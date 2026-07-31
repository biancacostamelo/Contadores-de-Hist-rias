/**
 * allProfiles.js - OOP Refactored Version
 * ========================================
 * Uses ES6+ classes for clean separation of concerns:
 *   - Sanitizer        : HTML escaping utility
 *   - StorageService   : localStorage abstraction layer
 *   - SessionManager   : Active session & user resolution
 *   - ImageStore       : IndexedDB image persistence
 *   - ProfileCard      : Single profile card DOM element
 *   - ProfilesGrid     : Main controller – state, rendering, events
 */

'use strict';

/* ─────────────────────────────────────────────
   CONFIGURATION
   ───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   CLASS: Sanitizer
   ───────────────────────────────────────────── */

/**
 * Sanitizer – static utility class for safe HTML string handling.
 * Prevents XSS by escaping special characters in user-generated content.
 */
class Sanitizer {
  /**
   * Escapes HTML special characters to prevent injection attacks.
   * @param {string} str - Raw string to sanitize
   * @returns {string} Sanitized string safe for innerHTML injection
   */
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

/* ─────────────────────────────────────────────
   CLASS: StorageService
   ───────────────────────────────────────────── */

/**
 * StorageService – centralized localStorage abstraction.
 * Provides safe get/set operations with JSON parsing fallbacks.
 */
class StorageService {
  /**
   * Retrieves and parses a JSON value from localStorage.
   * @param {string} key - Storage key
   * @returns {*} Parsed value or null on failure
   */
  static get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  /**
   * Stores a serializable value in localStorage.
   * @param {string} key - Storage key
   * @param {*} value - Value to store (must be JSON-serializable)
   */
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`StorageService: Failed to write key "${key}"`, err);
    }
  }

  /**
   * Removes a key from localStorage.
   * @param {string} key - Storage key
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`StorageService: Failed to remove key "${key}"`, err);
    }
  }
}

/* ─────────────────────────────────────────────
   CLASS: SessionManager
   ───────────────────────────────────────────── */

/**
 * SessionManager – resolves active user sessions from localStorage.
 * Handles token expiry and email extraction for the current session.
 */
class SessionManager {
  /**
   * Returns the active user's email hash if a valid, non-expired session exists.
   * @returns {string|null} Email hash or null
   */
  static getActiveUserEmail() {
    const session = StorageService.get(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return null;

    const isValid = Date.now() < session.expiresAt && session.email;
    return isValid ? session.email : null;
  }

  /**
   * Checks whether a user is currently logged in.
   * @returns {boolean}
   */
  static isLoggedIn() {
    return this.getActiveUserEmail() !== null;
  }
}

/* ─────────────────────────────────────────────
   CLASS: ImageStore (IndexedDB wrapper)
   ───────────────────────────────────────────── */

/**
 * ImageStore – IndexedDB abstraction for image persistence.
 * Resolves avatar/banner references from stored DB entries or falls back to defaults.
 */
class ImageStore {
  constructor() {
    this._dbPromise = null;
  }

  /**
   * Opens (or reuses) the IndexedDB connection and creates the object store if needed.
   * @returns {Promise<IDBDatabase>}
   */
  async open() {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB.NAME, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(CONFIG.DB.STORE_NAME, { keyPath: 'id' });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this._dbPromise;
  }

  /**
   * Resolves an image reference (object with id, or raw string URL) to a usable src.
   * Falls back to the default avatar when resolution fails.
   * @param {*} ref - Image reference object {type:'img',id} or string URL
   * @returns {string} Resolved image src
   */
  async resolveRef(ref) {
    if (!ref) return CONFIG.ASSETS.DEFAULT_AVATAR;

    // Resolve from IndexedDB when ref is an object with id
    if (typeof ref === 'object' && ref.type === 'img' && ref.id) {
      try {
        const db = await this.open();
        return new Promise((resolve) => {
          const req = db
            .transaction(CONFIG.DB.STORE_NAME, 'readonly')
            .objectStore(CONFIG.DB.STORE_NAME)
            .get(ref.id);

          req.onsuccess = () => resolve(req.result?.data || CONFIG.ASSETS.DEFAULT_AVATAR);
          req.onerror = () => resolve(CONFIG.ASSETS.DEFAULT_AVATAR);
        });
      } catch {
        return CONFIG.ASSETS.DEFAULT_AVATAR;
      }
    }

    // Return raw string URL or fallback
    return typeof ref === 'string' ? ref : CONFIG.ASSETS.DEFAULT_AVATAR;
  }
}

/* ─────────────────────────────────────────────
   CLASS: ProfileCard
   ───────────────────────────────────────────── */

/**
 * ProfileCard – represents a single user profile card DOM element.
 * Encapsulates card creation, accessibility attributes, and click/keyboard navigation.
 */
class ProfileCard {
  /**
   * Creates and returns an <article> element representing one user's profile card.
   * @param {string} emailHash - User's unique email hash
   * @param {Object} user - User data object (fullname, bio, avatar, banner, stories, drafts)
   * @returns {Promise<HTMLAnchorElement>} Resolved promise with the DOM element
   */
  static async create(emailHash, user) {
    const imageStore = new ImageStore();

    // Resolve banner and avatar images asynchronously
    const bannerUrl = await imageStore.resolveRef(user?.banner);
    const avatarUrl = await imageStore.resolveRef(user?.avatar);

    // Sanitize text content to prevent XSS
    const name = Sanitizer.escape(user?.fullname || 'Membro');
    const bio = Sanitizer.escape(user?.bio || 'Escritor apaixonado');

    // Count stories and drafts safely
    const storiesCount = Array.isArray(user?.stories) ? user.stories.length : 0;
    const draftsCount = Array.isArray(user?.drafts) ? user.drafts.length : 0;

    // Build the DOM element
    const card = document.createElement('article');
    card.className = 'profile-card';
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;
    card.dataset.emailHash = emailHash;

    // Apply banner background only if a URL exists
    const bannerStyle = bannerUrl ? `style="background-image: url('${bannerUrl}');"` : '';

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

    // Bind navigation handler (click + keyboard)
    card.addEventListener('click', this._handleNavigation.bind(this, emailHash));
    card.addEventListener('keydown', this._handleKeyboardNav.bind(this, emailHash));

    return card;
  }

  /**
   * Handles click events on profile cards – navigates to the user's profile page.
   * @param {string} emailHash - Target user's email hash
   * @param {Event} event - Click event
   */
  static _handleNavigation(emailHash, event) {
    if (event.target.closest('[data-action]')) return;

    const url = `${CONFIG.ROUTES.PROFILE}${encodeURIComponent(emailHash)}`;
    window.location.href = url;
  }

  /**
   * Handles keyboard navigation on profile cards – Enter and Space trigger navigation.
   * @param {string} emailHash - Target user's email hash
   * @param {KeyboardEvent} event - Keyboard event
   */
  static _handleKeyboardNav(emailHash, event) {
    if (event.target.closest('[data-action]')) return;

    const validKeys = ['Enter', ' ', 'Space'];
    if (!validKeys.includes(event.key)) return;

    event.preventDefault();

    const url = `${CONFIG.ROUTES.PROFILE}${encodeURIComponent(emailHash)}`;
    window.location.href = url;
  }
}

/* ─────────────────────────────────────────────
   CLASS: ProfilesGrid (Main Controller)
   ───────────────────────────────────────────── */

/**
 * ProfilesGrid – main controller for rendering and managing the profiles grid.
 * Handles state, async rendering, loading/empty states, and error boundaries.
 */
class ProfilesGrid {
  /**
   * @private
   * Current configuration for this grid instance.
   */
  constructor() {
    this._imageStore = new ImageStore();
  }

  /**
   * Renders the full profiles grid into a container element.
   * Creates the hero section, grid placeholder, loading spinner, and empty state message.
   * @param {string} containerSelector - CSS selector for the target container
   * @param {Object} [config={}] - Optional config overrides (gridId, loadingId, emptyId)
   */
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

  /**
   * @private
   * Fetches users from storage, filters out the active user, and renders cards.
   * Handles loading → success/empty transitions and error boundaries.
   * @param {string} gridId - ID of the profiles grid container
   * @param {string} loadingId - ID of the loading indicator
   * @param {string} emptyId - ID of the empty state message
   */
  async _renderProfiles(gridId, loadingId, emptyId) {
    const grid = document.getElementById(gridId);
    const loading = document.getElementById(loadingId);
    const empty = document.getElementById(emptyId);

    if (!grid) return;

    // Fetch all users and resolve active session email
    const users = StorageService.get(CONFIG.STORAGE_KEYS.USERS) || {};
    const activeEmail = SessionManager.getActiveUserEmail();

    // Filter out the currently logged-in user from the list
    const filteredUsers = Object.entries(users).filter(
      ([email]) => !activeEmail || email !== activeEmail,
    );

    // Remove loading indicator
    loading?.remove();

    // Handle empty state when no users remain after filtering
    if (!filteredUsers.length) {
      empty?.removeAttribute('hidden');
      return;
    }

    try {
      // Create all profile cards in parallel and render them atomically
      const cards = await Promise.all(filteredUsers.map(([emailHash, user]) => ProfileCard.create(emailHash, user)));
      grid.replaceChildren(...cards);
    } catch (err) {
      console.error('ProfilesGrid: Failed to render profiles:', err);

      // Show error state in the empty container as a fallback
      if (empty) {
        empty.textContent = 'Erro ao carregar perfis.';
        empty.removeAttribute('hidden');
      }
    }
  }
}

/* ─────────────────────────────────────────────
   INITIALIZATION
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const grid = new ProfilesGrid();
  grid.render('#profilesContainer');
});

// Expose for external use (e.g., other modules or debugging)
window.ProfilesGrid = ProfilesGrid;
