class HeaderComponent extends HTMLElement {
  static STORAGE_KEY_SESSION = 'writersCommunity_session';
  static STORAGE_KEY_USERS = 'writersCommunity_users';

  // IndexedDB Handler para avatares
  static ImageStore = {
    dbPromise: null,
    DB_NAME: 'writersCommunityImages',
    STORE_NAME: 'images',

    open() {
      if (this.dbPromise) return this.dbPromise;
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return this.dbPromise;
    },

    async load(id) {
      if (!id) return null;
      try {
        const db = await this.open();
        return new Promise((resolve) => {
          const request = db
            .transaction(this.STORE_NAME, 'readonly')
            .objectStore(this.STORE_NAME)
            .get(id);
          request.onsuccess = () => resolve(request.result?.data || null);
          request.onerror = () => resolve(null);
        });
      } catch {
        return null;
      }
    },
  };

  connectedCallback() {
    this.assetsPath = this.getAttribute('assets-path') || '../assets';
    this.basePath = this.getAttribute('base-path') || '../';
    this.defaultAvatar = `${this.assetsPath}/Logo-principal.svg`;
    this.somenteBtn = this.hasAttribute('somente-btn');

    this.render();
    this.bindEvents();
    this.updateAuthState();

    // Ouvinte para atualizações de perfil externas (ex: perfil.js)
    document.addEventListener('profileUpdated', () => this.refreshAvatar());

    // Ouvinte para sync entre abas
    window.addEventListener('storage', (e) => {
      if (
        e.key === HeaderComponent.STORAGE_KEY_USERS ||
        e.key === HeaderComponent.STORAGE_KEY_SESSION
      ) {
        this.updateAuthState();
      }
    });
  }

  // --- MÉTODOS DE AUTENTICAÇÃO ---

  clearSession() {
    localStorage.removeItem(HeaderComponent.STORAGE_KEY_SESSION);
  }

  getSession() {
    const raw = localStorage.getItem(HeaderComponent.STORAGE_KEY_SESSION);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  getUsers() {
    try {
      const raw = localStorage.getItem(HeaderComponent.STORAGE_KEY_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  isLoggedIn() {
    return this.getSession() !== null;
  }

  async resolveAvatarSrc(avatarRef) {
    if (!avatarRef) return this.defaultAvatar;

    if (typeof avatarRef === 'object' && avatarRef.id) {
      try {
        const loadedSrc = await HeaderComponent.ImageStore.load(avatarRef.id);
        return loadedSrc || this.defaultAvatar;
      } catch {
        return this.defaultAvatar;
      }
    }

    return typeof avatarRef === 'string' ? avatarRef : this.defaultAvatar;
  }

  async updateAuthState() {
    const entrarBtn = this.querySelector('.entrar');
    const criarBtn = this.querySelector('.criar');
    const avatarHeader = this.querySelector('#avatarHeader');
    const logoutBtn = this.querySelector('#logoutBtn');

    if (!entrarBtn || !avatarHeader) return;

    if (this.isLoggedIn()) {
      const session = this.getSession();
      const users = this.getUsers();
      const user = Object.values(users).find(
        (u) => u.emailHash === session?.email,
      );

      entrarBtn.style.display = 'none';
      if (criarBtn) criarBtn.style.display = 'none';
      avatarHeader.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = '';

      avatarHeader.setAttribute('href', `${this.basePath}pages/perfil.html`);

      const avatarImg = avatarHeader.querySelector('img');
      if (avatarImg) {
        avatarImg.src = await this.resolveAvatarSrc(user?.avatar);
      }
    } else {
      entrarBtn.style.display = '';
      if (criarBtn) criarBtn.style.display = '';
      avatarHeader.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  async refreshAvatar() {
    if (!this.isLoggedIn()) return;
    const session = this.getSession();
    const users = this.getUsers();
    const user = Object.values(users).find(
      (u) => u.emailHash === session?.email,
    );

    const avatarHeader = this.querySelector('#avatarHeader');
    if (!avatarHeader) return;

    const avatarImg = avatarHeader.querySelector('img');
    if (avatarImg) {
      avatarImg.src = await this.resolveAvatarSrc(user?.avatar);
    }
  }

  // --- RENDERIZAÇÃO E HTML ---

  render() {
    const dropdownHTML = `
      <div class="dropdown-wrapper">
        <button id="btn-menu" class="btn-icon" type="button" aria-label="Menu">
          <img src="${this.assetsPath}/icon_menu.svg" alt="Menu" />
        </button>

        <div id="dropdown-menu" class="dropdown-menu">
         <div class="menu-opcoes" id="menu-opcoes">
            <a href="/index.html">Início</a>
            <a href="/pages/topicos.html">Biblioteca</a>
            <a href="/pages/comunidade.html">Comunidades</a>
          </div>
          <button type="button" id="btn-theme" class="dropdown-item">
            Mudar tema
          </button>
          <a href="${this.basePath}pages/configuracoes.html" class="dropdown-item">Configurações</a>
        </div>
      </div>
    `;

    if (this.somenteBtn) {
      this.innerHTML = `
        <header class="header-somente-btn">
          <section class="header-container">
            ${dropdownHTML}
          </section>
        </header>
      `;
      return;
    }

    this.innerHTML = `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

      <header class="header">
        <section class="header-container">
          <div class="logo">
            <a href="${this.basePath}index.html">
              <img src="${this.assetsPath}/Logo-principal.svg" alt="Logo Contadores de Histórias" />
            </a>
          </div>

          <nav class="navbar">
            <a href="${this.basePath}index.html">
              <div class="icons">
                <img src="${this.assetsPath}/icon_home.svg" alt="Home" />
                <p class="iconstxt">Inicio</p>
              </div>
            </a>
            <a href="${this.basePath}pages/topicos.html">
              <div class="icons">
                <img src="${this.assetsPath}/icon_biblioteca.svg" alt="Biblioteca" />
                <p class="iconstxt">Biblioteca</p>
              </div>
            </a>
            <a href="${this.basePath}pages/comunidade.html">
              <div class="icons">
                <img src="${this.assetsPath}/icon_comunidade.svg" alt="Comunidades" />
                <p class="iconstxt">Comunidades</p>
              </div>
            </a>
          </nav>

          <div class="btn">
            <a href="${this.basePath}pages/signUp.html" class="criar">Comece a criar</a>
            <a href="${this.basePath}pages/login.html" class="entrar">Entrar</a>

            <button type="button" class="logout-btn" id="logoutBtn" style="display: none;" aria-label="Sair da sua conta">
              Sair
            </button>

            <a href="${this.basePath}pages/perfil.html" class="avatar-header" id="avatarHeader">
              <img src="${this.defaultAvatar}" alt="Avatar do usuário" />
            </a>

            ${dropdownHTML}
          </div>

          <!-- Modal de Logout -->
          <div class="modal-overlay" id="logoutModal" role="dialog" aria-modal="true" aria-labelledby="logoutModalTitle">
            <div class="modal-dialog">
              <h2 class="modal-title" id="logoutModalTitle">Sair da conta</h2>
              <p class="modal-description">Tem certeza que deseja sair? Você será redirecionado para a página inicial.</p>
              <div class="modal-actions">
                <button type="button" class="modal-btn modal-btn--cancel" id="logoutCancel">Cancelar</button>
                <button type="button" class="modal-btn modal-btn--confirm" id="logoutConfirm">Sair</button>
              </div>
            </div>
          </div>
        </section>
      </header>
    `;
  }

  // --- EVENTOS ---

  bindEvents() {
    const btnMenu = this.querySelector('#btn-menu');
    const dropdownMenu = this.querySelector('#dropdown-menu');
    const btnTheme = this.querySelector('#btn-theme');

    if (btnMenu && dropdownMenu) {
      btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
      });

      btnTheme?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
      });

      document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !btnMenu.contains(e.target)) {
          dropdownMenu.classList.remove('active');
        }
      });
    }

    // Eventos do Modal de Logout
    const logoutBtn = this.querySelector('#logoutBtn');
    const logoutModal = this.querySelector('#logoutModal');
    const logoutCancel = this.querySelector('#logoutCancel');
    const logoutConfirm = this.querySelector('#logoutConfirm');

    if (logoutBtn && logoutModal) {
      logoutBtn.addEventListener('click', () => {
        logoutModal.classList.add('modal-visible');
        logoutConfirm?.focus();
      });

      logoutCancel?.addEventListener('click', () => {
        logoutModal.classList.remove('modal-visible');
        logoutBtn.focus();
      });

      logoutConfirm?.addEventListener('click', () => {
        this.clearSession();
        window.location.href = `${this.basePath}index.html`;
      });

      logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
          logoutModal.classList.remove('modal-visible');
          logoutBtn.focus();
        }
      });
    }
  }
}

// Registro da tag HTML customizada
customElements.define('meu-header', HeaderComponent);
