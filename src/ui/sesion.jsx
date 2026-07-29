/* Quién está usando la app y qué le está permitido.
   Hoy lo alimenta un valor fijo; cuando entre Firebase lo alimentará
   la sesión de Google, sin que las pantallas tengan que cambiar. */
import React, { createContext, useContext, useMemo } from 'react';

/* rol: 'admin'    -> crea torneos, registra puntos, cierra temporadas
        'jugador'  -> ve todo y edita solo su propia ficha
        'invitado' -> solo ve */
export const SesionCtx = createContext({ rol: 'invitado', miId: null });

export function useSesion() {
  const s = useContext(SesionCtx);
  return useMemo(() => ({
    ...s,
    esAdmin: s.rol === 'admin',
    /* La ficha propia la edita su dueño; el admin puede editar cualquiera. */
    puedoEditar: (id) => s.rol === 'admin' || (!!id && id === s.miId),
  }), [s]);
}

export const ProveedorSesion = ({ rol, miId, children }) => {
  const valor = useMemo(() => ({ rol, miId }), [rol, miId]);
  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
};
