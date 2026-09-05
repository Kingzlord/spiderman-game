import { GameAudio } from './audio';
import { drawCar, drawCitizen, drawEnemy, drawGoblin, drawPumpkin, drawSpider, drawWebRope, makeCityLayer } from './art';
import { BOSS_HEALTH, BUILDINGS, GAME_HEIGHT, GROUND, WORLD_WIDTH } from './types';
import type { Boss, Enemy, FloatingText, GameHud, GameResult, GameStatus, Particle, Player, Point, Projectile } from './types';

interface GameCallbacks {
  onHud: (hud: GameHud) => void;
  onStatus: (status: GameStatus) => void;
  onFinish: (result: GameResult) => void;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const GAME_KEYS = new Set(['a', 'd', 'w', 's', ' ', 'e', 'j', 'p', 'escape', 'enter', 'r', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown']);
const KEY_ALIASES: Record<string, string> = { arrowleft: 'a', arrowright: 'd', arrowup: 'w', arrowdown: 's', j: 'e' };
const normalizeKey = (key: string) => KEY_ALIASES[key.toLowerCase()] ?? key.toLowerCase();

export class CityGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameCallbacks;
  private audio = new GameAudio();
  private background = new Image();
  private city = makeCityLayer();
  private observer: ResizeObserver;
  private animationFrame = 0;
  private lastFrame = 0;
  private destroyed = false;
  private width = 1440;
  private camera = 0;
  private sceneTime = 0;
  private elapsed = 0;
  private hudTimer = 0;
  private keys = new Set<string>();
  private inputEnabled = true;
  private jumpQueued = false;
  private jumps = 0;
  private shooting = false;
  private mouseInside = false;
  private pointerAim = false;
  private mouse: Point = { x: 900, y: 220 };
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private shake = 0;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private status: GameStatus = 'ready';
  private player!: Player;
  private boss!: Boss;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks, muted: boolean) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.callbacks = callbacks;
    this.audio.setMuted(muted);
    this.background.src = '/images/city-sunset.png';
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.resize();
    this.reset(false);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.width = GAME_HEIGHT * rect.width / rect.height;
    this.ctx.imageSmoothingEnabled = false;
    this.camera = clamp(this.camera, 0, Math.max(0, WORLD_WIDTH - this.width));
  };

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
    if (!muted && this.status === 'playing') this.audio.unlock();
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    if (!enabled) this.clearInput();
  }

  getStatus() { return this.status; }

  start() {
    if (this.status === 'paused') { this.resume(); return; }
    if (this.status === 'playing') return;
    this.audio.unlock();
    if (this.status !== 'ready') this.reset(false);
    this.player.vx = 160;
    this.player.vy = -90;
    this.setStatus('playing');
    this.canvas.focus({ preventScroll: true });
  }

  restart() {
    this.audio.unlock();
    this.reset(true);
    this.canvas.focus({ preventScroll: true });
  }

  pause() {
    if (this.status !== 'playing') return;
    this.clearInput();
    this.setStatus('paused');
  }

  resume() {
    if (this.status !== 'paused') return;
    this.audio.unlock();
    this.setStatus('playing');
    this.canvas.focus({ preventScroll: true });
  }

  private setStatus(status: GameStatus) {
    this.status = status;
    this.callbacks.onStatus(status);
    this.emitHud();
  }

  private reset(play: boolean) {
    this.player = {
      x: Math.min(490, this.width * 0.37), y: 269, vx: 0, vy: 0, facing: 1,
      health: 100, web: 100, grounded: false, invincible: 0,
      shotCooldown: 0, dropTimer: 0, rope: null,
    };
    this.boss = { x: Math.min(1050, this.width * 0.78), y: 202, health: BOSS_HEALTH, cooldown: 2.5, hitFlash: 0, facing: -1 };
    this.enemies = BUILDINGS.slice(1).map((building, i) => {
      const brute = i % 3 === 1;
      return {
        x: i === 0 ? 628 : building.x + building.width * 0.58,
        y: i === 0 ? GROUND - 31 : building.y - 9 - (brute ? 37 : 31),
        kind: brute ? 'brute' : 'scout',
        health: brute ? 4 : 2, maxHealth: brute ? 4 : 2,
        minX: i === 0 ? 584 : building.x + 28,
        maxX: i === 0 ? 674 : building.x + building.width - 28,
        direction: i % 2 ? -1 : 1, cooldown: 2 + i * 0.4,
        trapped: 0, hitFlash: 0, dead: false,
      };
    });
    this.camera = 0;
    this.elapsed = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 0;
    this.jumps = 0;
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.clearInput();
    this.setStatus(play ? 'playing' : 'ready');
  }

  private clearInput() {
    this.keys.clear();
    this.shooting = false;
    this.jumpQueued = false;
    if (this.player) this.player.rope = null;
  }

  pressKey(rawKey: string) {
    if (!this.inputEnabled) return;
    const key = normalizeKey(rawKey);
    if (this.status === 'ready') this.start();
    if (this.status !== 'playing') return;
    if (key === 'w' && !this.keys.has(key)) this.jumpQueued = true;
    if (key === ' ' && !this.keys.has(key)) this.attachRope();
    if (key === 's' && this.player.grounded && !this.player.rope) {
      this.player.dropTimer = 0.35;
      this.player.y += 12;
      this.player.grounded = false;
    }
    this.keys.add(key);
  }

  releaseKey(rawKey: string) {
    const key = normalizeKey(rawKey);
    this.keys.delete(key);
    if (key === ' ' && this.player.rope) {
      this.player.rope = null;
      this.player.vx *= 1.09;
      this.player.vy -= 50;
      this.jumps = Math.min(this.jumps, 1);
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.inputEnabled || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    const key = event.key.toLowerCase();
    if (target?.closest('button, a') && (key === ' ' || key === 'enter')) return;
    if (!GAME_KEYS.has(key)) return;
    event.preventDefault();
    if (event.repeat && ['escape', 'p', 'r', 'enter'].includes(key)) return;
    if (key === 'escape' || key === 'p') {
      if (this.status === 'playing') this.pause();
      else if (this.status === 'paused') this.resume();
      return;
    }
    if (key === 'r') { if (this.status !== 'ready') this.restart(); return; }
    if (key === 'enter') { this.start(); return; }
    this.pressKey(key);
  };

  private onKeyUp = (event: KeyboardEvent) => { this.releaseKey(event.key); };
  private onBlur = () => { this.clearInput(); this.pause(); };
  private onVisibilityChange = () => { if (document.hidden) this.onBlur(); };
  private onContextMenu = (event: MouseEvent) => { event.preventDefault(); };
  private onPointerLeave = () => { this.mouseInside = false; };

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse = {
      x: (event.clientX - rect.left) / rect.width * this.width,
      y: (event.clientY - rect.top) / rect.height * GAME_HEIGHT,
    };
    this.mouseInside = true;
    this.pointerAim = event.pointerType !== 'touch';
  };

  private onPointerDown = (event: PointerEvent) => {
    if (!this.inputEnabled) return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.onPointerMove(event);
    if (this.status === 'ready') this.start();
    if (this.status !== 'playing') return;
    this.audio.unlock();
    if (event.button === 0) this.shooting = true;
    if (event.button === 2) this.pressKey(' ');
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.button === 0 || event.pointerType === 'touch') this.shooting = false;
    if (event.button === 2) this.releaseKey(' ');
  };

  private attachRope() {
    const p = this.player;
    if (p.web < 4) return;
    const anchors = BUILDINGS.flatMap((building, index) => [
      { x: building.x + building.width * 0.67, y: index === 0 ? 95 : building.y - (building.tower ? 100 : 66) },
      { x: building.x + 12, y: building.y - 11 },
      { x: building.x + building.width - 12, y: building.y - 11 },
    ]);
    const possible = anchors.filter(anchor => anchor.y < p.y - 75 && distance(p, anchor) < 680 && distance(p, anchor) > 120);
    possible.sort((a, b) => {
      const value = (anchor: Point) => distance(p, anchor) + ((anchor.x - p.x) * p.facing < 40 ? 260 : 0) + anchor.y * 0.3;
      return value(a) - value(b);
    });
    // Distant skyline anchors keep swinging available between low rooftops.
    const anchor = possible[0] ?? { x: clamp(p.x + p.facing * 290, 40, WORLD_WIDTH - 40), y: Math.max(24, p.y - 290) };
    p.rope = { ...anchor, length: distance(p, anchor) };
    p.web -= 4;
    if (p.grounded) { p.vy = -370; p.y -= 6; }
    p.vx += p.facing * 135;
    p.grounded = false;
    this.audio.play('swing');
    this.burst(anchor.x, anchor.y, '#f8e9cf', 8, 50);
  }

  private frame = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min((now - this.lastFrame) / 1000, 0.034);
    this.lastFrame = now;
    if (this.status === 'playing') {
      this.sceneTime += dt;
      this.update(dt);
    } else if (this.status === 'ready' && !this.reducedMotion) {
      this.sceneTime += dt;
      this.player.x = Math.min(490, this.width * 0.37) + Math.sin(this.sceneTime * 0.8) * 15;
      this.player.y = 266 + Math.sin(this.sceneTime * 0.8 + 0.5) * 14;
      this.boss.x = Math.min(1050, this.width * 0.78) + Math.sin(this.sceneTime * 0.7) * 22;
      this.boss.y = 204 + Math.sin(this.sceneTime * 1.3) * 12;
    } else if (this.status === 'won' || this.status === 'lost') this.updateEffects(dt);
    this.render();
    this.hudTimer += dt;
    if (this.hudTimer > 0.1 && this.status === 'playing') { this.emitHud(); this.hudTimer = 0; }
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.elapsed += dt;
    const p = this.player;
    p.invincible = Math.max(0, p.invincible - dt);
    p.shotCooldown = Math.max(0, p.shotCooldown - dt);
    p.dropTimer = Math.max(0, p.dropTimer - dt);
    p.web = Math.min(100, p.web + dt * 13);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.shake = Math.max(0, this.shake - dt * 28);
    const horizontal = Number(this.keys.has('d')) - Number(this.keys.has('a'));
    if (horizontal) {
      p.facing = horizontal;
      p.vx += horizontal * (p.grounded ? 1800 : p.rope ? 920 : 760) * dt;
    } else p.vx *= Math.exp(-(p.grounded ? 11 : 0.27) * dt);
    p.vx = clamp(p.vx, p.rope ? -610 : -340, p.rope ? 610 : 340);
    if (p.rope) {
      if (this.keys.has('w')) p.rope.length = Math.max(85, p.rope.length - dt * 160);
      if (this.keys.has('s')) p.rope.length = Math.min(650, p.rope.length + dt * 160);
    }
    if (this.jumpQueued) {
      if (!p.rope && (p.grounded || this.jumps < 2)) {
        p.vy = this.jumps === 0 ? -540 : -450;
        p.grounded = false;
        this.jumps++;
        this.burst(p.x, p.y + 37, '#cccbc0', 5, 65);
      }
      this.jumpQueued = false;
    }
    const previousFeet = p.y + 40;
    p.vy += 960 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.rope) {
      // A taut rope removes radial velocity but preserves the pendulum's momentum.
      const dx = p.x - p.rope.x;
      const dy = p.y - p.rope.y;
      const length = Math.hypot(dx, dy);
      if (length > p.rope.length) {
        const nx = dx / length;
        const ny = dy / length;
        p.x = p.rope.x + nx * p.rope.length;
        p.y = p.rope.y + ny * p.rope.length;
        const radialVelocity = p.vx * nx + p.vy * ny;
        if (radialVelocity > 0) { p.vx -= radialVelocity * nx; p.vy -= radialVelocity * ny; }
      }
    }
    p.grounded = false;
    if (p.vy >= 0 && p.dropTimer <= 0) {
      for (const building of BUILDINGS) {
        const roof = building.y - 9;
        if (p.x > building.x - 5 && p.x < building.x + building.width + 5 && previousFeet <= roof + 7 && p.y + 40 >= roof) {
          p.y = roof - 40;
          p.vy = 0;
          p.grounded = true;
          this.jumps = 0;
        }
      }
    }
    if (p.y + 40 > GROUND) {
      p.y = GROUND - 40;
      p.vy = 0;
      p.grounded = true;
      this.jumps = 0;
    }
    p.x = clamp(p.x, 28, WORLD_WIDTH - 28);
    if (p.y < 51) { p.y = 51; p.vy = Math.max(0, p.vy); }
    if (this.shooting || this.keys.has('e')) this.shoot(this.keys.has('e') || !this.pointerAim);
    this.updateEnemies(dt);
    if (this.status !== 'playing') return;
    this.updateBoss(dt);
    if (this.status !== 'playing') return;
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    const targetCamera = clamp(p.x - this.width * 0.37, 0, Math.max(0, WORLD_WIDTH - this.width));
    this.camera += (targetCamera - this.camera) * Math.min(1, dt * 5);
  }

  private shoot(autoAim: boolean) {
    const p = this.player;
    if (p.shotCooldown > 0 || p.web < 6) return;
    const targets: Point[] = this.enemies.filter(enemy => !enemy.dead && distance(p, enemy) < 850);
    if (this.boss.health > 0 && distance(p, this.boss) < 1000) targets.push(this.boss);
    let target: Point = { x: this.mouse.x + this.camera, y: this.mouse.y };
    if (autoAim) {
      targets.sort((a, b) => distance(p, a) - distance(p, b));
      target = targets[0] ?? { x: p.x + p.facing * 600, y: p.y - 18 };
    } else {
      const close = targets.find(enemy => distance(enemy, target) < 48);
      if (close) target = close;
    }
    p.facing = target.x >= p.x ? 1 : -1;
    const origin = { x: p.x + p.facing * 36, y: p.y - 17 };
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    this.projectiles.push({ ...origin, vx: Math.cos(angle) * 1040, vy: Math.sin(angle) * 1040, life: 1.25, kind: 'web', trail: [] });
    p.web -= 6;
    p.shotCooldown = 0.175;
    this.audio.play('web');
    if (Math.random() > 0.67) this.texts.push({ x: origin.x, y: origin.y - 18, text: 'THWIP!', color: '#f7e8c5', life: 0.45, size: 17 });
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.trapped = Math.max(0, enemy.trapped - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.cooldown -= dt;
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      if (Math.abs(dx) < 290 && Math.abs(dy) < 70) enemy.direction = Math.sign(dx) || 1;
      enemy.x += enemy.direction * (enemy.kind === 'brute' ? 34 : 48) * dt * (enemy.trapped > 0 ? 0.12 : 1);
      if (enemy.x < enemy.minX) { enemy.x = enemy.minX; enemy.direction = 1; }
      if (enemy.x > enemy.maxX) { enemy.x = enemy.maxX; enemy.direction = -1; }
      if (enemy.trapped > 0) continue;
      if (Math.abs(dx) < 33 && Math.abs(dy) < 60 && enemy.cooldown <= 0) {
        this.hurt(enemy.kind === 'brute' ? 14 : 9, enemy.x);
        enemy.cooldown = 1.5;
      } else if (Math.abs(dx) < 420 && Math.abs(dy) < 170 && enemy.cooldown <= 0) {
        const angle = Math.atan2(dy - 8, dx);
        this.projectiles.push({ x: enemy.x, y: enemy.y - 8, vx: Math.cos(angle) * 230, vy: Math.sin(angle) * 230, kind: 'enemy', life: 2.5, trail: [] });
        enemy.cooldown = enemy.kind === 'brute' ? 2.1 : 2.7;
      }
    }
  }

  private updateBoss(dt: number) {
    const boss = this.boss;
    if (boss.health <= 0) return;
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    const rage = boss.health < BOSS_HEALTH * 0.4;
    const targetX = clamp(this.player.x + Math.min(410, this.width * 0.37) + Math.sin(this.elapsed * 0.8) * 150, 150, WORLD_WIDTH - 110);
    boss.x += (targetX - boss.x) * dt * 1.1;
    boss.y = 186 + Math.sin(this.elapsed * (rage ? 1.8 : 1.1)) * 65;
    boss.facing = this.player.x < boss.x ? -1 : 1;
    boss.cooldown -= dt;
    if (boss.cooldown <= 0) {
      const aimX = this.player.x + this.player.vx * 0.4;
      const aimY = this.player.y - 5;
      const angle = Math.atan2(aimY - boss.y, aimX - boss.x);
      this.projectiles.push({ x: boss.x + boss.facing * 32, y: boss.y - 17, vx: Math.cos(angle) * 285, vy: Math.sin(angle) * 285 - 90, kind: 'pumpkin', life: 3.4, trail: [] });
      boss.cooldown = rage ? 1.15 : 2.0;
    }
    if (Math.random() < dt * 22) this.particles.push({ x: boss.x - boss.facing * 40, y: boss.y + 34, vx: -boss.facing * 30, vy: 15, life: 0.55, maxLife: 0.55, color: '#a585a1', size: 2 + Math.random() * 3 });
    if (distance(this.player, boss) < 44) this.hurt(15, boss.x);
  }

  private updateProjectiles(dt: number) {
    for (const projectile of this.projectiles) {
      if (projectile.life <= 0) continue;
      projectile.trail.push({ x: projectile.x, y: projectile.y });
      if (projectile.trail.length > (projectile.kind === 'web' ? 6 : 8)) projectile.trail.shift();
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      if (projectile.kind === 'web') {
        for (const enemy of this.enemies) {
          if (enemy.dead || Math.abs(projectile.x - enemy.x) > (enemy.kind === 'brute' ? 29 : 23) || Math.abs(projectile.y - enemy.y) > 39) continue;
          enemy.health--;
          enemy.trapped = 1.7;
          enemy.hitFlash = 0.1;
          projectile.life = 0;
          this.burst(projectile.x, projectile.y, '#eae5cf', 8, 80);
          this.audio.play('hit');
          if (enemy.health <= 0) {
            enemy.dead = true;
            this.award(enemy.kind === 'brute' ? 250 : 100, enemy);
            this.player.web = Math.min(100, this.player.web + 16);
            this.player.health = Math.min(100, this.player.health + 4);
            this.texts.push({ x: enemy.x, y: enemy.y - 42, text: 'WEBBED!', color: '#f1e6c8', life: 0.95, size: 23 });
          }
          break;
        }
        if (projectile.life > 0 && this.boss.health > 0 && Math.abs(projectile.x - this.boss.x) < 56 && Math.abs(projectile.y - this.boss.y + 10) < 56) {
          this.boss.health = Math.max(0, this.boss.health - 9);
          this.boss.hitFlash = 0.13;
          projectile.life = 0;
          this.score += 25;
          this.audio.play('hit');
          this.burst(projectile.x, projectile.y, '#d9e4ad', 10, 90);
          if (this.boss.health <= 0) {
            this.burst(this.boss.x, this.boss.y, '#a5bd70', 40, 220);
            this.burst(this.boss.x, this.boss.y, '#ac77a0', 28, 160);
            this.finish(true);
            return;
          }
        }
        if (projectile.life > 0) {
          for (const bomb of this.projectiles) {
            if (bomb.kind === 'pumpkin' && bomb.life > 0 && distance(projectile, bomb) < 21) {
              bomb.life = 0;
              projectile.life = 0;
              this.burst(bomb.x, bomb.y, '#edbb70', 18, 110);
              this.score += 50;
              this.texts.push({ x: bomb.x, y: bomb.y - 12, text: '+50', color: '#efd89c', life: 0.7, size: 21 });
              this.audio.play('hit');
              break;
            }
          }
        }
      } else if (projectile.kind === 'pumpkin') {
        projectile.vy += 185 * dt;
        if (distance(projectile, this.player) < 35 || projectile.y > GROUND - 6 || projectile.life <= 0) {
          this.explode(projectile);
          projectile.life = 0;
          if (this.status !== 'playing') return;
        }
      } else if (Math.abs(projectile.x - this.player.x) < 23 && Math.abs(projectile.y - this.player.y) < 39) {
        this.hurt(8, projectile.x);
        projectile.life = 0;
        this.burst(projectile.x, projectile.y, '#b09dbc', 7, 75);
        if (this.status !== 'playing') return;
      }
    }
    this.projectiles = this.projectiles.filter(projectile => projectile.life > 0 && projectile.x > -100 && projectile.x < WORLD_WIDTH + 100 && projectile.y > -150);
  }

  private explode(projectile: Projectile) {
    this.burst(projectile.x, projectile.y, '#f5bd6d', 26, 180);
    this.burst(projectile.x, projectile.y, '#ba7151', 18, 130);
    this.texts.push({ x: projectile.x, y: projectile.y - 18, text: 'BOOM!', color: '#efba79', life: 0.65, size: 28 });
    if (distance(projectile, this.player) < 85) this.hurt(18, projectile.x);
    this.audio.play('bomb');
    if (Math.abs(projectile.x - this.player.x) < 700) this.shake = Math.max(this.shake, 4);
  }

  private hurt(amount: number, sourceX: number) {
    if (this.player.invincible > 0 || this.status !== 'playing') return;
    this.player.health = Math.max(0, this.player.health - amount);
    this.player.invincible = 1.05;
    this.player.vx += this.player.x > sourceX ? 120 : -120;
    this.combo = 0;
    this.shake = 6;
    this.audio.play('hurt');
    this.burst(this.player.x, this.player.y, '#e47565', 13, 95);
    this.emitHud();
    if (this.player.health <= 0) this.finish(false);
  }

  private award(amount: number, location: Point) {
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = 4;
    const earned = Math.round(amount * (1 + Math.min(7, this.combo - 1) * 0.2));
    this.score += earned;
    this.texts.push({ ...location, y: location.y - 12, text: `+${earned}`, color: '#efe6c9', life: 1.2, size: 24 });
  }

  private finish(won: boolean) {
    if (this.status !== 'playing') return;
    if (won) this.score += 1000 + Math.ceil(this.player.health) * 10;
    this.clearInput();
    this.setStatus(won ? 'won' : 'lost');
    this.audio.play(won ? 'win' : 'lose');
    this.callbacks.onFinish({ score: this.score, elapsed: this.elapsed, defeated: this.enemies.filter(enemy => enemy.dead).length, won, date: new Date().toISOString() });
  }

  private burst(x: number, y: number, color: string, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed;
      const life = 0.3 + Math.random() * 0.6;
      this.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, color, life, maxLife: life, size: 1 + Math.random() * 3 });
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  private updateEffects(dt: number) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += dt * 150;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    for (const text of this.texts) { text.life -= dt; text.y -= dt * 32; }
    this.texts = this.texts.filter(text => text.life > 0);
  }

  private emitHud() {
    if (!this.player) return;
    this.callbacks.onHud({
      health: Math.ceil(this.player.health), web: Math.floor(this.player.web), score: this.score,
      bossHealth: this.boss.health, defeated: this.enemies.filter(enemy => enemy.dead).length,
      totalEnemies: this.enemies.length, elapsed: Math.floor(this.elapsed), combo: this.combo,
    });
  }

  private render() {
    const ctx = this.ctx;
    const width = this.width;
    ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / GAME_HEIGHT, 0, 0);
    ctx.globalAlpha = 1;
    const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    sky.addColorStop(0, '#ba8994'); sky.addColorStop(0.65, '#d6a084'); sky.addColorStop(1, '#344651');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, GAME_HEIGHT);
    ctx.save();
    if (!this.reducedMotion && this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    if (this.background.complete && this.background.naturalWidth) ctx.drawImage(this.background, -40 - this.camera * 0.04, -28, width + 210, GAME_HEIGHT + 36);
    else {
      ctx.fillStyle = '#eac09b'; ctx.beginPath(); ctx.arc(width * 0.62, 183, 73, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 32; i++) {
        const height = 100 + Math.sin(i * 3.7) * 80 + i % 4 * 28;
        ctx.fillStyle = i % 2 ? '#465462' : '#615d70'; ctx.fillRect(i * 65 - this.camera * 0.08, GAME_HEIGHT - height - 40, 55, height + 40);
      }
    }
    const dusk = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    dusk.addColorStop(0, 'rgba(49,35,55,.09)'); dusk.addColorStop(1, 'rgba(12,28,40,.2)');
    ctx.fillStyle = dusk; ctx.fillRect(0, 0, width, GAME_HEIGHT);
    ctx.strokeStyle = 'rgba(46,52,61,.55)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      const bx = (width * 0.48 + i * 31 + this.sceneTime * 8) % (width + 20);
      const by = 126 + Math.sin(i * 2) * 13;
      ctx.beginPath(); ctx.moveTo(bx - 4, by - Math.sin(this.sceneTime * 4 + i) * 2); ctx.lineTo(bx, by + 1); ctx.lineTo(bx + 4, by - Math.sin(this.sceneTime * 4 + i) * 2); ctx.stroke();
    }
    ctx.translate(-this.camera, 0);
    ctx.drawImage(this.city, 0, 0);
    for (let i = 0; i < 7; i++) {
      const citizenX = (348 + i * 454 + Math.sin(this.sceneTime * 0.02 + i) * 120) % WORLD_WIDTH;
      if (citizenX > this.camera - 20 && citizenX < this.camera + width + 20) drawCitizen(ctx, citizenX, this.sceneTime, i);
    }
    for (const enemy of this.enemies) {
      if (enemy.x > this.camera - 70 && enemy.x < this.camera + width + 70) drawEnemy(ctx, enemy, this.sceneTime);
    }
    if (this.status === 'ready') drawWebRope(ctx, this.player, { x: 138, y: 95 }, this.sceneTime);
    else if (this.player.rope) drawWebRope(ctx, this.player, this.player.rope, this.sceneTime);
    if (this.boss.health > 0) drawGoblin(ctx, this.boss, this.sceneTime);
    if (this.player.invincible <= 0 || Math.floor(this.player.invincible * 15) % 2 === 0) drawSpider(ctx, this.player, this.sceneTime, this.status === 'ready' || !!this.player.rope);
    for (const projectile of this.projectiles) this.drawProjectile(projectile);
    for (let i = 0; i < 7; i++) {
      const direction = i % 3 === 1 ? -1 : 1;
      const x = ((400 + i * 554 + this.sceneTime * (i % 2 ? 34 : 46) * direction) % (WORLD_WIDTH + 180) + WORLD_WIDTH + 180) % (WORLD_WIDTH + 180) - 90;
      if (x > this.camera - 100 && x < this.camera + width + 100) drawCar(ctx, x, GROUND + 29 + (direction === -1 ? 10 : 0), i % 4, direction, this.sceneTime);
    }
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.min(1, particle.life / particle.maxLife * 1.5);
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    for (const text of this.texts) {
      ctx.save(); ctx.translate(text.x, text.y); ctx.rotate(-0.1);
      ctx.globalAlpha = Math.min(1, text.life * 3);
      ctx.font = `italic 800 ${text.size}px "Barlow Condensed", Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#23323a';
      ctx.strokeText(text.text, 0, 0); ctx.fillStyle = text.color; ctx.fillText(text.text, 0, 0); ctx.restore();
    }
    if (this.mouseInside && this.pointerAim && this.status === 'playing' && this.inputEnabled) {
      const x = this.mouse.x + this.camera;
      const y = this.mouse.y;
      ctx.strokeStyle = 'rgba(255,246,225,.85)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12); ctx.lineTo(x + Math.cos(angle) * 17, y + Math.sin(angle) * 17); ctx.stroke();
      }
    }
    ctx.restore();
    if (this.player.invincible > 0.86) {
      ctx.fillStyle = `rgba(215,47,46,${(this.player.invincible - 0.86) * 0.45})`;
      ctx.fillRect(0, 0, width, GAME_HEIGHT);
    }
  }

  private drawProjectile(projectile: Projectile) {
    const ctx = this.ctx;
    ctx.save();
    if (projectile.trail.length > 1) {
      ctx.beginPath();
      projectile.trail.forEach((point, i) => i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.lineTo(projectile.x, projectile.y);
      ctx.strokeStyle = projectile.kind === 'web' ? '#f4efdb' : projectile.kind === 'pumpkin' ? 'rgba(228,161,87,.48)' : 'rgba(175,145,186,.6)';
      ctx.lineWidth = projectile.kind === 'web' ? 2.1 : 2.5; ctx.stroke();
    }
    if (projectile.kind === 'pumpkin') drawPumpkin(ctx, projectile.x, projectile.y, this.sceneTime * 5);
    else if (projectile.kind === 'web') {
      ctx.strokeStyle = '#fff5de'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(projectile.x, projectile.y, 6, 3, Math.atan2(projectile.vy, projectile.vx), 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#c3a9cc'; ctx.fillRect(projectile.x - 3, projectile.y - 3, 6, 6);
      ctx.fillStyle = '#f0d8ed'; ctx.fillRect(projectile.x - 1, projectile.y - 1, 2, 2);
    }
    ctx.restore();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.observer.disconnect();
    this.audio.destroy();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}