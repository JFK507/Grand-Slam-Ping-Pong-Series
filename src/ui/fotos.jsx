/* Contexto de fotos y el avatar. Las fotos viven en su propia llave de
   almacenamiento para que contar puntos no reescriba las imágenes. */
import React, { createContext, useContext } from 'react';
import { C } from '../lib/constantes.js';
import { iniciales } from '../lib/util.js';

export const FotoCtx = createContext({ fotos: {}, setFoto: () => { } });

export const useFotos = () => useContext(FotoCtx);

export const Avatar = ({ id, name, size = 28, ring }) => {
  const { fotos } = useFotos();
  const src = fotos[id];
  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: `1px solid ${ring || C.line}`, objectFit: 'cover',
  };
  if (src) return <img src={src} alt="" style={base} />;
  return (
    <div style={{
      ...base, background: C.card2, display: 'grid', placeItems: 'center',
      fontSize: Math.max(9, size * 0.36), fontWeight: 700, color: C.dim,
    }}>
      {iniciales(name) || '?'}
    </div>
  );
};
