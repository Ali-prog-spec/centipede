const AdminUI = (() => {
  let players = [];

  async function init() {
    const user = await requireAdmin();
    if (!user) return;

    document.getElementById('admin-name').textContent = user.username.toUpperCase();
    document.getElementById('admin-user-info').classList.remove('hidden');
    document.getElementById('admin-logout-btn').addEventListener('click', logout);
    document.getElementById('admin-search-btn').addEventListener('click', searchPlayers);
    document.getElementById('admin-refresh-btn').addEventListener('click', loadAllPlayers);
    document.getElementById('admin-search').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') searchPlayers();
    });

    await Promise.all([loadAllPlayers(), loadRequests()]);
  }

  async function requireAdmin() {
    const token = localStorage.getItem('centipede-auth-token');
    const stored = localStorage.getItem('centipede-auth-user');
    if (!token || !stored) {
      window.location.href = '/auth.html';
      return null;
    }

    try {
      const user = await API.verify();
      localStorage.setItem('centipede-auth-user', JSON.stringify(user));
      if (user.role !== 'admin') {
        window.location.href = '/';
        return null;
      }
      return user;
    } catch (error) {
      window.location.href = '/auth.html';
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('centipede-auth-token');
    localStorage.removeItem('centipede-auth-user');
    window.location.href = '/auth.html';
  }

  async function loadAllPlayers() {
    try {
      players = await API.getAdminPlayers();
      renderPlayers(players);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function searchPlayers() {
    const query = document.getElementById('admin-search').value.trim();
    try {
      players = query ? await API.searchAdminPlayers(query) : await API.getAdminPlayers();
      renderPlayers(players);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function renderPlayers(entries) {
    const container = document.getElementById('admin-players');
    if (!entries.length) {
      container.innerHTML = '<div class="empty-state">No players found.</div>';
      return;
    }

    container.innerHTML = entries
      .map(
        (player) => `
          <article class="admin-player-card ${player.isActive ? '' : 'deactivated'}">
            <div>
              <div class="admin-player-name">
                ${escapeHtml(player.username)} 
                <span class="role-badge ${player.role}">${player.role.toUpperCase()}</span>
                ${player.isActive ? '' : '<span class="status-badge error">DEACTIVATED</span>'}
              </div>
              <div class="admin-player-meta">Tokens: ${player.tokens} | Games: ${player.totalGames} | Best: ${player.bestScore}</div>
            </div>
            <div class="admin-player-actions">
              <input id="assign-${player.id}" type="number" class="retro-input admin-token-input" min="1" value="5" />
              <button class="retro-btn" data-assign="${player.id}">ASSIGN TOKENS</button>
              <button class="retro-btn" data-history="${player.username}">VIEW HISTORY</button>
              ${player.username !== 'admin' ? `
                <button class="retro-btn" data-status="${player.id}" data-active="${player.isActive}">
                  ${player.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                </button>
                <button class="retro-btn" data-role="${player.id}" data-current="${player.role}">
                  ${player.role === 'admin' ? 'MAKE PLAYER' : 'MAKE ADMIN'}
                </button>
              ` : ''}
            </div>
          </article>
        `
      )
      .join('');

    container.querySelectorAll('[data-assign]').forEach((button) => {
      button.addEventListener('click', () => assignTokens(button.dataset.assign));
    });

    container.querySelectorAll('[data-history]').forEach((button) => {
      button.addEventListener('click', () => loadHistory(button.dataset.history));
    });

    container.querySelectorAll('[data-status]').forEach((button) => {
      button.addEventListener('click', () => toggleStatus(button.dataset.status, button.dataset.active === 'true'));
    });

    container.querySelectorAll('[data-role]').forEach((button) => {
      button.addEventListener('click', () => toggleRole(button.dataset.role, button.dataset.current));
    });
  }

  async function toggleStatus(playerId, currentlyActive) {
    try {
      await API.setPlayerStatus(playerId, !currentlyActive);
      toast(`Account ${currentlyActive ? 'deactivated' : 'activated'}.`);
      await loadAllPlayers();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function toggleRole(playerId, currentRole) {
    try {
      const newRole = currentRole === 'admin' ? 'player' : 'admin';
      await API.setPlayerRole(playerId, newRole);
      toast(`Role changed to ${newRole}.`);
      await loadAllPlayers();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function assignTokens(playerId) {
    const input = document.getElementById(`assign-${playerId}`);
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter a valid token amount.', 'error');
      return;
    }

    try {
      await API.assignTokens(playerId, amount);
      toast('Tokens assigned.');
      await Promise.all([loadAllPlayers(), loadRequests()]);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function loadHistory(username) {
    const title = document.getElementById('history-player-name');
    const tbody = document.getElementById('admin-history-body');
    title.textContent = `Recent runs for ${username}`;
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';

    try {
      const history = await API.getHistory(username);
      tbody.innerHTML = history.length
        ? history
            .map(
              (game) => `
                <tr>
                  <td>${game.score}</td>
                  <td>${game.level}</td>
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

  async function loadRequests() {
    const container = document.getElementById('admin-requests');
    container.innerHTML = '<div class="loading-cell">Loading...</div>';

    try {
      const requests = await API.getAdminRequests();
      if (!requests.length) {
        container.innerHTML = '<div class="empty-state">No token requests for this admin.</div>';
        return;
      }

      container.innerHTML = requests
        .map(
          (request) => `
            <article class="request-card ${request.status}">
              <div class="request-card-head">
                <strong>${escapeHtml(request.playerUsername)}</strong>
                <span>${request.status.toUpperCase()}</span>
              </div>
              <div class="request-card-body">
                Requested: ${request.requestedTokens} token(s)<br />
                ${request.message ? `Message: ${escapeHtml(request.message)}<br />` : ''}
                Sent ${relativeTime(request.createdAt)}
              </div>
              ${
                request.status === 'pending'
                  ? `
                    <div class="request-actions">
                      <input id="resolve-${request.id}" type="number" class="retro-input admin-token-input" min="1" value="${request.requestedTokens}" />
                      <button class="retro-btn" data-approve="${request.id}">APPROVE</button>
                      <button class="retro-btn" data-reject="${request.id}">REJECT</button>
                    </div>
                  `
                  : `
                    <div class="request-card-body">Resolved tokens: ${request.resolvedTokens || 0}</div>
                  `
              }
            </article>
          `
        )
        .join('');

      container.querySelectorAll('[data-approve]').forEach((button) => {
        button.addEventListener('click', () => processRequest(button.dataset.approve, 'approve'));
      });
      container.querySelectorAll('[data-reject]').forEach((button) => {
        button.addEventListener('click', () => processRequest(button.dataset.reject, 'reject'));
      });
    } catch (error) {
      container.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  async function processRequest(requestId, action) {
    const resolvedInput = document.getElementById(`resolve-${requestId}`);
    const resolvedTokens = resolvedInput ? Number(resolvedInput.value) : 0;

    try {
      await API.processAdminRequest(requestId, action, resolvedTokens);
      toast(`Request ${action}d.`);
      await Promise.all([loadAllPlayers(), loadRequests()]);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function toast(message, type = '') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
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

  return { init };
})();

document.addEventListener('DOMContentLoaded', AdminUI.init);
