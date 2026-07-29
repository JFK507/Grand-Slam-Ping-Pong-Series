/* Conexión con Firebase.
   El proyecto es liga-ping-pong-1b1a5.

   Sobre la apiKey: no es un secreto. Va incrustada en la app y cualquiera
   que la instale puede verla; así funcionan todas las apps web con Firebase.
   Lo que protege los datos son las reglas del servidor. */
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyDEptnSYkuAdX0i8H34wzABGApNKGZHFsk',
  authDomain: 'liga-ping-pong-1b1a5.firebaseapp.com',
  projectId: 'liga-ping-pong-1b1a5',
  storageBucket: 'liga-ping-pong-1b1a5.firebasestorage.app',
  messagingSenderId: '1063950624210',
  appId: '1:1063950624210:web:23e957341f71c2fd8d540b',
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const nube = getFirestore(app);

/* Esta lista es solo para mostrar u ocultar botones. Quien de verdad
   decide si podés escribir son las reglas del servidor, que tienen su
   propia copia. Cambiar esto acá no te da permisos. */
export const ADMINS = [
  'eariza2034@gmail.com',
  'marcejimez07@gmail.com',
];

export const esCorreoAdmin = (correo) =>
  !!correo && ADMINS.includes(correo.trim().toLowerCase());

const google = new GoogleAuthProvider();
/* Que siempre pregunte cuál cuenta usar: varios tienen más de un Gmail. */
google.setCustomParameters({ prompt: 'select_account' });

export const entrarConGoogle = () => signInWithPopup(auth, google);
export const salir = () => signOut(auth);
export const escucharSesion = (cb) => onAuthStateChanged(auth, cb);
