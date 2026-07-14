# Compliance para menores — Stack & Smash

Estado del cumplimiento para apps usables por menores. Basado en la skill
`.claude/skills/kids-app-compliance`. **No es asesoría legal**; para una app
comercial dirigida a menores, hacé una revisión legal real antes de publicar.

_Última revisión: 2026-07-05_

## 1. Decisión de audiencia (⚠️ confirmar antes de publicar)

**Recomendación implementada:** tratar a **todos** los usuarios con el criterio
más conservador (dirigido a menores) para ads y compras, de modo que la app sea
compatible tanto con **"mixed audience"** como con **"Diseñado para la familia" /
categoría Kids**.

- Google Play → completar "Público objetivo y contenido". Si se incluyen edades
  menores, la app entra al programa **Families** (AdMob debe estar en la lista de
  SDKs permitidos — lo está).
- Apple → si se usa la **categoría Kids**, revisar que ads e IAP queden detrás del
  gate parental (ya implementado) y que no haya enlaces externos (no hay).

> **Acción pendiente del owner:** decidir formalmente la clasificación en cada
> tienda y completar los cuestionarios de contenido / edad.

## 2. Cómo lo aborda el código (ya implementado)

| Requisito | Implementación |
|-----------|----------------|
| Sin recolección de datos personales | `SaveManager` usa solo `localStorage`; **cero** llamadas de red / navigator / geolocalización (auditado). |
| Ads no personalizados / child-directed | `COMPLIANCE` en `config.ts` + `AD_REQUEST_OPTIONS` en `AdManager` (npa=1, tagForChildDirectedTreatment, tagForUnderAgeOfConsent, maxAdContentRating='G'). |
| Ads no engañosos / opt-in | Rewarded siempre voluntario; interstitial solo en game-over con frecuencia limitada; banner fuera del gameplay. Ver skill `ad-monetization`. |
| Gate parental para dinero real | `ui/ParentalGate.ts` (desafío de multiplicación) delante de "Quitar anuncios" y "Pack de monedas". Las compras con monedas del juego NO se gatean. |
| Restaurar compras | Presente en la tienda (placeholder IAP; conectar `IAPManager.restore`). |
| Sin enlaces externos | No hay `window.open`/`<a>`/URLs. La política de privacidad se muestra **dentro** de la app (`PrivacyScene`). |
| Política de privacidad | `PRIVACY.md` (borrador) + `PrivacyScene` accesible desde el menú. |
| Precios sin presión / sin loot boxes | Tienda con precios claros, sin cuentas regresivas ni cajas aleatorias. |

## 3. Checklist final antes de publicar

- [ ] **Clasificación de audiencia decidida y documentada** en cada tienda.
- [x] Trato child-directed / TFUA aplicado por config (`COMPLIANCE.childDirected`).
- [x] Ningún SDK de ads no certificado para Families (solo AdMob, y como placeholder).
- [x] Sin recolección de datos personales; sin tracking de menores (auditado).
- [x] Ads no personalizados, aptos para todo público (config lista; validar con IDs reales).
- [x] Gate parental antes de compras con dinero real.
- [x] Restaurar compras presente (conectar SDK real).
- [ ] **Política de privacidad publicada en una URL** y enlazada en la ficha de la tienda (usar `PRIVACY.md`).
- [x] Política de privacidad accesible dentro de la app (`PrivacyScene`).
- [ ] **Formularios completados:** Google Data Safety y Apple Privacy Nutrition Labels (deben decir: no se recolectan datos).
- [ ] **Clasificación por edad / cuestionario de contenido** completado en ambas tiendas.
- [ ] IDs de AdMob de **producción** con la config child-directed verificada en dispositivo (al integrar el SDK real).
- [ ] Revisión legal (recomendado para app comercial dirigida a menores).

## 4. Respuestas sugeridas para los formularios de datos

Con la implementación actual (cero recolección), las respuestas honestas son:

- **Google Data Safety:** "No se recolectan ni comparten datos del usuario". Ads:
  declarar el uso de AdMob con anuncios no personalizados.
- **Apple Privacy Labels:** "Data Not Collected". (Al integrar AdMob real, revisar
  si el SDK requiere declarar "Identifiers/Usage Data" aun en modo no
  personalizado, y ajustar la etiqueta en consecuencia.)

> Nota: cuando se integre el SDK real de AdMob, volvé a validar estas respuestas,
> porque algunos SDKs recolectan identificadores técnicos aun en modo no
> personalizado. La etiqueta debe reflejar lo que el SDK realmente hace.
