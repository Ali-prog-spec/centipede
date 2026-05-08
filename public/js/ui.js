const UI = (() => {
  let currentUser = null;
  let storeSkins = [];
  let backgroundMusic = null;

  async function init() {
    const user = await requirePlayer();
    if (!user) return;

    currentUser = user;
    bindGlobalUI();
    setupBackgroundMusic();
    updateUserUI();
    Game.init(document.getElementById('game-canvas'));
    Game.setSkin(getSelectedSkinColors());

    await Promise.all([
      refreshMiniLeaderboard(),
      loadAlltime(),
      loadStore(),
      loadAdmins(),
      loadRequestHistory(),
    ]);
  }

  async function requirePlayer() {
    const token = localStorage.getItem('centipede-auth-token');
    const stored = localStorage.getItem('centipede-auth-user');
    if (!token || !stored) {
      window.location.href = '/auth.html';
      return null;
    }

    try {
      const user = await API.verify();
      if (user.role === 'admin') {
        window.location.href = '/admin.html';
        return null;
      }
      localStorage.setItem('centipede-auth-user', JSON.stringify(user));
      return user;
    } catch (error) {
      localStorage.removeItem('centipede-auth-token');
      localStorage.removeItem('centipede-auth-user');
      window.location.href = '/auth.html';
      return null;
    }
  }

  function bindGlobalUI() {
    document.getElementById('user-info-header').classList.remove('hidden');
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('start-btn').addEventListener('click', startRun);
    document.getElementById('overlay-btn').addEventListener('click', startRun);
    document.getElementById('profile-search-btn').addEventListener('click', loadProfile);
    document.getElementById('profile-username').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadProfile();
    });
    document.getElementById('send-request-btn').addEventListener('click', sendTokenRequest);

    document.querySelectorAll('.nav-btn').forEach((button) => {
      button.addEventListener('click', () => openTab(button.dataset.tab));
    });

    document.querySelectorAll('.board-tab-btn').forEach((button) => {
      button.addEventListener('click', () => openBoard(button.dataset.board));
    });
  }

  function setupBackgroundMusic() {
    if (backgroundMusic) return;
    backgroundMusic = new Audio('/audio.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    backgroundMusic.preload = 'auto';

    const startMusic = () => {
      if (!backgroundMusic) return;
      backgroundMusic.play().catch(() => {});
    };

    window.addEventListener('click', startMusic, { once: true });
    window.addEventListener('keydown', startMusic, { once: true });
  }

  function ensureBackgroundMusic() {
    if (!backgroundMusic) return;
    backgroundMusic.play().catch(() => {});
  }

  function logout() {
    localStorage.removeItem('centipede-auth-token');
    localStorage.removeItem('centipede-auth-user');
    window.location.href = '/auth.html';
  }

  function updateUserUI() {
    document.getElementById('username-header').textContent = currentUser.username.toUpperCase();
    document.getElementById('coins-count').textContent = currentUser.tokens || 0;
    document.getElementById('available-tokens').textContent = currentUser.tokens || 0;
    document.getElementById('equipped-skin-name').textContent = getSelectedSkinName();
    document.getElementById('hud-best').textContent = currentUser.bestScore || 0;
  }

  async function refreshCurrentUser() {
    currentUser = await API.verify();
    localStorage.setItem('centipede-auth-user', JSON.stringify(currentUser));
    updateUserUI();
    Game.setSkin(getSelectedSkinColors());
  }

  async function startRun() {
    ensureBackgroundMusic();
    if ((currentUser.tokens || 0) <= 0) {
      toast('You are out of tokens. Use the request page to ask an admin.', 'error');
      openTab('request');
      return;
    }

    try {
      currentUser = await API.startPlay();
      localStorage.setItem('centipede-auth-user', JSON.stringify(currentUser));
      updateUserUI();
      document.getElementById('hud-name').textContent = currentUser.username.toUpperCase();
      document.getElementById('player-setup').classList.add('hidden');
      document.getElementById('player-hud').classList.remove('hidden');
      document.getElementById('overlay-screen').classList.remove('active');
      Game.setSkin(getSelectedSkinColors());
      Game.startGame(currentUser.username);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function openTab(tab) {
    document.querySelectorAll('.nav-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-section').forEach((section) => {
      section.classList.add('hidden');
      section.classList.remove('active');
    });
    const current = document.getElementById(`tab-${tab}`);
    current.classList.remove('hidden');
    current.classList.add('active');

    if (tab === 'leaderboard') loadAlltime();
    if (tab === 'store') loadStore();
    if (tab === 'request') {
      loadAdmins();
      loadRequestHistory();
    }
  }

  function openBoard(board) {
    document.querySelectorAll('.board-tab-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.board === board);
    });
    document.querySelectorAll('.board-content').forEach((content) => {
      content.classList.add('hidden');
    });
    document.getElementById(`board-${board}`).classList.remove('hidden');

    if (board === 'alltime') loadAlltime();
    if (board === 'recent') loadRecent();
    if (board === 'daily') loadDaily();
  }

  async function refreshMiniLeaderboard() {
    const el = document.getElementById('mini-leaderboard');
    try {
      const board = await API.getLeaderboard();
      const top5 = board.slice(0, 5);
      el.innerHTML = top5.length
        ? top5
            .map(
              (player, index) => `
                <li>
                  <span class="mb-rank">#${index + 1} ${escapeHtml(player.username.slice(0, 10))}</span>
                  <span class="mb-score">${player.score}</span>
                </li>
              `
            )
            .join('')
        : '<li class="mini-board-loading">No scores yet</li>';
    } catch (error) {
      el.innerHTML = '<li class="mini-board-loading">Unavailable</li>';
    }
  }

  async function loadAlltime() {
    const tbody = document.getElementById('alltime-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading...</td></tr>';
    try {
      const board = await API.getLeaderboard();
      tbody.innerHTML = board.length
        ? board
            .map(
              (row) => `
                <tr>
                  <td>${row.rank}</td>
                  <td>${escapeHtml(row.username)}</td>
                  <td>${row.score.toLocaleString()}</td>
                  <td>${row.totalGames}</td>
                </tr>
              `
            )
            .join('')
        : '<tr><td colspan="4" class="loading-cell">No scores yet.</td></tr>';
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="4" class="loading-cell">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function loadRecent() {
    const tbody = document.getElementById('recent-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';
    try {
      const games = await API.getRecentGames();
      tbody.innerHTML = games.length
        ? games
            .map(
              (game) => `
                <tr>
                  <td>${escapeHtml(game.username)}</td>
                  <td>${game.score.toLocaleString()}</td>
                  <td>${game.kills}</td>
                  <td>${formatSeconds(game.duration_sec)}</td>
                  <td>${relativeTime(game.played_at)}</td>
                </tr>
              `
            )
            .join('')
        : '<tr><td colspan="5" class="loading-cell">No games yet.</td></tr>';
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function loadDaily() {
    document.getElementById('daily-date').textContent = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const tbody = document.getElementById('daily-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading...</td></tr>';
    try {
      const daily = await API.getDaily();
      tbody.innerHTML = daily.length
        ? daily
            .map(
              (entry) => `
                <tr>
                  <td>${entry.rank}</td>
                  <td>${escapeHtml(entry.username)}</td>
                  <td>${entry.score.toLocaleString()}</td>
                  <td>${entry.completed ? 'Completed' : 'Open'}</td>
                </tr>
              `
            )
            .join('')
        : '<tr><td colspan="4" class="loading-cell">No entries yet today.</td></tr>';
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="4" class="loading-cell">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function loadProfile() {
    const name = document.getElementById('profile-username').value.trim();
    if (!name) return;

    const content = document.getElementById('profile-content');
    const empty = document.getElementById('profile-empty');
    content.classList.add('hidden');
    empty.textContent = 'Loading...';

    try {
      const player = await API.getProfile(name);
      const history = await API.getHistory(name);

      document.getElementById('p-name').textContent = player.username.toUpperCase();
      document.getElementById('p-rank').textContent = `RANK #${player.rank}`;
      document.getElementById('p-joined').textContent = `Joined ${new Date(player.createdAt).toLocaleDateString()}`;
      document.getElementById('ps-best').textContent = (player.stats?.bestScore || 0).toLocaleString();
      document.getElementById('ps-games').textContent = player.stats?.totalGames || 0;
      document.getElementById('ps-kills').textContent = player.stats?.totalKills || 0;
      document.getElementById('ps-avg').textContent = player.stats?.avgScore || 0;

      document.getElementById('achievements-grid').innerHTML = player.achievements?.length
        ? player.achievements
            .map(
              (achievement) => `
                <div class="ach-card">
                  <span class="ach-icon">${achievement.icon || '★'}</span>
                  <div class="ach-name">${escapeHtml(achievement.name)}</div>
                  <div class="ach-desc">${escapeHtml(achievement.description)}</div>
                </div>
              `
            )
            .join('')
        : '<div class="empty-state">No achievements yet.</div>';

      document.getElementById('history-tbody').innerHTML = history.length
        ? history
            .map(
              (game) => `
                <tr>
                  <td>${game.score.toLocaleString()}</td>
                  <td>${game.kills}</td>
                  <td>${formatSeconds(game.duration_sec)}</td>
                  <td>${relativeTime(game.played_at)}</td>
                </tr>
              `
            )
            .join('')
        : '<tr><td colspan="4" class="loading-cell">No games yet.</td></tr>';

      empty.textContent = '';
      content.classList.remove('hidden');
    } catch (error) {
      empty.textContent = `Player "${name}" not found.`;
    }
  }

  async function loadStore() {
    const grid = document.getElementById('store-grid');
    grid.innerHTML = '<div class="loading-cell">Loading...</div>';

    try {
      storeSkins = await API.getStoreSkins();
      updateUserUI();
      grid.innerHTML = storeSkins
        .map((skin) => {
          const owned = (currentUser.ownedSkins || []).includes(skin.id);
          const selected = currentUser.selectedSkin === skin.id;
          return `
            <article class="store-card">
              <div class="skin-preview" style="--skin-main:${skin.colors.player};--skin-accent:${skin.colors.accent};--skin-bullet:${skin.colors.bullet};"></div>
              <div class="store-card-body">
                <div class="store-card-title">${escapeHtml(skin.name)}</div>
                <div class="store-card-subtitle">${escapeHtml(skin.theme)}</div>
                <div class="store-card-price">${skin.price === 0 ? 'Included' : `${skin.price} tokens`}</div>
                <p class="store-card-copy">${escapeHtml(skin.description)}</p>
                <button class="retro-btn ${selected ? 'primary' : ''}" data-skin-action="${skin.id}">
                  ${selected ? 'EQUIPPED' : owned ? 'EQUIP' : 'BUY'}
                </button>
              </div>
            </article>
          `;
        })
        .join('');

      grid.querySelectorAll('[data-skin-action]').forEach((button) => {
        button.addEventListener('click', () => handleSkinAction(button.dataset.skinAction));
      });
    } catch (error) {
      grid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  async function handleSkinAction(skinId) {
    const owned = (currentUser.ownedSkins || []).includes(skinId);

    try {
      if (owned) {
        currentUser = await API.selectSkin(skinId);
      } else {
        const result = await API.buySkin(skinId);
        currentUser = result.player;
        toast(result.purchased ? 'Skin purchased and equipped.' : 'Skin equipped.');
      }
      localStorage.setItem('centipede-auth-user', JSON.stringify(currentUser));
      updateUserUI();
      Game.setSkin(getSelectedSkinColors());
      await loadStore();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function loadAdmins() {
    const select = document.getElementById('request-admin');
    try {
      const admins = await API.listAdmins();
      select.innerHTML = admins.length
        ? admins
            .map((admin) => `<option value="${admin.id}">${escapeHtml(admin.username)}</option>`)
            .join('')
        : '<option value="">No admins available</option>';
    } catch (error) {
      select.innerHTML = '<option value="">Could not load admins</option>';
    }
  }

  async function sendTokenRequest() {
    const adminId = document.getElementById('request-admin').value;
    const requestedTokens = Number(document.getElementById('request-amount').value);
    const message = document.getElementById('request-message').value.trim();

    if (!adminId) {
      toast('Choose an admin first.', 'error');
      return;
    }

    if (!Number.isFinite(requestedTokens) || requestedTokens <= 0) {
      toast('Enter a valid token amount.', 'error');
      return;
    }

    try {
      await API.createPlayerRequest({ adminId, requestedTokens, message });
      document.getElementById('request-message').value = '';
      toast('Request sent to the admin.');
      await loadRequestHistory();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function loadRequestHistory() {
    const container = document.getElementById('request-history');
    container.innerHTML = '<div class="loading-cell">Loading...</div>';

    try {
      const requests = await API.getPlayerRequests();
      container.innerHTML = requests.length
        ? requests
            .map(
              (request) => `
                <article class="request-card ${request.status}">
                  <div class="request-card-head">
                    <strong>${escapeHtml(request.adminUsername)}</strong>
                    <span>${request.status.toUpperCase()}</span>
                  </div>
                  <div class="request-card-body">
                    Requested: ${request.requestedTokens} token(s)<br />
                    ${request.message ? `Message: ${escapeHtml(request.message)}<br />` : ''}
                    ${request.resolvedTokens ? `Resolved: ${request.resolvedTokens} token(s)<br />` : ''}
                    ${relativeTime(request.createdAt)}
                  </div>
                </article>
              `
            )
            .join('')
        : '<div class="empty-state">No requests yet.</div>';
    } catch (error) {
      container.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  function getSelectedSkinName() {
    const selected = storeSkins.find((skin) => skin.id === currentUser.selectedSkin);
    return selected ? selected.name : 'Classic Blaster';
  }

  function getSelectedSkinColors() {
    const selected = storeSkins.find((skin) => skin.id === currentUser.selectedSkin);
    return selected?.colors || {
      player: '#00ff41',
      bullet: '#ffff00',
      accent: '#0f200f',
    };
  }

  function toast(message, type = '') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatSeconds(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  function relativeTime(iso) {
    const delta = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  async function showGameOver(score, options = {}) {
    const finished = Boolean(options.finished);
    const rewarded = Boolean(options.rewarded);
    const overlay = document.getElementById('overlay-screen');
    document.getElementById('overlay-title').textContent = finished ? 'GAME FINISHED' : 'GAME OVER';
    document.getElementById('overlay-msg').textContent = finished
      ? rewarded
        ? 'You cleared level 3 and earned 1 bonus token.'
        : 'You cleared level 3. Spend another token to start a fresh run.'
      : 'Spend another token to jump back in.';
    document.getElementById('overlay-score-display').classList.remove('hidden');
    document.getElementById('overlay-final-score').textContent = score;
    document.getElementById('overlay-btn').classList.remove('hidden');
    document.getElementById('overlay-btn').textContent = finished ? 'PLAY AGAIN' : 'PLAY AGAIN';
    overlay.classList.add('active');
    document.getElementById('player-setup').classList.remove('hidden');
    document.getElementById('player-hud').classList.add('hidden');
    toast(
      finished
        ? rewarded
          ? 'Level 3 cleared. Bonus token awarded!'
          : 'Level 3 cleared. Game finished!'
        : 'Run ended.'
    );
    await Promise.all([refreshCurrentUser(), refreshMiniLeaderboard(), loadRequestHistory()]);
  }

  return {
    init,
    toast,
    showGameOver,
    refreshMiniLeaderboard,
  };
})();

document.addEventListener('DOMContentLoaded', UI.init);
