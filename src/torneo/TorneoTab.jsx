/* Enruta las etapas del torneo y el historial. */
import React, { useState } from 'react';
import { C, STAGES } from '../lib/constantes.js';
import { uid, hoy } from '../lib/util.js';
import { nombreLibre } from '../lib/db.js';
import { Btn, Card, Eyebrow } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';
import Inscripcion from './Inscripcion.jsx';
import Orden from './Orden.jsx';
import Clasificacion from './Clasificacion.jsx';
import Cuadro from './Cuadro.jsx';
import Ronda from './Ronda.jsx';
import FinalFase from './FinalFase.jsx';
import Resumen from './Resumen.jsx';
import Corregir from './Corregir.jsx';
import Detalle from '../detalle/Detalle.jsx';
import { useSesion } from '../ui/sesion.jsx';

export default function TorneoTab({ db, commit }) {
  const { esAdmin } = useSesion();
  const [ver, setVer] = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const name = (id) => db.players.find((p) => p.id === id)?.name || '?';
  const active = db.tournaments.find((t) => t.id === db.activeId) || null;

  const nuevo = () => {
    const t = {
      id: uid(), seasonId: db.season.id,
      edicion: db.tournaments.length + 1,
      name: nombreLibre(db.tournaments.map((x) => x.name)),
      date: hoy(), stage: 'inscripcion',
      entrants: [], groups: null, clas: {}, qualified: [],
      qf: null, sf: null, final: null,
    };
    commit({ ...db, tournaments: [...db.tournaments, t], activeId: t.id }, true);
  };

  const update = (patch, now = false) => commit({
    ...db,
    tournaments: db.tournaments.map((t) => (t.id === active.id ? { ...t, ...patch } : t)),
  }, now);

  if (ver) {
    const t = db.tournaments.find((x) => x.id === ver.id);
    if (t) {
      return (
        <Detalle t={t} db={db} commit={esAdmin ? commit : null} name={name} modo={ver.modo}
          setModo={(m) => setVer({ ...ver, modo: m })} onBack={() => setVer(null)} />
      );
    }
  }

  /* Quien no administra nunca entra al flujo de registro: solo mira. */
  if (!esAdmin) {
    return <Historial db={db} name={name} nuevo={null} setVer={setVer} activo={active} />;
  }

  if (!active) return <Historial db={db} name={name} nuevo={nuevo} setVer={setVer} />;

  if (corrigiendo) {
    return (
      <div>
        <Cabecera t={active} update={update} />
        <Corregir t={active} db={db} commit={commit} name={name} update={update}
          onBack={() => setCorrigiendo(false)} />
      </div>
    );
  }

  return (
    <div>
      <Cabecera t={active} update={update} />
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6 }}>
        <Btn small disabled={!active.qf} onClick={() => setVer({ id: active.id, modo: 'cuadro' })}>
          Cuadro
        </Btn>
        <Btn small onClick={() => setVer({ id: active.id, modo: 'registro' })}>Registro</Btn>
        <Btn small onClick={() => setCorrigiendo(true)} style={{ marginLeft: 'auto' }}>Corregir</Btn>
      </div>
      <Stepper stage={active.stage} />

      {active.stage === 'inscripcion' && <Inscripcion db={db} commit={commit} t={active} update={update} />}
      {active.stage === 'orden' && <Orden t={active} name={name} update={update} />}
      {active.stage === 'clasificacion' && <Clasificacion t={active} name={name} update={update} />}
      {active.stage === 'cuadro' && <Cuadro t={active} name={name} update={update} />}
      {active.stage === 'cuartos' && <Ronda t={active} name={name} update={update} fase="qf" />}
      {active.stage === 'semis' && <Ronda t={active} name={name} update={update} fase="sf" />}
      {active.stage === 'final' && <FinalFase t={active} name={name} update={update} />}
      {active.stage === 'resumen' && (
        <Resumen t={active} name={name} db={db} commit={commit} setVer={setVer} />
      )}
    </div>
  );
}

function Historial({ db, name, nuevo, setVer, activo }) {
  const hist = [...db.tournaments].reverse();
  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <Eyebrow>
        {activo ? `En juego · ${db.season.nombre}` : `Sin torneo en curso · ${db.season.nombre}`}
      </Eyebrow>
      {nuevo && <Btn tone="red" full onClick={nuevo}>Crear torneo</Btn>}
      {activo && (
        <Card onClick={() => setVer({ id: activo.id, modo: 'cuadro' })}
          style={{ background: C.redInk, borderColor: C.red, cursor: 'pointer' }}>
          <Eyebrow color={C.chalk}>Se está jugando ahora</Eyebrow>
          <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{activo.name}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>Toca para ver el cuadro en vivo</div>
        </Card>
      )}

      {hist.length > 0 && (
        <>
          <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
          <Eyebrow>Historial</Eyebrow>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: -8 }}>
            Toca un torneo para ver su registro, su cuadro y compartirlo.
          </div>
          {hist.map((t) => (
            <Card key={t.id} onClick={() => setVer({ id: t.id, modo: 'registro' })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 19 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                  Edición {t.edicion} · {t.date} · {t.entrants.length} jugadores
                </div>
              </div>
              {t.final?.winner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Avatar id={t.final.winner} name={name(t.final.winner)} size={34} ring={C.gold} />
                  <div>
                    <Eyebrow color={C.gold}>Campeón</Eyebrow>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{name(t.final.winner)}</div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function Cabecera({ t, update }) {
  const [edit, setEdit] = useState(false);
  return (
    <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {edit ? (
        <input autoFocus defaultValue={t.name} className="num"
          onBlur={(e) => { update({ name: e.target.value.trim() || t.name }, true); setEdit(false); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          style={{
            flex: 1, background: C.card, border: `1px solid ${C.red}`, color: C.chalk,
            borderRadius: 8, padding: '4px 8px', fontSize: 24, fontWeight: 800, outline: 'none',
          }} />
      ) : (
        <div className="num" onClick={() => setEdit(true)}
          style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, cursor: 'pointer' }}>
          {t.name}
        </div>
      )}
      <div style={{
        marginLeft: 'auto', fontSize: 10, color: C.dim,
        letterSpacing: '.14em', whiteSpace: 'nowrap',
      }}>
        EDICIÓN {t.edicion}
      </div>
    </div>
  );
}

function Stepper({ stage }) {
  const i = STAGES.findIndex(([k]) => k === stage);
  return (
    <div style={{ padding: '10px 16px 4px' }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {STAGES.map(([k], j) => (
          <div key={k} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: j < i ? C.red : j === i ? C.gold : C.line,
          }} />
        ))}
      </div>
      <Eyebrow color={C.gold}>{STAGES[i]?.[1]}</Eyebrow>
    </div>
  );
}
