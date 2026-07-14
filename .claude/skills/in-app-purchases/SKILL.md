---
name: in-app-purchases
description: Compras in-app en Stack & Smash — consumibles vs no-consumibles, RevenueCat vs plugin nativo, "quitar anuncios" de una sola compra, y precios para audiencia joven.
---

# In-App Purchases — Stack & Smash

Guía para monetizar con compras. Úsala al agregar cualquier ítem comprable.
**Importante:** para audiencia infantil, las compras deben estar detrás de un
gate de intención clara y (según tienda) posiblemente detrás de una barrera
parental. Consultá `kids-app-compliance` antes de definir el catálogo final.

## Tipos de producto

| Tipo               | Ejemplos                        | Se repone |
|--------------------|----------------------------------|-----------|
| **Consumible**     | Packs de monedas, revivir extra. | Sí, se compra muchas veces. |
| **No-consumible**  | "Quitar anuncios", skin premium. | No, se compra una vez y es permanente. |
| **Suscripción**    | Pase mensual (evitar al inicio). | Renueva. Complejo para menores; posponer. |

Restaurar compras (no-consumibles) es **obligatorio** en iOS: botón
"Restaurar compras" en la tienda.

## RevenueCat vs plugin nativo

- **RevenueCat** (recomendado para empezar): abstrae Google Play + App Store
  con una sola API y un dashboard. Menos código propio de recibos/validación.
  Plugin: `@revenuecat/purchases-capacitor`.
- **Plugin nativo directo** (`@capacitor-community/in-app-purchases` o
  `cordova-plugin-purchase`): más control, pero tenés que manejar validación
  de recibos y estados por vos mismo.

Para un hyper-casual con catálogo chico, RevenueCat ahorra tiempo. Estructurá
la lógica detrás de `src/systems/IAPManager.ts` con una interfaz única y un
mock de navegador, igual que el AdManager.

## "Quitar anuncios" — la compra estrella

Es la compra #1 en hyper-casual. Implementación:

- Producto **no-consumible** único (ej. `remove_ads`).
- Al comprarlo: setear `settings.adsRemoved = true` en el SaveManager.
- El AdManager debe respetar ese flag y **no** mostrar banner/interstitial
  (los rewarded voluntarios pueden seguir disponibles — el jugador los elige).
- Debe restaurarse gratis en un dispositivo nuevo con "Restaurar compras".

## Precios para audiencia joven

- Punto de entrada **bajo**: el primer pack o el "quitar ads" barato (ej. USD
  0.99–2.99) convierte mejor con este público (que muchas veces no paga).
- Ancla de valor: mostrá "mejor oferta" en el pack mediano, no en el más caro.
- **Nada de precios engañosos** ni cuentas regresivas de presión: prohibido en
  tiendas para niños y mala práctica en general.
- Precios siempre en la moneda local que devuelve la tienda (no hardcodear "$").
- La mayoría del revenue en este género viene de ads + un % chico de payers;
  el catálogo IAP debe ser simple, no un casino.

## Flujo de compra seguro

1. Cargar productos de la tienda al abrir la tienda (precios reales localizados).
2. Usuario toca comprar → SDK/tienda maneja el pago (nunca cobres por tu cuenta).
3. Entregar el ítem SOLO tras confirmación de la tienda (evento de compra
   exitosa), no al tocar el botón.
4. Persistir en SaveManager y refrescar la UI.
5. Manejar cancelación y error sin romper el juego.
