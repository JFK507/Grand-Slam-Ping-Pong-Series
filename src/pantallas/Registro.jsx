/* Registro de un jugador nuevo.
   Se muestra a quien ya entró con Google pero todavía no tiene ficha.

   Dos caminos:
     · Si el admin dejó una ficha preparada con su correo, se la ofrece
       para reclamar y no le pide código.
     · Si no, le pide el código de acceso y los datos para armarla.

   El código no se comprueba acá. Se manda al servidor y es la regla de
   Firestore la que lo compara contra el guardado; si no cuadra, la escritura
   se rechaza y nunca se llega a crear la ficha. Comprobarlo en la app sería
   inútil: cualquiera lo leería del código fuente. */
import React, { useEffect, useState } from 'react';
import { C } from '../lib/constantes.js';
import { Btn, Card, Eyebrow, Segmento } from '../ui/primitivas.jsx';
import { Avatar } from '../ui/fotos.jsx';
import { useSesion } from '../ui/sesion.jsx';
import { useSync } from '../ui/sincronizacion.jsx';

const campo = {
  width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.line}`,
  color: C.chalk, borderRadius: 10, padding: '12px 13px', fontSize: 15, outline: 'none',
};

/* Marco vive FUERA del componente a propósito.
   Si se define adentro, React lo trata como un componente nuevo en cada
   render, desmonta todo y vuelve a montarlo: los campos de texto pierden
   el foco y hay que volver a hacer clic tras cada letra. */
function Marco({ children, correo, onSalir, onOmitir }) {
  return (
    <div style={{
      background: C.ink, color: C.chalk, minHeight: '100vh', fontFamily: 'var(--ui)',
      padding: '28px 22px', display: 'grid', gap: 18, alignContent: 'start',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="num" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
          GRAND SLAM
        </div>
        <div style={{
          fontSize: 9, letterSpacing: '.28em', color: C.red,
          fontWeight: 700, marginTop: 4, textTransform: 'uppercase',
        }}>
          Ping Pong Series
        </div>
      </div>
      {children}
      <div style={{ textAlign: 'center', display: 'grid', gap: 10, marginTop: 4 }}>
        {onOmitir && (
          <button onClick={onOmitir}
            style={{
              background: 'transparent', border: 0, color: C.dim, fontSize: 12,
              textDecoration: 'underline', cursor: 'pointer', fontFamily: 'var(--ui)',
            }}>
            Ver la liga sin registrarme
          </button>
        )}
        <div style={{ fontSize: 10.5, color: C.dim }}>
          Entraste como {correo}.{' '}
          <button onClick={onSalir}
            style={{
              background: 'transparent', border: 0, color: C.dim, fontSize: 10.5,
              textDecoration: 'underline', cursor: 'pointer', fontFamily: 'var(--ui)',
            }}>
            Cambiar de cuenta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Registro({ onListo, onOmitir }) {
  const { user, salir } = useSesion();
  const { registrar, buscarReclamable, reclamar } = useSync();

  const [ficha, setFicha] = useState(undefined); // undefined = buscando
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [apodo, setApodo] = useState('');
  const [mano, setMano] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');

  /* ¿Hay una ficha esperando por este correo? */
  useEffect(() => {
    let vivo = true;
    buscarReclamable()
      .then((f) => { if (vivo) setFicha(f); })
      .catch(() => { if (vivo) setFicha(null); });
    return () => { vivo = false; };
  }, [buscarReclamable]);

  /* Nombre sugerido a partir de la cuenta de Google, editable. */
  useEffect(() => {
    if (!nombre && user?.displayName) setNombre(user.displayName);
  }, [user, nombre]);

  /* El paso viene marcado desde registrar(): así no se culpa al código
     cuando lo que falló fue crear la ficha. Antes cualquier rechazo de
     permisos decía "código incorrecto", y eso mandaba a revisar lo que no era. */
  const explicarError = (e) => {
    const c = e?.code || '';
    const paso = e?.paso;
    if (c === 'permission-denied') {
      if (paso === 'codigo') {
        return 'El código no es correcto. Pedíselo a quien organiza la liga.';
      }
      if (paso === 'ficha') {
        return 'El código quedó aceptado, pero el servidor no dejó crear la ficha. '
          + 'Mostrale esto a quien administra: falló la escritura en jugadores.';
      }
      return 'El servidor rechazó la operación.';
    }
    if (c === 'unavailable' || c === 'auth/network-request-failed') {
      return 'Sin conexión. Necesitás señal solo para registrarte; después la app funciona sin ella.';
    }
    return `No se pudo completar${paso ? ` (paso: ${paso})` : ''}. ${c || e?.message || ''}`;
  };

  const enviar = async () => {
    if (!codigo.trim()) { setMsg('Falta el código de acceso.'); return; }
    if (!nombre.trim()) { setMsg('Falta tu nombre.'); return; }
    setOcupado(true);
    setMsg('');
    try {
      await registrar({ codigo, name: nombre, apodo, mano });
      onListo?.();
    } catch (e) {
      setMsg(explicarError(e));
    }
    setOcupado(false);
  };

  const tomarFicha = async () => {
    setOcupado(true);
    setMsg('');
    try {
      await reclamar(ficha.id);
      onListo?.();
    } catch (e) {
      setMsg(explicarError(e));
    }
    setOcupado(false);
  };

  if (ficha === undefined) {
    return <Marco correo={user?.email} onSalir={() => salir()} onOmitir={onOmitir}><div style={{ textAlign: 'center', color: C.dim, fontSize: 13 }}>Buscando tu ficha…</div></Marco>;
  }

  /* ── camino corto: el admin ya la había creado ── */
  if (ficha) {
    return (
      <Marco correo={user?.email} onSalir={() => salir()} onOmitir={onOmitir}>
        <Card style={{ borderColor: C.gold, background: C.goldInk }}>
          <Eyebrow color={C.chalk}>Ya tenés ficha en la liga</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <Avatar id={ficha.id} name={ficha.name} size={46} ring={C.gold} />
            <div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{ficha.name}</div>
              {ficha.apodo && (
                <div style={{ fontSize: 12, color: C.chalk, opacity: 0.8 }}>{ficha.apodo}</div>
              )}
            </div>
          </div>
        </Card>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>
          Quien organiza la liga la creó con tu correo. Al tomarla quedan tuyos su
          historial y sus estadísticas.
        </div>
        <Btn tone="gold" full onClick={tomarFicha} disabled={ocupado}>
          {ocupado ? 'Un momento…' : 'Esta es mía'}
        </Btn>
        {msg && <div style={{ fontSize: 12, color: C.red, lineHeight: 1.5 }}>{msg}</div>}
      </Marco>
    );
  }

  /* ── camino normal: registro con código ── */
  return (
    <Marco correo={user?.email} onSalir={() => salir()} onOmitir={onOmitir}>
      <div>
        <Eyebrow color={C.gold}>Código de acceso</Eyebrow>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Pedíselo al organizador"
          autoCapitalize="characters"
          spellCheck={false}
          style={{ ...campo, borderColor: C.gold, letterSpacing: '.12em', fontWeight: 700 }}
        />
      </div>

      <div>
        <Eyebrow>Tu nombre</Eyebrow>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Como querés aparecer en la tabla" style={campo} />
      </div>

      <div>
        <Eyebrow>Apodo</Eyebrow>
        <input value={apodo} onChange={(e) => setApodo(e.target.value)}
          placeholder="Opcional" style={campo} />
      </div>

      <div>
        <Eyebrow>Mano</Eyebrow>
        <div style={{ marginTop: 6 }}>
          <Segmento
            ops={[['Diestro', 'Diestro'], ['Zurdo', 'Zurdo']]}
            val={mano}
            onChange={(m) => setMano(mano === m ? '' : m)}
          />
        </div>
      </div>

      <Btn tone="gold" full onClick={enviar} disabled={ocupado}>
        {ocupado ? 'Creando…' : 'Crear mi perfil'}
      </Btn>

      {msg && <div style={{ fontSize: 12.5, color: C.red, lineHeight: 1.5 }}>{msg}</div>}

      <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.6 }}>
        La foto la podés poner después, desde tu perfil.
      </div>
    </Marco>
  );
}
