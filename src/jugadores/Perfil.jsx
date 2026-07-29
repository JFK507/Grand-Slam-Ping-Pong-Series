/* Ficha del jugador: foto, datos, estadísticas, cara a cara e historial. */
import React, { useMemo, useRef, useState } from 'react';
import { C } from '../lib/constantes.js';
import { comprimirFoto } from '../lib/util.js';
import { sellar } from '../lib/db.js';
import { etiquetaPts } from '../lib/reglas.js';
import { agregados, caraACara, partidosDe, rachaDe, rivalTop } from '../lib/estadisticas.js';
import { Btn, Card, Eyebrow, Segmento } from '../ui/primitivas.jsx';
import { Avatar, useFotos } from '../ui/fotos.jsx';
import { useConfirmar } from '../ui/dialogo.jsx';
import { useSesion } from '../ui/sesion.jsx';

export default function Perfil({ p, db, commit, onBack }) {
  const { puedoEditar, esAdmin } = useSesion();
  const editable = puedoEditar(p.id);
  const confirmar = useConfirmar();
  const { fotos, setFoto } = useFotos();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [rival, setRival] = useState('');

  const s = agregados(db)[p.id];
  const usado = db.tournaments.some((t) => t.entrants.includes(p.id));
  const nombreDe = (id) => db.players.find((x) => x.id === id)?.name || '?';
  const partidos = useMemo(() => partidosDe(db, p.id).reverse(), [db, p.id]);
  const top = useMemo(() => rivalTop(db, p.id), [db, p.id]);
  const h2h = useMemo(() => (rival ? caraACara(db, p.id, rival) : null), [db, p.id, rival]);
  const racha = useMemo(() => rachaDe(db, p.id), [db, p.id]);
  const totalT = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  const set = (patch) => commit({
    ...db,
    players: db.players.map((x) => (x.id === p.id ? sellar({ ...x, ...patch }) : x)),
  }, true);

  const subir = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { await setFoto(p.id, await comprimirFoto(f)); } catch { }
    setBusy(false);
    e.target.value = '';
  };

  const borrar = async () => {
    const ok = await confirmar({
      titulo: `Borrar a ${p.name}`,
      texto: 'Sale del registro de jugadores. No tiene torneos jugados, así que nada más cambia.',
      ok: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    setFoto(p.id, null);
    commit({ ...db, players: db.players.filter((x) => x.id !== p.id) }, true);
    onBack();
  };

  const Campo = ({ label, value, onSave, multi, placeholder, bloqueado }) => (
    <div>
      <Eyebrow>{label}</Eyebrow>
      {bloqueado || !editable ? (
        <div style={{
          marginTop: 6, background: C.slate, border: `1px solid ${C.line}`, borderRadius: 10,
          padding: '11px 12px', fontSize: 14.5, color: value ? C.chalk : C.dim,
          minHeight: multi ? 60 : undefined, whiteSpace: 'pre-line',
        }}>
          {value || '—'}
        </div>
      ) : multi ? (
        <textarea defaultValue={value} placeholder={placeholder}
          onBlur={(e) => onSave(e.target.value)}
          style={{
            width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.line}`,
            color: C.chalk, borderRadius: 10, padding: '10px 12px', fontSize: 14,
            minHeight: 78, outline: 'none', resize: 'vertical',
          }} />
      ) : (
        <input defaultValue={value} placeholder={placeholder}
          onBlur={(e) => onSave(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          style={{
            width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.line}`,
            color: C.chalk, borderRadius: 10, padding: '11px 12px', fontSize: 15, outline: 'none',
          }} />
      )}
    </div>
  );

  const Stat = ({ k, v, color }) => (
    <Card style={{ padding: '10px 6px', textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 23, fontWeight: 800, color: color || C.chalk, lineHeight: 1 }}>
        {v}
      </div>
      <div style={{
        fontSize: 8.5, letterSpacing: '.12em', color: C.dim, marginTop: 5, fontWeight: 700,
      }}>
        {k}
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn small onClick={onBack}>←</Btn>
          <Eyebrow>Ficha del jugador</Eyebrow>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={() => editable && fileRef.current?.click()}
          style={{ position: 'relative', cursor: editable ? 'pointer' : 'default' }}>
          <Avatar id={p.id} name={p.name} size={86} ring={C.gold} />
          {editable && (
            <div style={{
              position: 'absolute', bottom: -2, right: -2, background: C.red, color: '#fff',
              borderRadius: '50%', width: 26, height: 26, display: 'grid', placeItems: 'center',
              fontSize: 13, border: `2px solid ${C.ink}`,
            }}>
              {busy ? '…' : '+'}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{p.name}</div>
          {editable && (
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
              {fotos[p.id] ? 'Toca la foto para cambiarla' : 'Toca para agregar una foto'}
            </div>
          )}
          {p.apodo && !editable && (
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 4 }}>{p.apodo}</div>
          )}
          {editable && fotos[p.id] && (
            <Btn small onClick={() => setFoto(p.id, null)} style={{ marginTop: 8 }}>Quitar foto</Btn>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={subir} style={{ display: 'none' }} />

      {s && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
            <Stat k="PTS" v={s.pts} color={C.gold} />
            <Stat k="DIF" v={(s.dif > 0 ? '+' : '') + s.dif} />
            <Stat k="EDICIONES" v={s.tor} />
            <Stat k="TÍTULOS" v={s.tit} color={s.tit ? C.gold : undefined} />
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
            Mejor resultado: {etiquetaPts(s.mejor)} · Asistencia: {s.tor} de {totalT} ediciones
            {' '}({totalT ? Math.round((s.tor / totalT) * 100) : 0}%)
            {racha > 1 && ` · Mejor racha: ${racha} seguidos`}
          </div>
        </>
      )}

      <Campo label="Nombre" value={p.name} placeholder="Nombre completo"
        bloqueado={!esAdmin}
        onSave={(v) => set({ name: v.trim() || p.name })} />
      <Campo label="Apodo" value={p.apodo || ''} placeholder="Cómo le dicen en la mesa"
        onSave={(v) => set({ apodo: v.trim() })} />

      {esAdmin && (
        <div>
          <Eyebrow color={C.gold}>Gmail vinculado</Eyebrow>
          <input defaultValue={p.email || ''} placeholder="correo@gmail.com"
            onBlur={(e) => set({ email: e.target.value.trim().toLowerCase() })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            style={{
              width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.gold}`,
              color: C.chalk, borderRadius: 10, padding: '11px 12px', fontSize: 14, outline: 'none',
            }} />
          <div style={{ fontSize: 10, color: C.dim, marginTop: 5, lineHeight: 1.5 }}>
            Con este correo entra a su cuenta y ve esta ficha como suya. Solo tú ves este campo.
          </div>
        </div>
      )}

      <div>
        <Eyebrow>Mano</Eyebrow>
        <div style={{ marginTop: 6 }}>
          <Segmento ops={[['Diestro', 'Diestro'], ['Zurdo', 'Zurdo']]} val={p.mano}
            onChange={(m) => editable && set({ mano: p.mano === m ? '' : m })} />
        </div>
      </div>

      {esAdmin && !usado && (
        <Btn onClick={borrar} style={{ borderColor: C.red, color: C.red }}>Borrar jugador</Btn>
      )}
      {esAdmin && usado && (
        <div style={{ fontSize: 10, color: C.dim }}>
          No se puede borrar: ya tiene torneos jugados.
        </div>
      )}

      <div style={{ height: 1, background: C.line, margin: '2px 0' }} />

      <div>
        <Eyebrow>Cara a cara</Eyebrow>
        <select value={rival} onChange={(e) => setRival(e.target.value)}
          style={{
            width: '100%', marginTop: 7, background: C.card, color: C.chalk,
            border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 10px', fontSize: 14,
          }}>
          <option value="">Elige un rival…</option>
          {db.players.filter((x) => x.id !== p.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>

        {h2h && (h2h.n === 0 ? (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8 }}>
            Nunca se han enfrentado de cuartos en adelante.
          </div>
        ) : (
          <Card style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar id={p.id} name={p.name} size={34} ring={h2h.g > h2h.p ? C.gold : C.line} />
              <div className="num" style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: 800 }}>
                <span style={{ color: h2h.g >= h2h.p ? C.gold : C.dim }}>{h2h.g}</span>
                <span style={{ color: C.dim, margin: '0 6px' }}>-</span>
                <span style={{ color: h2h.p > h2h.g ? C.red : C.dim }}>{h2h.p}</span>
              </div>
              <Avatar id={rival} name={nombreDe(rival)} size={34} ring={h2h.p > h2h.g ? C.red : C.line} />
            </div>
            <div style={{
              display: 'grid', gap: 3, marginTop: 10, paddingTop: 10,
              borderTop: `1px solid ${C.line}`,
            }}>
              {h2h.ms.slice().reverse().map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                  <span style={{ color: m.ganado ? C.gold : C.red, fontWeight: 700, width: 12 }}>
                    {m.ganado ? 'G' : 'P'}
                  </span>
                  <span className="num" style={{ width: 40, fontWeight: 700 }}>{m.pf}-{m.pc}</span>
                  <span style={{ flex: 1, color: C.dim }}>{m.fase} · {m.torneo}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {top && (
        <div>
          <Eyebrow>Rival más frecuente</Eyebrow>
          <Card onClick={() => setRival(top.id)}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
            <Avatar id={top.id} name={nombreDe(top.id)} size={40} ring={C.red} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{nombreDe(top.id)}</div>
              <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>
                {top.n} {top.n === 1 ? 'duelo' : 'duelos'} de cuartos en adelante
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>
                <span style={{ color: top.g >= top.p ? C.gold : C.dim }}>{top.g}</span>
                <span style={{ color: C.dim, margin: '0 3px' }}>-</span>
                <span style={{ color: top.p > top.g ? C.red : C.dim }}>{top.p}</span>
              </div>
              <div style={{
                fontSize: 8.5, letterSpacing: '.16em', color: C.dim, fontWeight: 700, marginTop: 4,
              }}>
                G - P
              </div>
            </div>
          </Card>
        </div>
      )}

      <div>
        <Eyebrow>Últimos 5 partidos</Eyebrow>
        {partidos.length === 0 ? (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 7 }}>
            Todavía no ha jugado partidos de cuartos en adelante.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 5, marginTop: 8 }}>
            {partidos.slice(0, 5).map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: C.card,
                border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 10px',
              }}>
                <span className="num" style={{
                  width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                  background: m.ganado ? C.gold : C.redInk,
                  color: m.ganado ? '#191400' : C.red,
                }}>
                  {m.ganado ? 'G' : 'P'}
                </span>
                <Avatar id={m.rival} name={nombreDe(m.rival)} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {nombreDe(m.rival)}
                  </div>
                  <div style={{
                    fontSize: 9, color: C.dim, letterSpacing: '.08em',
                    textTransform: 'uppercase', marginTop: 1,
                  }}>
                    {m.fase} · {m.torneo}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{
                    fontSize: 15, fontWeight: 800, color: m.ganado ? C.gold : C.dim,
                  }}>
                    {m.pf}-{m.pc}
                  </div>
                  {m.fase === 'Final' && (
                    <div style={{ fontSize: 8, color: C.dim, letterSpacing: '.1em' }}>SETS</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
