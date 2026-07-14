---
name: kids-app-compliance
description: Cumplimiento para apps usables por menores en Stack & Smash — Google Play Families, Apple Kids, COPPA (EE.UU.), GDPR-K (UE), y qué SDKs de ads/anuncios están permitidos.
---

# Kids App Compliance — Stack & Smash

Checklist legal/políticas para una app dirigida o atractiva a menores. Úsala
ANTES de elegir proveedor de ads, definir el catálogo de compras, o preparar
un build de release. Esta es la parte más riesgosa del proyecto.

> ⚠️ **Decisión clave primero:** ¿la app se categoriza "para niños" en las
> tiendas, o "para todos" / "mixed audience"? Esa clasificación cambia qué
> podés hacer. Si es "para niños", las reglas de abajo son obligatorias, no
> opcionales. No la marques "para niños" sin entender las consecuencias de ads.

## Google Play — Families / "Diseñado para la familia"

- Solo podés usar **SDKs de ads certificados por Google** para el programa
  Families. AdMob es compatible **si** configurás el contenido como dirigido a
  menores (tag-for-child-directed-treatment / TFUA) — eso desactiva los
  anuncios personalizados por comportamiento.
- Los anuncios deben ser aptos para todo público (rating adecuado).
- Requiere completar la sección "Público objetivo y contenido" y, muchas veces,
  el cuestionario de contenido / clasificación por edad.

## Apple App Store — categoría Kids

- Si usás la **categoría Kids**, NO podés incluir enlaces externos, compras ni
  publicidad de terceros **fuera** de un gate de control parental, y los ads
  deben ser apropiados para menores.
- App Tracking Transparency (ATT): no rastrear a menores. Nada de IDFA para
  publicidad personalizada dirigida a niños.

## COPPA (EE.UU. — menores de 13)

- Prohibido recolectar datos personales de menores de 13 sin consentimiento
  parental verificable.
- **No publicidad personalizada/comportamental** a menores → configurar AdMob
  con "child-directed treatment".
- Minimizar datos: no pidas nombre, email, ubicación precisa, ni logins
  sociales para jugar.

## GDPR-K (UE — menores, edad de consentimiento 13-16 según país)

- Base legal reforzada para tratar datos de menores; en la práctica: no
  recolectes datos y no personalices anuncios.
- Si mostrás cualquier consentimiento, debe ser comprensible y no manipulador
  (nada de "dark patterns").

## Anuncios: qué está PROHIBIDO en apps para niños

- Anuncios **personalizados por comportamiento** (deben ser contextuales).
- Anuncios **engañosos** ("ganaste un premio", botones de cierre falsos, X
  diminutas o fantasma).
- **Redirigir a la tienda o a un sitio sin confirmación explícita** del usuario.
- Contenido inapropiado (violencia real, apuestas, citas, etc.).
- Incentivar clics de forma engañosa.

## Compras (IAP) para menores

- Las compras deben requerir intención clara; en categoría Kids de Apple, van
  detrás de un **gate parental**.
- Precios reales localizados, sin presión artificial ni "loot boxes" opacas.
- Botón de restaurar compras presente.

## Privacidad y datos

- Publicá una **Política de Privacidad** accesible (requisito de ambas tiendas).
- Completá los formularios de datos: Apple **Privacy Nutrition Labels** y Google
  **Data Safety**. Deben coincidir con lo que la app realmente hace.
- Objetivo de diseño: **recolectar cero datos personales**. Todo el estado
  (monedas, skins, records) vive local en el dispositivo.

## Checklist final antes de publicar

- [ ] Decidida y documentada la clasificación de audiencia.
- [ ] AdMob configurado con child-directed treatment / TFUA si aplica.
- [ ] Ningún SDK de ads no certificado para Families.
- [ ] Sin recolección de datos personales; sin tracking de menores.
- [ ] Ads no engañosos, no personalizados, aptos para todo público.
- [ ] IAP con precios reales, restaurar compras, y gate parental si categoría Kids.
- [ ] Política de privacidad publicada y enlazada en la app y en la ficha.
- [ ] Formularios Data Safety (Google) y Privacy Labels (Apple) completos y veraces.
- [ ] Clasificación por edad / cuestionario de contenido completado.

> Esto es orientación de políticas de plataforma, no asesoría legal. Para una
> app comercial dirigida a menores, conviene una revisión legal real antes de
> publicar.
