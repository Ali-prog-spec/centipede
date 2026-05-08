// public/js/game.js
// Centipede game engine — HTML5 Canvas + JavaScript
// Features: true rapid fire (multiple bullets), speed-scaling levels, diagonal spiders
// Fixed: safe level transitions after the last segment dies
// Added: stop after clearing level 3, CRT power transitions on start and finish

const Game = (() => {
  let audioContext = null;
  let audioEnabled = false;

  function initAudio() {
    if (audioEnabled) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioEnabled = true;
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  function playSound(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
    if (!audioEnabled || !audioContext) return;
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = frequency;
      osc.type = type;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + duration);
    } catch (e) {}
  }

  function soundShoot() {
    playSound(900, 0.05, 'square', 0.2);
    playSound(200, 0.06, 'sine', 0.1);
  }

  function soundHit() {
    if (!audioEnabled || !audioContext) return;
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.18);
      gain.gain.setValueAtTime(0.4, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
      osc.start();
      osc.stop(audioContext.currentTime + 0.2);
    } catch (e) {}
  }

  function soundSpiderHit() {
    playSound(1400, 0.08, 'square', 0.25);
    playSound(500, 0.12, 'triangle', 0.2);
  }

  function soundExplode() {
    [80, 120, 200].forEach((f, i) => playSound(f + i * 30, 0.4 + i * 0.05, 'square', 0.25));
  }

  function soundDeath() {
    [440, 330, 220, 110].forEach((f, i) =>
      setTimeout(() => playSound(f, 0.2, 'triangle'), i * 80)
    );
  }

  function soundLevelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playSound(f, 0.15), i * 80)
    );
  }

  const TILE = 32;
  const COLS = 20;
  const ROWS = 20;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const SEGMENTS = 12;
  const MAX_MUSHROOMS = 25;
  const PLAYER_ZONE_ROWS = 5;
  const MAX_BULLETS = 5;
  const FIRE_RATE = 0.08;
  const SPIDER_SPAWN_SECS = 8;

  let canvas, ctx;
  let state = 'idle';
  let animId = null;
  let lastTime = 0;

  let player;
  let bullets;
  let centipede;
  let mushrooms;
  let spiders;
  let floaters;

  let score, level, kills, mushroomsHit, lives, startTime;
  let centTimers;
  let fireTimer, spiderSpawnTimer;
  let username = null;
  let levelFlash = 0;
  let levelAdvancing = false;

  const keys = {};

  const COLOURS = {
    player: '#00ff41',
    bullet: '#ffff00',
    head: '#ff00ff',
    body: '#cc00cc',
    head2: '#00ffff',
    body2: '#0099cc',
    mushroom: '#ffb300',
    mushroomHit: '#ff6600',
    spider: '#ff3333',
    spiderLegs: '#cc1111',
    bg: '#050a05',
    grid: '#0a150a',
  };

  function setSkin(colors = {}) {
    COLOURS.player = colors.player || '#00ff41';
    COLOURS.bullet = colors.bullet || '#ffff00';
    COLOURS.grid = colors.accent || '#0a150a';
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'p') togglePause();
      if (['w', 'a', 's', 'd', 'x', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      keys[e.key.toLowerCase()] = false;
    });

    drawIdle();
  }

  function startGame(uname) {
    username = uname;
    resetState();
    state = 'playing';
    lastTime = performance.now();
    cancelAnimationFrame(animId);
    triggerTvTransition('on');
    animId = requestAnimationFrame(loop);
  }

  function resetState() {
    score = 0;
    level = 1;
    kills = 0;
    mushroomsHit = 0;
    lives = 3;
    startTime = Date.now();
    fireTimer = 0;
    spiderSpawnTimer = 0;
    levelFlash = 0;
    levelAdvancing = false;

    player = {
      x: Math.floor(COLS / 2) * TILE,
      y: (ROWS - 1) * TILE,
    };

    bullets = [];
    spiders = [];
    floaters = [];
    centipede = [];
    centTimers = [];

    spawnCentipedeForLevel();
    spawnMushrooms();
  }

  function spawnMushrooms() {
    mushrooms = [];
    while (mushrooms.length < MAX_MUSHROOMS) {
      const col = Math.floor(Math.random() * COLS);
      const row = Math.floor(Math.random() * (ROWS - PLAYER_ZONE_ROWS - 1)) + 1;
      if (!mushrooms.some((m) => m.col === col && m.row === row)) {
        mushrooms.push({ col, row, hits: 0 });
      }
    }
  }

  function buildTrain(trainIndex) {
    const segments = [];
    const dir = trainIndex === 0 ? 1 : -1;
    const startX = trainIndex === 0 ? 0 : (COLS - 1) * TILE;
    const startY = trainIndex === 0 ? 0 : TILE;

    for (let i = 0; i < SEGMENTS; i++) {
      segments.push({
        x: startX + (trainIndex === 0 ? i : -i) * TILE,
        y: startY,
        dir,
        alive: true,
        isHead: i === 0,
        train: trainIndex,
      });
    }
    return segments;
  }

  function spawnCentipedeForLevel() {
    centipede = [];
    centTimers = [];

    if (level >= 3) {
      centipede.push(buildTrain(0));
      centipede.push(buildTrain(1));
      centTimers.push(0, 0);
    } else {
      centipede.push(buildTrain(0));
      centTimers.push(0);
    }
  }

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (state === 'playing') {
      update(dt);
      render();
    } else if (state === 'paused') {
      render();
      drawPauseOverlay();
    }

    animId = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (levelFlash > 0) levelFlash -= dt;
    handleInput(dt);
    updateBullets(dt);
    updateAllCentipedes(dt);
    updateSpiders(dt);
    updateFloaters(dt);
    checkCollisions();
    updateHUD();
  }

  function handleInput(dt) {
    const spd = 180;
    const minY = (ROWS - PLAYER_ZONE_ROWS) * TILE;

    if (keys.a) player.x = Math.max(0, player.x - spd * dt);
    if (keys.d) player.x = Math.min(W - TILE, player.x + spd * dt);
    if (keys.w) player.y = Math.max(minY, player.y - spd * dt);
    if (keys.s) player.y = Math.min(H - TILE, player.y + spd * dt);

    snapPlayerFromMushrooms();

    if (fireTimer > 0) fireTimer -= dt;
    if ((keys.x || keys[' ']) && fireTimer <= 0 && bullets.length < MAX_BULLETS) {
      bullets.push({
        x: player.x + TILE / 2 - 4,
        y: player.y,
      });
      fireTimer = FIRE_RATE;
      soundShoot();
    }
  }

  function snapPlayerFromMushrooms() {
    for (const m of mushrooms) {
      if (m.hits >= 2) continue;
      const mx = m.col * TILE;
      const my = m.row * TILE;
      if (rectsOverlap(player.x, player.y, TILE, TILE, mx, my, TILE, TILE)) {
        const oL = player.x + TILE - mx;
        const oR = mx + TILE - player.x;
        const oT = player.y + TILE - my;
        const oB = my + TILE - player.y;
        const min = Math.min(oL, oR, oT, oB);
        if (min === oL) player.x -= oL;
        else if (min === oR) player.x += oR;
        else if (min === oT) player.y -= oT;
        else player.y += oB;
      }
    }
  }

  function updateBullets(dt) {
    for (const b of bullets) b.y -= 450 * dt;
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (bullets[i].y < -TILE) bullets.splice(i, 1);
    }
  }

  function getCentipedeSpeed() {
    return Math.max(0.04, 0.15 - (level - 1) * 0.012);
  }

  function stepTrain(train) {
    for (const seg of train) {
      if (!seg.alive) continue;
      const nextX = seg.x + seg.dir * TILE;

      if (nextX < 0 || nextX > W - TILE) {
        seg.y += TILE;
        seg.dir = -seg.dir;
        if (seg.y >= H) {
          seg.y = 0;
          seg.dir = -seg.dir;
          soundExplode();
        }
      } else {
        const blocked = mushrooms.some(
          (m) =>
            m.hits < 2 &&
            m.col === Math.round(nextX / TILE) &&
            m.row === Math.round(seg.y / TILE)
        );
        if (blocked) {
          seg.y += TILE;
          seg.dir = -seg.dir;
          if (seg.y >= H) {
            seg.y = 0;
            seg.dir = -seg.dir;
            soundExplode();
          }
        } else {
          seg.x = nextX;
        }
      }
    }
  }

  function updateAllCentipedes(dt) {
    for (let ti = 0; ti < centipede.length; ti++) {
      centTimers[ti] += dt;
      if (centTimers[ti] >= getCentipedeSpeed()) {
        centTimers[ti] = 0;
        stepTrain(centipede[ti]);
      }
    }
  }

  function maxSpiders() {
    if (level >= 3) return 4;
    if (level >= 2) return 3;
    return 2;
  }

  function spiderSpawnInterval() {
    if (level >= 3) return 4;
    if (level >= 2) return 6;
    return SPIDER_SPAWN_SECS;
  }

  function spiderSpeed() {
    return 110 + level * 14;
  }

  function spawnSpider() {
    const fromLeft = Math.random() < 0.5;
    const spd = spiderSpeed();
    const startRow = Math.floor(Math.random() * (ROWS - PLAYER_ZONE_ROWS - 2)) + 1;
    spiders.push({
      x: fromLeft ? -TILE : W,
      y: startRow * TILE,
      vx: fromLeft ? spd : -spd,
      vy: (Math.random() < 0.5 ? 1 : -1) * spd * 0.65,
      legPhase: 0,
    });
  }

  function updateSpiders(dt) {
    spiderSpawnTimer += dt;
    if (spiderSpawnTimer >= spiderSpawnInterval() && spiders.length < maxSpiders()) {
      spiderSpawnTimer = 0;
      spawnSpider();
    }

    for (let i = spiders.length - 1; i >= 0; i--) {
      const sp = spiders[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.legPhase += dt * 12;

      if (sp.x <= 0) {
        sp.x = 0;
        sp.vx = Math.abs(sp.vx);
      } else if (sp.x >= W - TILE) {
        sp.x = W - TILE;
        sp.vx = -Math.abs(sp.vx);
      }
      if (sp.y <= TILE) {
        sp.y = TILE;
        sp.vy = Math.abs(sp.vy);
      } else if (sp.y >= H - TILE) {
        sp.y = H - TILE;
        sp.vy = -Math.abs(sp.vy);
      }

      for (const m of mushrooms) {
        if (m.hits >= 2) continue;
        if (rectsOverlap(sp.x, sp.y, TILE, TILE, m.col * TILE, m.row * TILE, TILE, TILE)) {
          m.hits = 2;
        }
      }
    }
  }

  function showFloatingScore(x, y, pts) {
    floaters.push({ x, y, pts, age: 0 });
  }

  function updateFloaters(dt) {
    for (const f of floaters) {
      f.y -= 40 * dt;
      f.age += dt;
    }
    floaters = floaters.filter((f) => f.age < 1.2);
  }

  function drawFloaters() {
    ctx.font = `bold 9px 'Press Start 2P'`;
    ctx.textAlign = 'center';
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.age / 1.2);
      ctx.fillStyle = '#ff3333';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.fillText(`+${f.pts}`, f.x + TILE / 2, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  function checkCollisions() {
    if (levelAdvancing) return;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let removed = false;

      for (const m of mushrooms) {
        if (m.hits >= 2) continue;
        if (rectsOverlap(b.x, b.y, 8, 16, m.col * TILE, m.row * TILE, TILE, TILE)) {
          m.hits++;
          soundHit();
          score += m.hits >= 2 ? 5 : 1;
          if (m.hits >= 2) mushroomsHit++;
          bullets.splice(bi, 1);
          removed = true;
          break;
        }
      }
      if (removed || levelAdvancing) continue;

      outer: for (let ti = 0; ti < centipede.length; ti++) {
        const train = centipede[ti];
        for (let ci = 0; ci < train.length; ci++) {
          const seg = train[ci];
          if (!seg.alive) continue;
          if (rectsOverlap(b.x, b.y, 8, 16, seg.x, seg.y, TILE, TILE)) {
            seg.alive = false;
            score += 10;
            kills++;
            soundHit();

            const col = Math.round(seg.x / TILE);
            const row = Math.round(seg.y / TILE);
            if (!mushrooms.some((m) => m.col === col && m.row === row)) {
              mushrooms.push({ col, row, hits: 0 });
            }

            for (let j = ci + 1; j < train.length; j++) {
              if (train[j].alive) {
                train[j].isHead = true;
                break;
              }
            }

            bullets.splice(bi, 1);
            removed = true;

            if (allCentipedesDead()) {
              if (level >= 3) {
                endGame(true);
              } else {
                nextLevel();
              }
              return;
            }
            break outer;
          }
        }
      }
      if (removed || levelAdvancing) continue;

      for (let si = spiders.length - 1; si >= 0; si--) {
        const sp = spiders[si];
        if (rectsOverlap(b.x, b.y, 8, 16, sp.x, sp.y, TILE, TILE)) {
          const dist = Math.abs(sp.x - player.x) + Math.abs(sp.y - player.y);
          const pts = dist < 3 * TILE ? 900 : dist < 6 * TILE ? 600 : 300;
          score += pts;
          kills++;
          showFloatingScore(sp.x, sp.y, pts);
          spiders.splice(si, 1);
          soundSpiderHit();
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    for (const train of centipede) {
      for (const seg of train) {
        if (!seg.alive) continue;
        if (
          rectsOverlap(
            player.x + 4,
            player.y + 4,
            TILE - 8,
            TILE - 8,
            seg.x + 4,
            seg.y + 4,
            TILE - 8,
            TILE - 8
          )
        ) {
          triggerDeath();
          return;
        }
      }
    }

    for (const sp of spiders) {
      if (
        rectsOverlap(
          player.x + 4,
          player.y + 4,
          TILE - 8,
          TILE - 8,
          sp.x + 4,
          sp.y + 4,
          TILE - 8,
          TILE - 8
        )
      ) {
        triggerDeath();
        return;
      }
    }
  }

  function allCentipedesDead() {
    return centipede.every((train) => train.every((s) => !s.alive));
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function triggerDeath() {
    lives--;
    soundDeath();
    levelAdvancing = false;
    if (lives <= 0) {
      endGame();
    } else {
      player.x = Math.floor(COLS / 2) * TILE;
      player.y = (ROWS - 1) * TILE;
      bullets = [];
      spawnCentipedeForLevel();
    }
    updateHUD();
  }

  function nextLevel() {
    if (levelAdvancing) return;
    levelAdvancing = true;
    level++;
    levelFlash = 1.5;
    soundLevelUp();

    bullets = [];
    spiders = [];
    spiderSpawnTimer = 0;

    spawnCentipedeForLevel();

    mushrooms = mushrooms.filter((m) => m.hits < 2).slice(0, MAX_MUSHROOMS);
    const needed = MAX_MUSHROOMS - mushrooms.length;
    let added = 0;
    let tries = 0;
    while (added < needed && tries < 500) {
      tries++;
      const col = Math.floor(Math.random() * COLS);
      const row = Math.floor(Math.random() * (ROWS - PLAYER_ZONE_ROWS - 1)) + 1;
      if (!mushrooms.some((m) => m.col === col && m.row === row)) {
        mushrooms.push({ col, row, hits: 0 });
        added++;
      }
    }

    updateHUD();
    setTimeout(() => {
      levelAdvancing = false;
    }, 0);
  }

  async function endGame(finished = false) {
    state = 'gameover';
    cancelAnimationFrame(animId);
    triggerTvTransition('off');
    let rewarded = false;

    const duration = Math.floor((Date.now() - startTime) / 1000);
    try {
      if (finished) {
        const rewardedPlayer = await API.rewardVictory();
        if (rewardedPlayer) {
          localStorage.setItem('centipede-auth-user', JSON.stringify(rewardedPlayer));
          rewarded = true;
        }
      }

      const result = await API.submitScore({
        username,
        score,
        level,
        kills,
        mushrooms_hit: mushroomsHit,
        duration_sec: duration,
      });
      if (result.newAchievements?.length) {
        result.newAchievements.forEach((a) => {
          UI.toast(`${a.icon} ${a.name} UNLOCKED!`, 'achievement');
        });
      }
    } catch (e) {
      console.warn('Score submit failed:', e.message);
    }

    setTimeout(async () => {
      await UI.showGameOver(score, { finished, rewarded });
      UI.refreshMiniLeaderboard();
    }, 850);
  }

  function triggerTvTransition(mode) {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (!wrapper) return;

    const old = wrapper.querySelector('.tv-transition');
    if (old) old.remove();

    const fx = document.createElement('div');
    fx.className = `tv-transition ${mode}`;
    wrapper.appendChild(fx);
    setTimeout(() => fx.remove(), mode === 'off' ? 900 : 800);
  }

  function togglePause() {
    if (state === 'playing') state = 'paused';
    else if (state === 'paused') {
      state = 'playing';
      lastTime = performance.now();
    }
  }

  function render() {
    ctx.fillStyle = COLOURS.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = COLOURS.grid;
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TILE, 0);
      ctx.lineTo(c * TILE, H);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE);
      ctx.lineTo(W, r * TILE);
      ctx.stroke();
    }

    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, (ROWS - PLAYER_ZONE_ROWS) * TILE);
    ctx.lineTo(W, (ROWS - PLAYER_ZONE_ROWS) * TILE);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const m of mushrooms) {
      if (m.hits >= 2) continue;
      const x = m.col * TILE;
      const y = m.row * TILE;
      ctx.fillStyle = m.hits === 1 ? COLOURS.mushroomHit : COLOURS.mushroom;
      ctx.shadowColor = m.hits === 1 ? '#ff6600' : '#ffb300';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2 - 4, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x + TILE / 2 - 5, y + TILE / 2 - 4, 10, 10);
      ctx.shadowBlur = 0;
    }

    for (const train of centipede) {
      for (const seg of train) {
        if (!seg.alive) continue;
        drawSegment(seg);
      }
    }

    for (const sp of spiders) drawSpider(sp);

    ctx.shadowColor = COLOURS.bullet;
    ctx.shadowBlur = 10;
    ctx.fillStyle = COLOURS.bullet;
    for (const b of bullets) ctx.fillRect(b.x, b.y, 8, 16);
    ctx.shadowBlur = 0;

    drawPlayer();
    drawFloaters();

    if (levelFlash > 0) {
      const alpha = Math.min(levelFlash, 0.5) * 0.6;
      ctx.fillStyle = `rgba(0,255,100,${alpha})`;
      ctx.fillRect(0, 0, W, H);

      ctx.globalAlpha = Math.min(1, levelFlash);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 18px 'Press Start 2P'`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 20;

      const lvlLabel = level >= 3 ? `LEVEL ${level} - DUAL CENTIPEDE!` : `LEVEL ${level}`;
      ctx.fillText(lvlLabel, W / 2, H / 2 - 10);

      if (level === 2) {
        ctx.font = `bold 9px 'Press Start 2P'`;
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.fillText('FASTER + MORE SPIDERS!', W / 2, H / 2 + 18);
      } else if (level >= 3) {
        ctx.font = `bold 9px 'Press Start 2P'`;
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.fillText('TWO CENTIPEDES - GOOD LUCK!', W / 2, H / 2 + 18);
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = '#00ff41';
    ctx.font = `bold 10px 'Press Start 2P'`;
    ctx.textAlign = 'right';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 8;
    ctx.fillText(`${score}`, W - 8, 20);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    ctx.fillStyle = '#00cc33';
    ctx.font = `bold 8px 'Press Start 2P'`;
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 4;
    ctx.fillText(`LVL ${level}`, 8, 20);
    ctx.shadowBlur = 0;
  }

  function drawPlayer() {
    const { x, y } = player;
    ctx.shadowColor = COLOURS.player;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLOURS.player;
    ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 8);
    ctx.fillRect(x + TILE / 2 - 3, y + 2, 6, 12);
    ctx.fillRect(x + 2, y + 12, 10, 6);
    ctx.fillRect(x + TILE - 12, y + 12, 10, 6);
    ctx.shadowBlur = 0;
  }

  function drawSegment(seg) {
    const { x, y, isHead, train } = seg;
    const headColor = train === 1 ? COLOURS.head2 : COLOURS.head;
    const bodyColor = train === 1 ? COLOURS.body2 : COLOURS.body;

    ctx.shadowColor = isHead ? headColor : bodyColor;
    ctx.shadowBlur = isHead ? 12 : 6;
    ctx.fillStyle = isHead ? headColor : bodyColor;
    ctx.beginPath();
    ctx.ellipse(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, TILE / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw legs
    ctx.strokeStyle = isHead ? headColor : bodyColor;
    ctx.lineWidth = 1.5;
    const legPhase = Date.now() / 80 + (x + y) * 0.1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const legYOffset = 8 + i * 8;
      const legOscillation = Math.sin(legPhase + i) * 3;
      
      // left leg
      ctx.moveTo(x + 6, y + legYOffset);
      ctx.lineTo(x - 2 + legOscillation, y + legYOffset + 4);
      
      // right leg
      ctx.moveTo(x + 26, y + legYOffset);
      ctx.lineTo(x + 34 + legOscillation, y + legYOffset + 4);
    }
    ctx.stroke();

    if (isHead) {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x + 10, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 22, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = headColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 8);
      ctx.lineTo(x + 6, y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 22, y + 8);
      ctx.lineTo(x + 26, y + 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function drawSpider(sp) {
    const cx = sp.x + TILE / 2;
    const cy = sp.y + TILE / 2;
    const ph = sp.legPhase || 0;

    ctx.shadowColor = COLOURS.spider;
    ctx.shadowBlur = 14;

    ctx.fillStyle = COLOURS.spider;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLOURS.spiderLegs;
    ctx.lineWidth = 1.5;
    const legAngles = [-0.9, -0.5, 0.5, 0.9];
    for (let side = -1; side <= 1; side += 2) {
      for (let li = 0; li < 4; li++) {
        const baseAngle = (legAngles[li] * Math.PI) / 2;
        const wobble = Math.sin(ph + li * 0.8) * 0.2;
        const angle = baseAngle + wobble;
        const len = 12;
        const kx1 = cx + side * Math.cos(angle) * len * 0.5;
        const ky1 = cy + Math.sin(angle) * len * 0.5;
        const kx2 = cx + side * Math.cos(angle) * len;
        const ky2 = cy + Math.sin(angle + 0.4) * len;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(kx1, ky1, kx2, ky2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2, cy - 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawIdle() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = COLOURS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(0,5,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00ff41';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 12;
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.fillText('Press P to continue', W / 2, H / 2 + 30);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  function updateHUD() {
    const elapsed = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(1, '0');
    const s = String(elapsed % 60).padStart(2, '0');

    document.getElementById('hud-score').textContent = score;
    document.getElementById('hud-level').textContent = level;
    document.getElementById('hud-lives').textContent = '❤️'.repeat(Math.max(0, lives));
    document.getElementById('stat-kills').textContent = kills;
    document.getElementById('stat-mush').textContent = mushroomsHit;
    document.getElementById('stat-time').textContent = `${m}:${s}`;
  }

  return { init, startGame, togglePause, setSkin };
})();
