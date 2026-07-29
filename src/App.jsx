/* Cascarón: cabecera, pestañas y el ciclo de carga/guardado. */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C } from './lib/constantes.js';
import {
  leerTodo, guardarEstado, guardarFotos, leerModoInvitado, guardarModoInvitado,
} from './lib/db.js';
import { FotoCtx } from './ui/fotos.jsx';
import { ProveedorDialogo } from './ui/dialogo.jsx';
import { useSesion } from './ui/sesion.jsx';
import TorneoTab from './torneo/TorneoTab.jsx';
import RankingTab from './ranking/RankingTab.jsx';
import JugadoresTab from './jugadores/JugadoresTab.jsx';
import MiPerfil from './perfil/MiPerfil.jsx';
import Bienvenida from './pantallas/Bienvenida.jsx';
import { LuzSync, ProveedorSyncNulo } from './ui/sincronizacion.jsx';
import DatosTab from './datos/DatosTab.jsx';

const TABS = [
  ['torneo', 'Torneos'], ['ranking', 'Ranking'],
  ['jugadores', 'Jugadores'], ['perfil', 'Perfil'],
];

/* App carga los datos y los entrega al proveedor de sesión que le pasen.
   No sabe de dónde viene la sesión: el punto de entrada real le pasa el de
   Google, y el prototipo le pasa uno inventado. Así este archivo no arrastra
   la librería de Firebase. */
export default function App({ Sesion, Sync = ProveedorSyncNulo }) {
  const [db, setDb] = useState(null);
  const [fotos, setFotos] = useState({});
  const [tab, setTab] = useState('torneo');
  const [ajustes, setAjustes] = useState(false);
  /* tab y ajustes viven acá arriba para no perderse al cambiar de sesión. */
  const [saved, setSaved] = useState(true);
  const timer = useRef(null);
  const pend = useRef(null);

  useEffect(() => {
    leerTodo().then(({ db: d, fotos: f }) => { setDb(d); setFotos(f); });
  }, []);

  /* Guarda con retraso: al contar puntos se toca muchas veces por segundo. */
  const flush = useCallback(async () => {
    if (!pend.current) return;
    const payload = pend.current;
    pend.current = null;
    try { await guardarEstado(payload); setSaved(true); } catch { setSaved(false); }
  }, []);

  /* Todo cambio deja marca de pendiente, salvo que venga de la propia
     sincronización (que ya sabe lo que hizo). */
  const commit = useCallback((next, now = false) => {
    const conMarca = next && next.sync && next.sync.pendiente !== undefined
      ? next
      : { ...next, sync: { ...(next?.sync || {}), pendiente: true } };
    next = conMarca;
    setDb(next);
    pend.current = next;
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    if (now) flush(); else timer.current = setTimeout(flush, 700);
  }, [flush]);

  const setFoto = useCallback(async (id, dataUrl) => {
    const next = { ...fotos };
    if (dataUrl) next[id] = dataUrl; else delete next[id];
    setFotos(next);
    try { await guardarFotos(next); } catch { }
  }, [fotos]);

  /* Si el celular se bloquea o cambias de app, se guarda de una. */
  useEffect(() => {
    const h = () => flush();
    document.addEventListener('visibilitychange', h);
    window.addEventListener('pagehide', h);
    return () => {
      document.removeEventListener('visibilitychange', h);
      window.removeEventListener('pagehide', h);
    };
  }, [flush]);

  if (!db) {
    return (
      <div style={{
        background: C.ink, color: C.dim, minHeight: '100vh',
        display: 'grid', placeItems: 'center', fontFamily: 'var(--ui)',
      }}>
        Cargando…
      </div>
    );
  }

  return (
    <Sesion db={db}>
      <Sync db={db} commit={commit} fotos={fotos} setFotos={setFotos}>
        <Pantallas
          db={db} commit={commit} fotos={fotos} setFoto={setFoto}
          saved={saved} tab={tab} setTab={setTab}
          ajustes={ajustes} setAjustes={setAjustes}
        />
      </Sync>
    </Sesion>
  );
}

function Pantallas({ db, commit, fotos, setFoto, saved, tab, setTab, ajustes, setAjustes }) {
  const { esAdmin, user, cargando } = useSesion();
  const [invitado, setInvitado] = useState(null); // null = todavía sin leer
  const eraUsuario = useRef(false);

  useEffect(() => { leerModoInvitado().then(setInvitado); }, []);

  /* Si alguien cierra sesión, vuelve a aparecer la puerta de entrada. */
  useEffect(() => {
    if (eraUsuario.current && !user) {
      setInvitado(false);
      guardarModoInvitado(false).catch(() => { });
    }
    eraUsuario.current = !!user;
  }, [user]);

  const entrarDeInvitado = () => {
    setInvitado(true);
    guardarModoInvitado(true).catch(() => { });
  };

  if (cargando || invitado === null) {
    return (
      <div style={{
        background: C.ink, color: C.dim, minHeight: '100vh',
        display: 'grid', placeItems: 'center', fontFamily: 'var(--ui)',
      }}>
        Cargando…
      </div>
    );
  }

  if (!user && !invitado) return <Bienvenida onInvitado={entrarDeInvitado} />;

  return (
    <FotoCtx.Provider value={{ fotos, setFoto }}>
     <ProveedorDialogo>
      <div style={{
        background: C.ink, color: C.chalk, minHeight: '100vh',
        fontFamily: 'var(--ui)', display: 'flex', flexDirection: 'column',
      }}>
        <header style={{
          padding: '14px 16px 10px', borderBottom: `1px solid ${C.line}`,
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <div className="num" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>GRAND SLAM</div>
          <div style={{
            fontSize: 9, letterSpacing: '.28em', color: C.red,
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            Ping Pong Series
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <LuzSync />
            <span title={saved ? 'Guardado en el teléfono' : 'Guardando…'}
              style={{ fontSize: 9, color: saved ? C.line : C.gold }}>{saved ? '●' : '○'}</span>
            {esAdmin && (
              <button
                onClick={() => setAjustes((v) => !v)}
                title="Ajustes"
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer', padding: '2px 0',
                  color: ajustes ? C.gold : C.dim, fontSize: 17, lineHeight: 1,
                }}
              >
                ⚙
              </button>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {ajustes ? (
            <DatosTab db={db} commit={commit} />
          ) : (
            <>
              {tab === 'torneo' && <TorneoTab db={db} commit={commit} />}
              {tab === 'ranking' && <RankingTab db={db} commit={commit} />}
              {tab === 'jugadores' && <JugadoresTab db={db} commit={commit} />}
              {tab === 'perfil' && <MiPerfil db={db} commit={commit} />}
            </>
          )}
        </main>

        <nav style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          borderTop: `1px solid ${C.line}`, background: C.slate,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setAjustes(false); }}
              style={{
                background: 'transparent', border: 0, padding: '13px 4px 15px', cursor: 'pointer',
                color: tab === k && !ajustes ? C.chalk : C.dim,
                borderTop: `2px solid ${tab === k && !ajustes ? C.red : 'transparent'}`,
                fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
              }}>
              {l}
            </button>
          ))}
        </nav>
      </div>
     </ProveedorDialogo>
    </FotoCtx.Provider>
  );
}
