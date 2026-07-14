// AdManager — interfaz única de anuncios (placeholder de AdMob).
//
// En navegador usa un MOCK (overlay simulado) para que el juego sea jugable sin
// SDK nativo. En dispositivo, aquí se conecta @capacitor-community/admob.
// Reglas de colocación y compliance: ver skills ad-monetization y
// kids-app-compliance. NUNCA llames al SDK directo desde una escena; pasá
// siempre por este manager.

import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob';
import { SaveManager } from './SaveManager';
import { COMPLIANCE } from '../config';

// IDs de TEST de AdMob. Reemplazar por los de producción antes de publicar
// (lo verifica el comando /build-release).
export const AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

// Opciones de request comunes a TODOS los anuncios, derivadas de COMPLIANCE.
// child-directed + non-personalized desactivan la publicidad comportamental,
// requisito para menores (COPPA / Google Families / GDPR-K). Se pasan al SDK
// real en cada llamada; nunca deben quedar en true los personalizados.
export const AD_REQUEST_OPTIONS = {
  // @capacitor-community/admob: 'npa' = non-personalized ads.
  npa: COMPLIANCE.nonPersonalizedAds ? '1' : '0',
  // Trato dirigido a niños (tagForChildDirectedTreatment) y bajo edad de
  // consentimiento (tagForUnderAgeOfConsent).
  tagForChildDirectedTreatment: COMPLIANCE.childDirected,
  tagForUnderAgeOfConsent: COMPLIANCE.childDirected,
  // Contenido apto para todo público.
  maxAdContentRating: 'G' as const,
};

// ¿Corremos dentro de Capacitor nativo? (En navegador puro, no → usa mock.)
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

// En desarrollo usamos ad units de TEST. Poner en false (o usar IDs de
// producción) antes de publicar — lo valida /build-release.
const AD_TESTING = true;

// Control de frecuencia de interstitials (ver skill ad-monetization).
let gamesSinceLastAd = 0;
let lastInterstitialAt = 0;
const INTERSTITIAL_EVERY_N_GAMES = 3;
const INTERSTITIAL_COOLDOWN_MS = 90_000;

export class AdManager {
  static async init(): Promise<void> {
    if (isNativePlatform()) {
      try {
        await AdMob.initialize({ initializeForTesting: AD_TESTING });
        // Nota compliance: el trato child-directed / under-age (TFCD/TFUA) para
        // menores se configura a nivel de app en AdMob y en el manifest/Info.plist
        // (ver MONETIZATION.md y COMPLIANCE.md). En cada request forzamos además
        // anuncios NO personalizados vía `npa` (ver AD_REQUEST_OPTIONS).
        console.info('[AdManager] AdMob inicializado (nativo).');
      } catch (e) {
        console.warn('[AdManager] fallo init AdMob:', e);
      }
    } else {
      console.info('[AdManager] init mock (navegador). Ads no personalizados / child-directed.');
    }
  }

  // --- Banner ---
  static async showBanner(): Promise<void> {
    if (SaveManager.adsRemoved) return; // respeta compra "quitar ads"
    if (isNativePlatform()) {
      try {
        await AdMob.showBanner({
          adId: AD_UNITS.banner,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: AD_TESTING,
          npa: COMPLIANCE.nonPersonalizedAds,
        });
      } catch (e) {
        console.warn('[AdManager] showBanner:', e);
      }
      return;
    }
    MockAds.showBanner();
  }

  static async hideBanner(): Promise<void> {
    if (isNativePlatform()) {
      try {
        await AdMob.hideBanner();
      } catch (e) {
        console.warn('[AdManager] hideBanner:', e);
      }
      return;
    }
    MockAds.hideBanner();
  }

  // --- Interstitial ---
  /** Llamar al terminar una partida. Decide internamente si toca mostrarlo. */
  static async maybeShowInterstitial(): Promise<void> {
    if (SaveManager.adsRemoved) return;
    gamesSinceLastAd += 1;

    const enoughGames = gamesSinceLastAd >= INTERSTITIAL_EVERY_N_GAMES;
    const cooledDown = Date.now() - lastInterstitialAt >= INTERSTITIAL_COOLDOWN_MS;
    if (!enoughGames || !cooledDown) return;

    gamesSinceLastAd = 0;
    lastInterstitialAt = Date.now();

    if (isNativePlatform()) {
      try {
        await AdMob.prepareInterstitial({
          adId: AD_UNITS.interstitial,
          isTesting: AD_TESTING,
          npa: COMPLIANCE.nonPersonalizedAds,
        });
        await AdMob.showInterstitial();
      } catch (e) {
        console.warn('[AdManager] interstitial:', e);
      }
      return;
    }
    await MockAds.showFullscreen('Anuncio (interstitial)');
  }

  // --- Rewarded (siempre opt-in) ---
  /**
   * Muestra un video recompensado. Resuelve `true` SOLO si el usuario ganó la
   * recompensa (vio el video completo). El caller entrega el premio recién con
   * ese true.
   */
  static async showRewarded(): Promise<boolean> {
    if (isNativePlatform()) {
      let earned = false;
      // El evento Rewarded solo dispara si el usuario completó el video.
      const listener = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (_item: AdMobRewardItem) => {
          earned = true;
        }
      );
      try {
        await AdMob.prepareRewardVideoAd({
          adId: AD_UNITS.rewarded,
          isTesting: AD_TESTING,
          npa: COMPLIANCE.nonPersonalizedAds,
        });
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.warn('[AdManager] rewarded:', e);
      } finally {
        await listener.remove();
      }
      return earned;
    }
    return MockAds.showRewarded();
  }
}

// -----------------------------------------------------------------------------
// MockAds — simulación visual para desarrollo en navegador. No forma parte del
// build nativo real (allá se usa AdMob). Sirve para probar los flujos de UX.
// -----------------------------------------------------------------------------
class MockAds {
  private static bannerEl: HTMLElement | null = null;

  static showBanner(): void {
    if (this.bannerEl) return;
    const el = document.createElement('div');
    el.textContent = 'BANNER (mock AdMob)';
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      color: '#ffd23f',
      font: '600 13px system-ui, sans-serif',
      letterSpacing: '1px',
      zIndex: '9999',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    this.bannerEl = el;
  }

  static hideBanner(): void {
    this.bannerEl?.remove();
    this.bannerEl = null;
  }

  static showFullscreen(label: string): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.buildOverlay(label, 'Toca para cerrar');
      overlay.addEventListener('pointerdown', () => {
        overlay.remove();
        resolve();
      });
    });
  }

  static showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = this.buildOverlay(
        'VIDEO RECOMPENSADO (mock)',
        'Toca "Reclamar" para simular ver el video completo'
      );
      const claim = document.createElement('button');
      claim.textContent = '▶ Reclamar recompensa';
      Object.assign(claim.style, {
        marginTop: '24px',
        padding: '14px 28px',
        fontSize: '16px',
        fontWeight: '700',
        color: '#1b1035',
        background: '#3ddc97',
        border: 'none',
        borderRadius: '12px',
      } as CSSStyleDeclaration);
      claim.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        overlay.remove();
        resolve(true); // recompensa ganada
      });
      overlay.appendChild(claim);
      // Tocar el fondo = cerrar sin recompensa.
      overlay.addEventListener('pointerdown', () => {
        overlay.remove();
        resolve(false);
      });
    });
  }

  private static buildOverlay(title: string, subtitle: string): HTMLElement {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
      background: 'rgba(10,4,25,0.92)',
      color: '#fff',
      font: '600 20px system-ui, sans-serif',
      zIndex: '10000',
    } as CSSStyleDeclaration);
    const t = document.createElement('div');
    t.textContent = title;
    const s = document.createElement('div');
    s.textContent = subtitle;
    Object.assign(s.style, {
      marginTop: '10px',
      fontSize: '13px',
      opacity: '0.7',
      fontWeight: '400',
    } as CSSStyleDeclaration);
    overlay.append(t, s);
    document.body.appendChild(overlay);
    return overlay;
  }
}
