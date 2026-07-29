/* Entrar y salir de la cuenta de Google. */
import React, { useState } from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Card, Eyebrow } from '../ui/primitivas.jsx';
import { useSesion } from '../ui/sesion.jsx';

/* Pantalla para quien todavía no entró. */
export function Entrar() {
  const { entrar: entrarConGoogle } = useSesion();
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    setOcupado(true);
    setMsg('');
    try {
      await entrarConGoogle();
    } catch (e) {
      const codigo = e?.code || '';
      if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') {
        setMsg('');
      } else if (codigo === 'auth/popup-blocked') {
        setMsg('El navegador bloqueó la ventana. Permití las ventanas emergentes y volvé a intentar.');
      } else if (codigo === 'auth/network-request-failed') {
        setMsg('Sin conexión. Entrá cuando tengas señal; después la app funciona sin ella.');
      } else {
        setMsg(`No se pudo entrar. ${codigo || e?.message || ''}`);
      }
    }
    setOcupado(false);
  };

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16, placeItems: 'center', textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
        GRAND SLAM
      </div>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, maxWidth: 300 }}>
        Entrá con tu Gmail para tener tu perfil, tus estadísticas y tu historial
        de partidos.
      </div>
      <Btn tone="gold" full onClick={entrar} disabled={ocupado} style={{ maxWidth: 300 }}>
        {ocupado ? 'Abriendo…' : 'Entrar con Google'}
      </Btn>
      {msg && (
        <div style={{ fontSize: 12, color: C.red, lineHeight: 1.5, maxWidth: 300 }}>{msg}</div>
      )}
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, maxWidth: 300 }}>
        Sin cuenta también podés ver los torneos, el ranking y los jugadores.
      </div>
    </div>
  );
}

/* Pie con la cuenta conectada y el botón de salir. */
export function PieCuenta() {
  const { user, rol, salir } = useSesion();
  if (!user) return null;
  return (
    <div style={{ padding: '4px 16px 20px' }}>
      <div style={{ height: 1, background: C.line, margin: '8px 0 12px' }} />
      <Card style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{rol === 'admin' ? 'Cuenta · administrador' : 'Cuenta'}</Eyebrow>
          <div style={{
            fontSize: 12.5, color: C.chalk, marginTop: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.email}
          </div>
        </div>
        <Btn small onClick={() => salir()}>Salir</Btn>
      </Card>
    </div>
  );
}
