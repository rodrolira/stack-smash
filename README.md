# Stack & Smash 🧱💥

Juego móvil **hyper-casual** de un solo toque: apilá bloques, el sobrante se
smashea, no dejes que el ancho llegue a cero. Hecho con **Phaser 3 + Capacitor +
TypeScript**, apuntado a **Android e iOS** y a un público infantil/juvenil.

> Estado: **scaffold jugable**. Ads e IAP están como *placeholders* con un mock
> de navegador — todavía no hay SDK nativo instalado.

## Requisitos

- Node.js 18+ y npm.
- (Nativo, más adde­lante) Android Studio para Android; macOS + Xcode para iOS.

## Cómo correrlo en el navegador

```bash
npm install      # instala Phaser, Vite, Capacitor CLI/core
npm run dev      # abre http://localhost:5173
```

Phaser corre directo en Chrome/Firefox: no hace falta compilar nada nativo para
probar la mecánica. Para probar desde el celular, `npm run dev` expone la red
local (`host: true` en `vite.config.ts`).

Otros scripts:

```bash
npm run typecheck   # chequeo de tipos (tsc --noEmit)
npm run build       # build de producción a dist/
```

## Estructura del código

```
src/
  main.ts              # config de Phaser + registro de escenas
  config.ts            # resolución, paleta, parámetros de dificultad
  scenes/
    BootScene.ts       # carga save + init managers → Menu
    MenuScene.ts       # título, jugar, tienda, mejor puntaje, banner
    GameScene.ts       # ★ mecánica core (apilar/smashear), HUD, game over, revivir
    ShopScene.ts       # 2 skins comprables + "quitar ads" (IAP placeholder)
  systems/
    SaveManager.ts     # monedas, vidas, skins, adsRemoved, racha (localStorage)
    AdManager.ts       # AdMob placeholder: banner/interstitial/rewarded + mock web
    Skins.ts           # catálogo de skins
  ui/
    Button.ts          # botón reutilizable con área táctil grande
    background.ts      # fondo con gradiente
```

## Cómo jugar

- **Un toque** suelta el bloque en movimiento.
- La parte que no solapa con el bloque de abajo se cae ("smash") y el ancho baja.
- Alineación casi perfecta = **PERFECT**: mantenés el ancho + bonus de monedas.
- **Game over** cuando el ancho llega a cero. Podés **revivir viendo un anuncio**
  (una vez) o **reintentar** (gasta una vida ❤).

## Estructura `.claude` (asistencia de Claude Code)

- **`.claude/skills/`** — conocimiento reutilizable: `casual-game-mechanics`,
  `ad-monetization`, `in-app-purchases`, `kids-app-compliance`.
- **`.claude/commands/`** — `/nuevo-nivel`, `/agregar-anuncio`, `/agregar-compra`,
  `/build-release`.
- **`.claude/agents/`** — `game-designer`, `monetization-engineer`, `qa-tester`.

## Siguientes pasos recomendados

1. Jugá el scaffold en el navegador y sentí la mecánica.
2. Iterá 2-3 niveles con `/nuevo-nivel` hasta que se sienta bien.
3. Recién ahí integrá ads e IAP **reales** con `/agregar-anuncio` y
   `/agregar-compra` (ver TODOs en `AdManager.ts` y `ShopScene.ts`).
4. Antes de publicar, corré el checklist de `kids-app-compliance` y
   `/build-release`.

### Convertir a app nativa (cuando quieras — requiere instalar plugins nativos)

```bash
npm run build
npm install @capacitor/android @capacitor/ios
npx cap add android          # y/o: npx cap add ios (necesita macOS)
npx cap sync
npx cap open android         # abre Android Studio
```

> ⚠️ **Compliance para menores:** antes de elegir el proveedor de ads y de
> marcar la app "para niños" en las tiendas, leé `.claude/skills/kids-app-compliance`.
> Hay restricciones estrictas (COPPA, GDPR-K, Google Play Families, Apple Kids)
> sobre datos y anuncios personalizados. Esto es orientación de políticas, no
> asesoría legal.
