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
        <section class="home-header">
          <div class="logo">
            <a href="../index.html">
              <img src="${escapeHtml(logoPath)}" alt="Logo Contadores de Histórias" class="img-logo" />
            </a>
          </div>
          <div class="input-pesquisa">
            <a href="#"><i class="fa-solid fa-magnifying-glass"></i></a>
            <input type="text" placeholder="Pesquisar..." />
          </div>
          <nav class="navbar">
            <a href="/pages/galeria.html">Galeria</a>
            <a href="/pages/comunidade.html">Comunidades</a>
            <a href="/pages/sobre.html">Sobre</a>
          </nav>

          <div class="display">
            <label class="switch">
              <input type="checkbox" id="btnTheme">
              <span class="slider"></span>
            </label>
          </div>
          <div class="btn">
            <a href="/pages/historia.html" id="criar">Comece a criar</a>
            <a href="/pages/login.html" id="entrar">Entrar</a>
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


