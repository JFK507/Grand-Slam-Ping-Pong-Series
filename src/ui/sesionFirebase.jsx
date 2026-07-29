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
    const lista = db?.players || [];

    /* El uid es el vínculo firme: lo escribe la propia cuenta al registrarse
       o al reclamar una ficha. El correo es el respaldo, para la ficha que el
       admin dejó preparada y todavía nadie reclamó. */
    const yo = lista.find((p) => p.uid && p.uid === user.uid)
      || lista.find((p) => (p.email || '').trim().toLowerCase() === correo);

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
