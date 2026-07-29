/* Quién está usando la app y qué le está permitido.
   Este archivo no sabe nada de Firebase a propósito: así el prototipo
   puede usar una sesión inventada sin arrastrar la librería entera. */
import React, { createContext, useContext, useMemo } from 'react';

/* rol: 'admin'    -> crea torneos, registra puntos, cierra temporadas
        'jugador'  -> ve todo y edita solo su propia ficha
        'invitado' -> solo ve */
const noop = async () => { };

export const SesionCtx = createContext({
  rol: 'invitado', miId: null, user: null, cargando: false,
  entrar: noop, salir: noop,
});

export function useSesion() {
  const s = useContext(SesionCtx);
  return useMemo(() => ({
    ...s,
    esAdmin: s.rol === 'admin',
    /* La ficha propia la edita su dueño; el admin puede editar cualquiera. */
    puedoEditar: (id) => s.rol === 'admin' || (!!id && id === s.miId),
  }), [s]);
}

/* Sesión inventada, para el prototipo. */
export function ProveedorSesionFija({ rol, miId, correo, children }) {
  const valor = useMemo(() => ({
    rol,
    miId,
    /* Un invitado es, literalmente, alguien sin sesión: por eso user va en
       null y la pestaña Perfil le ofrece entrar. */
    user: rol === 'invitado' ? null : { email: correo || 'prueba@grandslam.test' },
    cargando: false,
    entrar: noop,
    salir: noop,
  }), [rol, miId, correo]);
  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
}
