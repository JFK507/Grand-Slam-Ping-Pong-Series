/* Sesión real, atada a la cuenta de Google.
   El rol sale del correo; la ficha propia se encuentra buscando ese mismo
   correo entre los jugadores. */
import React, { useEffect, useMemo, useState } from 'react';
import { entrarConGoogle, escucharSesion, esCorreoAdmin, salir } from '../lib/firebase.js';
import { SesionCtx } from './sesion.jsx';

export default function ProveedorSesionFirebase({ db, children }) {
  const [user, setUser] = useState(undefined); // undefined = todavía cargando
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      return escucharSesion((u) => setUser(u || null));
    } catch (e) {
      setError(e);
      setUser(null);
      return undefined;
    }
  }, []);

  const valor = useMemo(() => {
    const base = { user: null, miId: null, rol: 'invitado', error, entrar: entrarConGoogle, salir };
    if (user === undefined) return { ...base, cargando: true };
    if (!user) return { ...base, cargando: false };

    const correo = (user.email || '').trim().toLowerCase();
    const admin = esCorreoAdmin(correo);
    const yo = (db?.players || []).find(
      (p) => (p.email || '').trim().toLowerCase() === correo,
    );

    return {
      rol: admin ? 'admin' : (yo ? 'jugador' : 'invitado'),
      miId: yo ? yo.id : null,
      user,
      cargando: false,
      error,
      entrar: entrarConGoogle,
      salir,
    };
  }, [user, db, error]);

  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
}
