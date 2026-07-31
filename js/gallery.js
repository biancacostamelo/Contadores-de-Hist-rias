(() => {
  'use strict';

  const CONFIG = {
    USERS_KEY: 'writersCommunity_users',
    COVER_FALLBACK: '../assets/img/capaPadraoHistorias.png',
  };

  const state = { stories: [] };

  function createCard(story) {
    const wrapper = document.createElement('a');
    wrapper.href = `../pages/historia.html?story=${story.index}`;
    wrapper.setAttribute('role', 'article');
    wrapper.setAttribute('aria-labelledby', `titulo-${story.id}`);

    const generoLabel = (story.type || 'Conto').toUpperCase();
    const statusLabel = story.status || 'Em desenvolvimento';
    const sinopseText = story.synopsis || '';

    wrapper.innerHTML = `
      <div class="posts-historia">
        <div class="imgpt">
          <img src="${story.cover || CONFIG.COVER_FALLBACK}" alt="${story.title}" class="pt-img-fundo" />
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

  function renderStories(container) {
    if (!container) return;

    if (!state.stories.length) {
      container.innerHTML =
        '<p class="empty-message">Nenhuma história em destaque no momento.</p>';
      return;
    }

    container.replaceChildren(...state.stories.map(createCard));
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

  function init(container) {
    loadStories();
    renderStories(container || document.querySelector('#hist-post'));
  }

  window.DestaqueList = {
    loadDestaqueStories(container) {
      if (container) renderStories(container);
      else init();
    },
  };

  document.addEventListener('DOMContentLoaded', () => init());
})();
