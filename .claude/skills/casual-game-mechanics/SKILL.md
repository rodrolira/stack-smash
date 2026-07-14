---
name: casual-game-mechanics
description: Diseño de mecánicas hyper-casual (un toque, sesiones de 15-30s, game feel "juicy", dificultad progresiva, rachas y recompensa diaria) para Stack & Smash.
---

# Casual Game Mechanics — Stack & Smash

Guía para diseñar e implementar mecánicas hyper-casual dirigidas a niños y
adolescentes. Úsala cuando crees o ajustes niveles, la dificultad, o el
"feel" del juego.

## Principios core

1. **Una sola acción.** Todo se juega con un tap (o hold). Nada de menús
   durante la partida, nada de combos complejos. El jugador entiende el juego
   en 3 segundos sin tutorial.
2. **Sesiones de 15-30 segundos.** Una partida perdida debe permitir reintentar
   en < 1 segundo (botón grande "Reintentar", sin pantallas intermedias).
3. **Fallo instantáneo y claro.** El jugador siempre entiende por qué perdió.
4. **Recompensa constante.** Monedas, partículas, y sonido en cada acierto.

## Mecánica de Stack & Smash

- Un bloque se mueve horizontalmente de un lado a otro sobre la torre.
- Un tap lo suelta. La parte que **no** solapa con el bloque de abajo se
  "smashea" (cae y desaparece con partículas).
- El ancho útil se reduce con cada error → tensión creciente.
- Alineación perfecta (overlap casi total): bonus de monedas + efecto especial
  + el bloque recupera un poco de ancho (mecánica de "perfect stack").
- Game over cuando el ancho llega a 0.

## Curva de dificultad

Ajusta SOLO estos parámetros por nivel/progresión (no cambies la mecánica):

| Parámetro          | Fácil | Medio | Difícil |
|--------------------|-------|-------|---------|
| Velocidad bloque   | 120   | 200   | 320 px/s|
| Tolerancia perfect | 12    | 8     | 5 px    |
| Aceleración/altura | 0     | +4    | +8 px/s por piso |

Regla: la dificultad sube DENTRO de una partida (cada piso un poco más rápido),
no entre partidas. La primera partida siempre debe sentirse fácil y ganable.

## Game feel ("juice")

Cada uno de estos suma retención; impleméntalos incrementalmente:

- **Screen shake** breve al smashear (2-4 px, 80 ms).
- **Squash & stretch** del bloque al aterrizar (scale tween 1.0 → 1.08 → 1.0).
- **Partículas** en el trozo que cae y en el "perfect".
- **Color shift** progresivo de la torre (gradiente HSL que avanza por piso).
- **Sonido** distinto para: aterrizaje normal, perfect, smash, game over.
- **Number pop**: las monedas ganadas suben flotando y se desvanecen.

Nota: mantené el audio opcional/mute-friendly; muchos niños juegan en silencio.

## Sistemas de enganche (retención)

- **Racha diaria**: cada día consecutivo jugado da un bonus creciente de monedas.
  Guardar `lastPlayedDate` y `streakCount` en el SaveManager.
- **Mejor puntaje** siempre visible en el menú (motiva "una más").
- **Metas cortas**: "llega a 10 pisos", "haz 3 perfects seguidos". Recompensa
  chica en monedas.

## Anti-patrones (evitar)

- Tutoriales largos o texto. Enseñar jugando.
- Timers de energía que bloqueen el juego (frustran y encima complican
  compliance para menores).
- Dificultad artificial (velocidad injusta desde el piso 1).
- Castigar el fallo con pantallas largas o esperas.
