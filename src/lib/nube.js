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
  collection, doc, getDoc, getDocs, runTransaction, setDoc,
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

export async function subirFoto(id, img) {
  await setDoc(doc(nube, 'fotos', id), { img, actualizado: Date.now() });
}

/* Marca de que alguien puso el código de acceso correcto.
   La regla del servidor compara el código; si no cuadra, rechaza la escritura
   y nunca llegamos a crear la ficha. */
export async function pasarCodigo(uid, codigo) {
  await setDoc(doc(nube, 'acceso', uid), { codigo, cuando: Date.now() });
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
