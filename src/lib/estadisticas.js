/* Todo lo que se calcula a partir del historial de torneos. */
import {
  calcTorneo, ordenRanking, contarSets, tieneDetalleSets, instanciaDe, partidosDeCopa,
} from './reglas.js';

/* ───────── la tabla, recorriendo la historia en orden ─────────

   Los duelos dependen de cómo estaba el ranking antes de cada copa, así que
   no alcanza con sumar copas por separado: hay que reproducir la secuencia.
   La tabla se recalcula al cerrar cada copa, y la primera copa de todas no
   lleva duelos porque no hay nada con qué comparar. */

/* Posiciones a partir de un acumulado. Los empatados comparten posición, así
   que entre ellos la distancia es 0 y el duelo cuenta como choque directo. */
export function puestosDesde(acum) {
  const filas = Object.values(acum);
  if (!filas.length) return null;
  const orden = filas.slice().sort(ordenRanking);
  const m = new Map();
  let puesto = 0;
  let anterior = null;
  orden.forEach((r, i) => {
    if (!anterior || r.pts !== anterior.pts || r.dif !== anterior.dif) puesto = i + 1;
    m.set(r.id, puesto);
    anterior = r;
  });
  /* Quien todavía no jugó nunca entra al final de la tabla. */
  m.ultimo = orden.length + 1;
  return m;
}

const cronologico = (a, b) => (
  String(a.date || '').localeCompare(String(b.date || '')) || (a.edicion || 0) - (b.edicion || 0)
);

export function tablaProgresiva(db, seasonId) {
  const copas = (db.tournaments || [])
    .filter((t) => t.stage === 'finalizado' && (!seasonId || t.seasonId === seasonId))
    .slice()
    .sort(cronologico);

  const acum = {};
  const porCopa = [];

  copas.forEach((t) => {
    const puestos = puestosDesde(acum);
    const r = calcTorneo(t, puestos);
    porCopa.push({ t, ...r, puestos });

    (t.entrants || []).forEach((id) => {
      acum[id] = acum[id] || {
        id, pts: 0, dif: 0, tor: 0, tit: 0, mejor: 0, finales: 0, clasif: 0,
      };
      const p = r.pts[id] || 0;
      acum[id].pts += p;
      acum[id].dif += r.dif[id] || 0;
      acum[id].tor += 1;
      acum[id].mejor = Math.max(acum[id].mejor, p);
      if ((r.inst[id] ?? 0) >= 3) acum[id].finales += 1;
      if ((r.inst[id] ?? 0) >= 1) acum[id].clasif += 1;
    });
    if (t.final?.winner && acum[t.final.winner]) acum[t.final.winner].tit += 1;
  });

  return { acum, porCopa };
}

/* Acumulado por jugador. Sin seasonId suma todos los tiempos. */
export function agregados(db, seasonId) {
  return tablaProgresiva(db, seasonId).acum;
}

/* La tabla tal como está ahora, para calcular los duelos de la copa en curso
   y para mostrar en pantalla lo que se juega cada partido. */
export function puestosActuales(db, seasonId) {
  return puestosDesde(tablaProgresiva(db, seasonId).acum);
}

/* La tabla tal como estaba ANTES de una copa concreta. Sirve para mostrar el
   acta de una copa vieja con los puntos que valió en su momento, no con los
   que valdría hoy. */
export function puestosAntesDe(db, tournamentId, seasonId) {
  const fila = tablaProgresiva(db, seasonId).porCopa.find((c) => c.t.id === tournamentId);
  return fila ? fila.puestos : puestosActuales(db, seasonId);
}

/* Partidos de un jugador, en orden cronológico. Solo de cuartos en adelante,
   porque en la clasificación no queda registro de quién enfrentó a quién. */
export function partidosDe(db, pid) {
  const out = [];
  db.tournaments.forEach((t) => {
    const push = (fase, m, sa, sb) => {
      const esA = m.a === pid, esB = m.b === pid;
      if (!esA && !esB) return;
      out.push({
        torneo: t.name, fase, rival: esA ? m.b : m.a,
        pf: esA ? sa : sb, pc: esA ? sb : sa, ganado: m.winner === pid,
      });
    };
    (t.qf || []).filter((m) => m.locked).forEach((m) => push('Cuartos', m, m.sa, m.sb));
    (t.sf || []).filter((m) => m.locked).forEach((m) => push('Semifinal', m, m.sa, m.sb));
    if (t.final?.locked) {
      push('Final', t.final, contarSets(t.final, 'a'), contarSets(t.final, 'b'));
    }
  });
  return out;
}

export function rivalTop(db, pid) {
  const riv = {};
  partidosDe(db, pid).forEach((m) => {
    riv[m.rival] = riv[m.rival] || { id: m.rival, n: 0, g: 0, p: 0 };
    riv[m.rival].n += 1;
    if (m.ganado) riv[m.rival].g += 1; else riv[m.rival].p += 1;
  });
  return Object.values(riv).sort((a, b) => b.n - a.n || b.g - a.g)[0] || null;
}

export function caraACara(db, a, b) {
  const ms = partidosDe(db, a).filter((m) => m.rival === b);
  return {
    n: ms.length,
    g: ms.filter((m) => m.ganado).length,
    p: ms.filter((m) => !m.ganado).length,
    ms,
  };
}

export function rachaDe(db, pid) {
  let cur = 0, max = 0;
  partidosDe(db, pid).forEach((m) => {
    if (m.ganado) { cur += 1; max = Math.max(max, cur); } else cur = 0;
  });
  return max;
}

export function listaRecords(db) {
  const arr = Object.values(agregados(db));
  if (!arr.length) return [];
  const mayor = (campo) => arr.slice().sort((x, y) => y[campo] - x[campo])[0];
  const R = [];
  const add = (titulo, r, valor, detalle) => { if (r && valor > 0) R.push({ titulo, id: r.id, valor, detalle }); };

  const tit = mayor('tit');
  add('Más títulos', tit, tit.tit, tit.tit === 1 ? '1 torneo ganado' : `${tit.tit} torneos ganados`);
  const fin = mayor('finales');
  add('Más finales jugadas', fin, fin.finales, `${fin.finales} de ${fin.tor} torneos`);
  const asi = mayor('tor');
  add('Más constante', asi, asi.tor, `${asi.tor} ediciones jugadas`);
  const cla = mayor('clasif');
  add('Más veces en cuartos', cla, cla.clasif, `${cla.clasif} clasificaciones`);

  let mejorDif = null;
  tablaProgresiva(db).porCopa.forEach(({ t, dif }) => {
    Object.entries(dif).forEach(([id, d]) => {
      if (!mejorDif || d > mejorDif.valor) mejorDif = { id, valor: d, torneo: t.name };
    });
  });
  if (mejorDif && mejorDif.valor > 0) {
    R.push({
      titulo: 'Mayor diferencia en un torneo', id: mejorDif.id, valor: mejorDif.valor,
      detalle: `+${mejorDif.valor} en ${mejorDif.torneo}`,
    });
  }

  let mejorRacha = null;
  arr.forEach((r) => {
    const v = rachaDe(db, r.id);
    if (!mejorRacha || v > mejorRacha.valor) mejorRacha = { id: r.id, valor: v };
  });
  if (mejorRacha && mejorRacha.valor > 1) {
    R.push({
      titulo: 'Racha más larga', id: mejorRacha.id, valor: mejorRacha.valor,
      detalle: `${mejorRacha.valor} partidos seguidos ganados`,
    });
  }

  const sinTitulo = arr.filter((r) => r.tit === 0).sort((x, y) => y.clasif - x.clasif)[0];
  if (sinTitulo && sinTitulo.clasif > 0) {
    R.push({
      titulo: 'El eterno aspirante', id: sinTitulo.id, valor: sinTitulo.clasif,
      detalle: `${sinTitulo.clasif} veces en cuartos, ningún título`,
    });
  }
  return R;
}

/* Texto listo para pegar en el grupo. */
export function textoResumen(db, t, name) {
  const dbT = t.stage === 'finalizado'
    ? db
    : {
      ...db,
      tournaments: db.tournaments.map((x) =>
        (x.id === t.id ? { ...x, stage: 'finalizado', result: calcTorneo(t) } : x)),
    };
  const camp = t.final?.winner;
  const fin = t.final && camp ? (camp === t.final.a ? t.final.b : t.final.a) : null;
  const semis = (t.sf || []).filter((m) => m.locked).map((m) => (m.winner === m.a ? m.b : m.a));
  const top = Object.values(agregados(dbT, db.season.id)).sort(ordenRanking).slice(0, 5);

  const L = [];
  L.push('🏓 GRAND SLAM PING PONG SERIES');
  L.push(`${t.name} · Edición ${t.edicion} · ${t.date}`);
  L.push('');
  if (camp) L.push(`🥇 Campeón: ${name(camp)}`);
  if (fin) L.push(`🥈 Finalista: ${name(fin)}`);
  if (semis.length) L.push(`🥉 Semifinales: ${semis.map(name).join(' y ')}`);
  L.push('');
  if (t.final?.locked) {
    L.push(tieneDetalleSets(t.final)
      ? `Final: ${t.final.sets.map((s) => `${s.a}-${s.b}`).join(' / ')}`
      : `Final: ${contarSets(t.final, 'a')}-${contarSets(t.final, 'b')} en sets`);
  }
  L.push(`Jugaron ${t.entrants.length} · clasificaron 8`);
  L.push('');
  L.push(`📊 ${db.season.nombre}`);
  top.forEach((r, i) => L.push(`${i + 1}. ${name(r.id)} — ${r.pts} pts`));
  return L.join('\n');
}

/* ─────────── estadísticas de liga ─────────── */

/* Todos los partidos jugados, de cualquier torneo finalizado. */
export function todosLosPartidos(db) {
  const out = [];
  db.tournaments.filter((t) => t.stage === 'finalizado').forEach((t) => {
    const add = (fase, m, sa, sb, detalle) => out.push({
      torneo: t.name, fecha: t.date, fase,
      a: m.a, b: m.b, sa, sb, winner: m.winner, detalle,
    });
    (t.qf || []).filter((m) => m.locked).forEach((m) => add('Cuartos', m, m.sa, m.sb, true));
    (t.sf || []).filter((m) => m.locked).forEach((m) => add('Semifinal', m, m.sa, m.sb, true));
    if (t.final?.locked) {
      add('Final', t.final, contarSets(t.final, 'a'), contarSets(t.final, 'b'),
        tieneDetalleSets(t.final));
    }
  });
  return out;
}

export function resumenLiga(db) {
  const fin = db.tournaments.filter((t) => t.stage === 'finalizado');
  const ms = todosLosPartidos(db);
  const conDetalle = ms.filter((m) => m.detalle);
  const puntos = conDetalle.reduce((s, m) => s + m.sa + m.sb, 0);
  return {
    copas: fin.length,
    jornadas: new Set(fin.map((t) => t.date)).size,
    jugadores: new Set(fin.flatMap((t) => t.entrants)).size,
    partidos: ms.length,
    puntos,
    promedio: conDetalle.length ? (puntos / conDetalle.length) : 0,
  };
}

/* Porcentaje de partidos ganados, de cuartos en adelante. */
export function efectividad(db, minimo = 5) {
  const acc = {};
  todosLosPartidos(db).forEach((m) => {
    [m.a, m.b].forEach((id) => {
      acc[id] = acc[id] || { id, j: 0, g: 0 };
      acc[id].j += 1;
      if (m.winner === id) acc[id].g += 1;
    });
  });
  return Object.values(acc)
    .filter((r) => r.j >= minimo)
    .map((r) => ({ ...r, pct: Math.round((r.g / r.j) * 100) }))
    .sort((x, y) => y.pct - x.pct || y.j - x.j);
}

/* Los emparejamientos que más se repiten en la liga. */
export function rivalidades(db, minimo = 3) {
  const pares = {};
  todosLosPartidos(db).forEach((m) => {
    const k = [m.a, m.b].sort().join('|');
    pares[k] = pares[k] || { a: k.split('|')[0], b: k.split('|')[1], n: 0, ga: 0, gb: 0 };
    pares[k].n += 1;
    if (m.winner === pares[k].a) pares[k].ga += 1; else pares[k].gb += 1;
  });
  return Object.values(pares)
    .filter((r) => r.n >= minimo)
    .sort((x, y) => y.n - x.n || Math.abs(x.ga - x.gb) - Math.abs(y.ga - y.gb));
}

/* El partido más apretado y el más abultado. */
export function partidosExtremos(db) {
  const ms = todosLosPartidos(db).filter((m) => m.detalle);
  if (!ms.length) return null;
  const dif = (m) => Math.abs(m.sa - m.sb);
  const total = (m) => m.sa + m.sb;
  const cerrado = ms.slice().sort((x, y) => dif(x) - dif(y) || total(y) - total(x))[0];
  const paliza = ms.slice().sort((x, y) => dif(y) - dif(x) || total(y) - total(x))[0];
  return { cerrado, paliza };
}

/* Campeón de cada copa, de la más reciente a la más vieja. */
export function palmares(db) {
  return db.tournaments
    .filter((t) => t.stage === 'finalizado' && t.final?.winner)
    .slice()
    .reverse()
    .map((t) => ({
      id: t.id, name: t.name, date: t.date, edicion: t.edicion,
      campeon: t.final.winner,
      finalista: t.final.winner === t.final.a ? t.final.b : t.final.a,
    }));
}

/* Quién es fijo y quién aparece de vez en cuando. */
export function asistencia(db) {
  const total = db.tournaments.filter((t) => t.stage === 'finalizado').length;
  const ag = agregados(db);
  return {
    total,
    filas: Object.values(ag)
      .map((r) => ({ id: r.id, tor: r.tor, pct: total ? Math.round((r.tor / total) * 100) : 0 }))
      .sort((x, y) => y.tor - x.tor),
  };
}

/* Hasta dónde llega cada uno. Muestra quién se queda en la puerta:
   muchos cuartos y ninguna final cuenta una historia. */
export function embudo(db, seasonId) {
  const ag = agregados(db, seasonId);
  return Object.values(ag)
    .map((r) => ({
      id: r.id,
      cuartos: r.clasif,
      semis: 0,
      finales: r.finales,
      titulos: r.tit,
      tor: r.tor,
    }))
    .map((r) => {
      /* Semifinales alcanzadas: se cuenta sobre los partidos, porque el puntaje
         acumulado no distingue entre llegar y ganar. */
      const semis = db.tournaments
        .filter((t) => t.stage === 'finalizado')
        .filter((t) => (t.sf || []).some((m) => m.a === r.id || m.b === r.id))
        .length;
      return { ...r, semis };
    })
    .sort((x, y) => y.titulos - x.titulos || y.finales - x.finales || y.cuartos - x.cuartos);
}

/* Efectividad separada por ronda. Acá se ve quién se achica en la final. */
export function efectividadPorRonda(db, minimo = 2) {
  const acc = {};
  todosLosPartidos(db).forEach((m) => {
    [m.a, m.b].forEach((id) => {
      acc[id] = acc[id] || { id, Cuartos: { j: 0, g: 0 }, Semifinal: { j: 0, g: 0 }, Final: { j: 0, g: 0 } };
      acc[id][m.fase].j += 1;
      if (m.winner === id) acc[id][m.fase].g += 1;
    });
  });
  const pct = (x) => (x.j ? Math.round((x.g / x.j) * 100) : null);
  return Object.values(acc)
    .filter((r) => r.Cuartos.j + r.Semifinal.j + r.Final.j >= minimo)
    .map((r) => ({
      id: r.id,
      cuartos: pct(r.Cuartos),
      semis: pct(r.Semifinal),
      finales: pct(r.Final),
      jugados: r.Cuartos.j + r.Semifinal.j + r.Final.j,
    }))
    .sort((x, y) => (y.finales ?? -1) - (x.finales ?? -1) || y.jugados - x.jugados);
}

/* Racha en curso: lo que lleva ganado o perdido al día de hoy. */
export function rachaActual(db, pid) {
  const ms = partidosDe(db, pid);
  if (!ms.length) return null;
  const ganando = ms[ms.length - 1].ganado;
  let n = 0;
  for (let i = ms.length - 1; i >= 0; i -= 1) {
    if (ms[i].ganado !== ganando) break;
    n += 1;
  }
  return { ganando, n };
}

/* Contra quién le va peor y contra quién mejor, con al menos dos duelos. */
export function nemesis(db, pid, minimo = 2) {
  const riv = {};
  partidosDe(db, pid).forEach((m) => {
    riv[m.rival] = riv[m.rival] || { id: m.rival, n: 0, g: 0, p: 0 };
    riv[m.rival].n += 1;
    if (m.ganado) riv[m.rival].g += 1; else riv[m.rival].p += 1;
  });
  const lista = Object.values(riv).filter((r) => r.n >= minimo);
  if (!lista.length) return null;
  const peor = lista.slice().sort((x, y) => (x.g - x.p) - (y.g - y.p) || y.n - x.n)[0];
  const mejor = lista.slice().sort((x, y) => (y.g - y.p) - (x.g - x.p) || y.n - x.n)[0];
  return {
    bestiaNegra: peor.p > peor.g ? peor : null,
    victima: mejor.g > mejor.p ? mejor : null,
  };
}
