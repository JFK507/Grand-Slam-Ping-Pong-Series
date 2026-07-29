/* Entrar y salir de la cuenta de Google. */
import React, { useState } from 'react';
import { C, CODIGO_LIGA } from '../lib/constantes.js';
import { uid } from '../lib/util.js';
import { sellar } from '../lib/db.js';
import { pasarCodigo } from '../lib/nube.js';
import { Btn, Card, Eyebrow, Segmento } from '../ui/primitivas.jsx';
import { useSesion } from '../ui/sesion.jsx';

const campo = {
  width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.line}`,
  color: C.chalk, borderRadius: 10, padding: '11px 12px', fontSize: 15, outline: 'none',
};

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

/* Para quien entró con Google pero su ficha todavía no existe: pide el
   código de la liga y, si es correcto, deja crear la ficha propia. */
export function CrearPerfil({ db, commit }) {
  const { user } = useSesion();
  const [paso, setPaso] = useState('codigo'); // 'codigo' | 'datos'
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [apodo, setApodo] = useState('');
  const [mano, setMano] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const validarCodigo = () => {
    if (codigo.trim().toUpperCase() === CODIGO_LIGA) {
      setError('');
      setPaso('datos');
    } else {
      setError('Código incorrecto.');
    }
  };

  const crear = async () => {
    const n = name.trim();
    if (!n || ocupado) return;
    setOcupado(true);
    const correo = (user.email || '').trim().toLowerCase();
    const nuevo = sellar({ id: uid(), name: n, apodo: apodo.trim(), mano, email: correo });
    commit({ ...db, players: [...db.players, nuevo] }, true);
    try { await pasarCodigo(user.uid, codigo.trim()); } catch { /* ya quedó creada la ficha localmente */ }
    setOcupado(false);
  };

  if (paso === 'codigo') {
    return (
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <Eyebrow color={C.gold}>Crear tu perfil</Eyebrow>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>
          Ingresá el código de acceso de la liga para crear tu ficha.
        </div>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && validarCodigo()}
          placeholder="Código de acceso" style={campo} />
        {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
        <Btn tone="gold" full onClick={validarCodigo} disabled={!codigo.trim()}>Continuar</Btn>
        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
          ¿Ya sos parte de la liga y no tenés el código? Pedile a quien administra
          que vincule tu correo directamente desde la pestaña Jugadores.
        </div>
        <PieCuenta />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Eyebrow color={C.gold}>Tu ficha</Eyebrow>
      <div>
        <Eyebrow>Nombre</Eyebrow>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo" style={campo} />
      </div>
      <div>
        <Eyebrow>Apodo</Eyebrow>
        <input value={apodo} onChange={(e) => setApodo(e.target.value)}
          placeholder="Cómo te dicen en la mesa" style={campo} />
      </div>
      <div>
        <Eyebrow>Mano</Eyebrow>
        <div style={{ marginTop: 6 }}>
          <Segmento ops={[['Diestro', 'Diestro'], ['Zurdo', 'Zurdo']]} val={mano}
            onChange={(m) => setMano(mano === m ? '' : m)} />
        </div>
      </div>
      <Btn tone="gold" full onClick={crear} disabled={!name.trim() || ocupado}>
        {ocupado ? 'Creando…' : 'Crear mi perfil'}
      </Btn>
      <PieCuenta />
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
