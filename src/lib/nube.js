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

/* ───────── fusión ───────── */

/* Junta lo local con lo que vino de la nube.
   Torneos y temporadas: manda la nube, porque es la copia compartida.
   Jugadores: documento por documento, gana el de fecha más reciente, así
   la ficha que alguien editó en su teléfono no se pierde. */
export function fusionar(local, remoto, playersRemotos) {
  const players = [...(local.players || [])];
  const porId = new Map(players.map((p, i) => [p.id, i]));

  (playersRemotos || []).forEach((r) => {
    const i = porId.get(r.id);
    if (i === undefined) {
      players.push(r);
    } else if ((r.actualizado || 0) >= (players[i].actualizado || 0)) {
      players[i] = { ...players[i], ...r };
    }
  });

  if (!remoto) return { ...local, players };

  return {
    ...local,
    players,
    tournaments: remoto.tournaments || [],
    activeId: remoto.activeId || null,
    season: remoto.season || local.season,
    seasons: remoto.seasons || [],
    sync: {
      ...(local.sync || {}),
      version: remoto.version || 0,
      bajadoEn: Date.now(),
      pendiente: false,
    },
  };
}
