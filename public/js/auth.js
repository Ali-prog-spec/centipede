const AuthService = (() => {
  const TOKEN_KEY = 'centipede-auth-token';
  const USER_KEY = 'centipede-auth-user';
  const API_BASE = '/api/auth';

  function saveSession(token, player) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(player));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() {
    return !!getToken() && !!getUser();
  }

  async function signup(username, password, confirmPassword, role) {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    saveSession(data.data.token, data.data.player);
    return data.data;
  }

  async function login(username, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    saveSession(data.data.token, data.data.player);
    return data.data;
  }

  async function verify() {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.success) {
        clearSession();
        return null;
      }

      saveSession(token, data.data);
      return data.data;
    } catch (error) {
      clearSession();
      return null;
    }
  }

  return {
    signup,
    login,
    verify,
    getUser,
    getToken,
    isAuthenticated,
    clearSession,
  };
})();

const AuthUI = (() => {
  const form = document.getElementById('authForm');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const errorMsg = document.getElementById('errorMessage');
  const successMsg = document.getElementById('successMessage');
  const coinsDisplay = document.getElementById('coinsDisplay');
  const coinCount = document.getElementById('coinCount');

  function init() {
    tabBtns.forEach((btn) => btn.addEventListener('click', switchTab));
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('signupBtn').addEventListener('click', handleSignup);
    checkAuthentication();
  }

  function switchTab(event) {
    const tab = event.target.dataset.tab;
    tabBtns.forEach((btn) => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById(`${tab}-form`).classList.add('active');
    clearMessages();
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearMessages();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      showError('Username and password are required');
      return;
    }

    try {
      setLoading(true);
      const result = await AuthService.login(username, password);
      showSuccess(`Welcome back, ${result.player.username}`);
      redirectForRole(result.player.role);
    } catch (error) {
      showError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    clearMessages();

    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const role = document.getElementById('signup-role').value;

    if (!username || !password || !confirm) {
      showError('All fields are required');
      return;
    }

    if (username.length < 2 || username.length > 20) {
      showError('Username must be 2 to 20 characters');
      return;
    }

    if (password.length < 4) {
      showError('Password must be at least 4 characters');
      return;
    }

    try {
      setLoading(true);
      const result = await AuthService.signup(username, password, confirm, role);
      showSuccess(`Account created for ${result.player.username}`);
      redirectForRole(result.player.role);
    } catch (error) {
      showError(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function checkAuthentication() {
    if (!AuthService.isAuthenticated()) return;

    const verified = await AuthService.verify();
    if (!verified) return;

    showTokenDisplay(verified.tokens || 0);
    showSuccess(`Already logged in as ${verified.username}`);
    redirectForRole(verified.role, 1000);
  }

  function redirectForRole(role, delay = 700) {
    setTimeout(() => {
      window.location.href = role === 'admin' ? '/admin.html' : '/';
    }, delay);
  }

  function showTokenDisplay(tokens) {
    coinCount.textContent = tokens;
    coinsDisplay.classList.add('show');
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
    successMsg.classList.remove('show');
  }

  function showSuccess(message) {
    successMsg.textContent = message;
    successMsg.classList.add('show');
    errorMsg.classList.remove('show');
  }

  function clearMessages() {
    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
  }

  function setLoading(loading) {
    form.classList.toggle('loading', loading);
    document.getElementById('loginBtn').disabled = loading;
    document.getElementById('signupBtn').disabled = loading;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', AuthUI.init);
