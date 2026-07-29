/* Deshacer: qué implica volver una etapa atrás en un torneo en curso.
   Cada paso devuelve el parche a aplicar y qué se pierde, para poder
   avisarlo antes de tocar nada. */

const limpiar = (ms) =>
  (ms || []).map((m) => ({ ...m, sa: 0, sb: 0, winner: null, locked: false }));

export function etapaAnterior(t) {
  switch (t.stage) {
    case 'orden':
      return {
        label: 'Inscripción',
        borra: 'el sorteo de lados de la mesa',
        patch: { groups: null, stage: 'inscripcion' },
      };
    case 'clasificacion':
      return {
        label: 'Orden',
        borra: 'todos los puntos de clasificación y los clasificados',
        patch: { clas: {}, qualified: [], stage: 'orden' },
      };
    case 'cuadro':
      return {
        label: 'Clasificación',
        borra: 'el cuadro sorteado',
        patch: { qf: null, stage: 'clasificacion' },
      };
    case 'cuartos':
      return {
        label: 'Cuadro',
        borra: 'los marcadores de cuartos ya jugados',
        patch: { qf: limpiar(t.qf), stage: 'cuadro' },
      };
    case 'semis':
      return {
        label: 'Cuartos',
        borra: 'los marcadores de semifinales',
        patch: { sf: null, stage: 'cuartos' },
      };
    case 'final':
      return {
        label: 'Semifinales',
        borra: 'la final',
        patch: { final: null, stage: 'semis' },
      };
    case 'resumen':
      return {
        label: 'Final',
        borra: 'nada: vuelves al marcador de la final para corregirlo',
        patch: { final: { ...t.final, locked: false }, stage: 'final' },
      };
    default:
      return null;
  }
}

/* Deja un partido de cuartos o semis listo para jugarse otra vez. */
export const repetirPartido = (t, fase, i) => ({
  [fase]: t[fase].map((m, j) => (
    j === i ? { ...m, sa: 0, sb: 0, winner: null, locked: false } : m
  )),
});

/* Reinicia la final por completo, desde el primer set. */
export const repetirFinal = (t) => ({
  final: { ...t.final, sets: [{ a: 0, b: 0 }], setsCount: undefined, winner: null, locked: false },
  stage: 'final',
});
