/* Reglas de juego y conteo de puntos. */
import { PTS } from './constantes.js';

/* Final: sets 1 y 2 a 10 con ventaja de 2; el tercero a 7 seco. */
export const setTarget = (i) => (i === 2 ? 7 : 10);
export const setAdv = (i) => i !== 2;

export const isWin = (x, y, target, adv) =>
  (adv ? x >= target && x - y >= 2 : x >= target);

export const ordenRanking = (a, b) => b.pts - a.pts || b.dif - a.dif;

/* Puntos y diferencia de un torneo. La diferencia solo cuenta de cuartos en adelante. */
export function calcTorneo(t) {
  const pts = {}, dif = {};
  t.entrants.forEach((id) => { pts[id] = 0; dif[id] = 0; });
  t.qualified.forEach((id) => { pts[id] = PTS.clasificar; });
  const acc = (id, f, c) => { dif[id] = (dif[id] || 0) + f - c; };

  (t.qf || []).forEach((m) => {
    acc(m.a, m.sa, m.sb); acc(m.b, m.sb, m.sa);
    if (m.winner) pts[m.winner] += PTS.ganarCuartos;
  });
  (t.sf || []).forEach((m) => {
    acc(m.a, m.sa, m.sb); acc(m.b, m.sb, m.sa);
    if (m.winner) pts[m.winner] += PTS.ganarSemis;
  });
  if (t.final) {
    const sets = t.final.setsCount ? [] : (t.final.sets || []);
    const fa = sets.reduce((s, x) => s + x.a, 0);
    const fb = sets.reduce((s, x) => s + x.b, 0);
    acc(t.final.a, fa, fb); acc(t.final.b, fb, fa);
    if (t.final.winner) pts[t.final.winner] += PTS.ganarFinal;
  }
  return { pts, dif };
}

export const etiquetaPts = (p) =>
  (p >= 25 ? 'Campeón' : p >= 15 ? 'Finalista' : p >= 8 ? 'Semifinal' : p >= 3 ? 'Cuartos' : 'Clasificatoria');

/* Sets ganados por un lado, contados desde los marcadores. */
export const setsGanados = (sets, lado) =>
  (sets || []).filter((s, i) => (lado === 'a'
    ? isWin(s.a, s.b, setTarget(i), setAdv(i))
    : isWin(s.b, s.a, setTarget(i), setAdv(i)))).length;

/* Sets de una final. Las ediciones viejas se anotaron solo como conteo
   (2-1) sin el marcador de cada set: en ese caso se usa setsCount y la
   final no aporta a la diferencia de puntos, para no inventar números. */
export const contarSets = (final, lado) => (
  final?.setsCount ? (final.setsCount[lado] || 0) : setsGanados(final?.sets, lado)
);

export const tieneDetalleSets = (final) => !final?.setsCount && (final?.sets?.length > 0);
