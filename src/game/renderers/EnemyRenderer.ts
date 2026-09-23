import Phaser from 'phaser';
import { ASSET_KEYS } from '../../data/assets';
import type { ChaserEnemy } from '../entities/ChaserEnemy';

interface EnemyBar {
  back: Phaser.GameObjects.Image;
  fill: Phaser.GameObjects.Image;
}

export class EnemyRenderer {
  private readonly bars = new Map<ChaserEnemy, EnemyBar>();

  constructor(private readonly scene: Phaser.Scene) {}

  track(enemy: ChaserEnemy): void {
    const back = this.scene.add.image(enemy.x, enemy.y - 30, ASSET_KEYS.PANEL_INLAY)
      .setDisplaySize(48, 9)
      .setDepth(24);
    const fill = this.scene.add.image(enemy.x - 21, enemy.y - 30, ASSET_KEYS.PANEL)
      .setOrigin(0, 0.5)
      .setDisplaySize(42, 5)
      .setTint(0xc84438)
      .setDepth(25);
    this.bars.set(enemy, { back, fill });
  }

  update(): void {
    for (const [enemy, bar] of this.bars) {
      if (!enemy.active) {
        bar.back.setVisible(false);
        bar.fill.setVisible(false);
        continue;
      }
      const ratio = enemy.health / enemy.maxHealth;
      bar.back.setPosition(enemy.x, enemy.y - 30);
      bar.fill
        .setPosition(enemy.x - 21, enemy.y - 30)
        .setDisplaySize(Math.max(1, 42 * ratio), 5)
        .setTint(ratio > 0.45 ? 0xc84438 : 0xe28a35);
    }
  }

  flash(enemy: ChaserEnemy): void {
    enemy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => enemy.active && enemy.clearTint());
  }

  untrack(enemy: ChaserEnemy): void {
    const bar = this.bars.get(enemy);
    bar?.back.destroy();
    bar?.fill.destroy();
    this.bars.delete(enemy);
  }

  destroy(): void {
    for (const bar of this.bars.values()) {
      bar.back.destroy();
      bar.fill.destroy();
    }
    this.bars.clear();
  }
}
