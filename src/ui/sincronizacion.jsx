/* Estado de la sincronización, para que la cabecera lo muestre y los ajustes
   puedan forzarla. Este archivo no sabe de Firebase: el prototipo usa el
   proveedor nulo y así no arrastra la librería. */
import React, { createContext, useContext } from 'react';

/* estado: 'apagado'      -> sin nube (prototipo)
           'sinConexion'  -> no hay señal
           'pendiente'    -> hay cambios locales sin subir
           'subiendo'     -> en eso
           'alDia'        -> todo arriba
           'conflicto'    -> el otro admin subió algo en el medio */
export const SyncCtx = createContext({
  /* listo: ya sabemos quién está registrado. Sin nube, se sabe de inmediato. */
  listo: true,
  estado: 'apagado', subidoEn: null, error: null,
  subirAhora: async () => { }, bajarAhora: async () => { }, resolver: async () => { },
  /* Registro de jugadores. Sin nube no hacen nada. */
  registrar: async () => { throw new Error('sin conexión con la nube'); },
  buscarReclamable: async () => null,
  reclamar: async () => { throw new Error('sin conexión con la nube'); },
  borrarJugadorNube: async () => { throw new Error('sin conexión con la nube'); },
});

export const useSync = () => useContext(SyncCtx);

export const ProveedorSyncNulo = ({ children }) => children;

/* Punto de color de la cabecera. */
export function LuzSync() {
  const { estado, subidoEn } = useSync();
  if (estado === 'apagado') return null;

  const mapa = {
    alDia: ['#2E7D53', 'Al día'],
    pendiente: ['#C9A227', 'Sin subir'],
    subiendo: ['#C9A227', 'Subiendo…'],
    sinConexion: ['#82828B', 'Sin señal'],
    conflicto: ['#D62828', 'Conflicto'],
  };
  const [color, texto] = mapa[estado] || mapa.sinConexion;
  const titulo = subidoEn
    ? `${texto} · última subida ${new Date(subidoEn).toLocaleString()}`
    : texto;

  return (
    <span title={titulo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        display: 'inline-block',
      }} />
      <span style={{ fontSize: 9, color: '#82828B', letterSpacing: '.08em' }}>{texto}</span>
    </span>
  );
}
