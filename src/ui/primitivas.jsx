/* Piezas visuales reutilizables. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { Avatar } from './fotos.jsx';

export const Btn = ({ children, onClick, tone = 'ghost', disabled, full, small, style }) => {
  const tones = {
    red: { bg: C.red, fg: '#fff', bd: C.red },
    gold: { bg: C.gold, fg: '#191400', bd: C.gold },
    ghost: { bg: 'transparent', fg: C.chalk, bd: C.line },
  };
  const t = tones[tone] || tones.ghost;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.card : t.bg, color: disabled ? C.dim : t.fg,
        border: `1px solid ${disabled ? C.line : t.bd}`, borderRadius: 10,
        padding: small ? '8px 12px' : '13px 18px', fontFamily: 'var(--ui)', fontWeight: 700,
        fontSize: small ? 12 : 14, letterSpacing: '.06em', textTransform: 'uppercase',
        width: full ? '100%' : undefined, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform .08s ease', ...style,
      }}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
};

export const Eyebrow = ({ children, color = C.dim }) => (
  <div style={{
    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em',
    textTransform: 'uppercase', color, fontWeight: 700,
  }}>
    {children}
  </div>
);

export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, ...style,
  }}>
    {children}
  </div>
);

/* Fila de marcas que se llena: se lee el avance sin mirar el número. */
export const Pips = ({ n, max = 7, on = C.gold }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {Array.from({ length: max }).map((_, i) => (
      <div key={i} style={{ width: 8, height: 4, borderRadius: 1, background: i < n ? on : C.line }} />
    ))}
  </div>
);

export const Segmento = ({ ops, val, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ops.length},1fr)`, gap: 5 }}>
    {ops.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)}
        style={{
          background: val === k ? C.redInk : 'transparent',
          border: `1px solid ${val === k ? C.red : C.line}`,
          color: val === k ? C.chalk : C.dim, borderRadius: 10, padding: '9px 4px',
          fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}>
        {l}
      </button>
    ))}
  </div>
);

export const Chip = ({ children, onClick, tone, id, name }) => (
  <button onClick={onClick}
    style={{
      background: tone === 'on' ? C.redInk : C.card,
      border: `1px solid ${tone === 'on' ? C.red : C.line}`,
      color: C.chalk, borderRadius: 999, padding: '5px 12px 5px 5px',
      fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
    }}>
    <Avatar id={id} name={name} size={22} />
    <span>{children}</span>
  </button>
);

export const Vacio = ({ children }) => (
  <div style={{ padding: '26px 20px', textAlign: 'center', color: C.dim, fontSize: 12.5, lineHeight: 1.6 }}>
    {children}
  </div>
);

/* Conector vertical entre rondas del cuadro. */
export const Baja = () => (
  <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}>
    <div style={{ width: 1, height: 16, background: C.line }} />
  </div>
);

/* Un jugador con su marcador dentro de una tarjeta de partido. */
export const Fila = ({ id, nombre, score, win }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <Avatar id={id} name={nombre} size={24} ring={win ? C.gold : C.line} />
    <span style={{ flex: 1, fontSize: 13.5, fontWeight: win ? 700 : 400, color: win ? C.gold : C.chalk }}>
      {nombre}
    </span>
    <span className="num" style={{ fontSize: 17, fontWeight: 800, color: win ? C.gold : C.dim }}>
      {score}
    </span>
  </div>
);

/* Columna con el orden de un lado de la mesa. */
export const ColOrden = ({ titulo, ids, name }) => (
  <div>
    <Eyebrow>{titulo}</Eyebrow>
    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
      {ids.map((id, i) => (
        <div key={id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span className="num" style={{ fontSize: 12, color: C.dim, width: 12 }}>{i + 1}</span>
          <Avatar id={id} name={name(id)} size={22} />
          <span style={{
            fontSize: 13, fontWeight: i === 0 ? 700 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name(id)}
          </span>
        </div>
      ))}
    </div>
  </div>
);
