/* Sincronización real. Baja al abrir y cuando vuelve la señal;
   sube en cuanto hay cambios pendientes y conexión. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Conflicto, bajarFotos, bajarTodo, borrarJugador, buscarFichaPorCorreo,
  escucharEstado, escucharJugadores, fusionar, pasarCodigo, reclamarFicha,
  subirEstado, subirJugador,
} from '../lib/nube.js';
import { guardarFotos } from '../lib/db.js';
import { SyncCtx } from './sincronizacion.jsx';
import { useSesion } from './sesion.jsx';

export default function ProveedorSyncFirebase({ db, commit, fotos, setFotos, children }) {
  const { rol, user, miId } = useSesion();
  const [estado, setEstado] = useState('sinConexion');
  const [error, setError] = useState(null);
  const trabajando = useRef(false);
  const dbRef = useRef(db);
  dbRef.current = db;

  const esAdmin = rol === 'admin';
  const pendiente = !!db?.sync?.pendiente;
  const subidoEn = db?.sync?.subidoEn || null;

  /* ── bajar ── */
  const bajarAhora = useCallback(async () => {
    if (trabajando.current || !navigator.onLine) return;
    trabajando.current = true;
    try {
      const { estado: remoto, players } = await bajarTodo();
      const local = dbRef.current;

      /* Si tenemos cambios sin subir y la nube ya avanzó, no pisamos nada:
         que lo resuelva una persona. */
      if (local?.sync?.pendiente && remoto && (remoto.version || 0) > (local.sync.version || 0)) {
        setEstado('conflicto');
        trabajando.current = false;
        return;
      }

      commit(fusionar(local, remoto, players), true, true);

      /* Fotos que no tenemos todavía. */
      const faltan = players.map((p) => p.id).filter((id) => !fotos[id]);
      if (faltan.length) {
        const nuevas = await bajarFotos(faltan);
        if (Object.keys(nuevas).length) {
          const juntas = { ...fotos, ...nuevas };
          setFotos(juntas);
          guardarFotos(juntas).catch(() => { });
        }
      }
      setEstado('alDia');
      setError(null);
    } catch (e) {
      setError(e);
      setEstado(navigator.onLine ? 'pendiente' : 'sinConexion');
    }
    trabajando.current = false;
  }, [commit, fotos, setFotos]);

  /* ── subir ── */
  const subirAhora = useCallback(async () => {
    const local = dbRef.current;
    if (trabajando.current || !navigator.onLine || !local) return;
    if (!esAdmin && !miId) return;

    trabajando.current = true;
    setEstado('subiendo');
    try {
      if (esAdmin) {
        const version = await subirEstado(local, user?.email);
        /* Jugadores tocados desde la última subida. */
        const desde = local.sync?.subidoEn || 0;
        const tocados = (local.players || []).filter((p) => (p.actualizado || 0) > desde);
        for (const p of tocados) await subirJugador(p);
        commit({
          ...dbRef.current,
          sync: { ...(dbRef.current.sync || {}), version, subidoEn: Date.now(), pendiente: false },
        }, true, true);
      } else {
        /* Un jugador solo sube su propia ficha. */
        const yo = (local.players || []).find((p) => p.id === miId);
        if (yo) await subirJugador(yo);
        commit({
          ...dbRef.current,
          sync: { ...(dbRef.current.sync || {}), subidoEn: Date.now(), pendiente: false },
        }, true, true);
      }
      setEstado('alDia');
      setError(null);
    } catch (e) {
      setError(e);
      setEstado(e instanceof Conflicto ? 'conflicto' : 'pendiente');
    }
    trabajando.current = false;
  }, [commit, esAdmin, miId, user]);

  /* Al resolver un conflicto se elige qué copia vale. */
  const resolver = useCallback(async (quien) => {
    if (quien === 'nube') {
      const local = dbRef.current;
      commit({ ...local, sync: { ...(local.sync || {}), pendiente: false } }, true, true);
      setEstado('alDia');
      await bajarAhora();
    } else {
      /* Quedarse con lo local: se adopta la versión de la nube como base
         y se vuelve a subir encima. */
      try {
        const { estado: remoto } = await bajarTodo();
        const local = dbRef.current;
        commit({
          ...local,
          sync: { ...(local.sync || {}), version: remoto?.version || 0, pendiente: true },
        }, true, true);
        setEstado('pendiente');
      } catch (e) { setError(e); }
    }
  }, [bajarAhora, commit]);

  /* ── escuchas en vivo ──
     Se queda oyendo la nube, así que cualquier cambio aparece en todos los
     aparatos en el momento, sin recargar ni volver a abrir.
     Corre también sin sesión: leer es público y un invitado tiene que ver
     la liga. Sin esto, quien entrara como invitado veía la app vacía. */
  const ultEstado = useRef(undefined);
  const ultJugadores = useRef(undefined);
  /* Hasta que no llegue la lista de jugadores no se puede afirmar que alguien
     no tiene ficha. Sin esta espera, la app pedía registro a quien ya estaba
     registrado y se creaban duplicados. */
  const [listo, setListo] = useState(false);

  const aplicar = useCallback(() => {
    const remoto = ultEstado.current;
    const players = ultJugadores.current;
    if (remoto === undefined && players === undefined) return;
    const local = dbRef.current;
    if (!local) return;

    /* Si tenemos cambios sin subir y la nube ya avanzó, no se pisa nada:
       lo resuelve una persona desde los ajustes. */
    if (local.sync?.pendiente && remoto && (remoto.version || 0) > (local.sync.version || 0)) {
      setEstado('conflicto');
      return;
    }

    commit(fusionar(local, remoto ?? null, players ?? []), true, true);
    if (!local.sync?.pendiente) setEstado('alDia');
  }, [commit]);

  useEffect(() => {
    const alFallar = (e) => {
      setError(e);
      setEstado(navigator.onLine ? 'pendiente' : 'sinConexion');
    };
    const offEstado = escucharEstado((d) => { ultEstado.current = d; aplicar(); }, alFallar);
    const offJug = escucharJugadores((l) => {
      ultJugadores.current = l;
      aplicar();
      setListo(true);
    }, (e) => { alFallar(e); setListo(true); });

    /* Sin señal, o si la nube tarda, no se puede quedar esperando para siempre:
       se sigue con lo que haya guardado en el teléfono. */
    if (!navigator.onLine) setListo(true);
    const rendirse = setTimeout(() => setListo(true), 8000);

    const alDesconectar = () => setEstado('sinConexion');
    window.addEventListener('offline', alDesconectar);
    return () => {
      clearTimeout(rendirse);
      offEstado();
      offJug();
      window.removeEventListener('offline', alDesconectar);
    };
  }, [aplicar]);

  /* Fotos que falten, cuando cambia la lista de jugadores. */
  useEffect(() => {
    if (!db?.players?.length) return;
    const faltan = db.players.map((p) => p.id).filter((id) => !fotos[id]);
    if (!faltan.length || !navigator.onLine) return;
    let vivo = true;
    bajarFotos(faltan).then((nuevas) => {
      if (!vivo || !Object.keys(nuevas).length) return;
      const juntas = { ...fotos, ...nuevas };
      setFotos(juntas);
      guardarFotos(juntas).catch(() => { });
    }).catch(() => { });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.players?.length]);

  /* Subir solo cuando hay algo pendiente y señal. */
  useEffect(() => {
    if (!user || !pendiente || estado === 'conflicto' || !navigator.onLine) return undefined;
    const t = setTimeout(() => { subirAhora(); }, 1500);
    return () => clearTimeout(t);
  }, [user, pendiente, estado, subirAhora]);

  /* ── registro de un jugador nuevo ──
     El código NO se comprueba acá: se manda al servidor, y es la regla la que
     lo compara contra el que está guardado. Si no cuadra, esta escritura falla
     y nunca se llega a crear la ficha. */
  const marcarPaso = (e, paso) => {
    if (e && !e.paso) e.paso = paso;
    throw e;
  };

  const registrar = useCallback(async ({ codigo, name, apodo, mano }) => {
    if (!user) throw new Error('Entrá con tu cuenta primero.');
    await pasarCodigo(user.uid, (codigo || '').trim().toUpperCase())
      .catch((e) => marcarPaso(e, 'codigo'));

    const ficha = {
      id: user.uid,
      uid: user.uid,
      email: (user.email || '').trim().toLowerCase(),
      name: (name || '').trim(),
      apodo: (apodo || '').trim(),
      mano: mano || '',
      actualizado: Date.now(),
    };
    await subirJugador(ficha).catch((e) => marcarPaso(e, 'ficha'));

    /* Reemplaza si ya existía en vez de agregar otra. Sin esto, alguien que
       cierra sesión y vuelve a registrarse termina con dos fichas locales. */
    const local = dbRef.current;
    const otros = (local.players || []).filter((p) => (
      p.id !== ficha.id
      && p.uid !== ficha.uid
      && (p.email || '').trim().toLowerCase() !== ficha.email
    ));
    commit({ ...local, players: [...otros, ficha] }, true);
    return ficha;
  }, [user, commit]);

  /* Ficha que el admin dejó preparada con este correo, si existe. */
  const buscarReclamable = useCallback(async () => {
    const correo = (user?.email || '').trim().toLowerCase();
    if (!correo) return null;
    try {
      const f = await buscarFichaPorCorreo(correo);
      return f && !f.uid ? f : null;
    } catch { return null; }
  }, [user]);

  const reclamar = useCallback(async (id) => {
    if (!user) throw new Error('Entrá con tu cuenta primero.');
    await reclamarFicha(id, user.uid);
    await bajarAhora();
  }, [user, bajarAhora]);

  const borrarJugadorNube = useCallback(async (id) => {
    await borrarJugador(id);
  }, []);

  const valor = useMemo(() => ({
    listo,
    estado,
    subidoEn,
    error,
    subirAhora,
    bajarAhora,
    resolver,
    registrar,
    buscarReclamable,
    reclamar,
    borrarJugadorNube,
  }), [
    listo, estado, subidoEn, error, subirAhora, bajarAhora, resolver,
    registrar, buscarReclamable, reclamar, borrarJugadorNube,
  ]);

  return <SyncCtx.Provider value={valor}>{children}</SyncCtx.Provider>;
}
