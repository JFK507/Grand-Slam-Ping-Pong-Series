/* Forma de los datos, migraciones y capa de guardado.
   Usa window.storage cuando existe (dentro de Claude) y
   localStorage cuando corre como app instalada. */
import { uid, hoy } from './util.js';
import { NOMBRES } from './constantes.js';

export const K_STATE = 'gsp:v2:state';
export const K_FOTOS = 'gsp:v2:fotos';

const fallback = {
  async get(k) {
    const v = localStorage.getItem(k);
    if (v === null) throw new Error('no existe');
    return { key: k, value: v };
  },
  async set(k, v) { localStorage.setItem(k, v); return { key: k, value: v }; },
};

const almacen = () =>
  (typeof window !== 'undefined' && window.storage ? window.storage : fallback);

export const emptyDB = () => ({
  version: 3,
  players: [],
  tournaments: [],
  activeId: null,
  season: { id: uid(), nombre: `Temporada ${new Date().getFullYear()}`, inicio: hoy() },
  seasons: [],
});

/* Rellena lo que falte en respaldos viejos. */
export function migrar(d) {
  if (!d || !d.players) return emptyDB();
  if (!d.season) {
    d.season = { id: uid(), nombre: `Temporada ${new Date().getFullYear()}`, inicio: hoy() };
  }
  d.seasons = d.seasons || [];
  d.tournaments = (d.tournaments || []).map((t) => ({ ...t, seasonId: t.seasonId || d.season.id }));
  return d;
}

export const nombreLibre = (usados) => {
  const libres = NOMBRES.filter((n) => !usados.includes(n));
  const pool = libres.length ? libres : NOMBRES;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const nombreTemporada = (db) => {
  const y = new Date().getFullYear();
  const usados = [...(db.seasons || []).map((s) => s.nombre), db.season?.nombre].filter(Boolean);
  const romanos = ['II', 'III', 'IV', 'V', 'VI'];
  let n = `Temporada ${y}`;
  let i = 0;
  while (usados.includes(n) && i < romanos.length) { n = `Temporada ${y} · ${romanos[i]}`; i += 1; }
  return n;
};

export async function leerTodo() {
  let db = emptyDB(), fotos = {};
  try { const r = await almacen().get(K_STATE); if (r) db = migrar(JSON.parse(r.value)); } catch { }
  try { const r = await almacen().get(K_FOTOS); if (r) fotos = JSON.parse(r.value); } catch { }
  return { db, fotos };
}

export const guardarEstado = (db) => almacen().set(K_STATE, JSON.stringify(db));
export const guardarFotos = (fotos) => almacen().set(K_FOTOS, JSON.stringify(fotos));
