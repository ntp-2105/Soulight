import Phaser from 'phaser';
import { ACTOR_FRAMES, ASSET_KEYS } from '../../data/assets';
import type { WeaponId } from '../../gameplay/weapons/WeaponDefinition';
import type { Player } from '../entities/Player';
import type { Vector2Like } from '../types';

export class PlayerRenderer {
  private readonly weapon: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player) {
    this.weapon = scene.add.image(player.x, player.y, ASSET_KEYS.ACTORS, ACTOR_FRAMES.WEAPONS.pistol)
      .setDisplaySize(30, 30)
      .setDepth(21);
  }

  update(aim: Vector2Like, weaponId: WeaponId): void {
    this.player.setFlipX(aim.x < 0);
    this.weapon
      .setFrame(ACTOR_FRAMES.WEAPONS[weaponId])
      .setPosition(this.player.x + aim.x * 21, this.player.y + aim.y * 21)
      .setRotation(Math.atan2(aim.y, aim.x) + Math.PI / 2)
      .setFlipY(aim.x < 0);
  }

  flash(): void {
    this.scene.tweens.killTweensOf(this.player);
    this.player.setTint(0xff5a74).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => this.player.active && this.player.clearTint());
  }

  destroy(): void {
    this.weapon.destroy();
  }
}
