(() => {
  'use strict';

  const CONFIG = {
    STORAGE_KEYS: {
      USERS: 'writersCommunity_users',
      SESSION: 'writersCommunity_session',
    },
    ASSETS: {
      DEFAULT_AVATAR: '../assets/img/capaPadraoHistorias.png',
    },
    DB: {
      NAME: 'writersCommunityImages',
      STORE_NAME: 'images',
    },
    ROUTES: {
      PROFILE: '../pages/perfil.html?view=',
    },
  };

  const Sanitizer = {
    escape: (str) =>
      typeof str === 'string'
        ? str.replace(
            /[&<>"']/g,
            (char) =>
              ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
              })[char],
          )
        : '',
  };

  const Storage = {
    get(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    },
  };

  const SessionManager = {
    getActiveUserEmail() {
      const session = Storage.get(CONFIG.STORAGE_KEYS.SESSION);
      if (!session) return null;
      return Date.now() < session.expiresAt && session.email
        ? session.email
        : null;
    },
  };

  const ImageStore = {
    dbPromise: null,

    open() {
      if (this.dbPromise) return this.dbPromise;

      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB.NAME, 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore(CONFIG.DB.STORE_NAME, {
            keyPath: 'id',
          });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return this.dbPromise;
    },

    async resolveRef(ref) {
      if (!ref) return CONFIG.ASSETS.DEFAULT_AVATAR;
      if (typeof ref === 'object' && ref.type === 'img' && ref.id) {
        try {
          const db = await this.open();
          return new Promise((resolve) => {
            const req = db
              .transaction(CONFIG.DB.STORE_NAME, 'readonly')
              .objectStore(CONFIG.DB.STORE_NAME)
              .get(ref.id);
            req.onsuccess = () =>
              resolve(req.result?.data || CONFIG.ASSETS.DEFAULT_AVATAR);
            req.onerror = () => resolve(CONFIG.ASSETS.DEFAULT_AVATAR);
          });
        } catch {
          return CONFIG.ASSETS.DEFAULT_AVATAR;
        }
      }
      return typeof ref === 'string' ? ref : CONFIG.ASSETS.DEFAULT_AVATAR;
    },
  };

  const createProfileCard = async ([emailHash, user]) => {
    const bannerUrl = await ImageStore.resolveRef(user?.banner);
    const name = Sanitizer.escape(user?.fullname || 'Membro');
    const bio = Sanitizer.escape(user?.bio || 'Escritor apaixonado');
    const avatarUrl = user?.avatar || CONFIG.ASSETS.DEFAULT_AVATAR;
    const storiesCount = Array.isArray(user?.stories) ? user.stories.length : 0;
    const draftsCount = Array.isArray(user?.drafts) ? user.drafts.length : 0;

    const card = document.createElement('article');
    card.className = 'profile-card';
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;
    card.dataset.emailHash = emailHash;

    const bannerStyle = bannerUrl
      ? `style="background-image: url('${bannerUrl}');"`
      : '';

    card.innerHTML = `
      <div class="profile-banner" ${bannerStyle}></div>
      <div class="profile-avatar-wrapper">
        <img class="profile-avatar" src="${avatarUrl}" alt="Foto de ${name}" width="80" height="80" loading="lazy" />
      </div>
      <div class="profile-info">
        <h2 class="profile-name">${name}</h2>
        <p class="profile-bio">${bio}</p>
        <div class="profile-stats">
          <span>${storiesCount} histórias</span>
          <span>${draftsCount} rascunhos</span>
        </div>
      </div>
    `;

    const navigateToProfile = (e) => {
      if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
      if (e.target.closest('[data-action]')) return;
      if (e.key === ' ') e.preventDefault();

      window.location.href = `${CONFIG.ROUTES.PROFILE}${encodeURIComponent(emailHash)}`;
    };

    card.addEventListener('click', navigateToProfile);
    card.addEventListener('keydown', navigateToProfile);

    return card;
  };

  const renderProfiles = async (gridId, loadingId, emptyId) => {
    const grid = document.getElementById(gridId);
    const loading = document.getElementById(loadingId);
    const empty = document.getElementById(emptyId);

    if (!grid) return;

    const users = Storage.get(CONFIG.STORAGE_KEYS.USERS) || {};
    const activeEmail = SessionManager.getActiveUserEmail();

    const filteredUsers = Object.entries(users).filter(
      ([email]) => !activeEmail || email !== activeEmail,
    );

    loading?.remove();

    if (!filteredUsers.length) {
      empty?.removeAttribute('hidden');
      return;
    }

    try {
      const cards = await Promise.all(filteredUsers.map(createProfileCard));
      grid.replaceChildren(...cards);
    } catch (err) {
      console.error('Failed to render profiles:', err);
      if (empty) {
        empty.textContent = 'Erro ao carregar perfis.';
        empty.removeAttribute('hidden');
      }
    }
  };

  const ProfileComponent = {
    render(containerSelector, config = {}) {
      const container = document.querySelector(containerSelector);
      if (!container)
        return console.warn('ProfileComponent: Container not found.');

      const gridId = config.gridId || 'profilesGrid';
      const loadingId = config.loadingId || 'profilesLoading';
      const emptyId = config.emptyId || 'profilesEmpty';

      container.innerHTML = `
        <section class="profiles-hero">
          <h1>Membros da Comunidade</h1>
          <p>Explore os perfis de todos os escritores e descubra suas histórias</p>
        </section>
        <div id="${gridId}" class="profiles-grid" aria-label="Lista de membros"></div>
        <div id="${loadingId}" class="loading-message">Carregando membros...</div>
        <div id="${emptyId}" class="empty-message" hidden>Nenhum membro encontrado na comunidade.</div>
      `;

      renderProfiles(gridId, loadingId, emptyId);
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    ProfileComponent.render('#profilesContainer');
  });

  window.ProfileComponent = ProfileComponent;
})();
