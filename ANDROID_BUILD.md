# Build de Android — Stack & Smash

El proyecto nativo de Android **ya está creado** en `android/` y sincronizado con
el build web. Este documento explica cómo generar el APK para probarlo en un
celular. Ver también `MONETIZATION.md` (IDs de ads/IAP) y `COMPLIANCE.md`.

## Estado

- ✅ `npx cap add android` ejecutado → carpeta `android/` creada.
- ✅ Plugins detectados: `@capacitor-community/admob`, `@revenuecat/purchases-capacitor`.
- ✅ `AndroidManifest.xml` con el **App ID de AdMob (test)** y permiso `VIBRATE`.
- ✅ `npx cap sync android` hecho (web + plugins copiados).

## Prerrequisitos (una sola vez)

1. **Android Studio** (https://developer.android.com/studio). Trae el **Android
   SDK** y un **JDK compatible**. Es la forma recomendada.
   > ⚠️ **Ojo con el JDK del sistema**: si tenés Java 22+ (este equipo tiene 26),
   > el build de Gradle de Capacitor 6 puede fallar. Usá el **JDK que incluye
   > Android Studio** (Settings → Build → Build Tools → Gradle → *Gradle JDK* →
   > elegí el JDK embebido / JBR 17 o 21). No hace falta desinstalar tu Java.
2. En Android Studio, instalar por el SDK Manager: **Android SDK Platform** (API
   34+) y **Android SDK Build-Tools**.
3. (Opcional) Un dispositivo físico con **depuración USB** activada, o un emulador.

## Compilar y correr (flujo normal)

Cada vez que cambiás el juego web, resincronizá antes de compilar:

```bash
npm run build
npx cap sync android
npx cap open android      # abre el proyecto en Android Studio
```

En Android Studio:
- **Correr en un dispositivo/emulador**: botón ▶ (Run 'app'). Compila e instala.
- **Generar un APK de debug** para compartir: `Build → Build Bundle(s) / APK(s) →
  Build APK(s)`. Queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

### Alternativa por línea de comandos (si ya tenés el SDK configurado)

```bash
npx cap run android            # compila e instala en el device conectado
# o un APK de debug directo:
cd android && ./gradlew assembleDebug
```

Para que Gradle encuentre el SDK sin Android Studio, creá
`android/local.properties` con:

```
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

## Antes de publicar (release)

- [ ] Cambiar `appId` en `capacitor.config.ts` (hoy: `com.tuestudio.stacksmash`)
      por el tuyo definitivo.
- [ ] Íconos y splash: poné tus imágenes y generalas (ej. `@capacitor/assets`).
- [ ] Reemplazar el **App ID y ad units de AdMob de TEST** por los de producción
      (Manifest + `AD_UNITS` en `AdManager.ts`, y `AD_TESTING = false`).
- [ ] Poner las claves de **RevenueCat** (ver `REVENUECAT_SETUP.md`).
- [ ] Subir el `versionCode` / `versionName` (en `android/app/build.gradle`).
- [ ] Generar un **AAB firmado** (`Build → Generate Signed Bundle / APK → Android
      App Bundle`) con tu **keystore** (guardala a salvo; sin ella no podés
      actualizar la app).
- [ ] Correr el checklist de `COMPLIANCE.md` (audiencia, privacidad, Data Safety).

## Notas

- El juego corre offline; los plugins de ads/IAP solo hacen algo real con tus
  cuentas configuradas. Sin claves de RevenueCat, el IAP nativo se saltea sin
  romper (ver `IAPManager`). AdMob usa IDs de test hasta que los cambies.
- La carpeta `android/` está en `.gitignore` (se regenera con `cap add`). Si
  querés versionar cambios nativos manuales, sacala del ignore.
