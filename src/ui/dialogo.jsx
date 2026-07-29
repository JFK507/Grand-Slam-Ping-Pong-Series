/* Confirmación dentro de la app.
   Los diálogos nativos (confirm/alert) están bloqueados dentro de un iframe,
   así que no se pueden usar: el botón parecería no responder. */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Eyebrow } from './primitivas.jsx';

const DialogoCtx = createContext(async () => false);

export const useConfirmar = () => useContext(DialogoCtx);

export function ProveedorDialogo({ children }) {
  const [d, setD] = useState(null);
  const resolver = useRef(null);

  const confirmar = useCallback((opts) => new Promise((res) => {
    resolver.current = res;
    setD(typeof opts === 'string' ? { texto: opts } : opts);
  }), []);

  const cerrar = (valor) => {
    setD(null);
    const r = resolver.current;
    resolver.current = null;
    if (r) r(valor);
  };

  return (
    <DialogoCtx.Provider value={confirmar}>
      {children}
      {d && (
        <div
          onClick={() => cerrar(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)',
            display: 'grid', placeItems: 'center', padding: 20, zIndex: 90,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card, border: `1px solid ${d.peligro ? C.red : C.line}`,
              borderRadius: 14, padding: 18, width: '100%', maxWidth: 340,
              display: 'grid', gap: 12, animation: 'rise .18s ease both',
            }}
          >
            {d.titulo && <Eyebrow color={d.peligro ? C.red : C.gold}>{d.titulo}</Eyebrow>}
            <div style={{ fontSize: 14, lineHeight: 1.55, color: C.chalk, whiteSpace: 'pre-line' }}>
              {d.texto}
            </div>
            {d.soloAviso ? (
              <Btn tone="solid" full onClick={() => cerrar(false)}>Entendido</Btn>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Btn onClick={() => cerrar(false)}>Cancelar</Btn>
                <Btn tone={d.peligro ? 'red' : 'gold'} onClick={() => cerrar(true)}>
                  {d.ok || 'Confirmar'}
                </Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </DialogoCtx.Provider>
  );
}
