/* La pestaña Perfil: tu propia ficha, o la forma de entrar si no hay sesión. */
import React from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Eyebrow, Vacio } from '../ui/primitivas.jsx';
import { useSesion } from '../ui/sesion.jsx';
import { useSync } from '../ui/sincronizacion.jsx';
import Perfil from '../jugadores/Perfil.jsx';
import { Entrar, PieCuenta } from './Cuenta.jsx';
import Registro from '../pantallas/Registro.jsx';

export default function MiPerfil({ db, commit }) {
  const { miId, rol, user, cargando } = useSesion();
  const { estado: estadoSync, subirAhora } = useSync();

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

      {(estadoSync === 'rechazado' || estadoSync === 'pendiente') && (
        <div style={{ padding: '0 16px', marginTop: 4 }}>
          <div style={{
            background: C.card, border: `1px solid ${estadoSync === 'rechazado' ? C.red : C.line}`,
            borderRadius: 10, padding: '11px 13px', fontSize: 12, lineHeight: 1.5,
            color: C.chalk, display: 'grid', gap: 9,
          }}>
            {estadoSync === 'rechazado'
              ? 'Tu cambio quedó guardado en este teléfono, pero el servidor no lo aceptó. Mostrale esto a quien administra la liga.'
              : 'Tu cambio está guardado acá y se subirá en cuanto haya señal.'}
            <Btn small onClick={() => subirAhora()}>Intentar de nuevo</Btn>
          </div>
        </div>
      )}

      <PieCuenta />
    </div>
  );
}
