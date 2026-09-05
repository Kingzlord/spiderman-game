export const WORLD_WIDTH = 3600;
export const GAME_HEIGHT = 570;
export const GROUND = 513;
export const BOSS_HEALTH = 180;

export type GameStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type EnemyKind = 'scout' | 'brute';

export interface Point { x: number; y: number }
export interface Rope { x: number; y: number; length: number }
export interface Player extends Point {
  vx: number;
  vy: number;
  facing: number;
  health: number;
  web: number;
  grounded: boolean;
  invincible: number;
  shotCooldown: number;
  dropTimer: number;
  rope: Rope | null;
}
export interface Building {
  x: number;
  y: number;
  width: number;
  style: number;
  tower?: boolean;
  sign?: string;
}
export interface Enemy extends Point {
  kind: EnemyKind;
  health: number;
  maxHealth: number;
  minX: number;
  maxX: number;
  direction: number;
  cooldown: number;
  trapped: number;
  hitFlash: number;
  dead: boolean;
}
export interface Boss extends Point {
  health: number;
  cooldown: number;
  hitFlash: number;
  facing: number;
}
export interface Projectile extends Point {
  vx: number;
  vy: number;
  life: number;
  kind: 'web' | 'pumpkin' | 'enemy';
  trail: Point[];
}
export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
export interface FloatingText extends Point {
  text: string;
  color: string;
  life: number;
  size: number;
}
export interface GameHud {
  health: number;
  web: number;
  score: number;
  bossHealth: number;
  defeated: number;
  totalEnemies: number;
  elapsed: number;
  combo: number;
}
export interface GameResult {
  score: number;
  elapsed: number;
  defeated: number;
  won: boolean;
  date: string;
}

export const BUILDINGS: Building[] = [
  { x: -80, y: 315, width: 325, style: 0, tower: true, sign: 'DAILY BUGLE' },
  { x: 314, y: 421, width: 246, style: 1, sign: 'DELI & GROCERY' },
  { x: 704, y: 386, width: 250, style: 2 },
  { x: 1100, y: 291, width: 307, style: 0, tower: true },
  { x: 1535, y: 363, width: 280, style: 2, sign: 'OSCORP' },
  { x: 1910, y: 439, width: 210, style: 1, sign: 'PIZZA' },
  { x: 2190, y: 331, width: 270, style: 0, tower: true },
  { x: 2640, y: 397, width: 275, style: 2 },
  { x: 3070, y: 286, width: 330, style: 0, tower: true, sign: 'MIDTOWN' },
];

export const INITIAL_HUD: GameHud = {
  health: 100, web: 100, score: 0, bossHealth: BOSS_HEALTH,
  defeated: 0, totalEnemies: 8, elapsed: 0, combo: 0,
};