/* Sincronización real. Baja al abrir y cuando vuelve la señal;
   sube en cuanto hay cambios pendientes y conexión. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Conflicto, bajarFotos, bajarTodo, fusionar, subirEstado, subirJugador,
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

  /* Bajar al abrir y cuando vuelve la señal. */
  useEffect(() => {
    if (!user) { setEstado('apagado'); return undefined; }
    bajarAhora();
    const alConectar = () => bajarAhora();
    const alDesconectar = () => setEstado('sinConexion');
    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* Subir solo cuando hay algo pendiente y señal. */
  useEffect(() => {
    if (!user || !pendiente || estado === 'conflicto' || !navigator.onLine) return undefined;
    const t = setTimeout(() => { subirAhora(); }, 1500);
    return () => clearTimeout(t);
  }, [user, pendiente, estado, subirAhora]);

  const valor = useMemo(() => ({
    estado: user ? estado : 'apagado',
    subidoEn,
    error,
    subirAhora,
    bajarAhora,
    resolver,
  }), [user, estado, subidoEn, error, subirAhora, bajarAhora, resolver]);

  return <SyncCtx.Provider value={valor}>{children}</SyncCtx.Provider>;
}
