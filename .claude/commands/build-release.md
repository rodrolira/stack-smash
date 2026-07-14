---
description: Corre el build de Capacitor para la plataforma indicada y deja un checklist de qué falta antes de subir a la tienda.
argument-hint: [android|ios]
---

# /build-release $ARGUMENTS

Preparar un build de release para `android` o `ios`.

Antes de empezar, leé `kids-app-compliance` y corré su checklist final. No
prepares un build de tienda si el compliance no está resuelto.

## Pasos

1. **Avisá antes** de instalar dependencias o tocar configuración nativa
   (Android Studio / Xcode), tal como pidió el usuario.
2. Build web de producción:
   ```bash
   npm run build          # genera dist/ con Vite
   npx cap sync $ARGUMENTS # copia web + plugins nativos
   ```
3. Abrir el proyecto nativo:
   - Android: `npx cap open android` → generar APK/AAB firmado en Android Studio.
   - iOS: `npx cap open ios` → archivar en Xcode (requiere Mac + cuenta Apple).
4. Verificá que los IDs de AdMob sean de PRODUCCIÓN (no los de test) y que el
   flag de child-directed treatment esté seteado si aplica.

## Checklist antes de subir a la tienda

- [ ] Íconos y splash screen generados para todas las densidades.
- [ ] `appId` y `appName` correctos en `capacitor.config.ts`.
- [ ] Versión / versionCode (Android) y build number (iOS) incrementados.
- [ ] IDs de AdMob de producción; IDs de test eliminados.
- [ ] Productos IAP creados en Play Console / App Store Connect y probados.
- [ ] Política de privacidad publicada y enlazada.
- [ ] Data Safety (Google) / Privacy Labels (Apple) completos.
- [ ] Clasificación por edad y público objetivo definidos.
- [ ] Checklist de `kids-app-compliance` aprobado.
- [ ] Probado en dispositivo real (no solo emulador).
- [ ] Firma: keystore (Android) / certificados y perfiles (iOS) configurados.

## Salida esperada

- Resumen de qué se buildeó y qué comandos correr.
- El checklist anterior con el estado de cada punto marcado según lo verificado.
