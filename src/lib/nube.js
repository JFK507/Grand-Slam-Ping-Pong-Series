/* Lectura y escritura contra Firestore. Sin nada de interfaz.

   Cómo están repartidos los datos en la nube:

     liga/estado       torneos, temporadas y el torneo en curso.
                       Lo escriben solo los admins, con control de versión.
     jugadores/{id}    un documento por jugador. Cada uno escribe el suyo.
     fotos/{id}        aparte, para que contar puntos no reescriba imágenes
                       y para no chocar con el límite de tamaño por documento.

   Los torneos NO incluyen a los jugadores: van por separado justamente para
   que un jugador pueda editar su ficha sin poder tocar el resto de la liga. */
import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query,
  runTransaction, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { nube } from './firebase.js';

const refEstado = () => doc(nube, 'liga', 'estado');

/* Se lanza cuando la nube cambió desde la última vez que bajamos.
   Pasa si el otro admin subió algo en el medio. */
export class Conflicto extends Error {
  constructor(versionNube) {
    super('La nube tiene una versión más nueva');
    this.name = 'Conflicto';
    this.versionNube = versionNube;
  }
}

/* ───────── bajar ───────── */

export async function bajarTodo() {
  const [snapEstado, snapJug] = await Promise.all([
    getDoc(refEstado()),
    getDocs(collection(nube, 'jugadores')),
  ]);
  return {
    estado: snapEstado.exists() ? snapEstado.data() : null,
    players: snapJug.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function bajarFotos(ids) {
  const out = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const s = await getDoc(doc(nube, 'fotos', id));
      if (s.exists() && s.data().img) out[id] = s.data().img;
    } catch { /* una foto que falla no debe tumbar la sincronización */ }
  }));
  return out;
}

/* ───────── subir ───────── */

/* Sube torneos y temporadas. Si el otro admin subió algo desde la última vez
   que bajamos, no sobrescribe: lanza Conflicto para que decida una persona. */
export async function subirEstado(db, correo) {
  const esperada = db.sync?.version || 0;
  let nuevaVersion = esperada;

  await runTransaction(nube, async (tx) => {
    const snap = await tx.get(refEstado());
    const enNube = snap.exists() ? (snap.data().version || 0) : 0;
    if (enNube !== esperada) throw new Conflicto(enNube);

    nuevaVersion = enNube + 1;
    tx.set(refEstado(), {
      version: nuevaVersion,
      actualizadoEn: Date.now(),
      actualizadoPor: correo || null,
      tournaments: db.tournaments || [],
      activeId: db.activeId || null,
      season: db.season || null,
      seasons: db.seasons || [],
    });
  });

  return nuevaVersion;
}

/* Guarda un jugador. Se usa tanto para el registro propio como para
   cuando el admin edita una ficha. */
export async function subirJugador(p) {
  const datos = {
    name: p.name || '',
    apodo: p.apodo || '',
    mano: p.mano || '',
    email: p.email || null,
    uid: p.uid || null,
    actualizado: p.actualizado || Date.now(),
  };
  await setDoc(doc(nube, 'jugadores', p.id), datos, { merge: true });
  return datos;
}

/* Borra un jugador de la nube, con su foto.
   Si solo se quita del teléfono, la escucha en vivo lo vuelve a traer
   en el siguiente aviso: el documento sigue existiendo del otro lado. */
export async function borrarJugador(id) {
  await deleteDoc(doc(nube, 'jugadores', id));
  try { await deleteDoc(doc(nube, 'fotos', id)); } catch { /* puede no tener foto */ }
}

export async function subirFoto(id, img) {
  await setDoc(doc(nube, 'fotos', id), { img, actualizado: Date.now() });
}

export async function borrarFoto(id) {
  await deleteDoc(doc(nube, 'fotos', id));
}

/* Escucha las fotos en vivo, pero entregando solo lo que cambió.
   Sin docChanges cada aviso traería las fotos de todos otra vez, que son
   lo más pesado que guarda la app. */
export function escucharFotos(cb, alFallar) {
  return onSnapshot(
    collection(nube, 'fotos'),
    (snap) => {
      const puestas = {};
      const quitadas = [];
      snap.docChanges().forEach((c) => {
        if (c.type === 'removed') { quitadas.push(c.doc.id); return; }
        const img = c.doc.data()?.img;
        if (img) puestas[c.doc.id] = img;
      });
      if (Object.keys(puestas).length || quitadas.length) cb({ puestas, quitadas });
    },
    (e) => alFallar?.(e),
  );
}

/* Busca una ficha que el admin haya creado de antemano con este correo.
   La lectura es pública, así que no hace falta permiso especial. */
export async function buscarFichaPorCorreo(correo) {
  const q = query(collection(nube, 'jugadores'), where('email', '==', correo));
  const s = await getDocs(q);
  if (s.empty) return null;
  const d = s.docs[0];
  return { id: d.id, ...d.data() };
}

/* Reclamar una ficha preexistente. Escribe SOLO el uid: la regla del servidor
   no permite tocar ningún otro campo en esta operación, y exige que el correo
   de la ficha coincida con el de la cuenta. */
export async function reclamarFicha(id, uid) {
  await updateDoc(doc(nube, 'jugadores', id), { uid });
}

/* Marca de que alguien puso el código de acceso correcto.
   La regla del servidor compara el código; si no cuadra, rechaza la escritura
   y nunca llegamos a crear la ficha. */
export async function pasarCodigo(uid, codigo) {
  await setDoc(doc(nube, 'acceso', uid), { codigo, cuando: Date.now() });
}

/* ───────── escuchas en vivo ─────────
   En vez de bajar una sola vez al abrir, la app se queda escuchando: cuando
   alguien sube algo, a todos los demás les llega en el momento. Sin señal
   Firestore entrega lo último que tenía guardado y reconecta solo. */

export function escucharEstado(cb, alFallar) {
  return onSnapshot(
    refEstado(),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (e) => alFallar?.(e),
  );
}

export function escucharJugadores(cb, alFallar) {
  return onSnapshot(
    collection(nube, 'jugadores'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => alFallar?.(e),
  );
}

/* ¿Hay conflicto de verdad?

   Solo puede haberlo entre dos administradores, porque son los únicos que
   escriben el documento compartido de torneos y temporadas. Un jugador con un
   cambio de apodo pendiente NO está en conflicto con nada: su ficha es un
   documento aparte y no se pisa con los torneos.

   Antes esto no se distinguía, y a cualquier jugador con algo pendiente le
   aparecía conflicto en cuanto el admin subía una jornada. Peor: al quedar en
   conflicto la app deja de subir, así que el jugador quedaba trabado. */
export function hayConflicto({ esAdmin, local, remoto }) {
  if (!esAdmin) return false;
  if (!local?.sync?.pendiente) return false;
  if (!remoto) return false;

  const mia = local.sync.version || 0;
  if ((remoto.version || 0) <= mia) return false;

  /* Un aparato recién estrenado arranca en versión cero y la nube ya va
     adelantada. Eso no es un choque: es ponerse al día. Solo cuenta como
     conflicto si además ya tiene torneos registrados acá, porque entonces sí
     hay dos versiones distintas de la liga en juego. */
  if (mia === 0 && (local.tournaments || []).length === 0) return false;

  return true;
}


/* ───────── fusión ───────── */

/* Junta lo local con lo que vino de la nube.
   Torneos y temporadas: manda la nube, porque es la copia compartida.
   Jugadores: documento por documento, gana el de fecha más reciente, así
   la ficha que alguien editó en su teléfono no se pierde. */
/* Colapsa fichas repetidas. Puede haber dos por el mismo id, o dos distintas
   que apunten a la misma persona (mismo uid o mismo correo). Gana la de fecha
   más reciente. Las fichas sin uid ni correo se dejan como están: son las que
   creó el admin a mano y no hay forma de saber si son la misma persona. */
function deduplicar(lista) {
  const porId = new Map();
  lista.forEach((p) => {
    const previo = porId.get(p.id);
    if (!previo || (p.actualizado || 0) >= (previo.actualizado || 0)) porId.set(p.id, p);
  });

  const clave = (p) => (
    p.uid ? `u:${p.uid}`
      : (p.email ? `e:${String(p.email).trim().toLowerCase()}` : null)
  );

  const salida = [];
  const vistos = new Map();
  [...porId.values()].forEach((p) => {
    const k = clave(p);
    if (!k) { salida.push(p); return; }
    const previo = vistos.get(k);
    if (!previo) { vistos.set(k, p); salida.push(p); return; }
    if ((p.actualizado || 0) > (previo.actualizado || 0)) {
      salida[salida.indexOf(previo)] = p;
      vistos.set(k, p);
    }
  });
  return salida;
}

export function fusionar(local, remoto, playersRemotos, opciones = {}) {
  const players = [...(local.players || [])];
  const porId = new Map(players.map((p, i) => [p.id, i]));

  (playersRemotos || []).forEach((r) => {
    const i = porId.get(r.id);
    if (i === undefined) {
      players.push(r);
      porId.set(r.id, players.length - 1);
    } else if ((r.actualizado || 0) >= (players[i].actualizado || 0)) {
      players[i] = { ...players[i], ...r };
    }
  });

  /* La nube manda también en las bajas: un jugador borrado allá tiene que
     desaparecer acá. Antes esta función solo agregaba y actualizaba, así que
     un borrado no llegaba nunca a los demás aparatos.

     Se protegen dos cosas para no borrar de más: la ficha propia, y todo lo
     que se creó local y todavía no subió (mientras haya algo pendiente). */
  const protegidos = new Set([opciones.protegerId].filter(Boolean));
  const hayPendientes = !!local.sync?.pendiente;
  const subidoEn = local.sync?.subidoEn || 0;
  const idsNube = new Set((playersRemotos || []).map((p) => p.id));
  const sobrevive = (p) => (
    idsNube.has(p.id)
    || protegidos.has(p.id)
    || (hayPendientes && (p.actualizado || 0) > subidoEn)
  );

  const limpios = deduplicar(
    playersRemotos === undefined ? players : players.filter(sobrevive),
  );

  if (!remoto) return { ...local, players: limpios };

  return {
    ...local,
    players: limpios,
    tournaments: remoto.tournaments || [],
    activeId: remoto.activeId || null,
    season: remoto.season || local.season,
    seasons: remoto.seasons || [],
    sync: {
      ...(local.sync || {}),
      version: remoto.version || 0,
      bajadoEn: Date.now(),
      /* NO se toca la marca de pendiente. Bajar no resuelve lo que falta subir.
         Antes se ponía en false acá, y eso cancelaba la subida en curso: los
         cambios de ficha se quedaban en el teléfono de quien los hizo. */
      pendiente: local.sync?.pendiente || false,
    },
  };
}
