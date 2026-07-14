import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COMPLIANCE, BANNER_SAFE_Y } from '../config';
import { SaveManager } from '../systems/SaveManager';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import { HapticsManager } from '../systems/HapticsManager';
import { SKINS, Skin } from '../systems/Skins';
import { POWERUPS, PowerUp } from '../systems/PowerUps';
import { IAPManager, ProductId } from '../systems/IAPManager';
import { createButton } from '../ui/Button';
import { parentalGate } from '../ui/ParentalGate';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

type Tab = 'skins' | 'powerups' | 'especiales';

// Rareza según el precio: le da jerarquía visual al catálogo.
interface Rarity {
  label: string;
  color: number;
  glow: boolean;
}
function rarityOf(price: number): Rarity {
  if (price >= 900) return { label: 'LEGENDARIA', color: 0xffd23f, glow: true };
  if (price >= 500) return { label: 'ÉPICA', color: 0xb14bff, glow: true };
  if (price >= 200) return { label: 'RARA', color: 0x2ec5ff, glow: false };
  return { label: 'COMÚN', color: 0x8a80a6, glow: false };
}

// Tienda con pestañas. Cada ítem es una TARJETA tocable (sin botones anidados
// que se solapen), con rareza, brillo y badges para que entre por los ojos.
export class ShopScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Container;
  private tab: Tab = 'skins';
  private tabs: Partial<Record<Tab, Phaser.GameObjects.Container>> = {};

  constructor() {
    super('Shop');
  }

  create(): void {
    drawBackground(this);
    fadeIn(this);
    AdManager.showBanner();
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 70, 'TIENDA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '62px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(cx, 140, `🪙 ${SaveManager.coins}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffd23f',
      })
      .setOrigin(0.5);

    this.tabs.skins = this.buildTab('🎨 SKINS', 'skins', cx - 218);
    this.tabs.powerups = this.buildTab('⚡ POWER', 'powerups', cx);
    this.tabs.especiales = this.buildTab('✨ EXTRAS', 'especiales', cx + 218);

    // Arriba del banner de AdMob (que se superpone abajo).
    createButton(this, cx, BANNER_SAFE_Y, '←  VOLVER', () => goto(this, 'Menu'), {
      width: 330,
      height: 86,
      fontSize: 30,
    });

    this.showTab(this.tab);
  }

  private refreshCoins(): void {
    this.coinsText.setText(`🪙 ${SaveManager.coins}`);
  }

  private async gateRealMoney(): Promise<boolean> {
    if (!COMPLIANCE.parentalGateForRealMoney) return true;
    return parentalGate(this);
  }

  // --- Pestañas ---
  private buildTab(label: string, tab: Tab, x: number): Phaser.GameObjects.Container {
    const w = 205;
    const h = 74;
    const c = this.add.container(x, 225);
    const bg = this.add.graphics();
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([bg, text]);
    c.setData('bg', bg);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', () => {
      SoundManager.unlock();
      if (this.tab !== tab) {
        SoundManager.coin();
        HapticsManager.light();
        this.showTab(tab);
      }
    });
    return c;
  }

  private paintTab(c: Phaser.GameObjects.Container | undefined, active: boolean): void {
    if (!c) return;
    const bg = c.getData('bg') as Phaser.GameObjects.Graphics;
    const w = 205;
    const h = 74;
    bg.clear();
    bg.fillStyle(active ? COLORS.button : 0x1c1338, active ? 1 : 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 15);
    bg.lineStyle(3, active ? COLORS.accent : 0xffffff, active ? 1 : 0.12);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 15);
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    (['skins', 'powerups', 'especiales'] as Tab[]).forEach((t) =>
      this.paintTab(this.tabs[t], t === tab)
    );

    this.content?.destroy();
    this.content = this.add.container(0, 0);
    if (tab === 'skins') this.buildSkinsTab();
    else if (tab === 'powerups') this.buildPowerUpsTab();
    else this.buildEspecialesTab();
  }

  /** Badge chico en la esquina de una tarjeta (NUEVO, MEJOR VALOR, etc.). */
  private addBadge(
    card: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    color: number
  ): void {
    const g = this.add.graphics();
    const w = 8 + text.length * 12;
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - w / 2, y - 15, w, 30, 8);
    card.add(g);
    card.add(
      this.add
        .text(x, y, text, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#1b1035',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );
  }

  // --- Skins (grilla 2 columnas, con rareza y brillo) ---
  private buildSkinsTab(): void {
    const colX = [GAME_WIDTH * 0.27, GAME_WIDTH * 0.73];
    const topY = 370;
    const stepY = 190;
    SKINS.forEach((skin, i) => {
      this.buildSkinCard(skin, colX[i % 2], topY + Math.floor(i / 2) * stepY);
    });
  }

  private buildSkinCard(skin: Skin, x: number, y: number): void {
    const w = 300;
    const h = 185;
    const owned = SaveManager.ownsSkin(skin.id);
    const selected = SaveManager.selectedSkin === skin.id;
    const rarity = rarityOf(skin.price);

    const card = this.add.container(x, y);

    const bg = this.add.graphics();
    // Glow exterior para rarezas altas.
    if (rarity.glow && !owned) {
      bg.fillStyle(rarity.color, 0.18);
      bg.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 22);
    }
    bg.fillStyle(0x241847, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, selected ? COLORS.good : rarity.color, selected ? 1 : 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    card.add(bg);

    // Etiqueta de rareza.
    card.add(
      this.add
        .text(0, -72, rarity.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: '#' + rarity.color.toString(16).padStart(6, '0'),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    // Muestra de colores, con latido suave (llama la atención).
    skin.colors.forEach((col, i) => {
      const sw = this.add.rectangle(-46 + i * 46, -30, 40, 58, col).setStrokeStyle(2, 0xffffff, 0.3);
      card.add(sw);
      this.tweens.add({
        targets: sw,
        scaleY: 1.08,
        duration: 900 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    card.add(
      this.add
        .text(0, 26, skin.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '30px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    let status: string;
    let color: string;
    if (selected) {
      status = '✓ EN USO';
      color = '#3ddc97';
    } else if (owned) {
      status = 'USAR';
      color = '#ffffff';
    } else {
      status = `🪙 ${skin.price}`;
      color = SaveManager.coins >= skin.price ? '#ffd23f' : '#ff8fa3';
    }
    card.add(
      this.add
        .text(0, 66, status, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          color,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    this.content.add(card);
    if (!selected) this.attachTap(card, w, h, () => this.onSkinTap(skin));
  }

  private onSkinTap(skin: Skin): void {
    if (SaveManager.ownsSkin(skin.id)) {
      SaveManager.selectSkin(skin.id);
      SoundManager.coin();
    } else if (SaveManager.spendCoins(skin.price)) {
      SaveManager.unlockSkin(skin.id);
      SaveManager.selectSkin(skin.id);
      SoundManager.perfect(3);
      HapticsManager.success();
      this.refreshCoins();
    } else {
      SoundManager.smash();
      this.flashMessage('Monedas insuficientes');
      return;
    }
    this.showTab('skins');
  }

  // --- Power-ups (se compran con monedas, se usan en la partida) ---
  private buildPowerUpsTab(): void {
    this.content.add(
      this.add
        .text(GAME_WIDTH / 2, 330, 'Se activan tocándolos durante la partida', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          color: COLORS.textDim,
        })
        .setOrigin(0.5)
    );
    let y = 430;
    POWERUPS.forEach((p) => {
      this.buildPowerUpCard(p, y);
      y += 185;
    });
  }

  private buildPowerUpCard(p: PowerUp, y: number): void {
    const w = GAME_WIDTH - 90;
    const h = 155;
    const count = SaveManager.powerUpCount(p.id);
    const affordable = SaveManager.coins >= p.price;

    const card = this.add.container(GAME_WIDTH / 2, y);
    const bg = this.add.graphics();
    bg.fillStyle(p.color, 0.14);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, p.color, 0.8);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    card.add(bg);

    // Icono grande con latido.
    const icon = this.add.text(-w / 2 + 70, 0, p.emoji, { fontSize: '62px' }).setOrigin(0.5);
    card.add(icon);
    this.tweens.add({
      targets: icon,
      scale: 1.12,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    card.add(
      this.add
        .text(-w / 2 + 135, -32, p.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '36px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
    );
    card.add(
      this.add
        .text(-w / 2 + 135, 6, p.desc, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: COLORS.textDim,
        })
        .setOrigin(0, 0.5)
    );
    card.add(
      this.add
        .text(-w / 2 + 135, 42, `Tenés: x${count}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
    );

    card.add(
      this.add
        .text(w / 2 - 34, 0, `🪙 ${p.price}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: affordable ? '#ffd23f' : '#ff8fa3',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5)
    );

    this.content.add(card);
    this.attachTap(card, w, h, () => {
      if (!SaveManager.spendCoins(p.price)) {
        SoundManager.smash();
        this.flashMessage('Monedas insuficientes');
        return;
      }
      SaveManager.addPowerUp(p.id, 1);
      SoundManager.perfect(3);
      HapticsManager.success();
      this.refreshCoins();
      this.flashMessage(`${p.emoji} ${p.name} comprado`);
      this.showTab('powerups');
    });
  }

  // --- Extras (IAP con dinero real) ---
  private buildEspecialesTab(): void {
    let y = 400;
    const step = 180;

    const adsPrice = IAPManager.getProduct('remove_ads').priceLabel;
    this.buildSpecialCard(
      '🚫 Quitar anuncios',
      SaveManager.adsRemoved ? 'Compra única · ACTIVO' : `Compra única · ${adsPrice}`,
      SaveManager.adsRemoved ? '✓ ACTIVO' : 'COMPRAR',
      SaveManager.adsRemoved ? '#3ddc97' : '#ffd23f',
      y,
      SaveManager.adsRemoved ? undefined : () => this.buyRealMoney('remove_ads'),
      SaveManager.adsRemoved ? undefined : 'POPULAR'
    );
    y += step;

    const coinsPrice = IAPManager.getProduct('coins_500').priceLabel;
    this.buildSpecialCard(
      '🪙 Pack de monedas',
      `+500 monedas · ${coinsPrice}`,
      'COMPRAR',
      '#ffd23f',
      y,
      () => this.buyRealMoney('coins_500'),
      'MEJOR VALOR'
    );
    y += step;

    this.buildSpecialCard(
      '↩ Restaurar compras',
      'Recuperá tus compras en otro dispositivo',
      'RESTAURAR',
      '#b9a6e0',
      y,
      () => this.restorePurchases()
    );
  }

  private buildSpecialCard(
    title: string,
    subtitle: string,
    cta: string,
    ctaColor: string,
    y: number,
    action?: () => void,
    badge?: string
  ): void {
    const w = GAME_WIDTH - 90;
    const h = 150;
    const card = this.add.container(GAME_WIDTH / 2, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1e52, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(3, action ? COLORS.accent : COLORS.good, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    card.add(bg);

    card.add(
      this.add
        .text(-w / 2 + 34, -28, title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '34px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
    );
    card.add(
      this.add
        .text(-w / 2 + 34, 24, subtitle, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '23px',
          color: COLORS.textDim,
        })
        .setOrigin(0, 0.5)
    );
    card.add(
      this.add
        .text(w / 2 - 34, 20, cta, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '30px',
          color: ctaColor,
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5)
    );

    if (badge) this.addBadge(card, w / 2 - 70, -h / 2 + 4, badge, COLORS.accent);

    this.content.add(card);
    if (action) this.attachTap(card, w, h, action);
  }

  private async buyRealMoney(id: ProductId): Promise<void> {
    if (!(await this.gateRealMoney())) return;
    const result = await IAPManager.purchase(id);
    if (result === 'cancelled') return;
    if (result === 'error') {
      SoundManager.smash();
      this.flashMessage('No se pudo completar la compra');
      return;
    }
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
    HapticsManager.success();
    this.refreshCoins();
    this.showTab('especiales');
  }

  private async restorePurchases(): Promise<void> {
    const restored = await IAPManager.restore();
    if (restored.includes('remove_ads')) {
      SaveManager.setAdsRemoved(true);
      AdManager.hideBanner();
    }
    this.flashMessage(
      restored.length > 0 ? '¡Compras restauradas!' : 'No hay compras para restaurar'
    );
    this.showTab('especiales');
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
      HapticsManager.light();
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
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 260, msg, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
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
