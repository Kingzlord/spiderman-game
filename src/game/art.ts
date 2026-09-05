import { BUILDINGS, GAME_HEIGHT, GROUND, WORLD_WIDTH } from './types';
import type { Boss, Building, Enemy, Player, Point } from './types';

const INK = '#12212d';
const RED = '#ed443e';
const BLUE = '#28559b';

function polygon(ctx: CanvasRenderingContext2D, points: number[][], fill: string, stroke = INK, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function line(ctx: CanvasRenderingContext2D, points: number[][], color: string, width: number) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function noise(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function waterTower(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  line(ctx, [[-24, -18], [-29, 0]], '#1b2b32', 5);
  line(ctx, [[24, -18], [29, 0]], '#1b2b32', 5);
  line(ctx, [[-25, -19], [26, -1], [-26, -1], [24, -19]], '#30474b', 2);
  ctx.fillStyle = '#243a40';
  ctx.fillRect(-31, -74, 62, 56);
  ctx.fillStyle = '#344a4b';
  ctx.fillRect(-29, -72, 11, 51);
  ctx.fillStyle = '#142a34';
  ctx.fillRect(19, -72, 12, 54);
  for (let i = -27; i < 30; i += 7) line(ctx, [[i, -72], [i, -19]], '#1a3037', 1);
  line(ctx, [[-32, -59], [31, -59]], '#637070', 2);
  line(ctx, [[-32, -28], [31, -28]], '#617071', 2);
  polygon(ctx, [[-35, -74], [0, -91], [35, -74]], '#243940', '#1b3037', 2);
  line(ctx, [[-34, -75], [0, -92]], '#ac816b', 2);
  ctx.restore();
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, index: number) {
  const { x, y, width: w, style } = b;
  const palettes = [
    ['#1b303c', '#263e49', '#132630', '#344c54'],
    ['#293337', '#3b4141', '#172a30', '#4d5450'],
    ['#23333d', '#32444b', '#15262f', '#43525a'],
  ];
  const [base, light, dark, sill] = palettes[style];
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, GROUND - y);
  ctx.fillStyle = dark;
  ctx.fillRect(x + w - 21, y, 21, GROUND - y);
  ctx.fillStyle = light;
  ctx.fillRect(x + 4, y + 5, 5, GROUND - y - 5);
  for (let by = y + 14; by < GROUND; by += 15) {
    ctx.fillStyle = 'rgba(8, 20, 27, .22)';
    ctx.fillRect(x + 9, by, w - 31, 1);
    for (let bx = x + 12 + (by % 2) * 13; bx < x + w - 25; bx += 29) ctx.fillRect(bx, by, 1, 14);
  }
  const columns = Math.floor((w - 34) / 38);
  const spacing = (w - 36) / columns;
  for (let row = 0; row < Math.floor((GROUND - y - 28) / 45); row++) {
    for (let col = 0; col < columns; col++) {
      const wx = Math.round(x + 17 + col * spacing);
      const wy = y + 23 + row * 45;
      const lit = noise(index * 100 + col * 3 + row * 17) > 0.6;
      ctx.fillStyle = '#10252f';
      ctx.fillRect(wx - 2, wy - 2, 24, 29);
      ctx.fillStyle = lit ? (noise(col + row * 11) > 0.5 ? '#c3a073' : '#9f8970') : '#354a50';
      ctx.fillRect(wx, wy, 20, 24);
      ctx.fillStyle = lit ? '#92745b' : '#293e47';
      ctx.fillRect(wx + 12, wy, 8, 24);
      ctx.fillStyle = dark;
      ctx.fillRect(wx + 9, wy, 2, 24);
      ctx.fillRect(wx, wy + 11, 20, 2);
      ctx.fillStyle = sill;
      ctx.fillRect(wx - 3, wy + 25, 26, 3);
    }
  }
  ctx.fillStyle = '#132934';
  ctx.fillRect(x - 5, y - 5, w + 10, 10);
  ctx.fillStyle = '#5c6260';
  ctx.fillRect(x - 6, y - 8, w + 12, 3);
  ctx.fillStyle = '#b28b71';
  ctx.fillRect(x - 6, y - 9, w + 12, 1);
  ctx.fillStyle = '#263a43';
  ctx.fillRect(x + 28, y - 26, 37, 18);
  ctx.fillStyle = '#5d6663';
  ctx.fillRect(x + 25, y - 29, 43, 4);
  for (let vx = x + 32; vx < x + 62; vx += 5) {
    ctx.fillStyle = '#152b36';
    ctx.fillRect(vx, y - 22, 2, 9);
  }
  ctx.fillStyle = '#293d44';
  ctx.fillRect(x + w - 58, y - 24, 14, 15);
  ctx.fillStyle = '#5d6260';
  ctx.fillRect(x + w - 62, y - 26, 22, 3);
  if (b.tower) waterTower(ctx, x + w * 0.67, y - 8, index === 0 ? 1.12 : 0.92);
  else {
    line(ctx, [[x + w - 65, y - 9], [x + w - 65, y - 68]], '#253841', 3);
    line(ctx, [[x + w - 86, y - 48], [x + w - 43, y - 48]], '#31454a', 2);
    line(ctx, [[x + w - 79, y - 57], [x + w - 49, y - 57]], '#31454a', 2);
  }
  if (index === 0) {
    line(ctx, [[138, y - 105], [138, 92]], '#2b3b42', 2);
    line(ctx, [[124, 113], [152, 113]], '#304048', 2);
    line(ctx, [[130, 102], [146, 102]], '#304048', 2);
    line(ctx, [[124, 128], [152, 128]], '#304048', 2);
  }
  if (style === 0) {
    const fx = x + w - 86;
    for (let fy = y + 59; fy < GROUND - 25; fy += 48) {
      line(ctx, [[fx, fy - 18], [fx, fy], [fx + 54, fy], [fx + 54, fy - 18]], '#10232d', 3);
      line(ctx, [[fx, fy - 14], [fx + 54, fy - 14]], '#415056', 1);
      line(ctx, [[fx + 46, fy], [fx + 8, fy + 48]], '#12262f', 4);
      for (let rx = fx + 9; rx < fx + 54; rx += 9) line(ctx, [[rx, fy - 14], [rx, fy]], '#12262f', 2);
    }
  }
  if (b.sign) {
    const signW = b.sign.length * 7 + 20;
    const sx = x + 18;
    const sy = style === 1 ? y + 24 : y - 64;
    if (style !== 1) {
      line(ctx, [[sx + 8, sy + 31], [sx + 8, y - 10]], '#20343b', 4);
      line(ctx, [[sx + signW - 8, sy + 31], [sx + signW - 8, y - 10]], '#20343b', 4);
    }
    ctx.fillStyle = style === 1 ? '#784c45' : '#23353a';
    ctx.fillRect(sx, sy, signW, 31);
    ctx.strokeStyle = '#788078';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 3, sy + 3, signW - 6, 25);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d7c6a7';
    ctx.fillText(b.sign, sx + signW / 2, sy + 20);
  }
}

export function makeCityLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_WIDTH;
  canvas.height = GAME_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  BUILDINGS.forEach((building, i) => drawBuilding(ctx, building, i));
  ctx.fillStyle = '#26383d';
  ctx.fillRect(0, GROUND - 2, WORLD_WIDTH, 12);
  ctx.fillStyle = '#56605c';
  ctx.fillRect(0, GROUND - 3, WORLD_WIDTH, 2);
  ctx.fillStyle = '#101f29';
  ctx.fillRect(0, GROUND + 10, WORLD_WIDTH, GAME_HEIGHT - GROUND);
  ctx.fillStyle = '#6e7264';
  ctx.fillRect(0, GROUND + 10, WORLD_WIDTH, 2);
  ctx.fillStyle = '#4d514b';
  for (let x = 20; x < WORLD_WIDTH; x += 130) ctx.fillRect(x, GROUND + 42, 59, 2);
  for (let x = 273; x < WORLD_WIDTH; x += 405) {
    line(ctx, [[x, GROUND], [x, GROUND - 85], [x + 7, GROUND - 93], [x + 35, GROUND - 93]], '#182b32', 4);
    ctx.fillStyle = '#b4a281';
    ctx.fillRect(x + 26, GROUND - 92, 19, 3);
    const glow = ctx.createRadialGradient(x + 34, GROUND - 88, 1, x + 34, GROUND - 78, 37);
    glow.addColorStop(0, 'rgba(255,204,135,.15)');
    glow.addColorStop(1, 'rgba(255,204,135,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 5, GROUND - 120, 80, 95);
  }
  for (let x = 593; x < WORLD_WIDTH; x += 840) {
    ctx.fillStyle = '#813e38';
    ctx.fillRect(x, GROUND - 20, 9, 20);
    ctx.fillRect(x - 3, GROUND - 14, 15, 5);
    ctx.fillStyle = '#b26851';
    ctx.fillRect(x + 2, GROUND - 23, 5, 5);
  }
  return canvas;
}

function limb(ctx: CanvasRenderingContext2D, joints: number[][], upper: string, lower: string, width = 10) {
  line(ctx, joints, INK, width + 4);
  line(ctx, joints, upper, width);
  line(ctx, joints.slice(1), lower, width - 1);
  const last = joints[joints.length - 1];
  ctx.fillStyle = lower;
  ctx.fillRect(last[0] - width / 2, last[1] - width / 2, width, width);
}

export function drawSpider(ctx: CanvasRenderingContext2D, player: Player, time: number, swinging = false) {
  ctx.save();
  ctx.translate(Math.round(player.x), Math.round(player.y));
  ctx.scale(player.facing * 1.13, 1.13);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const run = player.grounded && Math.abs(player.vx) > 25;
  const stride = run ? Math.sin(time * 13) * 16 : 0;
  const air = !player.grounded;
  if (swinging) ctx.rotate(-0.13);
  else if (run) ctx.rotate(0.13);
  const rearLeg = swinging ? [[-6, 9], [-24, 24], [-16, 40], [-7, 40]] : [[-6, 10], [-9 - stride, 23], [-12 - stride, 34], [-5 - stride, 35]];
  const frontLeg = swinging ? [[6, 10], [24, 16], [26, 31], [35, 32]] : air ? [[6, 10], [21, 20], [15, 35], [24, 36]] : [[6, 10], [7 + stride, 23], [8 + stride, 35], [16 + stride, 35]];
  limb(ctx, rearLeg, '#21437e', '#bc2b33', 10);
  const backArm = swinging ? [[-9, -12], [-22, -29], [-18, -51]] : run ? [[-10, -12], [-19, -1], [-29, -6 - stride * 0.3]] : [[-10, -12], [-20, -2], [-22, 10]];
  limb(ctx, backArm, '#b92c35', '#e03c37', 8);
  polygon(ctx, [[-12, -16], [10, -17], [14, -6], [9, 12], [-9, 12], [-14, -3]], RED);
  polygon(ctx, [[-12, -7], [-7, -3], [-6, 10], [-10, 13], [-13, 4]], BLUE, '', 0);
  polygon(ctx, [[9, -10], [13, -5], [10, 11], [6, 11], [7, 0]], '#1f4581', '', 0);
  polygon(ctx, [[-9, 9], [9, 9], [11, 16], [1, 20], [-11, 15]], BLUE);
  limb(ctx, frontLeg, BLUE, RED, 10);
  const frontArm = player.shotCooldown > 0.03 ? [[10, -11], [26, -16], [40, -17]] : swinging ? [[10, -11], [26, -17], [34, -31]] : run ? [[10, -11], [19, -18], [27, -8 + stride * 0.25]] : [[10, -11], [22, -2], [24, 10]];
  limb(ctx, frontArm, RED, '#f44b42', 8);
  line(ctx, [[-5, -14], [-4, 9]], '#87252d', 0.8);
  line(ctx, [[4, -14], [3, 9]], '#87252d', 0.8);
  for (let y = -10; y < 9; y += 5) line(ctx, [[-10, y], [0, y + 3], [10, y]], '#92252d', 0.8);
  ctx.fillStyle = '#131f2b';
  ctx.beginPath(); ctx.ellipse(0, -3, 2.2, 4.2, 0, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    line(ctx, [[0, -5], [side * 5, -9], [side * 6, -13]], INK, 1.2);
    line(ctx, [[0, -3], [side * 7, -5], [side * 9, -9]], INK, 1.2);
    line(ctx, [[0, -1], [side * 6, 1], [side * 8, 5]], INK, 1.2);
    line(ctx, [[0, 0], [side * 4, 5], [side * 4, 9]], INK, 1.2);
  }
  ctx.fillStyle = RED;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -29, 12.7, 15.6, 0.09, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, -29, 12, 15, 0.09, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#a62832'; ctx.fillRect(-15, -46, 5, 36);
  line(ctx, [[0, -46], [0, -12]], '#8f2930', 0.8);
  line(ctx, [[-11, -42], [-4, -29], [-9, -14]], '#8f2930', 0.8);
  line(ctx, [[10, -42], [5, -29], [10, -14]], '#8f2930', 0.8);
  for (let y = -40; y < -15; y += 6) line(ctx, [[-14, y], [0, y + 5], [14, y]], '#8f2930', 0.8);
  ctx.restore();
  polygon(ctx, [[-10, -35], [-1, -30], [-4, -23], [-9, -25]], '#f7efdc', INK, 1.6);
  polygon(ctx, [[2, -30], [11, -37], [10, -27], [5, -23]], '#fff7e4', INK, 1.6);
  ctx.restore();
}

export function drawGoblin(ctx: CanvasRenderingContext2D, boss: Boss, time: number) {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.scale(boss.facing, 1);
  ctx.rotate(Math.sin(time * 2.1) * 0.045);
  if (boss.hitFlash > 0) { ctx.shadowColor = '#eafec3'; ctx.shadowBlur = 14; }
  const flame = 10 + Math.sin(time * 40) * 7;
  polygon(ctx, [[-20, 35], [-38 - flame, 38], [-22, 28]], '#d99969', '', 0);
  polygon(ctx, [[-17, 32], [-30 - flame * 0.5, 35], [-20, 29]], '#f6dd99', '', 0);
  polygon(ctx, [[-74, 18], [-47, 29], [-19, 26], [1, 22], [20, 26], [44, 21], [70, 6], [49, 37], [20, 41], [0, 32], [-25, 39], [-58, 36]], '#5c6577', '#192631', 2.5);
  polygon(ctx, [[-74, 18], [-45, 32], [-17, 29], [2, 25], [19, 30], [42, 25], [70, 6], [39, 19], [13, 21], [0, 17], [-20, 22], [-46, 24]], '#93929b', '', 0);
  line(ctx, [[-49, 33], [-30, 31]], '#b2a6a3', 2);
  line(ctx, [[25, 33], [46, 27]], '#aca0a1', 2);
  polygon(ctx, [[-12, 6], [-23, 17], [-18, 27], [-5, 27], [-11, 16], [0, 13]], '#6e467a');
  polygon(ctx, [[7, 5], [22, 10], [24, 21], [34, 25], [18, 26], [13, 16], [3, 15]], '#7d914d');
  polygon(ctx, [[-13, -20], [9, -23], [19, -7], [10, 10], [-11, 11], [-21, -5]], '#75467f');
  polygon(ctx, [[-13, -17], [-24, -8], [-33, 5], [-25, 10], [-14, -2]], '#7c9e4e');
  polygon(ctx, [[10, -20], [23, -12], [32, -23], [39, -18], [31, -5], [19, -1]], '#8eaf59');
  polygon(ctx, [[-15, -34], [-28, -41], [-19, -26], [-11, -25]], '#89a44f');
  polygon(ctx, [[11, -36], [24, -43], [19, -29], [11, -24]], '#9eba5e');
  polygon(ctx, [[-14, -46], [10, -47], [17, -37], [10, -20], [-2, -15], [-14, -25], [-18, -37]], '#8dad52');
  polygon(ctx, [[-16, -43], [-12, -61], [1, -69], [18, -60], [31, -57], [15, -55], [5, -59], [11, -43], [-1, -48]], '#74437e');
  line(ctx, [[-15, -44], [-2, -48], [12, -43]], '#a3669a', 2);
  polygon(ctx, [[-12, -36], [-3, -34], [-7, -30], [-12, -31]], '#ecdb78', INK, 1);
  polygon(ctx, [[2, -34], [12, -38], [10, -31], [5, -30]], '#f6e77e', INK, 1);
  polygon(ctx, [[-4, -26], [7, -27], [4, -21], [-3, -22], [-9, -28]], '#202e2b', '', 0);
  line(ctx, [[-6, -26], [4, -25]], '#e5d9a2', 1.5);
  drawPumpkin(ctx, 38, -24, 0, 8);
  ctx.restore();
}

export function drawPumpkin(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size = 9) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = '#ec8d3f'; ctx.strokeStyle = '#743e2c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  line(ctx, [[0, -size], [2, -size - 4]], '#769346', 3);
  line(ctx, [[-size * 0.4, -size * 0.65], [-size * 0.55, 0], [-size * 0.3, size * 0.6]], '#bd642e', 1.2);
  polygon(ctx, [[-5, -3], [-1, -1], [-5, 0]], '#ffe3a5', '', 0);
  polygon(ctx, [[5, -3], [1, -1], [5, 0]], '#ffe3a5', '', 0);
  line(ctx, [[-4, 3], [0, 5], [4, 2]], '#754d2b', 1.5);
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  if (enemy.dead) return;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(enemy.direction, 1);
  const brute = enemy.kind === 'brute';
  if (brute) ctx.scale(1.25, 1.18);
  const step = enemy.trapped > 0 ? 0 : Math.sin(time * 7 + enemy.minX) * 5;
  limb(ctx, [[-6, 9], [-9 - step, 19], [-9 - step, 27], [-4 - step, 27]], '#353347', '#252b39', 8);
  limb(ctx, [[6, 9], [8 + step, 19], [8 + step, 27], [14 + step, 27]], '#454052', '#242c38', 8);
  polygon(ctx, [[-12, -13], [11, -13], [15, 7], [8, 13], [-12, 11], [-16, -2]], brute ? '#665169' : '#746078');
  limb(ctx, [[-12, -8], [-19, 1], [-15, 10]], '#66516b', '#b18b75', 7);
  limb(ctx, [[12, -8], [21, -1], [22, 7]], '#7b647e', '#c29b7d', 7);
  polygon(ctx, [[-9, -31], [7, -31], [11, -23], [7, -14], [-6, -13], [-12, -21]], '#af8774');
  polygon(ctx, [[-12, -26], [-10, -34], [7, -35], [13, -28], [14, -24], [-11, -25]], '#343044');
  ctx.fillStyle = '#222635'; ctx.fillRect(-10, -24, 21, 5);
  ctx.fillStyle = '#cfb47e'; ctx.fillRect(3, -23, 5, 2);
  line(ctx, [[-4, -2], [6, -2]], '#a89680', 2);
  if (enemy.hitFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-13, -32, 26, 44); }
  if (enemy.trapped > 0) {
    ctx.strokeStyle = '#e2e8dc'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(0, -2 + i * 3, 19 - i, 9 + i * 2, i * 0.5, 0, Math.PI * 2); ctx.stroke();
    }
    line(ctx, [[-15, -16], [12, 21], [-12, 12], [15, -13]], '#f3eddb', 1);
  }
  if (enemy.health < enemy.maxHealth) {
    ctx.fillStyle = '#13232d'; ctx.fillRect(-15, -46, 30, 4);
    ctx.fillStyle = '#dd6251'; ctx.fillRect(-15, -46, 30 * enemy.health / enemy.maxHealth, 3);
  }
  ctx.restore();
}

export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number, direction: number, time: number) {
  ctx.save(); ctx.translate(Math.round(x), y); ctx.scale(direction, 1);
  const paint = ['#c69748', '#637581', '#b5b4a0', '#884f49'][kind % 4];
  ctx.fillStyle = 'rgba(4,14,21,.5)';
  ctx.beginPath(); ctx.ellipse(0, 11, 61, 6, 0, 0, Math.PI * 2); ctx.fill();
  polygon(ctx, [[-56, -13], [-37, -16], [-23, -35], [20, -35], [37, -17], [54, -12], [58, 5], [-58, 5]], paint, '#15242d', 2);
  polygon(ctx, [[-29, -17], [-19, -31], [-3, -31], [-3, -17]], '#28414c', '', 0);
  polygon(ctx, [[2, -31], [18, -31], [30, -17], [2, -17]], '#314e58', '', 0);
  line(ctx, [[-52, -10], [48, -10]], kind === 0 ? '#e1b46a' : '#86938f', 2);
  line(ctx, [[-1, -13], [-1, 2]], '#695f50', 1);
  ctx.fillStyle = '#c0bda2'; ctx.fillRect(9, -10, 7, 2);
  ctx.fillStyle = '#ead6a0'; ctx.fillRect(49, -10, 9, 5);
  ctx.fillStyle = '#ad4f40'; ctx.fillRect(-58, -9, 6, 5);
  ctx.fillStyle = '#7b827b'; ctx.fillRect(45, 2, 16, 4); ctx.fillRect(-60, 2, 10, 4);
  for (const wheel of [-35, 35]) {
    ctx.fillStyle = '#10202a'; ctx.beginPath(); ctx.arc(wheel, 5, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#657379'; ctx.beginPath(); ctx.arc(wheel, 5, 5, 0, Math.PI * 2); ctx.fill();
    line(ctx, [[wheel - Math.cos(time * 9) * 4, 5], [wheel + Math.cos(time * 9) * 4, 5]], '#b7b6a2', 1);
  }
  if (kind === 0) {
    ctx.fillStyle = '#d8b578'; ctx.fillRect(-9, -42, 20, 7);
    ctx.fillStyle = '#394040'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 1, -37);
    ctx.fillStyle = '#3e453e';
    for (let i = 0; i < 6; i++) ctx.fillRect(-24 + i * 8, -6 + i % 2 * 3, 4, 3);
  }
  ctx.restore();
}

export function drawCitizen(ctx: CanvasRenderingContext2D, x: number, time: number, index: number) {
  ctx.save(); ctx.translate(x, GROUND - 16);
  const step = Math.sin(time * 5 + index) * 4;
  line(ctx, [[-3, 1], [-4 - step, 14]], '#243241', 4);
  line(ctx, [[3, 1], [4 + step, 14]], '#283b48', 4);
  ctx.fillStyle = ['#947879', '#747d83', '#9c896c', '#496b6e'][index % 4];
  ctx.fillRect(-6, -12, 12, 16);
  ctx.fillStyle = '#b2947c'; ctx.fillRect(-4, -23, 8, 10);
  ctx.fillStyle = '#394047'; ctx.fillRect(-5, -25, 10, 4);
  line(ctx, [[-7, -9], [-9, 1]], '#837478', 3);
  line(ctx, [[7, -9], [9, 0]], '#837478', 3);
  ctx.restore();
}

export function drawWebRope(ctx: CanvasRenderingContext2D, player: Player, anchor: Point, time: number) {
  const hand = { x: player.x - player.facing * 27, y: player.y - 54 };
  ctx.save();
  ctx.shadowColor = 'rgba(255,245,213,.3)'; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y);
  ctx.quadraticCurveTo((anchor.x + hand.x) / 2 + Math.sin(time * 5) * 3, (anchor.y + hand.y) / 2 + 6, hand.x, hand.y);
  ctx.strokeStyle = '#fff2d8'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    line(ctx, [[anchor.x, anchor.y], [anchor.x + Math.cos(angle) * 7, anchor.y + Math.sin(angle) * 7]], '#f7ecd4', 1);
  }
  ctx.restore();
}