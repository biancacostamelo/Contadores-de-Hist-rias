class HeaderComponent extends HTMLElement {
  connectedCallback() {
    const assetsPath = this.getAttribute('assets-path') || './assets';
    const basePath = this.getAttribute('base-path') || './';

    // Verifica se a tag <meu-header> tem o atributo 'somente-btn'
    const somenteBtn = this.hasAttribute('somente-btn');

    const dropdownHTML = `
      <div class="dropdown-wrapper">
        <button id="btn-menu" class="btn-icon" type="button">
          <img src="${assetsPath}/icon_menu.svg" alt="Menu" />
        </button>

        <div id="dropdown-menu" class="dropdown-menu">
          <button type="button" id="btn-theme" class="dropdown-item">
            Mudar tema
          </button>
          <a href="#" class="dropdown-item">Configurações</a>
        </div>
      </div>
    `;

    if (somenteBtn) {
      // MODO SIMPLIFICADO (com o elemento 'somente-btn')
      this.innerHTML = `
        <header class="header-somente-btn">
          <section class="header-container">
            ${dropdownHTML}
          </section>
        </header>
      `;
    } else {
      // MODO COMPLETO
      this.innerHTML = `
        <header class="header">
          <section class="header-container">
            <div class="logo">
              <a href="${basePath}index.html">
                <img src="${assetsPath}/Logo-principal.svg" alt="Logo Contadores de Histórias" />
              </a>
            </div>

            <nav class="navbar">
              <a href="${basePath}index.html">
                <div class="icons">
                  <img src="${assetsPath}/icon_home.svg" alt="Home" />
                  <p class="iconstxt">Inicio</p>
                </div>
              </a>
              <a href="${basePath}pages/topicos.html">
                <div class="icons">
                  <img src="${assetsPath}/icon_biblioteca.svg" alt="Biblioteca" />
                  <p class="iconstxt">Biblioteca</p>
                </div>
              </a>
              <a href="${basePath}pages/comunidade.html">
                <div class="icons">
                  <img src="${assetsPath}/icon_comunidade.svg" alt="Comunidades" />
                  <p class="iconstxt">Comunidades</p>
                </div>
              </a>
            </nav>

            <div class="btn">
              <a href="${basePath}pages/signUp.html" class="criar">Comece a criar</a>
              <a href="${basePath}pages/login.html" class="entrar">Entrar</a>
            </div>

            ${dropdownHTML}
          </section>
        </header>
      `;
    }

    this.initEvents();
  }

  initEvents() {
    const btnMenu = this.querySelector('#btn-menu');
    const dropdownMenu = this.querySelector('#dropdown-menu');
    const btnTheme = this.querySelector('#btn-theme');

    if (btnMenu && dropdownMenu) {
      btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
      });

      if (btnTheme) {
        btnTheme.addEventListener('click', (e) => {
          e.stopPropagation();
          document.body.classList.toggle('dark-theme');
        });
      }

      document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !btnMenu.contains(e.target)) {
          dropdownMenu.classList.remove('active');
        }
      });
    }
  }
}

customElements.define('meu-header', HeaderComponent);