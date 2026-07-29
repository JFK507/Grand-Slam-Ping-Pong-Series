# Grand Slam Ping Pong Series

App para llevar la liga de ping pong. Los datos se guardan en el propio
dispositivo: no hay servidor ni cuenta.

## Correrla

```bash
npm install
npm run dev      # abre en el navegador, también accesible desde el celular en la red local
npm run build    # deja la app lista en dist/
```

## Cómo está organizado

```
src/
├── main.jsx              punto de entrada
├── App.jsx               cabecera, pestañas y ciclo de guardado
├── estilos.css           tipografías y utilidades
├── lib/                  lógica sin interfaz
│   ├── constantes.js     colores, puntos, etapas, nombres de torneo
│   ├── util.js           uid, sorteo, vibración, compresión de fotos
│   ├── reglas.js         objetivos por ronda, quién gana, puntos del torneo
│   ├── db.js             forma de los datos, migraciones y guardado
│   └── estadisticas.js   ranking, rachas, cara a cara, récords, resumen
├── ui/                   piezas visuales compartidas
│   ├── primitivas.jsx    botones, tarjetas, marcas, segmentos
│   ├── fotos.jsx         contexto de fotos y avatar
│   └── usePantallaViva.js  evita que la pantalla se apague
├── torneo/               las etapas, en orden
│   ├── TorneoTab.jsx     enruta las etapas y muestra el historial
│   ├── Inscripcion.jsx   inscribir y sortear lados
│   ├── Orden.jsx         orden de competencia
│   ├── Clasificacion.jsx contar puntos hasta tener 8 clasificados
│   ├── Cuadro.jsx        revelar el cuadro sorteado
│   ├── Ronda.jsx         cuartos y semis
│   ├── Marcador.jsx      los dos paneles grandes
│   ├── FinalFase.jsx     final al mejor de 3
│   └── Resumen.jsx       tabla final y cierre
├── detalle/              ver un torneo
│   ├── Detalle.jsx       cuadro / registro / compartir
│   ├── CuadroCompleto.jsx
│   ├── Registro.jsx      el acta completa
│   └── Compartir.jsx     texto para el grupo
├── ranking/RankingTab.jsx   temporada, histórico y récords
├── jugadores/
│   ├── JugadoresTab.jsx  el registro
│   └── Perfil.jsx        ficha, foto, cara a cara e historial
└── datos/DatosTab.jsx    respaldo y borrado
```

## Reglas que trae cargadas

- **Clasificación**: una sola mesa, dos lados. Se juega a un punto; el que pierde
  sale y entra el siguiente de su lado. Los primeros 8 en acumular 7 puntos pasan.
- **Cuartos**: a 7 seco. **Semis**: a 10 seco.
- **Final**: al mejor de 3. Sets a 10 con ventaja de 2; si van 1-1, tercero a 7 seco.
- **Puntos acumulativos**: clasificar 3, ganar cuartos +5, ganar semis +7,
  ganar la final +10. El campeón termina con 25.
- **Desempate**: diferencia de puntos, contando lo anotado menos lo recibido
  de cuartos en adelante.

## Dónde se guarda

Dentro de Claude usa `window.storage`; como app instalada usa `localStorage`.
Son dos almacenes distintos, así que los datos no pasan solos de uno a otro:
para eso está Exportar / Importar en la pestaña **Datos**.

Las fotos van en una llave aparte del resto, para que contar puntos a toda
velocidad no reescriba las imágenes en cada toque. Se recortan a 256×256.
