const HeaderComponent = (() => {
  const STORAGE_KEY_SESSION = 'writersCommunity_session';
  const STORAGE_KEY_USERS = 'writersCommunity_users';

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  };

  const render = (config = {}) => {
    const {
      logoPath = '../assets/Logo-principal.svg',
      searchIconPath = '../assets/lupa-pesquisar',
      containerSelector = '.site-header-container',
    } = config;

    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(
        'HeaderComponent: Container not found. Header will not be rendered.',
      );
      return;
    }

    const html = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    
    <style>
      .avatar-header {
        display: none;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .avatar-header:hover {
        transform: var(--btn-transform);
        box-shadow: 0 0 0 2px var(--color-primary-hover);
      }

      .avatar-header img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      @media (max-width: 768px) {
        .avatar-header {
          width: 36px;
          height: 36px;
        }
      }

      .btn .logout-btn {
       display: inline-flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 130px;
  background: var(--color-secundary);
  color: var(--text-header);
  border: 1px solid var(--border-color-two);
  border-radius: 30px;
  font-weight: bold;
  transition: 0.3s ease;
    }

  .btn .logout-btn:hover {
  transform: var(--btn-transform);
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .modal-overlay.modal-visible {
      opacity: 1;
      visibility: visible;
    }

    .modal-dialog {
      background: var(--bg-main);
      color: var(--text-color);
      border-radius: 16px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      transform: translateY(20px);
      transition: transform 0.2s ease;
    }

    .modal-overlay.modal-visible .modal-dialog {
      transform: translateY(0);
    }

    .modal-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      text-align: center;
    }

    .modal-description {
      font-size: 1rem;
      margin-bottom: 1.5rem;
      text-align: center;
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .modal-btn {
      padding: 0.6rem 1.5rem;
      border-radius: 30px;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .modal-btn:hover {
      transform: var(--btn-transform);
    }

    .modal-btn--cancel {
      background: transparent;
      color: var(--text-color);
      border: 1px solid var(--border-color-two);
    }

    .modal-btn--confirm {
      background: var(--color-primary);
      color: #fff;
    }

    </style>

    <header class="header">
      <section class="header-container">
        <div class="logo">
          <a href="/pages/sobre.html">
            <img src="${logoPath}" alt="Logo Contadores de Histórias" />
          </a>
        </div>

        <nav class="navbar2">
          <a href="/index.html">
            <div class="icons">
              <img src="../assets/icon_home.svg" alt="Home" />
              <p class="iconstxt">Inicio</p>
            </div>
          </a>
          <a href="/pages/topicos.html">
            <div class="icons">
              <img src="../assets/icon_biblioteca.svg" alt="Biblioteca" />
              <p class="iconstxt">Biblioteca</p>
            </div>
          </a>
          <a href="/pages/comunidade.html">
            <div class="icons">
              <img height="20px" src="../assets/icon_comunidade.svg" alt="Comunidades" />
              <p class="iconstxt">Comunidades</p>
            </div>
          </a>
        </nav>

        <div class="btn">
          <a href="../pages/signUp.html" class="criar">Comece a criar</a>
          <a href="../pages/login.html" class="entrar">Entrar</a>
          <button type="button" class="logout-btn" id="logoutBtn" aria-label="Sair da sua conta">
            Sair
          </button>

           <a href="../pages/perfil.html" class="avatar-header" id="avatarHeader">
            <img src="../assets/img/avatar-miguel.jpg" alt="Avatar do usuário" />
          </a>

        <!-- Logout confirmation modal -->
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
          <div class="menu" id="menu-btn">
            <img src="../assets/icon_menu.svg" width="40px" alt="Menu" />
          </div>
          
          <div class="menu-opcoes" id="menu-opcoes">
          <div>
            <a href="/index.html">Início</a>
            <a href="/pages/topicos.html">Biblioteca</a>
            <a href="/pages/comunidade.html">Comunidades</a>
          </div>
          <p id="btnTheme">Mudar tema</p>
          <p>Configurações</p>
          </div>
        </div>
      </section>
    </header>
    `;

    container.innerHTML = html;

    const btnTheme = document.getElementById('btnTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', (e) => {
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
      });
    }

    const btnSecondary = document.getElementById('menu-btn');
    const menuOpcoes = document.getElementById('menu-opcoes');
    if (btnSecondary && menuOpcoes) {
      btnSecondary.addEventListener('click', (e) => {
        menuOpcoes.classList.toggle('menu-opcoes-active');
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const logoutCancel = document.getElementById('logoutCancel');
    const logoutConfirm = document.getElementById('logoutConfirm');

    if (logoutBtn && logoutModal) {
      const openLogoutModal = () => {
        logoutModal.classList.add('modal-visible');
        logoutConfirm.focus();
      };

      const closeLogoutModal = () => {
        logoutModal.classList.remove('modal-visible');
        logoutBtn.focus();
      };

      const handleLogout = () => {
        clearSession();
        window.location.href = '../index.html';
      };

      logoutBtn.addEventListener('click', openLogoutModal);
      logoutCancel.addEventListener('click', closeLogoutModal);
      logoutConfirm.addEventListener('click', handleLogout);

      logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
          closeLogoutModal();
        }
      });
    }

    waitForAuthAndApply();
  };

  const getSession = () => {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }
  };

  const getUsers = () => {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const isLoggedIn = () => getSession() !== null;

  const updateAuthState = () => {
    const entrarBtn = document.querySelector('.entrar');
    const avatarHeader = document.getElementById('avatarHeader');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!entrarBtn || !avatarHeader) return false;

    const criarBtn = document.querySelector('.criar');

    if (isLoggedIn()) {
      const session = getSession();
      const users = getUsers();
      const user = Object.values(users).find(
        (u) => u.emailHash === session?.email,
      );

      entrarBtn.style.display = 'none';
      criarBtn.style.display = 'none';
      avatarHeader.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = '';

      const avatarImg = avatarHeader.querySelector('img');
      if (avatarImg && user) {
        avatarImg.src = user.avatar || '../assets/img/avatar-miguel.jpg';
      }
    } else {
      entrarBtn.style.display = '';
      criarBtn.style.display = '';
      avatarHeader.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }

    return true;
  };

  const waitForAuthAndApply = () => {
    if (updateAuthState()) return true;
    setTimeout(() => updateAuthState(), 50);
    return false;
  };

  const handleStorageChange = () => {
    if (
      document.querySelector('.entrar') &&
      document.getElementById('avatarHeader')
    ) {
      updateAuthState();
    }
  };

  return { render, updateAuthState };
})();

document.addEventListener('DOMContentLoaded', () => {
  HeaderComponent.render();
  window.addEventListener('storage', () => {
    if (
      document.querySelector('.entrar') &&
      document.getElementById('avatarHeader')
    ) {
      HeaderComponent.updateAuthState();
    }
  });
});
