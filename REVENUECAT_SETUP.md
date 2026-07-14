# RevenueCat — Guía de configuración desde cero (Stack & Smash)

El **código ya está integrado** (`src/systems/IAPManager.ts`). Esta guía cubre la
**configuración externa** que RevenueCat necesita para funcionar. Seguí los pasos
en orden. Tiempo estimado: 1–2 horas (sin contar revisiones de las tiendas).

> RevenueCat es una capa **encima** de las tiendas (Google Play / App Store). No
> reemplaza a las tiendas: los productos se crean en cada tienda y RevenueCat los
> unifica. Por eso necesitás cuentas de desarrollador en las tiendas primero.

## Lo que nuestro código espera (no cambiar salvo que sepas por qué)

| Cosa | Valor esperado | Dónde en el código |
|------|----------------|--------------------|
| Producto "quitar ads" | ID `remove_ads` (no-consumible) | `CATALOG` en `IAPManager.ts` |
| Producto "monedas" | ID `coins_500` (consumible) | `CATALOG` |
| Entitlement | `remove_ads` | `REMOVE_ADS_ENTITLEMENT` |
| Clave pública Android | empieza con `goog_` | `REVENUECAT_API_KEYS.android` |
| Clave pública iOS | empieza con `appl_` | `REVENUECAT_API_KEYS.ios` |

---

## Paso 0 — Prerrequisitos (cuestan dinero)

- **Google Play Console**: cuenta de desarrollador, pago único de **US$25**.
- **Apple Developer Program** (solo si vas a iOS): **US$99/año** + una Mac con Xcode.
- Podés hacer **solo Android** para empezar y sumar iOS después.

> ⚠️ No vas a poder **probar** compras hasta tener: (a) el producto creado en la
> tienda, (b) la app subida al menos a un track interno, y (c) el build nativo
> corriendo en un dispositivo real (los IAP no funcionan en navegador ni, en
> general, en emulador). El mock del navegador te deja probar el **flujo de UX**
> mientras tanto.

---

## Paso 1 — Crear los productos en cada tienda

### Google Play Console
1. Creá la app en Play Console (nombre, idioma, etc.).
2. **Monetizar → Productos:**
   - **Productos in-app** → crear uno con ID `remove_ads` (tipo: no se consume) y
     otro `coins_500` (tipo: se consume). Poné título, descripción y **precio**.
   - Activá ambos productos.
3. Play requiere subir un **AAB** a un track (ej. *pruebas internas*) para que los
   productos queden "activos" y testeables.
4. Creá una **cuenta de servicio** (Google Cloud) con permisos sobre la app: te da
   un **JSON de credenciales** que RevenueCat usa para leer las compras (paso 3).

### App Store Connect (si hacés iOS)
1. Creá la app en App Store Connect.
2. **Compras dentro de la app** → crear `remove_ads` (No consumible) y `coins_500`
   (Consumible), con precio y textos. Estado: "Listo para enviar".
3. Generá una **App Store Connect API Key** (o el *shared secret*) para RevenueCat.

> Usá los **mismos identificadores** `remove_ads` y `coins_500` en ambas tiendas.
> Así el código no necesita cambios.

---

## Paso 2 — Crear el proyecto en RevenueCat

1. Entrá a https://app.revenuecat.com y creá una cuenta (tiene plan gratis
   generoso).
2. **Create new project** → "Stack & Smash".
3. **Project settings → Apps → Add app:**
   - **Play Store**: subí el JSON de la cuenta de servicio (paso 1).
   - **App Store**: cargá la API key / shared secret.
   Cada app te da su **Public SDK Key** (Android `goog_…`, iOS `appl_…`).

---

## Paso 3 — Importar productos, Offering y Entitlement

1. **Products**: importá / agregá `remove_ads` y `coins_500` (RevenueCat los lee
   de las tiendas una vez conectadas).
2. **Entitlements**: creá uno con identificador **`remove_ads`** y **adjuntale el
   producto `remove_ads`**. (El consumible `coins_500` NO va en un entitlement.)
3. **Offerings**: creá el offering **`default`** (marcalo como *current*) y agregá
   dos **Packages**, uno apuntando a `remove_ads` y otro a `coins_500`.
   - Nuestro código lee `offerings.current.availablePackages` y matchea por
     `package.product.identifier`. Por eso los IDs deben ser esos.

---

## Paso 4 — Poner las claves en el código

En `src/systems/IAPManager.ts`, reemplazá los placeholders:

```ts
const REVENUECAT_API_KEYS: Record<string, string> = {
  android: 'goog_TU_CLAVE_ANDROID',
  ios: 'appl_TU_CLAVE_IOS',
};
```

- Son claves **públicas** del SDK (no secretas), pero igual no subas claves
  privadas/secret de las tiendas al repo.
- Si solo hacés Android por ahora, dejá el placeholder de iOS: el código elige la
  clave según la plataforma y, si falta, saltea el init sin romper.

---

## Paso 5 — Compilar el build nativo y probar (sandbox)

```bash
npm run build
npm install @capacitor/android          # y/o @capacitor/ios
npx cap add android                      # crea la carpeta nativa
npx cap sync                             # copia web + plugins
npx cap open android                     # abrir en Android Studio → correr en dispositivo
```

Probar compras:
- **Android**: agregá tu cuenta de Google como **tester de licencias** en Play
  Console y usá un track interno; las compras de test no cobran.
- **iOS**: usá un usuario **Sandbox** de App Store Connect.
- Verificá en el **dashboard de RevenueCat → Customers** que la compra aparece.

Qué deberías ver en la app (modo nativo, no mock):
- La tienda muestra los **precios reales localizados** (vienen de `getOfferings`).
- Comprar `remove_ads` → oculta los anuncios y queda activo; **Restaurar** lo
  recupera en otro dispositivo.
- Comprar `coins_500` → se acreditan 500 monedas.

---

## Solución de problemas

| Síntoma | Causa habitual |
|---------|----------------|
| Precios no cargan / tienda vacía | El offering `default` no está *current*, o los productos no están activos/aprobados en la tienda, o el package apunta a otro product ID. |
| "There is no singleton instance" | `Purchases.configure` no corrió (¿falta la clave? ¿`isNativePlatform` es false?). |
| Compra siempre da error | Producto no activo en la tienda, app no subida a un track, o cuenta no es tester. |
| Restaurar no devuelve nada | El entitlement no se llama `remove_ads` o el producto no está adjunto a él. |
| Funciona en navegador pero no en device | El navegador usa el **mock** a propósito; los IAP reales solo van en nativo. |

## Checklist

- [ ] Cuentas de tienda creadas (Play y/o Apple).
- [ ] Productos `remove_ads` y `coins_500` creados y activos en cada tienda.
- [ ] Proyecto RevenueCat con las apps conectadas (JSON de Play / API key de Apple).
- [ ] Entitlement `remove_ads` con su producto adjunto.
- [ ] Offering `default` (current) con los dos packages.
- [ ] Claves públicas puestas en `REVENUECAT_API_KEYS`.
- [ ] Build nativo corriendo en dispositivo real; compra de test verificada en el
      dashboard de RevenueCat.
