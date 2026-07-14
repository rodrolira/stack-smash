---
description: Genera un nuevo nivel/escena de Phaser siguiendo el patrón del nivel de ejemplo, ajustando dificultad.
argument-hint: [nombre] [dificultad: facil|medio|dificil]
---

# /nuevo-nivel $ARGUMENTS

Creá un nuevo nivel de Stack & Smash. Argumentos: `nombre` y `dificultad`
(facil | medio | dificil).

Antes de escribir código, leé la skill `casual-game-mechanics` para respetar la
curva de dificultad y no romper la mecánica core.

## Patrón (importante)

Los modos/niveles son **data, no escenas nuevas**. `GameScene` está
parametrizada por `Difficulty` y se lanza con `scene.start('Game', { difficulty })`.
Agregar un modo = agregar datos, NO duplicar la escena.

## Pasos

1. En `src/config.ts`:
   - Agregá la clave nueva al tipo `Difficulty`.
   - Agregá su entrada en `DIFFICULTY` (speed, perfectTolerance, accelPerFloor,
     maxSpeed) siguiendo la curva de la skill `casual-game-mechanics`.
   - Agregá su `DIFFICULTY_META` (label, blurb, color, emoji) y sumá la clave a
     `DIFFICULTY_ORDER`.
2. Listo: `LevelSelectScene` toma el modo automáticamente (tarjeta + récord por
   modo vía `SaveManager.bestScoreFor`). No hace falta tocar `main.ts` ni el menú.
3. Si el "nivel" necesita una mecánica distinta (no solo tuning), recién ahí
   creá una escena nueva basada en `GameScene` y registrala en `main.ts`.
4. No toques `AdManager`, `IAPManager` ni la lógica de monedas: este comando es
   solo de diseño de nivel.
5. Verificá con `npm run dev` que el modo aparece en la selección y es jugable.

## Referencia de curva (ver skill para la justificación)

| Modo    | speed | perfectTolerance | accelPerFloor | maxSpeed |
|---------|-------|------------------|---------------|----------|
| facil   | 110   | 12               | 3             | 240      |
| medio   | 170   | 8                | 5             | 360      |
| dificil | 300   | 5                | 9             | 520      |
| experto | 380   | 4                | 11            | 640      |

## Salida esperada

- Datos del modo nuevo en `config.ts` (params + meta + orden).
- Aparece en `LevelSelectScene` con su récord, sin código duplicado.
- Un resumen de los parámetros y por qué encajan en la curva.
