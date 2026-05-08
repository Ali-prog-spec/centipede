const API = (() => {
  const BASE = '/api';

  function getAuthToken() {
    return localStorage.getItem('centipede-auth-token');
  }

  async function request(method, path, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const token = getAuthToken();
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    if (body) options.body = JSON.stringify(body);

    const res = await fetch(BASE + path, options);
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'API error');
    }
    return json.data;
  }

  return {
    verify: () => request('POST', '/auth/verify'),
    getProfile: (username) => request('GET', `/players/${username}`),
    getHistory: (username) => request('GET', `/players/${username}/history`),
    startPlay: () => request('POST', '/play/start'),
    submitScore: (payload) => request('POST', '/scores', payload),
    getLeaderboard: () => request('GET', '/leaderboard'),
    getRecentGames: () => request('GET', '/leaderboard/recent'),
    getDaily: () => request('GET', '/daily'),
    submitDaily: (payload) => request('POST', '/daily', payload),
    getStoreSkins: () => request('GET', '/store/skins'),
    buySkin: (skinId) => request('POST', '/store/buy', { skinId }),
    selectSkin: (skinId) => request('POST', '/store/select', { skinId }),
    listAdmins: () => request('GET', '/admin/list'),
    getPlayerRequests: () => request('GET', '/player/requests'),
    createPlayerRequest: (payload) => request('POST', '/player/requests', payload),
    rewardVictory: () => request('POST', '/player/reward-victory'),
    getAdminPlayers: () => request('GET', '/admin/players'),
    searchAdminPlayers: (query) => request('GET', `/admin/search?q=${encodeURIComponent(query)}`),
    assignTokens: (playerId, tokens) => request('POST', '/admin/assign-tokens', { playerId, tokens }),
    getAdminRequests: () => request('GET', '/admin/requests'),
    processAdminRequest: (id, action, resolvedTokens) =>
      request('POST', `/admin/requests/${id}/process`, { action, resolvedTokens }),
    setPlayerStatus: (playerId, isActive) => 
      request('PATCH', `/admin/players/${playerId}/status`, { isActive }),
    setPlayerRole: (playerId, role) => 
      request('PATCH', `/admin/players/${playerId}/role`, { role }),
  };
})();
