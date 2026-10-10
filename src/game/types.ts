export interface Vector2Like {
  x: number;
  y: number;
}

export interface PlayerInput {
  sequence: number;
  clientTick: number;
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  ability: boolean;
  interact: boolean;
}

export enum GamePhase {
  Ready = 'Ready',
  Playing = 'Playing',
  Victory = 'Victory',
  Defeat = 'Defeat',
}
