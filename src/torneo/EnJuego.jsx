/* Muestra lo que se juega en un partido: cuántos puntos gana el que gane y
   cuántos pierde el que pierda, según la distancia en la tabla.
   En la primera copa de la liga no hay tabla, así que no muestra nada. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { duelo } from '../lib/reglas.js';
import { Eyebrow } from '../ui/primitivas.jsx';

/* Qué pasa si gana A, y qué pasa si gana B. */
export function calcularEnJuego(puestos, idA, idB) {
  if (!puestos || !idA || !idB) return null;
  const pA = puestos.get(idA) ?? puestos.ultimo;
  const pB = puestos.get(idB) ?? puestos.ultimo;
  if (pA == null || pB == null) return null;
  return {
    puestoA: pA,
    puestoB: pB,
    siGanaA: duelo(pA, pB),
    siGanaB: duelo(pB, pA),
  };
}

const Lado = ({ nombre, puesto, escenario, alinear }) => (
  <div style={{ flex: 1, textAlign: alinear }}>
    <div style={{ fontSize: 10, color: C.dim }}>
      {nombre} · {puesto}º
    </div>
    <div className="num" style={{
      fontSize: 17, fontWeight: 800, marginTop: 2,
      color: escenario.gana >= 4 ? '#2E7D53' : C.chalk,
    }}>
      +{escenario.gana}
      <span style={{ fontSize: 12, color: C.red, marginLeft: 6 }}>{escenario.pierde}</span>
    </div>
    <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{escenario.nombre}</div>
  </div>
);

export default function EnJuego({ puestos, idA, idB, nameA, nameB }) {
  const j = calcularEnJuego(puestos, idA, idB);
  if (!j) return null;

  return (
    <div style={{
      background: C.slate, border: `1px solid ${C.line}`, borderRadius: 11,
      padding: '9px 12px',
    }}>
      <Eyebrow>En juego</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 6 }}>
        <Lado nombre={nameA} puesto={j.puestoA} escenario={j.siGanaA} alinear="left" />
        <div style={{ width: 1, alignSelf: 'stretch', background: C.line }} />
        <Lado nombre={nameB} puesto={j.puestoB} escenario={j.siGanaB} alinear="right" />
      </div>
      <div style={{ fontSize: 9.5, color: C.dim, marginTop: 6, lineHeight: 1.45 }}>
        El primer número es lo que suma si gana; el rojo, lo que resta si pierde.
      </div>
    </div>
  );
}
