import Phaser from 'phaser';
import { ASSET_MANIFEST, GAME_FONT } from '../../data/assets';

export class BootScene extends Phaser.Scene {
  private readonly failedAssets: string[] = [];

  constructor() {
    super('BootScene');
  }

  preload(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#17120f');
    const title = this.add.text(width / 2, height / 2 - 42, 'OPENING THE DUNGEON...', {
      fontFamily: 'monospace', fontSize: '18px', color: '#f5d78e',
    }).setOrigin(0.5);
    const barBack = this.add.rectangle(width / 2, height / 2, 324, 20, 0x2a211a).setStrokeStyle(2, 0x9d7241);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 0, 12, 0xd8a657).setOrigin(0, 0.5);

    this.load.on('progress', (progress: number) => bar.setDisplaySize(316 * progress, 12));
    this.load.on('loaderror', (file: Phaser.Loader.File) => this.failedAssets.push(file.key));
    this.load.once('complete', () => {
      title.destroy();
      barBack.destroy();
      bar.destroy();
    });

    for (const asset of ASSET_MANIFEST) {
      if (asset.kind === 'image') {
        this.load.image(asset.key, asset.url);
      } else if (asset.kind === 'spritesheet') {
        this.load.spritesheet(asset.key, asset.url, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
          spacing: asset.spacing ?? 0,
          margin: asset.margin ?? 0,
        });
      }
    }
  }

  create(): void {
    if (this.failedAssets.length > 0) {
      this.showFatalAssetError();
      return;
    }

    const fontReady = document.fonts?.load(`16px ${GAME_FONT}`) ?? Promise.resolve([]);
    void fontReady.finally(() => this.scene.start('LobbyScene'));
  }

  private showFatalAssetError(): void {
    this.cameras.main.setBackgroundColor('#20100f');
    this.add.text(this.scale.width / 2, this.scale.height / 2, [
      'ASSET LOAD FAILED', '', ...this.failedAssets.map((key) => `- ${key}`), '',
      'Restore the files under public/assets and reload.',
    ], {
      fontFamily: 'monospace', fontSize: '18px', align: 'center', color: '#ffb49f',
    }).setOrigin(0.5);
  }
}
