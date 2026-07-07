(function (global) {
  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function getStorage() {
    return typeof global.localStorage !== 'undefined' ? global.localStorage : null;
  }

  function readJSON(key, fallback) {
    const storage = getStorage();
    if (!storage) return fallback;

    try {
      const rawValue = storage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(key, JSON.stringify(value));
  }

  function getUsers() {
    const storage = getStorage();
    if (!storage) return {};

    const users = readJSON('mydogcrushUsers', {});
    const normalizedEntries = {};

    Object.keys(users || {}).forEach((key) => {
      const normalizedKey = normalizeEmail(key);
      const value = users[key] || {};
      if (!normalizedKey) return;
      normalizedEntries[normalizedKey] = {
        email: normalizedKey,
        ...value,
        email: normalizedKey
      };
    });

    if (Object.keys(normalizedEntries).length && JSON.stringify(normalizedEntries) !== storage.getItem('mydogcrushUsers')) {
      writeJSON('mydogcrushUsers', normalizedEntries);
    }

    return normalizedEntries;
  }

  function saveUsers(users) {
    writeJSON('mydogcrushUsers', users);
    return users;
  }

  function getUser(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const users = getUsers();
    if (users[normalizedEmail]) return users[normalizedEmail];

    const pendingEmail = getPendingEmail();
    if (pendingEmail && pendingEmail === normalizedEmail) {
      return registerUser(normalizedEmail, { password: '' });
    }

    const account = readJSON('mydogcrushAccount', {});
    const accountEmail = normalizeEmail(account.email);
    if (accountEmail && accountEmail === normalizedEmail) {
      return registerUser(normalizedEmail, { password: '' });
    }

    return null;
  }

  function registerUser(email, data = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const users = getUsers();
    users[normalizedEmail] = {
      email: normalizedEmail,
      password: '',
      ...data,
      email: normalizedEmail
    };

    saveUsers(users);
    return users[normalizedEmail];
  }

  function setPendingEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    const storage = getStorage();
    if (!storage) return null;
    if (normalizedEmail) {
      storage.setItem('mydogcrushPendingEmail', normalizedEmail);
    } else {
      storage.removeItem('mydogcrushPendingEmail');
    }
    return normalizedEmail;
  }

  function getPendingEmail() {
    const storage = getStorage();
    if (!storage) return '';
    return normalizeEmail(storage.getItem('mydogcrushPendingEmail') || '');
  }

  function setAccount(account) {
    const storage = getStorage();
    if (!storage) return null;
    const nextAccount = {
      ownerName: '',
      email: '',
      phone: '',
      ...account
    };
    storage.setItem('mydogcrushAccount', JSON.stringify(nextAccount));
    return nextAccount;
  }

  function getAccount() {
    return readJSON('mydogcrushAccount', {});
  }

  function setLoggedIn(email) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem('mydogcrushLoggedIn', 'true');
    if (email) {
      storage.setItem('mydogcrushUserEmail', normalizeEmail(email));
    }
  }

  function isLoggedIn() {
    const storage = getStorage();
    return storage ? storage.getItem('mydogcrushLoggedIn') === 'true' : false;
  }

  const api = {
    normalizeEmail,
    getUsers,
    saveUsers,
    getUser,
    registerUser,
    setPendingEmail,
    getPendingEmail,
    setAccount,
    getAccount,
    setLoggedIn,
    isLoggedIn
  };

  global.Auth = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
