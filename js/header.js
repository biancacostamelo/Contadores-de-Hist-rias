const HeaderComponent = (() => {
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

           <a href="../pages/perfil.html" class="avatar-header" id="avatarHeader">
            <img src="../assets/img/avatar-miguel.jpg" alt="Avatar do usuário" />
          </a>
          <div class="menu" id="menu-btn">
            <img src="../assets/icon_menu.svg" width="40px" alt="Menu" />
          </div>
          
          <div class="menu-opcoes" id="menu-opcoes">
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

    waitForAuthAndApply();
  };

  const STORAGE_KEY_SESSION = 'writersCommunity_session';
  const STORAGE_KEY_USERS = 'writersCommunity_users';

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

      const avatarImg = avatarHeader.querySelector('img');
      if (avatarImg && user) {
        avatarImg.src = user.avatar || '../assets/img/avatar-miguel.jpg';
      }
    } else {
      entrarBtn.style.display = '';
      criarBtn.style.display = '';
      avatarHeader.style.display = 'none';
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
