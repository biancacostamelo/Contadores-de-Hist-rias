(() => {
  'use strict';

  const COVER_URL = '../assets/img/capaPadraoHistorias.png';

  const DOM = {
    grid: document.getElementById('destaquesGrid'),
  };

  function renderDestaqueCards(stories) {
    if (!DOM.grid) return;

    if (stories.length === 0) {
      DOM.grid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">Nenhuma história em destaque no momento.</p>';
      return;
    }

    DOM.grid.innerHTML = stories
      .map(
        (story, index) =>
          `<a class="cardDestaque" href="../pages/historia.html?story=${index}" style="background-image:url('${COVER_URL}');">
            <div class="contentCard">
              <div>
                <h3>${story.title || 'Sem título'}</h3>
                <p>${story.type || 'Conto'}</p>
              </div>
            </div>
          </a>`,
      )
      .join('');
  }

  function loadDestaqueStories() {
    const isLoggedIn = window.auth?.isLoggedIn();
    let stories;

    if (isLoggedIn) {
      const session = window.auth.getSession();
      const allUsers = typeof window.auth.getUsers === 'function' ? window.auth.getUsers() : {};
      const currentUser = session && allUsers[session.email];
      stories = currentUser?.stories || [];
    } else {
      const allUsers = typeof window.auth.getUsers === 'function' ? window.auth.getUsers() : {};
      const allStories = Object.values(allUsers)
        .flatMap((user) => user.stories || [])
        .slice(0, 9);
      stories = allStories.length > 0 ? allStories : [];
    }

    renderDestaqueCards(stories);
  }

  loadDestaqueStories();
})();
