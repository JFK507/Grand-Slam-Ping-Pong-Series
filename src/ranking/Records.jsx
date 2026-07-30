/* Récords en formato tablero: cada récord es una baldosa con el número
   grande adelante, para que se lea de un vistazo sin tener que ir renglón
   por renglón. Dos columnas, que es lo que entra cómodo en un celular. */
import React, { useMemo } from 'react';
import { C } from '../lib/constantes.js';
import { listaRecords } from '../lib/estadisticas.js';
import { Vacio } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';

/* Cada récord lleva su propio ícono, así se distinguen sin leer el título. */
const ICONOS = {
  'Más títulos': '🏆',
  'Más finales jugadas': '🎯',
  'Más constante': '📅',
  'Más veces en cuartos': '🎽',
  'Mayor diferencia en un torneo': '📈',
  'Racha más larga': '🔥',
  'El eterno aspirante': '🥲',
};

const Baldosa = ({ r, name }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.line}`, borderTop: `2px solid ${C.gold}`,
    borderRadius: 12, padding: '12px 12px 11px', display: 'flex',
    flexDirection: 'column', gap: 8, minHeight: 132,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{ICONOS[r.titulo] || '★'}</span>
      <div style={{
        flex: 1, fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase',
        color: C.dim, fontWeight: 700, lineHeight: 1.35,
      }}>
        {r.titulo}
      </div>
    </div>

    <div className="num" style={{
      fontSize: 40, fontWeight: 800, lineHeight: 0.85, color: C.gold,
    }}>
      {r.valor}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 'auto' }}>
      <Avatar id={r.id} name={name(r.id)} size={26} ring={C.gold} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name(r.id)}
        </div>
        <div style={{ fontSize: 9.5, color: C.dim, lineHeight: 1.3, marginTop: 1 }}>
          {r.detalle}
        </div>
      </div>
    </div>
  </div>
);

export default function Records({ db }) {
  const name = (id) => db.players.find((p) => p.id === id)?.name || '?';
  const recs = useMemo(() => listaRecords(db), [db]);

  if (!recs.length) {
    return <Vacio>Los récords aparecen cuando termines tu primer torneo.</Vacio>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {recs.map((r, i) => <Baldosa key={i} r={r} name={name} />)}
      </div>
      <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
        Todo se cuenta de cuartos en adelante, que es donde queda registro de
        quién jugó contra quién.
      </div>
    </div>
  );
}
