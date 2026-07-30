/* Identidad visual y reglas fijas de la liga. */

export const C = {
  ink: '#0B0B0C', slate: '#141518', card: '#1B1C20', card2: '#232429',
  line: '#2E2F35', chalk: '#F2F0EB', dim: '#82828B',
  red: '#D62828', redInk: '#3B0F0F', gold: '#C9A227', goldInk: '#3A2E0B',
};

/* ───────── puntuación ─────────
   Escalón alcanzado en la copa, solo el más alto.
   El que no clasifica se lleva 1 más lo que anotó en la clasificación:
   si hizo 5, son 6. */
export const ESCALON = {
  participar: 1, cuartos: 10, semis: 15, final: 20, campeon: 25,
};

/* Duelos de cuartos en adelante, según la distancia en la tabla.
   La sorpresa vale más mientras más grande sea la diferencia, y al favorito
   que cae le cuesta más perder contra alguien muy por debajo. */
export const DUELOS = {
  logica: { nombre: 'Victoria lógica', detalle: 'favorito por 2 o más', gana: 1, pierde: -1 },
  choque: { nombre: 'Choque directo', detalle: 'a 1 puesto o empatados', gana: 3, pierde: -1 },
  leve: { nombre: 'Sorpresa leve', detalle: 'gana el de abajo por 2 a 5', gana: 4, pierde: -2 },
  media: { nombre: 'Sorpresa media', detalle: 'gana el de abajo por 6 a 8', gana: 5, pierde: -3 },
  grande: { nombre: 'Gran sorpresa', detalle: 'gana el de abajo por 9 o más', gana: 7, pierde: -5 },
};

export const TARGET_QF = 7;
export const TARGET_SF = 10;

export const STAGES = [
  ['inscripcion', 'Inscripción'], ['orden', 'Orden'], ['clasificacion', 'Clasificación'],
  ['cuadro', 'Cuadro'], ['cuartos', 'Cuartos'], ['semis', 'Semis'],
  ['final', 'Final'], ['resumen', 'Resumen'],
];

/* Nombres con los que se bautiza cada edición. */
export const NOMBRES = [
  'Tomatito', 'Diamante', 'Relámpago', 'Cangrejo', 'Tiburón', 'Volcán', 'Huracán', 'Mango',
  'Guacamayo', 'Pelícano', 'Meteorito', 'Cometa', 'Zafiro', 'Rubí', 'Obsidiana', 'Trueno',
  'Jaguar', 'Colibrí', 'Iguana', 'Pulpo', 'Piraña', 'Ñeque', 'Tucán', 'Marañón',
  'Cacao', 'Papaya', 'Coco', 'Guandú', 'Patacón', 'Chicheme', 'Raspao', 'Carimañola',
  'Hojaldre', 'Tamborito', 'Diablico', 'Pollera', 'Mola', 'Chiva', 'Taboga', 'Azuero',
  'Cerro Punta', 'Bocas', 'Guararé', 'Corotú', 'Macano', 'Guayacán', 'Chichica', 'Sancocho',
];
