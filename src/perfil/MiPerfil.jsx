/* La pestaña Perfil: tu propia ficha. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { Eyebrow, Vacio } from '../ui/primitivas.jsx';
import { useSesion } from '../ui/sesion.jsx';
import Perfil from '../jugadores/Perfil.jsx';

export default function MiPerfil({ db, commit }) {
  const { miId, rol } = useSesion();
  /* Un invitado no tiene ficha propia aunque el contexto traiga un id:
     el rol manda, para que una sesión inconsistente no filtre permisos. */
  const yo = rol !== 'invitado' && miId ? db.players.find((p) => p.id === miId) : null;

  if (!yo) {
    return (
      <Vacio>
        {rol === 'invitado'
          ? 'Entra con tu Gmail para ver tu perfil.'
          : 'Tu cuenta todavía no está vinculada a un jugador.'}
        <div style={{ marginTop: 10, fontSize: 11.5, color: C.dim }}>
          Pídele a quien administra la liga que vincule tu correo a tu ficha.
        </div>
      </Vacio>
    );
  }

  return (
    <div>
      <div style={{ padding: '14px 16px 0' }}>
        <Eyebrow color={C.gold}>Mi perfil</Eyebrow>
      </div>
      <Perfil p={yo} db={db} commit={commit} />
    </div>
  );
}
