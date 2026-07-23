(() => {
  'use strict';

  const CONFIG = {
    USERS_KEY: 'writersCommunity_users',
    COVER_FALLBACK: '../assets/img/capaPadraoHistorias.png',
  };

  const state = { stories: [] };

  function createCard(story) {
    const card = document.createElement('a');
    card.className = 'cardDestaque';
    card.href = `../pages/historia.html?story=${story.index}`;
    card.setAttribute('role', 'article');
    card.setAttribute('aria-labelledby', `titulo-${story.id}`);
    card.style.backgroundImage = `url('${story.cover || CONFIG.COVER_FALLBACK}')`;
    console.log(story);
    card.innerHTML = `
      <div class="contentCard">
        <div>
          <h3 id="titulo-${story.id}">${story.title || 'Sem título'}</h3>
          <p>${story.type || 'Conto'}</p>
        </div>
      </div>
    `;

    return card;
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
    renderStories(container || document.getElementById('destaquesGrid'));
  }

  window.DestaqueList = {
    loadDestaqueStories(container) {
      if (container) renderStories(container);
      else init();
    },
  };

  document.addEventListener('DOMContentLoaded', () => init());
})();
