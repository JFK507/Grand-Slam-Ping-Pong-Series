/* Lista del registro de jugadores con su asistencia. */
import React, { useState } from 'react';
import { C } from '../lib/constantes.js';
import { uid } from '../lib/util.js';
import { sellar } from '../lib/db.js';
import { agregados } from '../lib/estadisticas.js';
import { Btn, Card } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';
import Perfil from './Perfil.jsx';
import { useSesion } from '../ui/sesion.jsx';

export default function JugadoresTab({ db, commit }) {
  const { esAdmin } = useSesion();
  const [val, setVal] = useState('');
  const [sel, setSel] = useState(null);

  const add = () => {
    const n = val.trim();
    if (!n || db.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      setVal('');
      return;
    }
    commit({
      ...db,
      players: [...db.players, sellar({ id: uid(), name: n, apodo: '', mano: '' })],
    }, true);
    setVal('');
  };

  const elegido = sel ? db.players.find((x) => x.id === sel) : null;
  if (elegido) {
    return <Perfil p={elegido} db={db} commit={commit} onBack={() => setSel(null)} />;
  }

  const stats = agregados(db);
  const totalT = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      {esAdmin && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Agregar jugador"
            style={{
              flex: 1, background: C.card, border: `1px solid ${C.line}`, color: C.chalk,
              borderRadius: 10, padding: '13px 14px', fontSize: 15, outline: 'none',
            }} />
          <Btn tone="red" onClick={add}>+</Btn>
        </div>
      )}

      {db.players.length === 0 && (
        <div style={{ fontSize: 12, color: C.dim }}>Aún no hay jugadores registrados.</div>
      )}

      <div style={{ display: 'grid', gap: 5 }}>
        {[...db.players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
          const s = stats[p.id];
          const asis = s && totalT ? Math.round((s.tor / totalT) * 100) : 0;
          return (
            <Card key={p.id} onClick={() => setSel(p.id)}
              style={{
                padding: '9px 12px', display: 'flex', alignItems: 'center',
                gap: 10, cursor: 'pointer',
              }}>
              <Avatar id={p.id} name={p.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {p.name}
                  {p.apodo && <span style={{ color: C.dim, fontWeight: 400 }}> · {p.apodo}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>
                  {s
                    ? `${s.tor} de ${totalT} ediciones · ${asis}% · ${s.pts} pts${s.tit ? ` · ★${s.tit}` : ''}`
                    : 'Sin torneos jugados'}
                </div>
              </div>
              <span style={{ color: C.dim, fontSize: 16 }}>›</span>
            </Card>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: C.dim }}>
        Toca a un jugador para su ficha, foto, notas y estadísticas.
        {esAdmin && ' Ahí mismo vinculas su Gmail.'}
      </div>
    </div>
  );
}
