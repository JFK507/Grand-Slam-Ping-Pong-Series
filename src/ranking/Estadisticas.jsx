/* Cuarta vista de Ranking: las estadísticas que dan conversación.
   Todo sale de los partidos ya jugados, de cuartos en adelante, que es
   donde queda registro de quién enfrentó a quién. */
import React, { useMemo } from 'react';
import { C } from '../lib/constantes.js';
import {
  asistencia, efectividad, efectividadPorRonda, embudo, palmares,
  partidosExtremos, resumenLiga, rivalidades,
} from '../lib/estadisticas.js';
import { Card, Eyebrow, Vacio } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';

const Titulo = ({ children, nota }) => (
  <div style={{ marginTop: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Eyebrow color={C.red}>{children}</Eyebrow>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
    {nota && (
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 5, lineHeight: 1.5 }}>{nota}</div>
    )}
  </div>
);

const Barra = ({ pct, color = C.gold }) => (
  <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 3, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color }} />
  </div>
);

export default function Estadisticas({ db }) {
  const name = (id) => db.players.find((p) => p.id === id)?.name || '?';

  const datos = useMemo(() => ({
    resumen: resumenLiga(db),
    palma: palmares(db),
    efec: efectividad(db, 3),
    porRonda: efectividadPorRonda(db, 3),
    emb: embudo(db),
    riv: rivalidades(db, 2),
    extremos: partidosExtremos(db),
    asis: asistencia(db),
  }), [db]);

  const { resumen, palma, efec, porRonda, emb, riv, extremos, asis } = datos;

  if (!resumen.copas) {
    return (
      <Vacio>
        Todavía no hay torneos finalizados.
        <br />
        Las estadísticas aparecen cuando cierres el primero.
      </Vacio>
    );
  }

  const Dato = ({ k, v }) => (
    <Card style={{ padding: '10px 6px', textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{v}</div>
      <div style={{
        fontSize: 8, letterSpacing: '.12em', color: C.dim, marginTop: 5, fontWeight: 700,
      }}>
        {k}
      </div>
    </Card>
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
        <Dato k="COPAS" v={resumen.copas} />
        <Dato k="JORNADAS" v={resumen.jornadas} />
        <Dato k="JUGADORES" v={resumen.jugadores} />
        <Dato k="PARTIDOS" v={resumen.partidos} />
      </div>

      {/* ── palmarés ── */}
      <Titulo>Palmarés</Titulo>
      <div style={{ display: 'grid', gap: 4 }}>
        {palma.slice(0, 10).map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: C.card,
            border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 11px',
          }}>
            <Avatar id={c.campeon} name={name(c.campeon)} size={26} ring={C.gold} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{name(c.campeon)}</div>
              <div style={{ fontSize: 9.5, color: C.dim, marginTop: 1 }}>
                {c.name} · le ganó a {name(c.finalista)}
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: C.dim, whiteSpace: 'nowrap' }}>{c.date}</div>
          </div>
        ))}
      </div>

      {/* ── embudo ── */}
      <Titulo nota="Cuántas veces llegó a cada instancia. Muchos cuartos y ninguna final es una historia en sí misma.">
        Hasta dónde llega cada uno
      </Titulo>
      <div style={{
        display: 'flex', fontSize: 9, letterSpacing: '.1em', color: C.dim,
        padding: '0 11px', fontWeight: 700,
      }}>
        <span style={{ flex: 1, marginLeft: 34 }}>JUGADOR</span>
        <span style={{ width: 30, textAlign: 'right' }}>4°</span>
        <span style={{ width: 30, textAlign: 'right' }}>SF</span>
        <span style={{ width: 30, textAlign: 'right' }}>F</span>
        <span style={{ width: 30, textAlign: 'right' }}>★</span>
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {emb.map((r) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: C.card,
            border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 11px',
          }}>
            <Avatar id={r.id} name={name(r.id)} size={26} />
            <span style={{ flex: 1, fontSize: 12.5 }}>{name(r.id)}</span>
            <span className="num" style={{ width: 30, textAlign: 'right', fontSize: 13, color: C.dim }}>{r.cuartos}</span>
            <span className="num" style={{ width: 30, textAlign: 'right', fontSize: 13, color: C.dim }}>{r.semis}</span>
            <span className="num" style={{ width: 30, textAlign: 'right', fontSize: 13 }}>{r.finales}</span>
            <span className="num" style={{
              width: 30, textAlign: 'right', fontSize: 14, fontWeight: 800,
              color: r.titulos ? C.gold : C.dim,
            }}>
              {r.titulos}
            </span>
          </div>
        ))}
      </div>

      {/* ── efectividad ── */}
      {efec.length > 0 && (
        <>
          <Titulo nota="Partidos ganados sobre jugados, de cuartos en adelante. Mínimo tres partidos.">
            Efectividad
          </Titulo>
          <div style={{ display: 'grid', gap: 5 }}>
            {efec.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
                <Avatar id={r.id} name={name(r.id)} size={24} />
                <span style={{ width: 78, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name(r.id)}
                </span>
                <Barra pct={r.pct} color={r.pct >= 60 ? C.gold : r.pct >= 40 ? '#9AA0A6' : C.red} />
                <span className="num" style={{ width: 34, textAlign: 'right', fontSize: 13, fontWeight: 800 }}>
                  {r.pct}%
                </span>
                <span style={{ width: 40, textAlign: 'right', fontSize: 9.5, color: C.dim }}>
                  {r.g}/{r.j}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── efectividad por ronda ── */}
      {porRonda.length > 0 && (
        <>
          <Titulo nota="La misma cuenta, separada por instancia. Acá se nota quién se achica en la final.">
            Efectividad por ronda
          </Titulo>
          <div style={{
            display: 'flex', fontSize: 9, letterSpacing: '.1em', color: C.dim,
            padding: '0 11px', fontWeight: 700,
          }}>
            <span style={{ flex: 1, marginLeft: 34 }}>JUGADOR</span>
            <span style={{ width: 44, textAlign: 'right' }}>CUARTOS</span>
            <span style={{ width: 38, textAlign: 'right' }}>SEMIS</span>
            <span style={{ width: 38, textAlign: 'right' }}>FINAL</span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {porRonda.map((r) => {
              const cel = (v) => (
                <span className="num" style={{
                  fontSize: 12.5,
                  color: v === null ? C.line : v >= 60 ? C.gold : v >= 40 ? C.chalk : C.red,
                }}>
                  {v === null ? '—' : `${v}%`}
                </span>
              );
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: C.card,
                  border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 11px',
                }}>
                  <Avatar id={r.id} name={name(r.id)} size={26} />
                  <span style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name(r.id)}
                  </span>
                  <span style={{ width: 44, textAlign: 'right' }}>{cel(r.cuartos)}</span>
                  <span style={{ width: 38, textAlign: 'right' }}>{cel(r.semis)}</span>
                  <span style={{ width: 38, textAlign: 'right' }}>{cel(r.finales)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── rivalidades ── */}
      {riv.length > 0 && (
        <>
          <Titulo nota="Los cruces que más se repiten. Los parejos aparecen primero.">
            Rivalidades
          </Titulo>
          <div style={{ display: 'grid', gap: 4 }}>
            {riv.slice(0, 8).map((r, i) => (
              <Card key={i} style={{ padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar id={r.a} name={name(r.a)} size={26} ring={r.ga > r.gb ? C.gold : C.line} />
                <span style={{ flex: 1, fontSize: 12, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name(r.a)}
                </span>
                <span className="num" style={{ fontSize: 15, fontWeight: 800, minWidth: 46, textAlign: 'center' }}>
                  {r.ga}<span style={{ color: C.dim, margin: '0 3px' }}>-</span>{r.gb}
                </span>
                <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name(r.b)}
                </span>
                <Avatar id={r.b} name={name(r.b)} size={26} ring={r.gb > r.ga ? C.gold : C.line} />
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── partidos extremos ── */}
      {extremos && (
        <>
          <Titulo>Partidos para recordar</Titulo>
          {[['El más apretado', extremos.cerrado, C.gold], ['La paliza', extremos.paliza, C.red]].map(
            ([et, m, color]) => m && (
              <Card key={et} style={{ padding: '10px 12px', borderColor: color }}>
                <Eyebrow color={color}>{et}</Eyebrow>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <span style={{ flex: 1, fontSize: 13, textAlign: 'right', fontWeight: m.winner === m.a ? 700 : 400 }}>
                    {name(m.a)}
                  </span>
                  <span className="num" style={{ fontSize: 19, fontWeight: 800 }}>
                    {m.sa}<span style={{ color: C.dim, margin: '0 3px' }}>-</span>{m.sb}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: m.winner === m.b ? 700 : 400 }}>
                    {name(m.b)}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 5, textAlign: 'center' }}>
                  {m.fase} · {m.torneo} · {m.fecha}
                </div>
              </Card>
            ),
          )}
        </>
      )}

      {/* ── asistencia ── */}
      <Titulo nota={`Sobre ${asis.total} ${asis.total === 1 ? 'copa' : 'copas'} jugadas.`}>
        Asistencia
      </Titulo>
      <div style={{ display: 'grid', gap: 5 }}>
        {asis.filas.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
            <Avatar id={r.id} name={name(r.id)} size={24} />
            <span style={{ width: 78, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name(r.id)}
            </span>
            <Barra pct={r.pct} color={r.pct >= 80 ? C.gold : '#9AA0A6'} />
            <span className="num" style={{ width: 34, textAlign: 'right', fontSize: 13, fontWeight: 800 }}>
              {r.pct}%
            </span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 9.5, color: C.dim }}>
              {r.tor}/{asis.total}
            </span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6, marginTop: 4 }}>
        Todo se cuenta de cuartos en adelante: en la clasificación no queda
        registro de quién jugó contra quién.
      </div>
    </div>
  );
}
