/* Etapa 2: muestra el orden de competencia y el primer partido. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Card, ColOrden, Eyebrow } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';

export default function Orden({ t, name, update }) {
  const { izq, der } = t.groups;

  const empezar = () => {
    const clas = {};
    [...izq, ...der].forEach((id) => { clas[id] = 0; });
    update({ clas, qualified: [], stage: 'clasificacion' }, true);
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <Card style={{ background: C.redInk, borderColor: C.red }}>
        <Eyebrow color={C.chalk}>Primer partido</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Avatar id={izq[0]} name={name(izq[0])} size={40} />
          <div className="num" style={{ flex: 1, fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
            {name(izq[0])}
            <span style={{ color: C.gold, margin: '0 8px', fontSize: 13 }}>vs</span>
            {name(der[0])}
          </div>
          <Avatar id={der[0]} name={name(der[0])} size={40} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12 }}>
        <ColOrden titulo="Izquierda" ids={izq} name={name} />
        <div style={{ background: C.line }} />
        <ColOrden titulo="Derecha" ids={der} name={name} />
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        Se juega a un punto. El que pierde sale y entra el siguiente de su lado, en este orden.
      </div>

      <Btn tone="gold" full onClick={empezar}>Empezar</Btn>
    </div>
  );
}
