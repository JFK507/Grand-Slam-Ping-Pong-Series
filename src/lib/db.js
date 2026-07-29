/* Forma de los datos, migraciones y capa de guardado.
   Usa window.storage cuando existe (dentro de Claude) y
   localStorage cuando corre como app instalada. */
import { uid, hoy } from './util.js';
import { NOMBRES } from './constantes.js';

export const K_STATE = 'gsp:v2:state';
export const K_FOTOS = 'gsp:v2:fotos';
export const K_INVITADO = 'gsp:v2:invitado';

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
  version: 4,
  sync: { version: 0, subidoEn: 0, pendiente: false },
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
  d.sync = d.sync || { version: 0, subidoEn: 0, pendiente: false };
  return d;
}

/* Sella un jugador con la hora del cambio. La fusión usa esta marca para
   decidir qué copia vale cuando la misma ficha se tocó en dos lados. */
export const sellar = (p) => ({ ...p, actualizado: Date.now() });

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

/* Recuerda que alguien eligió entrar sin cuenta, para no volver a
   preguntarle en cada apertura. */
export async function leerModoInvitado() {
  try {
    const r = await almacen().get(K_INVITADO);
    return r?.value === '1';
  } catch { return false; }
}

export const guardarModoInvitado = (v) => almacen().set(K_INVITADO, v ? '1' : '0');
