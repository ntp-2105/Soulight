export interface Vector2Like {
  x: number;
  y: number;
}

export interface PlayerInput {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
}

export enum GamePhase {
  Ready = 'Ready',
  Playing = 'Playing',
  Victory = 'Victory',
  Defeat = 'Defeat',
}
