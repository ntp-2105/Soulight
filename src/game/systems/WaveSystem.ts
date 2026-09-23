import Phaser from 'phaser';
import { ENEMY_SPAWNS } from '../../data/balance';
import { ChaserEnemy } from '../entities/ChaserEnemy';
import type { Player } from '../entities/Player';
import type { EnemyRenderer } from '../renderers/EnemyRenderer';
import type { EffectsSystem } from './EffectsSystem';

export class WaveSystem {
  readonly enemies: Phaser.Physics.Arcade.Group;
  private readonly allEnemies = new Set<ChaserEnemy>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly renderer: EnemyRenderer,
    private readonly effects: EffectsSystem,
  ) {
    this.enemies = scene.physics.add.group();
  }

  spawn(): void {
    for (const point of ENEMY_SPAWNS) {
      const enemy = new ChaserEnemy(this.scene, point.x, point.y);
      this.enemies.add(enemy);
      this.allEnemies.add(enemy);
      this.renderer.track(enemy);
    }
  }

  update(player: Player, enabled: boolean): void {
    for (const enemy of this.allEnemies) {
      if (!enemy.active) continue;
      if (enabled) enemy.chase(player);
      else enemy.stop();
    }
  }

  markKilled(enemy: ChaserEnemy): void {
    if (!enemy.active) return;
    enemy.setActive(false);
    enemy.setVelocity(0, 0);
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.renderer.untrack(enemy);
    this.effects.enemyDefeated(enemy.x, enemy.y);
    this.scene.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 1.7,
      duration: 140,
      onComplete: () => {
        this.allEnemies.delete(enemy);
        enemy.destroy();
      },
    });
  }

  livingCount(): number {
    let count = 0;
    for (const enemy of this.allEnemies) if (enemy.active) count += 1;
    return count;
  }

  livingEnemies(): ChaserEnemy[] {
    return [...this.allEnemies].filter((enemy) => enemy.active);
  }
}
