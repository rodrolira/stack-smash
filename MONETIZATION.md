# Integración de Monetización — Stack & Smash

Estado y pasos de AdMob + RevenueCat. La integración **de código ya está hecha**:
plugins instalados y branch nativo implementado en `AdManager` e `IAPManager`. En
navegador se usa el mock; en dispositivo, los SDKs reales. Lo que falta es
**configuración externa** (cuentas, claves, IDs, productos, plataformas nativas).
Ver skills `ad-monetization`, `in-app-purchases` y `kids-app-compliance`.

## ✅ Ya implementado

- Plugins instalados: `@capacitor-community/admob@^6.2.0`,
  `@revenuecat/purchases-capacitor@^9.2.2` (compatibles con Capacitor 6).
- `AdManager` — AdMob real (banner adaptativo, interstitial, rewarded con
  detección de recompensa por evento), `npa` no personalizado, respeto de
  `adsRemoved`, control de frecuencia. Mock en navegador.
- `IAPManager` — RevenueCat real (`configure`, `getOfferings` → precios
  localizados, `purchasePackage`, `restorePurchases`). Mock en navegador.
- `ShopScene` — entrega el ítem SOLO si la compra es `purchased`; gate parental
  antes de dinero real; restaurar compras.

## ⏳ Pendiente (config externa — necesita tus cuentas)

### AdMob (`src/systems/AdManager.ts`)
1. Crear cuenta de AdMob y **ad units** de producción; reemplazar los IDs de test
   en `AD_UNITS` y poner `AD_TESTING = false`.
2. Compliance menores: activar child-directed treatment (TFCD) y under-age (TFUA)
   a nivel de app en AdMob, y en `AndroidManifest.xml` / `Info.plist`
   (`GADApplicationIdentifier`, `SKAdNetworkItems`). El `npa` ya se manda por request.

### RevenueCat (`src/systems/IAPManager.ts`)
1. Crear proyecto en RevenueCat y poner la **clave pública** en `REVENUECAT_API_KEY`.
2. Crear los productos en **Play Console** y **App Store Connect** con los
   identificadores `remove_ads` (no-consumible) y `coins_500` (consumible),
   mapearlos a un **Offering** y crear el entitlement `remove_ads`.
   (Si usás otros IDs, ajustá `CATALOG` y `REMOVE_ADS_ENTITLEMENT`.)
3. No commitear claves privadas.

## Sincronizar y probar en nativo (requiere tu OK)

```bash
npm run build
npm install @capacitor/android @capacitor/ios
npx cap add android            # y/o ios (macOS)
npx cap sync
npx cap open android           # probar en dispositivo real
```

- Probar con **IDs/entornos de test** primero (AdMob test ads, sandbox de la
  tienda). Recién después, IDs de producción.
- Verificar la config child-directed en un dispositivo real (ver COMPLIANCE.md).

## Checklist de compliance de monetización (resumen)

- [ ] IDs de AdMob de producción (no los de test) — lo valida `/build-release`.
- [ ] Ads no personalizados / child-directed activos y verificados.
- [ ] Productos IAP creados y probados en sandbox.
- [ ] Restaurar compras funciona (no-consumibles).
- [ ] Gate parental delante de todo lo que cueste dinero real.
- [ ] Ver checklist completo en `COMPLIANCE.md`.
