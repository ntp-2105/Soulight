export type AssetKind = 'image' | 'spritesheet' | 'font';

interface AssetBase {
  key: string;
  url: string;
  kind: AssetKind;
  sourceId: AssetSourceId;
  purpose: string;
}

export interface ImageAssetDefinition extends AssetBase {
  kind: 'image';
}

export interface SpritesheetDefinition extends AssetBase {
  kind: 'spritesheet';
  frameWidth: number;
  frameHeight: number;
  spacing?: number;
  margin?: number;
}

export interface FontAssetDefinition extends AssetBase {
  kind: 'font';
  family: string;
}

export type AssetDefinition = ImageAssetDefinition | SpritesheetDefinition | FontAssetDefinition;

export const ASSET_KEYS = {
  ACTORS: 'actors',
  DUNGEON: 'dungeon-tiles',
  RPG: 'rpg-tiles',
  PROMPTS: 'input-prompts',
  PANEL: 'ui-panel',
  PANEL_INLAY: 'ui-panel-inlay',
  BUTTON_PRESSED: 'ui-button-pressed',
  CROSSHAIR: 'crosshair',
  MAGIC: 'vfx-magic',
  EMBER: 'vfx-ember',
  SPARK: 'vfx-spark',
  SLASH: 'vfx-slash',
  SMOKE: 'vfx-smoke',
  FONT: 'kenney-pixel-font',
} as const;

export const ACTOR_FRAMES = {
  PLAYER: 84,
  ENEMY: 121,
  TORCH: 29,
  WEAPONS: {
    pistol: 129,
    shotgun: 130,
    sword: 105,
  },
} as const;

export const DUNGEON_FRAMES = {
  FLOOR: 9,
  FLOOR_ALT: 10,
  WALL: 68,
  CORNER: 8,
  ROCK: 404,
  MUSHROOM: 310,
} as const;

export const PROMPT_FRAMES = {
  ONE: 51,
  TWO: 52,
  THREE: 53,
  W: 87,
  A: 120,
  S: 121,
  D: 122,
  R: 89,
  MOUSE_LEFT: 569,
} as const;

export const ASSET_SOURCES = {
  tinyDungeon: { name: 'Kenney Tiny Dungeon', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/tiny-dungeon', licenseFile: 'assets/licenses/tiny-dungeon.txt' },
  caves: { name: 'Kenney Roguelike Caves & Dungeons', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/roguelike-caves-dungeons', licenseFile: 'assets/licenses/caves-dungeons.txt' },
  rpg: { name: 'Kenney Roguelike/RPG Pack', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/roguelike-rpg-pack', licenseFile: 'assets/licenses/roguelike-rpg.txt' },
  pixelUi: { name: 'Kenney Pixel UI Pack', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/pixel-ui-pack', licenseFile: 'assets/licenses/pixel-ui.txt' },
  prompts: { name: 'Kenney Input Prompts Pixel', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/input-prompts-pixel', licenseFile: 'assets/licenses/input-prompts.txt' },
  crosshair: { name: 'Kenney Crosshair Pack', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/crosshair-pack', licenseFile: 'assets/licenses/crosshair.txt' },
  particles: { name: 'Kenney Particle Pack', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/particle-pack', licenseFile: 'assets/licenses/particle-pack.txt' },
  fonts: { name: 'Kenney Fonts', license: 'CC0 1.0', sourceUrl: 'https://kenney.nl/assets/kenney-fonts', licenseFile: 'assets/licenses/kenney-fonts.txt' },
} as const;

export type AssetSourceId = keyof typeof ASSET_SOURCES;

export const ASSET_MANIFEST: readonly AssetDefinition[] = [
  { key: ASSET_KEYS.ACTORS, url: 'assets/world/tiny-dungeon.png', kind: 'spritesheet', frameWidth: 16, frameHeight: 16, sourceId: 'tinyDungeon', purpose: 'Player, enemy, torches, and weapon sprites' },
  { key: ASSET_KEYS.DUNGEON, url: 'assets/world/dungeon.png', kind: 'spritesheet', frameWidth: 16, frameHeight: 16, spacing: 1, sourceId: 'caves', purpose: 'Dungeon floor, walls, and decorations' },
  { key: ASSET_KEYS.RPG, url: 'assets/world/roguelike-rpg.png', kind: 'spritesheet', frameWidth: 16, frameHeight: 16, spacing: 1, sourceId: 'rpg', purpose: 'Fantasy environment and item library' },
  { key: ASSET_KEYS.PROMPTS, url: 'assets/ui/input-prompts.png', kind: 'spritesheet', frameWidth: 16, frameHeight: 16, sourceId: 'prompts', purpose: 'Keyboard and mouse control prompts' },
  { key: ASSET_KEYS.PANEL, url: 'assets/ui/panel.png', kind: 'image', sourceId: 'pixelUi', purpose: 'Fantasy UI panels and buttons' },
  { key: ASSET_KEYS.PANEL_INLAY, url: 'assets/ui/panel-inlay.png', kind: 'image', sourceId: 'pixelUi', purpose: 'Inset meters and UI surfaces' },
  { key: ASSET_KEYS.BUTTON_PRESSED, url: 'assets/ui/button-pressed.png', kind: 'image', sourceId: 'pixelUi', purpose: 'Pressed button state' },
  { key: ASSET_KEYS.CROSSHAIR, url: 'assets/ui/crosshair.png', kind: 'image', sourceId: 'crosshair', purpose: 'Mouse aim crosshair' },
  { key: ASSET_KEYS.MAGIC, url: 'assets/vfx/magic.png', kind: 'image', sourceId: 'particles', purpose: 'Wand bolts and magic flashes' },
  { key: ASSET_KEYS.EMBER, url: 'assets/vfx/ember.png', kind: 'image', sourceId: 'particles', purpose: 'Staff projectiles and flame effects' },
  { key: ASSET_KEYS.SPARK, url: 'assets/vfx/spark.png', kind: 'image', sourceId: 'particles', purpose: 'Combat impacts' },
  { key: ASSET_KEYS.SLASH, url: 'assets/vfx/slash.png', kind: 'image', sourceId: 'particles', purpose: 'Sword attack arc' },
  { key: ASSET_KEYS.SMOKE, url: 'assets/vfx/smoke.png', kind: 'image', sourceId: 'particles', purpose: 'Trails and defeat effects' },
  { key: ASSET_KEYS.FONT, url: 'assets/fonts/kenney-pixel.ttf', kind: 'font', family: 'Kenney Pixel', sourceId: 'fonts', purpose: 'Game typography' },
] as const;

export const GAME_FONT = '"Kenney Pixel", monospace';
