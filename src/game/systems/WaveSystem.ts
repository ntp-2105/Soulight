import Phaser from 'phaser';
import { ChaserEnemy } from '../entities/ChaserEnemy';
import type { Player } from '../entities/Player';
import type { EnemyRenderer } from '../renderers/EnemyRenderer';
import type { Vector2Like } from '../types';
import type { EffectsSystem } from './EffectsSystem';

const AGGRO_RANGE = 480;

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

  spawn(points: readonly Vector2Like[]): void {
    for (const point of points) {
      const enemy = new ChaserEnemy(this.scene, point.x, point.y);
      this.enemies.add(enemy);
      this.allEnemies.add(enemy);
      this.renderer.track(enemy);
    }
  }

  update(player: Player, enabled: boolean): void {
    for (const enemy of this.allEnemies) {
      if (!enemy.active) continue;
      // Only enemies near the player wake up; the rest idle in their rooms (no pathfinding yet).
      if (enabled && Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y) < AGGRO_RANGE) enemy.chase(player);
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
