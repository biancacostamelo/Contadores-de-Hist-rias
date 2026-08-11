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

class Sanitizer {
  static escape(str) {
    if (typeof str !== 'string') return '';

    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return str.replace(/[&<>"']/g, (char) => replacements[char]);
  }
}

class StorageService {
  static get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`StorageService: Failed to write key "${key}"`, err);
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`StorageService: Failed to remove key "${key}"`, err);
    }
  }
}

class SessionManager {
  static getActiveUserEmail() {
    const session = StorageService.get(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return null;

    const isValid = Date.now() < session.expiresAt && session.email;
    return isValid ? session.email : null;
  }

  static isLoggedIn() {
    return this.getActiveUserEmail() !== null;
  }
}

class ImageStore {
  constructor() {
    this._dbPromise = null;
  }

  async open() {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB.NAME, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(CONFIG.DB.STORE_NAME, {
          keyPath: 'id',
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this._dbPromise;
  }

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
  }
}

class ProfileCard {
  static async create(emailHash, user) {
    const imageStore = new ImageStore();

    const bannerUrl = await imageStore.resolveRef(user?.banner);
    const avatarUrl = await imageStore.resolveRef(user?.avatar);

    const name = Sanitizer.escape(user?.fullname || 'Membro');
    const bio = Sanitizer.escape(user?.bio || 'Escritor apaixonado');

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

    card.addEventListener(
      'click',
      this._handleNavigation.bind(this, emailHash),
    );
    card.addEventListener(
      'keydown',
      this._handleKeyboardNav.bind(this, emailHash),
    );

    return card;
  }

  static _handleNavigation(emailHash, event) {
    if (event.target.closest('[data-action]')) return;

    const url = `${CONFIG.ROUTES.PROFILE}${encodeURIComponent(emailHash)}`;
    window.location.href = url;
  }

  static _handleKeyboardNav(emailHash, event) {
    if (event.target.closest('[data-action]')) return;

    const validKeys = ['Enter', ' ', 'Space'];
    if (!validKeys.includes(event.key)) return;

    event.preventDefault();

    const url = `${CONFIG.ROUTES.PROFILE}${encodeURIComponent(emailHash)}`;
    window.location.href = url;
  }
}

class ProfilesGrid {
  constructor() {
    this._imageStore = new ImageStore();
  }

  render(containerSelector, config = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn('ProfilesGrid: Container not found.');
      return;
    }

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

    this._renderProfiles(gridId, loadingId, emptyId);
  }

  async _renderProfiles(gridId, loadingId, emptyId) {
    const grid = document.getElementById(gridId);
    const loading = document.getElementById(loadingId);
    const empty = document.getElementById(emptyId);

    if (!grid) return;

    const users = StorageService.get(CONFIG.STORAGE_KEYS.USERS) || {};
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
      const cards = await Promise.all(
        filteredUsers.map(([emailHash, user]) =>
          ProfileCard.create(emailHash, user),
        ),
      );
      grid.replaceChildren(...cards);
    } catch (err) {
      console.error('ProfilesGrid: Failed to render profiles:', err);

      if (empty) {
        empty.textContent = 'Erro ao carregar perfis.';
        empty.removeAttribute('hidden');
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = new ProfilesGrid();
  grid.render('#profilesContainer');
});

window.ProfilesGrid = ProfilesGrid;
