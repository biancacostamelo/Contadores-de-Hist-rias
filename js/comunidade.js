(() => {
  'use strict';

  const KEYS = {
    COMMUNITIES: 'writersCommunity_communities',
    MEMBERS: 'writersCommunity_members',
  };
  const DEFAULT_AVATAR = '../assets/img/perfilComunidade.png';

  const getStorage = (key, fallback) =>
    JSON.parse(localStorage.getItem(key)) ?? fallback;
  const setStorage = (key, val) =>
    localStorage.setItem(key, JSON.stringify(val));
  const getCurrentUserEmail = () =>
    window.auth?.isLoggedIn()
      ? (window.auth.getSession()?.email ?? null)
      : null;

  const escapeHTML = (str = '') =>
    String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[m],
    );

  const isMember = (communityId, email) =>
    Boolean(
      email && getStorage(KEYS.MEMBERS, {})[communityId]?.includes(email),
    );

  const updateMembership = (communityId, action) => {
    const email = getCurrentUserEmail();
    if (!email || !communityId) return false;

    const communities = getStorage(KEYS.COMMUNITIES, []);
    const community = communities.find((c) => c.id === communityId);
    if (!community) return false;

    const members = getStorage(KEYS.MEMBERS, {});
    const list = new Set(members[communityId] || []);

    if (action === 'join') list.add(email);
    if (action === 'leave') list.delete(email);

    members[communityId] = [...list];
    community.memberCount = members[communityId].length;

    setStorage(KEYS.MEMBERS, members);
    setStorage(KEYS.COMMUNITIES, communities);
    return true;
  };

  const createCardHTML = (community, email) => {
    const safeName = escapeHTML(community.name);
    const userIsMember = isMember(community.id, email);
    const query = new URLSearchParams({
      name: community.name,
      memberCount: String(community.memberCount),
    });

    const actionButton = email
      ? `<button class="btn-card-comunidade btn-${userIsMember ? 'leave' : 'join'}" data-community-id="${community.id}" aria-label="${userIsMember ? 'Sair de' : 'Participar de'} ${safeName}">${userIsMember ? 'Sair' : 'Participar'}</button>`
      : '';

    return `
      <a href="./comentariosComunidade.html?${query}" class="cardComunidade-link" data-community-id="${community.id}">
        <div class="cardComunidade">
          <img src="${DEFAULT_AVATAR}" alt="${safeName}" />
          <div class="contentCard">
            <div class="card-info">
              <h3>${safeName}</h3>
              ${!email ? '<p class="status-membro">Faça login para participar</p>' : ''}
              <p>+${community.memberCount} seguidores</p>
            </div>
            <div class="card-actions">${actionButton}</div>
          </div>
        </div>
      </a>`;
  };

  const render = () => {
    const container = document.getElementById('communitiesList');
    if (!container) return;

    const communities = getStorage(KEYS.COMMUNITIES, []);
    const email = getCurrentUserEmail();

    container.innerHTML = communities.length
      ? communities.map((c) => createCardHTML(c, email)).join('')
      : `<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Nenhuma comunidade criada ainda. Vá ao seu perfil para criar uma nova.</p>`;
  };

  const container = document.getElementById('communitiesList');
  container?.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-join, .btn-leave');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const action = button.classList.contains('btn-join') ? 'join' : 'leave';
    if (updateMembership(button.dataset.communityId, action)) render();
  });

  render();
})();
