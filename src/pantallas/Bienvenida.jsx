/* Primera pantalla. Se muestra hasta que la persona entra con Google
   o decide seguir como invitada; la elección queda recordada. */
import React, { useState } from 'react';
import { C } from '../lib/constantes.js';
import { Btn } from '../ui/primitivas.jsx';
import { useSesion } from '../ui/sesion.jsx';

export default function Bienvenida({ onInvitado }) {
  const { entrar } = useSesion();
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');

  const conGoogle = async () => {
    setOcupado(true);
    setMsg('');
    try {
      await entrar();
    } catch (e) {
      const c = e?.code || '';
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') setMsg('');
      else if (c === 'auth/popup-blocked') setMsg('El navegador bloqueó la ventana. Permití las emergentes y probá de nuevo.');
      else if (c === 'auth/network-request-failed') setMsg('Sin conexión. Podés entrar como invitado y crear tu cuenta cuando tengas señal.');
      else setMsg(`No se pudo entrar. ${c || e?.message || ''}`);
    }
    setOcupado(false);
  };

  return (
    <div style={{
      background: C.ink, color: C.chalk, minHeight: '100vh',
      fontFamily: 'var(--ui)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 24px', gap: 28,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="num" style={{ fontSize: 44, fontWeight: 800, lineHeight: 0.95 }}>
          GRAND SLAM
        </div>
        <div className="num" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
          PING PONG
        </div>
        <div style={{
          fontSize: 13, letterSpacing: '.42em', color: C.gold,
          fontWeight: 700, marginTop: 6, textTransform: 'uppercase',
        }}>
          Series
        </div>
        <div style={{
          fontSize: 9, letterSpacing: '.3em', color: C.dim,
          marginTop: 14, textTransform: 'uppercase',
        }}>
          Jesurun
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, maxWidth: 320, margin: '0 auto', width: '100%' }}>
        <Btn tone="gold" full onClick={conGoogle} disabled={ocupado}>
          {ocupado ? 'Abriendo…' : 'Entrar con Google'}
        </Btn>
        <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.55, textAlign: 'center' }}>
          Con cuenta tenés tu perfil, tus estadísticas y tu historial de partidos.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontSize: 9, letterSpacing: '.2em', color: C.dim }}>O BIEN</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        <Btn full onClick={onInvitado}>Entrar como invitado</Btn>
      </div>

      {msg && (
        <div style={{
          fontSize: 12, color: C.red, lineHeight: 1.5,
          textAlign: 'center', maxWidth: 320, margin: '0 auto',
        }}>
          {msg}
        </div>
      )}
    </div>
  );
}
