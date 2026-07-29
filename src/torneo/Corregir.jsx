/* Todo lo que sirve para arreglar un error, junto y lejos de los botones
   que se usan mientras se juega. */
import React from 'react';
import { C, STAGES } from '../lib/constantes.js';
import { etapaAnterior, repetirFinal, repetirPartido } from '../lib/retroceder.js';
import { contarSets } from '../lib/reglas.js';
import { Btn, Card, Eyebrow } from '../ui/primitivas.jsx';
import { useConfirmar } from '../ui/dialogo.jsx';
import { Avatar } from '../ui/fotos.jsx';

export default function Corregir({ t, db, commit, name, update, onBack }) {
  const confirmar = useConfirmar();
  const atras = etapaAnterior(t);
  const etapaActual = STAGES.find(([k]) => k === t.stage)?.[1] || t.stage;

  const retroceder = async () => {
    if (!atras) return;
    const ok = await confirmar({
      titulo: `Volver a ${atras.label}`,
      texto: `Se borra ${atras.borra}.`,
      ok: 'Retroceder',
    });
    if (!ok) return;
    update(atras.patch, true);
    onBack();
  };

  const cancelar = async () => {
    const ok = await confirmar({
      titulo: `Cancelar ${t.name}`,
      texto: 'Se borra el torneo completo y no queda registro.\n\n'
        + 'Como no está finalizado, el ranking no cambia.',
      ok: 'Borrar torneo',
      peligro: true,
    });
    if (!ok) return;
    commit({
      ...db,
      tournaments: db.tournaments.filter((x) => x.id !== t.id),
      activeId: null,
    }, true);
  };

  /* Solo se ofrecen los partidos de la etapa en curso: repetir uno de una
     ronda anterior dejaría el cuadro inconsistente. Para eso está retroceder. */
  const fase = t.stage === 'cuartos' ? 'qf' : t.stage === 'semis' ? 'sf' : null;
  const jugados = fase ? (t[fase] || []).map((m, i) => ({ m, i })).filter((x) => x.m.locked) : [];
  const pref = fase === 'qf' ? 'C' : 'S';

  const repetir = async (i) => {
    const m = t[fase][i];
    const ok = await confirmar({
      titulo: `Repetir ${pref}${m.n}`,
      texto: `${name(m.a)} vs ${name(m.b)} vuelve a 0-0.`,
      ok: 'Repetir',
    });
    if (!ok) return;
    update(repetirPartido(t, fase, i), true);
    onBack();
  };

  const rehacerFinal = async () => {
    const ok = await confirmar({
      titulo: 'Repetir la final',
      texto: 'Se borran todos los sets y empieza de nuevo.',
      ok: 'Repetir',
    });
    if (!ok) return;
    update(repetirFinal(t), true);
    onBack();
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn small onClick={onBack}>←</Btn>
        <Eyebrow>Corregir · {etapaActual}</Eyebrow>
      </div>

      {jugados.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <Eyebrow color={C.red}>Repetir un partido</Eyebrow>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginTop: -2 }}>
            El marcador vuelve a cero y lo juegas otra vez.
          </div>
          {jugados.map(({ m, i }) => (
            <Card key={i} style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="num" style={{ fontSize: 11, color: C.dim, fontWeight: 800, width: 20 }}>
                {pref}{m.n}
              </span>
              <Avatar id={m.winner} name={name(m.winner)} size={24} ring={C.gold} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                {name(m.a)} <span className="num" style={{ color: C.gold, fontWeight: 800 }}>{m.sa}-{m.sb}</span> {name(m.b)}
              </div>
              <Btn small onClick={() => repetir(i)}>Repetir</Btn>
            </Card>
          ))}
        </div>
      )}

      {(t.stage === 'final' || t.stage === 'resumen') && t.final && (
        <div style={{ display: 'grid', gap: 6 }}>
          <Eyebrow color={C.red}>Repetir la final</Eyebrow>
          <Card style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
              {name(t.final.a)}
              <span className="num" style={{ color: C.gold, fontWeight: 800, margin: '0 5px' }}>
                {contarSets(t.final, 'a')}-{contarSets(t.final, 'b')}
              </span>
              {name(t.final.b)}
            </div>
            <Btn small onClick={rehacerFinal}>Repetir</Btn>
          </Card>
        </div>
      )}

      <div style={{ height: 1, background: C.line }} />

      <div style={{ display: 'grid', gap: 6 }}>
        <Eyebrow color={C.red}>Retroceder etapa</Eyebrow>
        {atras ? (
          <>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
              Vuelves a <b style={{ color: C.chalk }}>{atras.label}</b>. Se borra {atras.borra}.
            </div>
            <Btn onClick={retroceder} style={{ borderColor: C.gold, color: C.gold }}>
              Volver a {atras.label}
            </Btn>
          </>
        ) : (
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            Estás en la primera etapa; no hay nada atrás. Si quieres empezar de nuevo,
            cancela el torneo.
          </div>
        )}
      </div>

      <div style={{ height: 1, background: C.line }} />

      <div style={{ display: 'grid', gap: 6 }}>
        <Eyebrow color={C.red}>Cancelar el torneo</Eyebrow>
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
          Borra {t.name} completo. Como todavía no está finalizado, el ranking
          y las estadísticas quedan igual que antes.
        </div>
        <Btn onClick={cancelar} style={{ borderColor: C.red, color: C.red }}>
          Cancelar {t.name}
        </Btn>
      </div>
    </div>
  );
}
