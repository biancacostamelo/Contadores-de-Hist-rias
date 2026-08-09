(() => {
  'use strict';

  // Ensure imageStore is available
  if (typeof ImageStore !== 'function') {
    console.warn('[Galeria] ImageStore não disponível, usando fallback');
    window.imageStore = {
      load: async () => null,
    };
  } else if (!window.imageStore) {
    window.imageStore = new ImageStore();
  }

  const CONFIG = {
    USERS_KEY: 'writersCommunity_users',
    COVER_FALLBACK: '../assets/img/capaPadraoHistorias.png',
  };

  const state = { stories: [] };

  async function resolveCover(coverRef) {
    if (!coverRef) return CONFIG.COVER_FALLBACK;
    if (typeof coverRef === 'string') return coverRef;
    if (coverRef && typeof coverRef === 'object' && coverRef.type === 'img') {
      try {
        const src = await imageStore.load(coverRef.id);
        if (src) return src;
      } catch {}
    }
    return CONFIG.COVER_FALLBACK;
  }

  async function createCard(story) {
    const wrapper = document.createElement('a');
    wrapper.href = `../pages/historia.html?story=${story.index}`;
    wrapper.setAttribute('role', 'article');
    wrapper.setAttribute('aria-labelledby', `titulo-${story.id}`);

    const coverSrc = await resolveCover(story.cover);
    const generoLabel = (story.type || 'Conto').toUpperCase();
    const statusMap = {
      'em-andamento': 'Em andamento',
      'finalizado': 'Finalizado',
    };
    const statusLabel = statusMap[story.status] || story.status || 'Em desenvolvimento';
    const sinopseText = story.synopsis || '';

    wrapper.innerHTML = `
      <div class="posts-historia">
        <div class="imgpt">
          <img src="${coverSrc}" alt="${story.title}" class="pt-img-fundo" />
          <div class="overlay-historia">
            <div class="iconStats"></div>
            <div class="detalhes-historia">
              <span class="genero">${generoLabel}</span>
              <h3 id="titulo-${story.id}" class="titulo-capa">${story.title || 'Sem título'}</h3>
              <span class="andamento">${statusLabel}</span>
              ${sinopseText ? `<p class="sinopse">${sinopseText}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    return wrapper;
  }

  async function renderStories(container) {
    if (!container) return;

    if (!state.stories.length) {
      container.innerHTML =
        '<p class="empty-message">Nenhuma história em destaque no momento.</p>';
      return;
    }

    const cards = await Promise.all(state.stories.map(createCard));
    container.replaceChildren(...cards);
  }

  function loadStories() {
    try {
      const users = JSON.parse(localStorage.getItem(CONFIG.USERS_KEY)) || {};

      const flatStories = Object.values(users)
        .flatMap((u) => u.stories || [])
        .slice(0, 50);

      state.stories = Object.values(users)
        .flatMap((user) => {
          const stories = user?.stories || [];
          return stories.map((story, idx) => ({
            ...story,
            id: `${user.emailHash}-${idx}`,
            index: flatStories.indexOf(story),
          }));
        })
        .sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
    } catch (e) {
      console.warn('[Destaque] Erro ao carregar histórias:', e);
      state.stories = [];
    }
  }

  async function init(container) {
    loadStories();
    await renderStories(container || document.querySelector('#hist-post'));
  }

  window.DestaqueList = {
    async loadDestaqueStories(container) {
      if (container) await renderStories(container);
      else init();
    },
  };

  document.addEventListener('DOMContentLoaded', () => init());
})();
