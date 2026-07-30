/* Etapa 4: revela el cuadro ya sorteado. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Card, Eyebrow } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';

export default function Cuadro({ t, name, update }) {
  const qf = t.qf;

  const Llave = ({ titulo, ms }) => (
    <div style={{ display: 'grid', gap: 6 }}>
      <Eyebrow color={C.red}>{titulo}</Eyebrow>
      {ms.map((m) => (
        <Card key={m.n} style={{
          padding: '10px 12px', animation: 'rise .3s ease both',
          animationDelay: `${m.n * 60}ms`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="num" style={{ fontSize: 11, color: C.red, fontWeight: 800, width: 20 }}>
              C{m.n}
            </span>
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              {[[m.a, m.seedA], [m.b, m.seedB]].map(([id, s]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Avatar id={id} name={name(id)} size={24} />
                  <span style={{ fontSize: 13, flex: 1 }}>{name(id)}</span>
                  <span className="num" style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>
                    A{s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        Cuadro sorteado al azar. Los ganadores de C1 y C3 se cruzan en la semifinal 1;
        los de C2 y C4, en la semifinal 2.
      </div>
      <Llave titulo="Semifinal 1 sale de aquí" ms={[qf[0], qf[2]]} />
      <div style={{ height: 1, background: C.line }} />
      <Llave titulo="Semifinal 2 sale de aquí" ms={[qf[1], qf[3]]} />
      <Btn tone="gold" full onClick={() => update({ stage: 'cuartos' }, true)}>
        Empezar cuartos
      </Btn>
    </div>
  );
}
