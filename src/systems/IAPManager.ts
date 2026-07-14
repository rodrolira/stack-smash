// IAPManager — interfaz única de compras in-app (placeholder de RevenueCat).
//
// Misma arquitectura que AdManager: MOCK en navegador (para probar el flujo de
// UX sin SDK) y un punto claro donde se conecta @revenuecat/purchases-capacitor
// en dispositivo. NUNCA llames al SDK directo desde una escena; pasá por acá.
//
// Reglas: entregar el ítem SOLO tras confirmación de la tienda; precios reales
// localizados (los devuelve la tienda, no se hardcodean); restaurar compras
// obligatorio para no-consumibles (iOS). Ver skills in-app-purchases y
// kids-app-compliance.

import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { SaveManager } from './SaveManager';

export type ProductId = 'remove_ads' | 'coins_500';

// Claves PÚBLICAS de RevenueCat, una por plataforma (Android empieza con
// "goog_", iOS con "appl_"). Reemplazar antes de publicar. Son claves públicas
// del SDK; NO son secretas, pero NO commitees claves privadas/secret. Si siguen
// con el placeholder, el init nativo se salta (permite probar el resto de la app
// en un build nativo sin IAP configurado todavía). Ver REVENUECAT_SETUP.md.
const REVENUECAT_API_KEYS: Record<string, string> = {
  android: '<REVENUECAT_ANDROID_PUBLIC_SDK_KEY>',
  ios: '<REVENUECAT_IOS_PUBLIC_SDK_KEY>',
};

function revenueCatKey(): string {
  return REVENUECAT_API_KEYS[Capacitor.getPlatform()] ?? '';
}

// El entitlement (en el dashboard de RevenueCat) que representa "sin anuncios".
const REMOVE_ADS_ENTITLEMENT = 'remove_ads';

export interface Product {
  id: ProductId;
  type: 'nonconsumable' | 'consumable';
  title: string;
  priceLabel: string; // localizado por la tienda; en mock es un placeholder
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'error';

// Catálogo. En nativo, los priceLabel se sobreescriben con los de la tienda.
const CATALOG: Record<ProductId, Product> = {
  remove_ads: {
    id: 'remove_ads',
    type: 'nonconsumable',
    title: 'Quitar anuncios',
    priceLabel: 'US$1.99',
  },
  coins_500: {
    id: 'coins_500',
    type: 'consumable',
    title: 'Pack de 500 monedas',
    priceLabel: 'US$0.99',
  },
};

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export class IAPManager {
  private static products: Record<ProductId, Product> = { ...CATALOG };
  // Paquetes de RevenueCat mapeados por nuestro ProductId (solo en nativo).
  private static packages: Partial<Record<ProductId, PurchasesPackage>> = {};
  private static configured = false;

  static async init(): Promise<void> {
    if (!isNativePlatform()) {
      console.info('[IAPManager] init mock (navegador).');
      return;
    }
    const apiKey = revenueCatKey();
    if (!apiKey || apiKey.startsWith('<')) {
      console.warn('[IAPManager] falta la clave de RevenueCat: IAP nativo deshabilitado.');
      return;
    }
    try {
      await Purchases.configure({ apiKey });
      this.configured = true;
      // Cargar ofertas y mapear paquetes → precios localizados reales.
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (current) {
        for (const pkg of current.availablePackages) {
          const pid = pkg.product.identifier as ProductId;
          if (pid in CATALOG) {
            this.packages[pid] = pkg;
            this.products[pid] = { ...this.products[pid], priceLabel: pkg.product.priceString };
          }
        }
      }
      console.info('[IAPManager] RevenueCat configurado (nativo).');
    } catch (e) {
      console.warn('[IAPManager] fallo init RevenueCat:', e);
    }
  }

  static getProduct(id: ProductId): Product {
    return this.products[id];
  }

  /** Compra un producto. Resuelve el estado real de la transacción. La ENTREGA
   * del ítem la hace el caller SOLO si el resultado es 'purchased'. */
  static async purchase(id: ProductId): Promise<PurchaseResult> {
    if (!isNativePlatform()) {
      return MockStore.buy(this.products[id]);
    }
    const aPackage = this.packages[id];
    if (!this.configured || !aPackage) return 'error';
    try {
      await Purchases.purchasePackage({ aPackage });
      // Éxito: si no lanzó, la compra se completó (consumibles) o el entitlement
      // quedó activo (no-consumibles). El caller entrega el ítem.
      return 'purchased';
    } catch (e) {
      // RevenueCat marca la cancelación del usuario con userCancelled.
      const cancelled = !!(e as { userCancelled?: boolean }).userCancelled;
      return cancelled ? 'cancelled' : 'error';
    }
  }

  /** Restaura compras no-consumibles. Devuelve los IDs restaurados. */
  static async restore(): Promise<ProductId[]> {
    if (!isNativePlatform()) {
      // Mock: "restaura" lo que ya está marcado localmente (solo no-consumibles).
      return SaveManager.adsRemoved ? ['remove_ads'] : [];
    }
    if (!this.configured) return [];
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const out: ProductId[] = [];
      if (customerInfo.entitlements.active[REMOVE_ADS_ENTITLEMENT]) out.push('remove_ads');
      return out;
    } catch (e) {
      console.warn('[IAPManager] restore:', e);
      return [];
    }
  }
}

// -----------------------------------------------------------------------------
// MockStore — hoja de compra simulada para desarrollo en navegador. No forma
// parte del build nativo (allá se usa la tienda real).
// -----------------------------------------------------------------------------
class MockStore {
  static buy(product: Product): Promise<PurchaseResult> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        padding: '24px',
        textAlign: 'center',
        background: 'rgba(10,4,25,0.94)',
        color: '#fff',
        font: '600 20px system-ui, sans-serif',
        zIndex: '10001',
      } as CSSStyleDeclaration);

      const title = document.createElement('div');
      title.textContent = 'Tienda (simulada)';
      const info = document.createElement('div');
      info.textContent = `${product.title} — ${product.priceLabel}`;
      Object.assign(info.style, { fontSize: '17px', opacity: '0.85' } as CSSStyleDeclaration);

      const buy = document.createElement('button');
      buy.textContent = 'Confirmar compra';
      Object.assign(buy.style, {
        padding: '14px 28px',
        fontSize: '16px',
        fontWeight: '700',
        color: '#1b1035',
        background: '#3ddc97',
        border: 'none',
        borderRadius: '12px',
      } as CSSStyleDeclaration);

      const cancel = document.createElement('button');
      cancel.textContent = 'Cancelar';
      Object.assign(cancel.style, {
        padding: '10px 20px',
        fontSize: '15px',
        color: '#fff',
        background: 'transparent',
        border: '1px solid #ffffff44',
        borderRadius: '12px',
      } as CSSStyleDeclaration);

      const close = (result: PurchaseResult): void => {
        overlay.remove();
        resolve(result);
      };
      buy.addEventListener('click', () => close('purchased'));
      cancel.addEventListener('click', () => close('cancelled'));

      overlay.append(title, info, buy, cancel);
      document.body.appendChild(overlay);
    });
  }
}
