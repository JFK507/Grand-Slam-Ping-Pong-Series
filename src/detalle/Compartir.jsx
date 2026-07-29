/* Texto armado para pegar en el grupo. */
import React, { useMemo, useRef, useState } from 'react';
import { C } from '../lib/constantes.js';
import { vibra } from '../lib/util.js';
import { textoResumen } from '../lib/estadisticas.js';
import { Btn, Eyebrow } from '../ui/primitivas.jsx';

export default function Compartir({ t, db, name }) {
  const texto = useMemo(() => textoResumen(db, t, name), [db, t]);
  const [msg, setMsg] = useState('');
  const ref = useRef(null);
  const puedeCompartir = typeof navigator !== 'undefined' && !!navigator.share;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.value ?? texto);
      vibra(20);
      setMsg('Copiado. Pégalo en el grupo.');
    } catch {
      try {
        ref.current?.select();
        document.execCommand('copy');
        setMsg('Copiado.');
      } catch {
        setMsg('Selecciona el texto y cópialo a mano.');
      }
    }
  };

  const compartir = async () => {
    try { await navigator.share({ text: ref.current?.value ?? texto }); } catch { }
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Eyebrow>Resumen para el grupo</Eyebrow>
      <textarea ref={ref} defaultValue={texto}
        style={{
          background: C.card, border: `1px solid ${C.line}`, color: C.chalk,
          borderRadius: 10, padding: 14, fontSize: 13, minHeight: 300, outline: 'none',
          resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--ui)',
        }} />
      <div style={{
        display: 'grid', gridTemplateColumns: puedeCompartir ? '1fr 1fr' : '1fr', gap: 8,
      }}>
        <Btn tone="gold" onClick={copiar}>Copiar</Btn>
        {puedeCompartir && <Btn tone="red" onClick={compartir}>Compartir</Btn>}
      </div>
      {msg && <div style={{ fontSize: 12, color: C.gold }}>{msg}</div>}
      <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.6 }}>
        Puedes editar el texto antes de copiarlo. El ranking mostrado es el de {db.season.nombre}.
      </div>
    </div>
  );
}
