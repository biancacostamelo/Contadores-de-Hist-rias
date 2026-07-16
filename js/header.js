const HeaderComponent = (() => {

  const render = (config = {}) => {

    const {
      logoPath = '../assets/Logo principal.svg',
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
      <header class="header">
    <section class="header-container">
      <div class="logo">
        <a href="/pages/sobre.html">
          <img src="../assets/Logo-principal.svg" alt="Logo Contadores de Histórias" />
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

        <!-- MENU -->
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

    btnTheme.addEventListener('click', (e) => {
      document.body.classList.toggle('dark-theme');
      document.body.classList.toggle('light-theme');

    });

    const btnSecondary = document.getElementById('menu-btn')
    const menuOpcoes = document.getElementById('menu-opcoes')

    btnSecondary.addEventListener('click', (e) => {
      menuOpcoes.classList.toggle('menu-opcoes-active')
    })

  };

  const escapeHtml = (unsafe) => {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  return { render };
})();

document.addEventListener('DOMContentLoaded', () => {
  HeaderComponent.render();
});


