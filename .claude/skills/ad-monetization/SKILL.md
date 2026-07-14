---
name: ad-monetization
description: Integración de anuncios (AdMob + Capacitor) en Stack & Smash — banner/interstitial/rewarded, dónde colocarlos sin frustrar, y cómo medir impacto en retención.
---

# Ad Monetization — Stack & Smash

Guía para integrar anuncios sin arruinar la experiencia. Úsala al agregar
cualquier punto de anuncio. **Importante:** si la app se categoriza "para
niños", primero consultá la skill `kids-app-compliance` — hay restricciones
fuertes sobre qué ads se permiten y el formato rewarded/interstitial puede
estar limitado.

## Tipos de anuncio

| Tipo         | Qué es                          | Cuándo usarlo |
|--------------|----------------------------------|---------------|
| **Banner**   | Franja fija (arriba/abajo).      | Menú y tienda. NUNCA sobre el área jugable durante la partida. |
| **Interstitial** | Pantalla completa entre acciones. | Cada 2-3 partidas terminadas, en la transición game-over → menú. |
| **Rewarded** | Video que el jugador elige ver a cambio de algo. | Revivir, duplicar monedas, desbloqueo temporal. Siempre opt-in. |

## Reglas de colocación (retención primero)

- **Nunca** interrumpas una acción en curso. El interstitial va DESPUÉS del
  game over, no a mitad de una torre.
- **Frecuencia**: máximo 1 interstitial cada 2-3 partidas. Guardá un contador
  `gamesSinceLastAd` y un cooldown de tiempo (ej. no más de 1 cada 90 s).
- **Rewarded siempre es voluntario**: botón claro con ícono de "play" y el
  premio explícito ("Revivir ▶" / "x2 monedas ▶"). Nunca autoplay.
- **Primera sesión limpia**: no muestres interstitials en las primeras 2-3
  partidas de un usuario nuevo (deja que se enganche).
- **Banner**: fuera del área de juego, tamaño adaptativo, sin tapar botones.

## Implementación con Capacitor + AdMob

Plugin recomendado: `@capacitor-community/admob`.

```ts
// Inicialización (una vez, al arrancar la app)
import { AdMob } from '@capacitor-community/admob';

await AdMob.initialize({
  requestTrackingAuthorization: true,      // iOS ATT
  testingDevices: ['TU_DEVICE_ID'],        // durante desarrollo
  initializeForTesting: true,              // usa IDs de test
});
```

En este proyecto la lógica vive en `src/systems/AdManager.ts`, que expone una
**interfaz única** (`showBanner`, `showInterstitial`, `showRewarded`) con un
mock para navegador y la implementación nativa detrás de un flag de
plataforma. Así el juego web sigue jugable sin SDK nativo.

- IDs de test de AdMob (usar SIEMPRE en desarrollo, jamás IDs reales):
  - Banner Android: `ca-app-pub-3940256099942544/6300978111`
  - Interstitial Android: `ca-app-pub-3940256099942544/1033173712`
  - Rewarded Android: `ca-app-pub-3940256099942544/5224354917`
- El rewarded debe entregar el premio SOLO en el callback de "reward earned",
  no cuando el usuario abre el video (puede cerrarlo antes de completarlo).

## Medir impacto en retención

Antes de subir la frecuencia de ads, medí:

- **D1 / D7 retention** con y sin el cambio de ads.
- **Sesiones por usuario por día** (si bajan tras un interstitial nuevo, es
  demasiado agresivo).
- **Tasa de opt-in del rewarded** (bueno: > 20-30%). Si es baja, el premio no
  es atractivo o el botón no se ve.

Regla de oro: un anuncio que baja la retención cuesta más de lo que gana. El
rewarded (voluntario) casi nunca daña; el interstitial mal ubicado sí.
