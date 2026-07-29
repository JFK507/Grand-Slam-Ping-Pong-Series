/* La pestaña Perfil: tu propia ficha, o la forma de entrar si no hay sesión. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { Eyebrow, Vacio } from '../ui/primitivas.jsx';
import { useSesion } from '../ui/sesion.jsx';
import Perfil from '../jugadores/Perfil.jsx';
import { Entrar, PieCuenta } from './Cuenta.jsx';
import Registro from '../pantallas/Registro.jsx';

export default function MiPerfil({ db, commit }) {
  const { miId, rol, user, cargando } = useSesion();

  if (cargando) return <Vacio>Cargando tu cuenta…</Vacio>;

  /* Nadie ha entrado: se ofrece la entrada con Google. */
  if (!user) return <Entrar />;

  /* Un invitado no tiene ficha propia aunque el contexto traiga un id:
     el rol manda, para que una sesión inconsistente no filtre permisos. */
  const yo = rol !== 'invitado' && miId ? db.players.find((p) => p.id === miId) : null;

  /* Sin ficha todavía: se le ofrece crearla acá mismo. */
  if (!yo) return <Registro />;

  return (
    <div>
      <div style={{ padding: '14px 16px 0' }}>
        <Eyebrow color={C.gold}>Mi perfil</Eyebrow>
      </div>
      <Perfil p={yo} db={db} commit={commit} />
      <PieCuenta />
    </div>
  );
}
