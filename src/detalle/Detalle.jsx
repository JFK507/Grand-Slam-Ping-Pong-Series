/* Vista de un torneo: su cuadro, su acta y el texto para compartir. */
import React, { useMemo } from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Eyebrow, Segmento } from '../ui/primitivas.jsx';
import { useConfirmar } from '../ui/dialogo.jsx';
import { puestosAntesDe } from '../lib/estadisticas.js';
import CuadroCompleto from './CuadroCompleto.jsx';
import Registro from './Registro.jsx';
import Compartir from './Compartir.jsx';

export default function Detalle({ t, db, commit, name, modo, setModo, onBack }) {
  const confirmar = useConfirmar();
  /* Los duelos de esa copa se calcularon con la tabla de ese momento. */
  const puestos = useMemo(() => puestosAntesDe(db, t.id, t.seasonId), [db, t.id, t.seasonId]);
  const hayOtro = !!db.activeId && db.activeId !== t.id;

  /* Si un torneo se cerró por error, se puede reabrir: sale del ranking
     hasta que lo vuelvas a finalizar. */
  const reabrir = async () => {
    const ok = await confirmar({
      titulo: `Reabrir ${t.name}`,
      texto: 'Vuelve a la pantalla de resumen y sale del ranking '
        + 'hasta que lo finalices otra vez.',
      ok: 'Reabrir',
    });
    if (!ok) return;
    commit({
      ...db,
      tournaments: db.tournaments.map((x) =>
        (x.id === t.id ? { ...x, stage: 'resumen', result: undefined } : x)),
      activeId: t.id,
    }, true);
    onBack();
  };

  return (
    <div>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn small onClick={onBack}>←</Btn>
        <div className="num" style={{ fontSize: 23, fontWeight: 800, lineHeight: 1 }}>{t.name}</div>
        <div style={{
          marginLeft: 'auto', fontSize: 10, color: C.dim,
          letterSpacing: '.14em', whiteSpace: 'nowrap',
        }}>
          EDICIÓN {t.edicion}
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <Segmento
          ops={[['cuadro', 'Cuadro'], ['registro', 'Registro'], ['compartir', 'Compartir']]}
          val={modo} onChange={setModo} />
      </div>

      {modo === 'cuadro' && <CuadroCompleto t={t} name={name} />}
      {modo === 'registro' && <Registro t={t} name={name} puestos={puestos} />}
      {modo === 'compartir' && <Compartir t={t} db={db} name={name} />}

      {t.stage === 'finalizado' && commit && (
        <div style={{ padding: '4px 16px 20px', display: 'grid', gap: 8 }}>
          <div style={{ height: 1, background: C.line, margin: '6px 0' }} />
          <Eyebrow color={C.red}>Se cerró con un error</Eyebrow>
          <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.5 }}>
            {hayOtro
              ? 'Termina o cancela el torneo en curso antes de reabrir este.'
              : 'Reabrirlo lo saca del ranking hasta que lo finalices de nuevo.'}
          </div>
          <Btn onClick={reabrir} disabled={hayOtro}
            style={hayOtro ? undefined : { borderColor: C.gold, color: C.gold }}>
            Reabrir torneo
          </Btn>
        </div>
      )}
    </div>
  );
}
