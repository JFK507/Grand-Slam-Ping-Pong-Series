/* Respaldo, almacenamiento y las reglas cargadas. */
import React, { useState } from 'react';
import { C } from '../lib/constantes.js';
import { emptyDB, guardarFotos, migrar } from '../lib/db.js';
import { useFotos } from '../ui/fotos.jsx';
import { Btn, Eyebrow } from '../ui/primitivas.jsx';
import { useConfirmar } from '../ui/dialogo.jsx';
import { useSync } from '../ui/sincronizacion.jsx';

export default function DatosTab({ db, commit }) {
  const confirmar = useConfirmar();
  const sync = useSync();
  const { fotos } = useFotos();
  const [txt, setTxt] = useState('');
  const [msg, setMsg] = useState('');

  const exportar = () => {
    setTxt(JSON.stringify({ db, fotos }));
    setMsg('Copia todo el texto y guárdalo donde quieras.');
  };

  const importar = async () => {
    try {
      const d = JSON.parse(txt);
      const st = migrar(d.db || d);
      if (!st.players || !st.tournaments) throw new Error('formato');
      if (d.fotos) { try { await guardarFotos(d.fotos); } catch { } }
      commit(st, true);
      setMsg('Respaldo restaurado. Cierra y vuelve a abrir para ver las fotos.');
    } catch {
      setMsg('Ese texto no es un respaldo válido.');
    }
  };

  const borrar = async () => {
    const ok = await confirmar({
      titulo: 'Borrar todo',
      texto: 'Se borran jugadores, torneos, fotos, temporadas y ranking.\n\nNo se puede deshacer.',
      ok: 'Borrar todo',
      peligro: true,
    });
    if (!ok) return;
    commit(emptyDB(), true);
    guardarFotos({}).catch(() => { });
    setTxt('');
    setMsg('Todo borrado. Cierra y vuelve a abrir para refrescar.');
  };

  const kb = Math.round(JSON.stringify(fotos).length / 1024);
  const fin = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  const TEXTO_SYNC = {
    alDia: 'Todo subido a la nube.',
    pendiente: 'Hay cambios sin subir. Se suben solos en cuanto haya señal.',
    subiendo: 'Subiendo…',
    sinConexion: 'Sin señal. Los cambios quedan guardados y se suben después.',
    conflicto: 'El otro administrador subió algo desde tu última bajada.',
    apagado: 'Entrá con tu cuenta para sincronizar.',
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      {sync.estado !== 'apagado' && (
        <>
          <Eyebrow color={sync.estado === 'conflicto' ? C.red : C.gold}>Nube</Eyebrow>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            {TEXTO_SYNC[sync.estado] || ''}
            {sync.subidoEn && (
              <><br />Última subida: {new Date(sync.subidoEn).toLocaleString()}</>
            )}
          </div>

          {sync.estado === 'conflicto' ? (
            <>
              <div style={{ fontSize: 11.5, color: C.chalk, lineHeight: 1.55 }}>
                Los dos registraron sin señal. Elegí cuál copia vale: subir la tuya
                pisa la de la nube, y traer la de la nube descarta la tuya.
                No hay vuelta atrás, así que mirá antes en Torneos qué tenés registrado.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Btn onClick={() => sync.resolver('local')} style={{ borderColor: C.gold, color: C.gold }}>
                  Vale la mía
                </Btn>
                <Btn onClick={() => sync.resolver('nube')} style={{ borderColor: C.red, color: C.red }}>
                  Vale la de la nube
                </Btn>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Btn onClick={() => sync.subirAhora()} disabled={sync.estado === 'subiendo'}>
                Subir ahora
              </Btn>
              <Btn onClick={() => sync.bajarAhora()} disabled={sync.estado === 'subiendo'}>
                Bajar ahora
              </Btn>
            </div>
          )}
          <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
        </>
      )}

      <Eyebrow>Respaldo</Eyebrow>
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
        Los datos viven solo en este dispositivo. Exporta después de cada torneo
        y pega el texto en tus notas.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn onClick={exportar}>Exportar</Btn>
        <Btn onClick={importar} disabled={!txt.trim()}>Importar</Btn>
      </div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)}
        placeholder="Aquí aparece el respaldo al exportar. Para restaurar, pega el texto y toca Importar."
        style={{
          background: C.card, border: `1px solid ${C.line}`, color: C.dim, borderRadius: 10,
          padding: 12, fontSize: 11, minHeight: 118, outline: 'none', resize: 'vertical',
        }} />
      {msg && <div style={{ fontSize: 12, color: C.gold }}>{msg}</div>}

      <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
      <Eyebrow>Almacenamiento</Eyebrow>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
        {db.players.length} jugadores · {fin} torneos finalizados · {db.seasons.length} temporadas cerradas
        <br />
        Temporada en curso: {db.season.nombre} (desde {db.season.inicio})
        <br />
        Fotos: {kb} KB, recortadas a 256×256.
      </div>

      <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
      <Eyebrow color={C.red}>Zona de riesgo</Eyebrow>
      <Btn onClick={borrar} style={{ borderColor: C.red, color: C.red }}>Borrar todos los datos</Btn>

      <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
      <Eyebrow>Reglas cargadas</Eyebrow>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
        Clasificación: primeros 8 en llegar a 7 puntos.
        <br />
        Cuartos a 7 seco · semis a 10 seco.
        <br />
        Final: sets a 10 con ventaja de 2; si van 1-1, tercer set a 7 seco.
        <br />
        Puntos acumulativos: clasificar 3 · ganar cuartos +5 · ganar semis +7 · ganar la final +10 (campeón 25).
        <br />
        La diferencia cuenta lo anotado menos lo recibido de cuartos en adelante.
      </div>
    </div>
  );
}
