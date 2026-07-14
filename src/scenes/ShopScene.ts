import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { SaveManager } from '../systems/SaveManager';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import { SKINS, Skin } from '../systems/Skins';
import { IAPManager, ProductId } from '../systems/IAPManager';
import { COMPLIANCE } from '../config';
import { createButton } from '../ui/Button';
import { parentalGate } from '../ui/ParentalGate';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

type Tab = 'skins' | 'especiales';

// Tienda con pestañas. Cada ítem es una TARJETA tocable (la tarjeta entera es el
// botón), así no hay botones anidados que se solapen y escala a muchos ítems.
export class ShopScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Container;
  private tab: Tab = 'skins';
  private tabSkins?: Phaser.GameObjects.Container;
  private tabEspeciales?: Phaser.GameObjects.Container;

  constructor() {
    super('Shop');
  }

  create(): void {
    drawBackground(this);
    fadeIn(this);
    AdManager.showBanner();
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 80, 'TIENDA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '68px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(cx, 155, `🪙 ${SaveManager.coins}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffd23f',
      })
      .setOrigin(0.5);

    // Pestañas.
    this.tabSkins = this.buildTab('🎨 SKINS', 'skins', cx - 165);
    this.tabEspeciales = this.buildTab('✨ EXTRAS', 'especiales', cx + 165);

    // Botón volver (footer fijo).
    createButton(this, cx, GAME_HEIGHT - 80, '←  VOLVER', () => goto(this, 'Menu'), {
      width: 340,
      height: 92,
      fontSize: 32,
    });

    this.showTab(this.tab);
  }

  private refreshCoins(): void {
    this.coinsText.setText(`🪙 ${SaveManager.coins}`);
  }

  /** Gate parental antes de una compra con dinero real (ver kids-app-compliance).
   * Las compras con monedas del juego NO pasan por acá. */
  private async gateRealMoney(): Promise<boolean> {
    if (!COMPLIANCE.parentalGateForRealMoney) return true;
    return parentalGate(this);
  }

  // --- Pestañas ---
  private buildTab(label: string, tab: Tab, x: number): Phaser.GameObjects.Container {
    const w = 300;
    const h = 78;
    const c = this.add.container(x, 245);
    const bg = this.add.graphics();
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([bg, text]);
    c.setData('bg', bg);
    c.setData('w', w);
    c.setData('h', h);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', () => {
      SoundManager.unlock();
      if (this.tab !== tab) {
        SoundManager.coin();
        this.showTab(tab);
      }
    });
    return c;
  }

  private paintTab(c: Phaser.GameObjects.Container | undefined, active: boolean): void {
    if (!c) return;
    const bg = c.getData('bg') as Phaser.GameObjects.Graphics;
    const w = c.getData('w') as number;
    const h = c.getData('h') as number;
    bg.clear();
    bg.fillStyle(active ? COLORS.button : 0x1c1338, active ? 1 : 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    bg.lineStyle(3, active ? COLORS.accent : 0xffffff, active ? 1 : 0.12);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    this.paintTab(this.tabSkins, tab === 'skins');
    this.paintTab(this.tabEspeciales, tab === 'especiales');

    this.content?.destroy();
    this.content = this.add.container(0, 0);
    if (tab === 'skins') this.buildSkinsTab();
    else this.buildEspecialesTab();
  }

  // --- Pestaña de Skins (grilla de 2 columnas) ---
  private buildSkinsTab(): void {
    const colX = [GAME_WIDTH * 0.27, GAME_WIDTH * 0.73];
    const topY = 400;
    const stepY = 205;
    SKINS.forEach((skin, i) => {
      const x = colX[i % 2];
      const y = topY + Math.floor(i / 2) * stepY;
      this.buildSkinCard(skin, x, y);
    });
  }

  private buildSkinCard(skin: Skin, x: number, y: number): void {
    const w = 300;
    const h = 190;
    const owned = SaveManager.ownsSkin(skin.id);
    const selected = SaveManager.selectedSkin === skin.id;

    const card = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x241847, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, selected ? COLORS.good : 0xffffff, selected ? 1 : 0.12);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    card.add(bg);

    // Muestra de colores de la skin.
    skin.colors.forEach((col, i) => {
      const sw = this.add.rectangle(-46 + i * 46, -46, 40, 64, col).setStrokeStyle(2, 0xffffff, 0.3);
      card.add(sw);
    });

    card.add(
      this.add
        .text(0, 28, skin.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    // Estado / precio.
    let status: string;
    let color: string;
    if (selected) {
      status = '✓ EN USO';
      color = '#3ddc97';
    } else if (owned) {
      status = 'USAR';
      color = '#ffffff';
    } else {
      const affordable = SaveManager.coins >= skin.price;
      status = `🪙 ${skin.price}`;
      color = affordable ? '#ffd23f' : '#ff8fa3';
    }
    card.add(
      this.add
        .text(0, 70, status, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '30px',
          color,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    this.content.add(card);
    if (!selected) {
      this.attachTap(card, w, h, () => this.onSkinTap(skin));
    }
  }

  private onSkinTap(skin: Skin): void {
    if (SaveManager.ownsSkin(skin.id)) {
      SaveManager.selectSkin(skin.id);
      SoundManager.coin();
    } else if (SaveManager.spendCoins(skin.price)) {
      SaveManager.unlockSkin(skin.id);
      SaveManager.selectSkin(skin.id);
      SoundManager.perfect(3);
      this.refreshCoins();
    } else {
      SoundManager.smash();
      this.flashMessage('Monedas insuficientes');
      return;
    }
    this.showTab('skins'); // refresca estados
  }

  // --- Pestaña de Extras (IAP) ---
  private buildEspecialesTab(): void {
    let y = 400;
    const step = 180;

    // Quitar anuncios (no-consumible). Precio real desde la tienda (IAPManager).
    const adsPrice = IAPManager.getProduct('remove_ads').priceLabel;
    this.buildSpecialCard(
      '🚫 Quitar anuncios',
      SaveManager.adsRemoved ? 'Compra única · ACTIVO' : `Compra única · ${adsPrice}`,
      SaveManager.adsRemoved ? '✓ ACTIVO' : 'COMPRAR',
      SaveManager.adsRemoved ? '#3ddc97' : '#ffd23f',
      y,
      SaveManager.adsRemoved
        ? undefined
        : () => this.buyRealMoney('remove_ads')
    );
    y += step;

    // Pack de monedas (consumible).
    const coinsPrice = IAPManager.getProduct('coins_500').priceLabel;
    this.buildSpecialCard(
      '🪙 Pack de monedas',
      `+500 monedas · ${coinsPrice}`,
      'COMPRAR',
      '#ffd23f',
      y,
      () => this.buyRealMoney('coins_500')
    );
    y += step;

    // Restaurar compras (obligatorio en iOS para no-consumibles).
    this.buildSpecialCard(
      '↩ Restaurar compras',
      'Recuperá tus compras en otro dispositivo',
      'RESTAURAR',
      '#b9a6e0',
      y,
      () => this.restorePurchases()
    );
  }

  /** Flujo de compra con dinero real: gate parental → tienda → entregar SOLO si
   * la compra fue confirmada. */
  private async buyRealMoney(id: ProductId): Promise<void> {
    if (!(await this.gateRealMoney())) return;
    const result = await IAPManager.purchase(id);
    if (result === 'cancelled') return;
    if (result === 'error') {
      SoundManager.smash();
      this.flashMessage('No se pudo completar la compra');
      return;
    }
    // result === 'purchased' → entregar el ítem.
    this.deliverProduct(id);
  }

  private deliverProduct(id: ProductId): void {
    switch (id) {
      case 'remove_ads':
        SaveManager.setAdsRemoved(true);
        AdManager.hideBanner();
        this.flashMessage('¡Anuncios quitados!');
        break;
      case 'coins_500':
        SaveManager.addCoins(500);
        this.flashMessage('+500 🪙');
        break;
    }
    SoundManager.perfect(4);
    this.refreshCoins();
    this.showTab('especiales');
  }

  private async restorePurchases(): Promise<void> {
    const restored = await IAPManager.restore();
    if (restored.includes('remove_ads')) {
      SaveManager.setAdsRemoved(true);
      AdManager.hideBanner();
    }
    this.flashMessage(restored.length > 0 ? '¡Compras restauradas!' : 'No hay compras para restaurar');
    this.showTab('especiales');
  }

  private buildSpecialCard(
    title: string,
    subtitle: string,
    cta: string,
    ctaColor: string,
    y: number,
    action?: () => void
  ): void {
    const w = GAME_WIDTH - 90;
    const h = 150;
    const card = this.add.container(GAME_WIDTH / 2, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1e52, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(3, action ? COLORS.accent : COLORS.good, 0.5);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    card.add(bg);

    card.add(
      this.add
        .text(-w / 2 + 34, -28, title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '36px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
    );
    card.add(
      this.add
        .text(-w / 2 + 34, 26, subtitle, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          color: COLORS.textDim,
        })
        .setOrigin(0, 0.5)
    );
    card.add(
      this.add
        .text(w / 2 - 34, 0, cta, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: ctaColor,
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5)
    );

    this.content.add(card);
    if (action) this.attachTap(card, w, h, action);
  }

  // --- Interacción común de tarjetas ---
  private attachTap(
    card: Phaser.GameObjects.Container,
    w: number,
    h: number,
    action: () => void
  ): void {
    let busy = false;
    card.setSize(w, h);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    card.on('pointerover', () => card.setScale(1.03));
    card.on('pointerout', () => card.setScale(1));
    card.on('pointerdown', () => {
      if (busy) return;
      busy = true;
      SoundManager.unlock();
      this.tweens.add({
        targets: card,
        scale: 0.96,
        duration: 70,
        yoyo: true,
        onComplete: () => {
          action();
          if (card.active) {
            card.setScale(1);
            busy = false;
          }
        },
      });
    });
  }

  private flashMessage(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 180, msg, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: '#ffd23f',
        fontStyle: 'bold',
        backgroundColor: '#00000099',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(200);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: t.y - 40,
      delay: 900,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }
}
