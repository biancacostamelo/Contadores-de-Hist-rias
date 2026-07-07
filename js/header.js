const HeaderComponent = (() => {
  const render = (config = {}) => {
    const {
      logoPath = '../assets/img/logo.png',
      searchIconPath = './assets/lupa pesquisar.svg',
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
      <header class="header">
        <section class="home-header">
          <div class="logo">
            <a href="#">
              <img src="${escapeHtml(logoPath)}" alt="Logo Contadores de Histórias" class="img-logo" />
            </a>
          </div>
          <div class="input-pesquisa">
            <img src="${escapeHtml(searchIconPath)}" alt="lupa" />
            <input type="text" placeholder="Pesquisar..." />
          </div>
          <nav class="navbar">
            <a href="#">Galeria</a>
            <a href="#">Comunidades</a>
            <a href="#">Sobre</a>
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
