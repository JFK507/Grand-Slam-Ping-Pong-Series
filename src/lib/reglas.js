/* Reglas de juego y sistema de puntuación.

   La puntuación tiene dos partes que se suman:

   1. El escalón alcanzado en la copa, solo el más alto.
      No clasificó: 1 más los puntos que hizo en la clasificación.
      Clasificó a cuartos 10 · semifinalista 15 · finalista 20 · campeón 25.

   2. Los duelos, en cada partido de cuartos en adelante, según la distancia
      en la tabla del ranking.

   La tabla se recalcula al terminar cada copa, así que la segunda copa de la
   noche ya usa lo que dejó la primera. En la primerísima copa de la liga no
   hay tabla, así que no se aplican duelos: solo cuenta el escalón.

   Consecuencia importante: como los duelos dependen de cómo estaba la tabla
   ANTES de esa copa, los puntos no se pueden calcular copa por copa por
   separado. Hay que recorrer la historia en orden, y de eso se encarga
   tablaProgresiva() en estadisticas.js. */
import { DUELOS, ESCALON } from './constantes.js';

/* Final: sets 1 y 2 a 10 con ventaja de 2; el tercero a 7 seco. */
export const setTarget = (i) => (i === 2 ? 7 : 10);
export const setAdv = (i) => i !== 2;

export const isWin = (x, y, target, adv) =>
  (adv ? x >= target && x - y >= 2 : x >= target);

/* Desempate del ranking: la diferencia de puntos anotados y recibidos. */
export const ordenRanking = (a, b) => b.pts - a.pts || b.dif - a.dif;

export const setsGanados = (sets, lado) =>
  (sets || []).filter((s, i) => (lado === 'a'
    ? isWin(s.a, s.b, setTarget(i), setAdv(i))
    : isWin(s.b, s.a, setTarget(i), setAdv(i)))).length;

/* Las copas viejas se anotaron solo como conteo de sets (2-1) sin el marcador
   de cada uno: en ese caso no aportan a la diferencia, para no inventar. */
export const contarSets = (final, lado) => (
  final?.setsCount ? (final.setsCount[lado] || 0) : setsGanados(final?.sets, lado)
);

export const tieneDetalleSets = (final) => !final?.setsCount && (final?.sets?.length > 0);

/* ───────── instancia alcanzada ─────────
   0 = jugó y no clasificó · 1 = cuartos · 2 = semis · 3 = final · 4 = campeón */
export function instanciaDe(t) {
  const r = {};
  (t.entrants || []).forEach((id) => { r[id] = 0; });
  (t.qf || []).forEach((m) => { r[m.a] = 1; r[m.b] = 1; });
  (t.sf || []).forEach((m) => { r[m.a] = 2; r[m.b] = 2; });
  if (t.final) { r[t.final.a] = 3; r[t.final.b] = 3; }
  if (t.final?.winner) r[t.final.winner] = 4;
  return r;
}

export const ETIQUETA_INSTANCIA = ['Clasificatoria', 'Cuartos', 'Semifinal', 'Finalista', 'Campeón'];

export function puntosEscalon(t, id, inst) {
  const n = inst[id] ?? 0;
  if (n === 0) return ESCALON.participar + (t.clas?.[id] || 0);
  return [0, ESCALON.cuartos, ESCALON.semis, ESCALON.final, ESCALON.campeon][n];
}

/* ───────── duelos ─────────
   Recibe las posiciones de los dos. Si no hay tabla todavía devuelve null
   y el partido no mueve puntos extra. */
export function duelo(puestoGanador, puestoPerdedor) {
  if (puestoGanador == null || puestoPerdedor == null) return null;
  const d = puestoGanador - puestoPerdedor; // > 0 => ganó el que estaba más abajo
  const a = Math.abs(d);
  if (a <= 1) return DUELOS.choque;
  if (d < 0) return DUELOS.logica;
  if (d <= 5) return DUELOS.leve;
  if (d <= 8) return DUELOS.media;
  return DUELOS.grande;
}

/* Partidos de cuartos en adelante ya cerrados. */
export function partidosDeCopa(t) {
  return [
    ...(t.qf || []).filter((m) => m.locked).map((m) => ({ ...m, fase: 'Cuartos', et: `C${m.n}` })),
    ...(t.sf || []).filter((m) => m.locked).map((m) => ({ ...m, fase: 'Semifinal', et: `S${m.n}` })),
    ...(t.final?.locked ? [{ ...t.final, fase: 'Final', et: 'F' }] : []),
  ];
}

/* Puntos y diferencia de una copa.
   puestos: Map(id -> posición) de ANTES de esta copa, o null si es la primera.
   Puede traer la propiedad `ultimo` para quien todavía no está en la tabla. */
export function calcTorneo(t, puestos = null) {
  const pts = {};
  const dif = {};
  const extras = {};
  const inst = instanciaDe(t);

  (t.entrants || []).forEach((id) => {
    pts[id] = puntosEscalon(t, id, inst);
    dif[id] = 0;
    extras[id] = 0;
  });

  const puestoDe = (id) => {
    if (!puestos) return null;
    const p = puestos.get(id);
    return p == null ? (puestos.ultimo ?? null) : p;
  };
  const acc = (id, favor, contra) => { dif[id] = (dif[id] || 0) + favor - contra; };

  partidosDeCopa(t).forEach((m) => {
    const esFinal = m.fase === 'Final';

    if (esFinal) {
      if (tieneDetalleSets(m)) {
        const fa = m.sets.reduce((s, x) => s + x.a, 0);
        const fb = m.sets.reduce((s, x) => s + x.b, 0);
        acc(m.a, fa, fb); acc(m.b, fb, fa);
      }
    } else {
      acc(m.a, m.sa, m.sb); acc(m.b, m.sb, m.sa);
    }

    if (!m.winner) return;
    const perdedor = m.winner === m.a ? m.b : m.a;
    const e = duelo(puestoDe(m.winner), puestoDe(perdedor));
    if (!e) return;
    extras[m.winner] += e.gana;
    extras[perdedor] += e.pierde;
    pts[m.winner] += e.gana;
    pts[perdedor] += e.pierde;
  });

  return { pts, dif, extras, inst };
}
