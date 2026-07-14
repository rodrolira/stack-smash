---
description: Crea un nuevo ítem comprable (skin, moneda, power-up) con su entrada en la tienda y su lógica de desbloqueo.
argument-hint: [nombre-item] [precio]
---

# /agregar-compra $ARGUMENTS

Creá un ítem comprable. Argumentos: `nombre-item` y `precio` (referencial; el
precio real lo devuelve la tienda).

Antes de codear, leé las skills `in-app-purchases` y `kids-app-compliance`.

## Pasos

1. Definí el tipo de producto:
   - **skin / quitar-ads**: no-consumible (se compra una vez, permanente).
   - **pack de monedas / revivir extra**: consumible (se repite).
2. Registrá el producto:
   - Skin cosmética que se paga con monedas del juego → agregala en
     `src/systems/Skins.ts` y su compra con monedas en `ShopScene`.
   - Producto pagado con dinero real → registralo vía `src/systems/IAPManager.ts`
     (interfaz única + mock de navegador). El precio se muestra localizado
     desde la tienda, no hardcodeado.
3. Lógica de desbloqueo: entregá el ítem SOLO tras confirmación (evento de
   compra exitosa o monedas suficientes). Persistí en `SaveManager` y refrescá
   la UI de la tienda.
4. Si es "quitar-ads": setear `settings.adsRemoved = true` y que el AdManager lo
   respete. Asegurá "Restaurar compras".
5. Sin precios engañosos ni presión temporal (regla para audiencia joven).

## Salida esperada

- Producto registrado (Skins o IAPManager según corresponda).
- Entrada en la tienda con precio correcto y estado (comprado/disponible).
- Persistencia en SaveManager y refresco de UI.
