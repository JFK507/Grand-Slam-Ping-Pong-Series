/* Todo lo que se calcula a partir del historial de torneos. */
import { calcTorneo, ordenRanking, contarSets, tieneDetalleSets } from './reglas.js';

/* Acumulado por jugador. Sin seasonId suma todos los tiempos. */
export function agregados(db, seasonId) {
  const acc = {};
  db.tournaments
    .filter((t) => t.stage === 'finalizado' && (!seasonId || t.seasonId === seasonId))
    .forEach((t) => {
      const r = t.result || calcTorneo(t);
      t.entrants.forEach((id) => {
        acc[id] = acc[id] || { id, pts: 0, dif: 0, tor: 0, tit: 0, mejor: 0, finales: 0, clasif: 0 };
        const p = r.pts[id] || 0;
        acc[id].pts += p;
        acc[id].dif += r.dif[id] || 0;
        acc[id].tor += 1;
        acc[id].mejor = Math.max(acc[id].mejor, p);
        if (p >= 15) acc[id].finales += 1;
        if (p >= 3) acc[id].clasif += 1;
      });
      if (t.final?.winner && acc[t.final.winner]) acc[t.final.winner].tit += 1;
    });
  return acc;
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
  db.tournaments.filter((t) => t.stage === 'finalizado').forEach((t) => {
    const r = t.result || calcTorneo(t);
    Object.entries(r.dif).forEach(([id, d]) => {
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
