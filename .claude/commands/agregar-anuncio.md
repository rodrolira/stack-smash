---
description: Inserta un punto de anuncio (rewarded/interstitial/banner) en una pantalla o evento del juego.
argument-hint: [tipo: banner|interstitial|rewarded] [ubicacion]
---

# /agregar-anuncio $ARGUMENTS

Insertá un punto de anuncio. Argumentos: `tipo` (banner | interstitial |
rewarded) y `ubicacion` (ej: "game-over", "menu", "revivir").

Antes de tocar código, leé las skills `ad-monetization` y `kids-app-compliance`.
Si la app es "para niños", confirmá que el tipo y la frecuencia son permitidos
antes de implementar.

## Pasos

1. Usá SIEMPRE la interfaz de `src/systems/AdManager.ts` (`showBanner`,
   `showInterstitial`, `showRewarded`). No llames al SDK directamente desde una
   escena.
2. Respetá las reglas de colocación de la skill:
   - **interstitial**: solo en transiciones (ej. game-over → menú), con
     contador `gamesSinceLastAd` y cooldown. Nunca a mitad de una acción.
   - **rewarded**: siempre opt-in, con botón claro y premio explícito. Entregá
     el premio SOLO en el callback de "reward earned".
   - **banner**: fuera del área jugable (menú/tienda).
3. Respetá `settings.adsRemoved`: si el jugador compró "quitar ads", no mostrar
   banner ni interstitial.
4. En navegador, el AdManager usa un mock: verificá que el flujo funcione sin
   SDK nativo (log/placeholder visible).

## Salida esperada

- Llamada al AdManager en el evento/ubicación indicada.
- Manejo de éxito, cierre y error sin romper el juego.
- Nota sobre implicancias de compliance si aplica.
