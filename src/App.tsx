import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { AdSlot } from './ads/AdSlot';
import { GoblinMask, Icon, SpiderMark, SpiderMask } from './components/Icons';
import type { IconName } from './components/Icons';
import { CityGame } from './game/engine';
import { BOSS_HEALTH, INITIAL_HUD } from './game/types';
import type { GameHud, GameResult, GameStatus } from './game/types';

type ModalKind = 'help' | 'scores';
const SCORE_KEY = 'spiderman-city-scores-v1';
const SOUND_KEY = 'spiderman-city-muted';
const formatScore = (score: number) => score.toString().padStart(6, '0');
const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

function readScores(): GameResult[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is GameResult => item && typeof item.score === 'number' && Number.isFinite(item.score) && typeof item.elapsed === 'number' && typeof item.won === 'boolean' && typeof item.date === 'string').slice(0, 5);
  } catch { return []; }
}

function readMuted() {
  try { return localStorage.getItem(SOUND_KEY) === 'true'; } catch { return false; }
}

function Key({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <kbd className={wide ? 'key key-wide' : 'key'}>{children}</kbd>;
}

function TouchButton({ code, label, icon, game, className = '' }: { code: string; label: string; icon: IconName; game: RefObject<CityGame | null>; className?: string }) {
  const heldKeyboardKey = useRef<string | null>(null);
  useEffect(() => {
    const release = (event: KeyboardEvent) => {
      if (event.key !== heldKeyboardKey.current) return;
      game.current?.releaseKey(code);
      heldKeyboardKey.current = null;
    };
    window.addEventListener('keyup', release);
    return () => { window.removeEventListener('keyup', release); };
  }, [code, game]);
  return <button
    className={`touch-button ${className}`}
    aria-label={label}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); game.current?.pressKey(code); }}
    onPointerUp={event => { event.preventDefault(); game.current?.releaseKey(code); }}
    onPointerCancel={() => game.current?.releaseKey(code)}
    onLostPointerCapture={() => game.current?.releaseKey(code)}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); heldKeyboardKey.current = event.key; game.current?.pressKey(code); } }}
  ><Icon name={icon} size={21} /><span>{label}</span></button>;
}

function GameDialog({ kind, scores, onClose }: { kind: ModalKind; scores: GameResult[]; onClose: (play?: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  return <dialog ref={ref} className="game-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner">
      <button className="icon-button dialog-close" onClick={() => onClose()} aria-label="Close dialog"><Icon name="close" /></button>
      <span className="eyebrow dialog-eyebrow">{kind === 'help' ? 'YOUR FRIENDLY NEIGHBORHOOD FIELD GUIDE' : 'THE LOCAL HALL OF FAME'}</span>
      <h2 id="dialog-title">{kind === 'help' ? 'LEARN THE ROPES.' : 'NEIGHBORHOOD LEGENDS.'}</h2>
      <p className="dialog-description">{kind === 'help' ? 'A little practice. A lot of spider-sense. You got this.' : 'Your best runs, saved right here on this device.'}</p>
      {kind === 'help' ? <>
        <div className="guide-list">
          <div className="guide-row"><div className="guide-keys"><Key>A</Key><Key>D</Key></div><div><h3>Make the city your playground</h3><p>Run left and right. Press <b>W</b> to jump, again to double-jump. <b>S</b> drops you through a rooftop.</p></div></div>
          <div className="guide-row"><div className="guide-keys"><Key wide>SPACE</Key></div><div><h3>Catch a little air</h3><p>Hold to attach a web and swing. <b>A / D</b> build momentum. Release to fly. Hold <b>W / S</b> to shorten or lengthen your web.</p></div></div>
          <div className="guide-row"><div className="guide-keys"><Icon name="mouse" size={27} /><span className="key-or">/</span><Key>E</Key></div><div><h3>Give the bad guys a time-out</h3><p>Aim with your mouse and hold left-click to shoot. Or hold <b>E</b> for auto-aim. Web fluid recharges on its own.</p></div></div>
          <div className="guide-row"><div className="guide-keys"><Key wide>ESC</Key><Key>R</Key></div><div><h3>Even heroes need a breather</h3><p><b>Esc</b> or <b>P</b> pauses the action. <b>R</b> starts a fresh run. On touchscreens, use the buttons below the city.</p></div></div>
        </div>
        <div className="guide-mission"><GoblinMask /><div><span className="eyebrow">THE MISSION</span><p>Stop the Green Goblin. Web up his crew for bonus points, health, and web fluid. And those pumpkin bombs? You can shoot them, too.</p></div></div>
      </> : scores.length ? <>
        <div className="score-table-wrap"><table className="score-table"><thead><tr><th>RANK</th><th>SCORE</th><th>TIME</th><th>RESULT</th></tr></thead><tbody>{scores.map((run, index) => <tr key={`${run.date}-${index}`}><td><span className={index === 0 ? 'first-place' : ''}>{String(index + 1).padStart(2, '0')}</span></td><td>{formatScore(run.score)}</td><td>{formatTime(run.elapsed)}</td><td><span className={run.won ? 'result-won' : 'result-ended'}>{run.won ? 'CITY SAVED' : 'GOOD FIGHT'}</span></td></tr>)}</tbody></table></div>
        <p className="scores-note"><Icon name="trophy" size={16} /> No accounts. No global rankings. Just your personal best.</p>
      </> : <div className="empty-scores"><Icon name="trophy" size={48} /><h3>EVERY HERO STARTS AT ZERO.</h3><p>Finish your first run to make the leaderboard.<br />The neighborhood is rooting for you.</p></div>}
      <div className="dialog-footer"><span>{kind === 'help' ? 'TIP: RELEASE YOUR WEB TO KEEP YOUR MOMENTUM.' : 'ONE MORE RUN. ONE BETTER SCORE.'}</span><button className="primary-button" onClick={() => onClose(true)}><Icon name="play" size={17} />{kind === 'help' ? "LET'S DO THIS" : scores.length ? 'BACK TO THE CITY' : 'SET YOUR FIRST SCORE'}</button></div>
    </div>
  </dialog>;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<CityGame | null>(null);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [hud, setHud] = useState<GameHud>(INITIAL_HUD);
  const [scores, setScores] = useState<GameResult[]>(readScores);
  const [muted, setMuted] = useState(readMuted);
  const initialMuted = useRef(muted);
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState('');
  const resumeAfterModal = useRef(false);

  const onFinish = useCallback((result: GameResult) => {
    setScores(previous => {
      const updated = [...previous, result].sort((a, b) => b.score - a.score).slice(0, 5);
      try { localStorage.setItem(SCORE_KEY, JSON.stringify(updated)); } catch { /* The game remains playable without browser storage. */ }
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new CityGame(canvasRef.current, { onHud: setHud, onStatus: setStatus, onFinish }, initialMuted.current);
    gameRef.current = game;
    return () => { game.destroy(); gameRef.current = null; };
  }, [onFinish]);

  useEffect(() => {
    gameRef.current?.setMuted(muted);
    try { localStorage.setItem(SOUND_KEY, String(muted)); } catch { /* Sound preferences are optional. */ }
  }, [muted]);

  useEffect(() => {
    const handleFullscreen = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const openModal = (kind: ModalKind) => {
    resumeAfterModal.current = gameRef.current?.getStatus() === 'playing';
    gameRef.current?.pause();
    gameRef.current?.setInputEnabled(false);
    setModal(kind);
  };

  const closeModal = (play = false) => {
    setModal(null);
    gameRef.current?.setInputEnabled(true);
    requestAnimationFrame(() => {
      if (play) gameRef.current?.start();
      else if (resumeAfterModal.current) gameRef.current?.resume();
      else canvasRef.current?.focus({ preventScroll: true });
    });
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen();
      else setNotice('Fullscreen is not supported by this browser. Try rotating your device for a wider view.');
      canvasRef.current?.focus({ preventScroll: true });
    } catch { setNotice('Fullscreen is unavailable here. You can keep playing in the city below.'); }
  };

  const primaryAction = () => {
    if (status === 'playing') gameRef.current?.pause();
    else gameRef.current?.start();
  };
  const bestScore = scores[0]?.score ?? 0;
  const finished = status === 'won' || status === 'lost';

  // Monetag ad slot activation. See src/ads/monetag.ts for documented limitations:
  // - IPP position (top/bottom) must be configured per zone via Monetag support.
  // - Removing the top IPP script is best-effort; Monetag provides no hide API.
  // - The game-end Interstitial fires on Monetag's own delay; there is no close
  //   callback, so the Play Again UI is not gated on ad completion.
  const showTopBanner = status === 'ready';
  const showBottomBanner = status === 'ready' || status === 'playing' || status === 'paused';
  const showGameEndAd = finished;
  // OnClick is page-level; Monetag handles the click trigger and frequency.
  const showOnClickAd = true;

  return <div className="app">
    <header className="site-header"><div className="header-inner page-shell">
      <a href="#play" className="brand" aria-label="Spider-Man Web Arcade home"><SpiderMark /><span>SPIDER-MAN</span><span className="brand-edition">WEB<br />ARCADE</span></a>
      <nav className="main-nav" aria-label="Main navigation"><a className="nav-link active" href="#play" aria-current="page">PLAY</a><button className={`nav-link ${modal === 'help' ? 'selected' : ''}`} onClick={() => openModal('help')}>HOW TO PLAY</button><button className={`nav-link ${modal === 'scores' ? 'selected' : ''}`} onClick={() => openModal('scores')}>HIGH SCORES</button></nav>
      <div className="header-right"><span className="player-status"><i />PLAYER ONE</span><button className={`sound-button ${muted ? 'is-muted' : ''}`} aria-label={muted ? 'Enable sound' : 'Mute sound'} aria-pressed={!muted} onClick={() => { setMuted(value => !value); canvasRef.current?.focus({ preventScroll: true }); }}><Icon name={muted ? 'muted' : 'sound'} size={18} /><span>SOUND {muted ? 'OFF' : 'ON'}</span></button></div>
    </div></header>

    <main id="play" className="page-shell main-content">
      <section className="intro" aria-labelledby="game-title">
        <div className="intro-copy"><div className="title-lockup"><h1 id="game-title">SPIDER-MAN</h1><div className="title-edition">CITY UNDER<br /><strong>SIEGE</strong></div></div><p>Big city. Bad guys. Your friendly neighborhood hero.</p></div>
        <div className="intro-action"><button className="primary-button play-button" onClick={primaryAction}><Icon name={status === 'playing' ? 'pause' : 'play'} size={19} /><span>{status === 'playing' ? 'PAUSE GAME' : status === 'paused' ? 'RESUME GAME' : finished ? 'PLAY AGAIN' : 'PLAY GAME'}</span><span className="button-shortcut">{status === 'playing' ? 'ESC' : <Icon name="enter" size={16} />}</span></button><span className="cta-caption">{status === 'playing' ? "GO GET 'EM, TIGER." : status === 'paused' ? 'EVEN HEROES NEED A BREATHER.' : 'NO DOWNLOADS. JUST SPIDER-SENSE.'}</span></div>
      </section>

      <section className="game-section" aria-label="Spider-Man City Under Siege game">
        <div className="stage-toolbar"><div className="level-info"><span className="level-index">01</span><h2>MIDTOWN MAYHEM</h2><span className="toolbar-slash">/</span><span className="mode-label">STORY MODE</span></div><div className="stage-tools"><button className="best-score" onClick={() => openModal('scores')} title="View your high scores"><Icon name="trophy" size={14} /><span>PERSONAL BEST</span><strong>{formatScore(bestScore)}</strong></button><span className="tool-divider" /><button className="fullscreen-button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen"><Icon name={fullscreen ? 'shrink' : 'expand'} size={17} /></button></div></div>

        <div className="game-frame" ref={stageRef}>
          <div className={`game-stage game-${status}`}>
            {fullscreen && <button className="fullscreen-exit" onClick={toggleFullscreen}><Icon name="shrink" size={14} /><span>EXIT FULLSCREEN</span></button>}
            <canvas ref={canvasRef} className="game-canvas" tabIndex={0} aria-label="Spider-Man game. A and D to move, W to jump, S to drop. Hold Space to swing. Aim and click to shoot webs, or press E for auto-aim. Escape pauses." aria-describedby="game-instructions">Your browser needs Canvas support to play this game.</canvas>
            <div className="stage-vignette" />
            <div className="game-hud">
              <div className="player-hud"><div className="player-portrait"><SpiderMask /></div><div className="player-meters"><div className="hud-player-name"><span>SPIDER-MAN</span><strong>{hud.health}<small> / 100</small></strong></div><div className={`health-track ${hud.health < 30 ? 'low-health' : ''}`} role="progressbar" aria-label="Health" aria-valuenow={hud.health} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${hud.health}%` }} /><span /></div><div className="web-meter"><Icon name="web" size={13} /><div className="web-track" role="progressbar" aria-label="Web fluid" aria-valuenow={hud.web} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${hud.web}%` }} /></div><span>{hud.web}%</span></div></div></div>
              <div className="right-hud"><div className="score-hud"><span>SCORE</span><strong>{formatScore(hud.score)}</strong>{hud.combo > 1 && <small className="combo-text">{hud.combo}x COMBO</small>}</div><button className="hud-pause" onClick={primaryAction} aria-label={status === 'playing' ? 'Pause game' : status === 'paused' ? 'Resume game' : 'Start game'}><Icon name={status === 'playing' ? 'pause' : 'play'} size={17} /></button></div>
            </div>
            <div className="stage-bottom-hud"><div className="location-hud"><div><Icon name="pin" size={13} /><span>MIDTOWN, NEW YORK</span></div>{status === 'ready' ? <button className="ready-prompt" onClick={() => gameRef.current?.start()}><span className="enter-key">ENTER</span><span>YOUR CITY IS WAITING</span><Icon name="arrow" size={15} /></button> : <div className="patrol-status"><i className={status === 'playing' ? 'live-dot' : ''} /><span>{status === 'won' ? 'NEIGHBORHOOD SECURED' : status === 'lost' ? 'PATROL ENDED' : status === 'paused' ? 'PATROL PAUSED' : 'PATROL ACTIVE'}</span><span className="patrol-time">{formatTime(hud.elapsed)}</span></div>}</div><div className="boss-hud"><GoblinMask /><div className="boss-detail"><div className="boss-name"><span>GREEN GOBLIN</span><span className="boss-tag">BOSS</span></div><div className="boss-health-track" role="progressbar" aria-label="Green Goblin health" aria-valuenow={hud.bossHealth} aria-valuemin={0} aria-valuemax={BOSS_HEALTH}><div style={{ width: `${hud.bossHealth / BOSS_HEALTH * 100}%` }} /></div><span className="boss-caption">{hud.bossHealth === 0 ? 'THREAT NEUTRALIZED' : hud.bossHealth < BOSS_HEALTH * 0.4 ? 'ENRAGED. WATCH THOSE BOMBS.' : 'NOT SO FRIENDLY. NOT YOUR NEIGHBOR.'}</span></div></div></div>

            {(status === 'paused' || finished) && !modal && <div className="game-overlay" role="region" aria-label={status === 'paused' ? 'Game paused' : 'Game results'}><div className="overlay-content">
              {status === 'won' ? <div className="victory-symbol"><SpiderMark /></div> : <SpiderMask className="overlay-mask" />}<span className="eyebrow">{status === 'paused' ? 'TAKE YOUR TIME, HERO.' : status === 'won' ? 'JUST ANOTHER DAY IN THE NEIGHBORHOOD.' : 'EVERY HERO GETS KNOCKED DOWN.'}</span><h2>{status === 'paused' ? 'ON A WEB BREAK.' : status === 'won' ? 'CITY. SAVED.' : 'ONE MORE SWING?'}</h2><p>{status === 'paused' ? 'Your city will be right here when you get back.' : status === 'won' ? 'The Goblin is grounded. New York owes you one.' : 'Brush off the suit. The city still needs you.'}</p>
              {finished && <div className="run-result"><div><span>FINAL SCORE</span><strong>{formatScore(hud.score)}</strong></div><div><span>TIME ON PATROL</span><strong>{formatTime(hud.elapsed)}</strong></div><div><span>CREW WEBBED</span><strong>{hud.defeated}<small> / {hud.totalEnemies}</small></strong></div></div>}
              <div className="overlay-actions"><button className="primary-button" onClick={() => status === 'paused' ? gameRef.current?.resume() : gameRef.current?.restart()}><Icon name={status === 'paused' ? 'play' : 'restart'} size={18} />{status === 'paused' ? 'BACK IN ACTION' : 'GIVE IT ANOTHER SWING'}</button><button className="secondary-button" onClick={() => status === 'paused' ? gameRef.current?.restart() : openModal('scores')}><Icon name={status === 'paused' ? 'restart' : 'trophy'} size={16} />{status === 'paused' ? 'START FRESH' : 'HIGH SCORES'}</button></div>{status === 'paused' && <span className="overlay-hint">PRESS ESC TO RESUME</span>}
            </div></div>}
          </div>

          <div className="touch-controls" aria-label="Touch game controls"><div className="touch-movement"><TouchButton code="a" label="Left" icon="left" game={gameRef} /><div className="touch-vertical"><TouchButton code="w" label="Jump" icon="up" game={gameRef} /><TouchButton code="s" label="Drop" icon="down" game={gameRef} /></div><TouchButton code="d" label="Right" icon="right" game={gameRef} /></div><span className="touch-hint">YOUR CITY.<br />YOUR MOVE.</span><div className="touch-actions"><TouchButton code="e" label="Web" icon="web" game={gameRef} className="touch-web" /><TouchButton code=" " label="Swing" icon="bolt" game={gameRef} className="touch-swing" /></div></div>

          <div className="controls-bar" id="game-instructions"><div className="control-item movement-control"><div className="wasd-keys"><Key>W</Key><div><Key>A</Key><Key>S</Key><Key>D</Key></div></div><div className="control-copy"><span>Move & jump</span><small>Make yourself at home</small></div></div><div className="control-item"><Key wide>SPACE</Key><div className="control-copy"><span>Hold to swing</span><small>Release to fly</small></div></div><div className="control-item"><Icon name="mouse" size={25} /><div className="control-copy"><span>Shoot webs</span><small>Left-click or hold E</small></div></div><div className="control-item pause-control"><Key wide>ESC</Key><div className="control-copy"><span>Pause</span><small>Catch your breath</small></div></div><button className="quick-guide" onClick={() => openModal('help')}><Icon name="help" size={18} /><span>Quick guide</span><Icon name="arrow" size={15} /></button></div>
          {notice && <div className="game-notice" role="status"><Icon name="help" size={17} /><span>{notice}</span><button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss message"><Icon name="close" size={16} /></button></div>}
          {modal && <GameDialog kind={modal} scores={scores} onClose={closeModal} />}
        </div>

        <div className="mission-line"><div className="mission-copy"><span className="mission-marker" /><span className="eyebrow">THE MISSION</span><p>Clear the rooftops. Stop the Green Goblin. <strong>Save your city.</strong></p></div><span className="enemy-count"><span>{String(hud.defeated).padStart(2, '0')}</span> / {String(hud.totalEnemies).padStart(2, '0')} CREW WEBBED</span></div>
      </section>
    </main>

    <footer className="site-footer page-shell"><div><SpiderMark /><span>A FRIENDLY NEIGHBORHOOD FAN PROJECT.</span></div><span>NO CAPES. JUST WEBS.<span className="footer-dot" />V.1.0</span></footer>
    <div className="sr-only" role="status" aria-live="polite">{status === 'won' ? `You saved the city! Final score ${hud.score}.` : status === 'lost' ? `Run ended. Final score ${hud.score}. Try again.` : status === 'paused' ? 'Game paused.' : status === 'playing' ? 'Game started. Defeat the Green Goblin.' : 'Ready to play. Press Enter or select Play Game.'}</div>
    {/* Monetag ad slots. Headless — Monetag renders its own DOM. */}
    <AdSlot slot="topBanner" active={showTopBanner} />
    <AdSlot slot="bottomBanner" active={showBottomBanner} />
    <AdSlot slot="gameEnd" active={showGameEndAd} />
    <AdSlot slot="onClick" active={showOnClickAd} />
  </div>;
}
