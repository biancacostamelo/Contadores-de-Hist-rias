'use strict';
const CONFIG = Object.freeze({
  STORAGE_KEYS: {
    COMMUNITIES: 'writersCommunity_communities',
    MEMBERS: 'writersCommunity_members',
  },
  ASSETS: {
    DEFAULT_AVATAR: '../assets/img/perfilComunidade.png',
  },
});

class Sanitizer {
  static #replacements = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });

  static escape(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (char) => this.#replacements[char]);
  }
}

class StorageService {
  static get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`StorageService: Failed to write key "${key}"`, err);
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`StorageService: Failed to remove key "${key}"`, err);
    }
  }
}

class AuthService {
  static isLoggedIn() {
    try {
      return Boolean(window?.auth?.isLoggedIn?.());
    } catch (err) {
      console.warn('AuthService: Error checking login state', err);
      return false;
    }
  }

  static getActiveUserEmail() {
    try {
      if (!this.isLoggedIn()) return null;
      return window?.auth?.getSession?.()?.email ?? null;
    } catch (err) {
      console.warn('AuthService: Error getting active user email', err);
      return null;
    }
  }
}

class CommunityService {
  static getCommunities() {
    return StorageService.get(CONFIG.STORAGE_KEYS.COMMUNITIES, []);
  }

  static isMember(communityId, email) {
    if (!email || !communityId) return false;
    const members = StorageService.get(CONFIG.STORAGE_KEYS.MEMBERS, {});
    return Boolean(members?.[communityId]?.includes(email));
  }

  static updateMembership(communityId, action) {
    const email = AuthService.getActiveUserEmail();
    if (!email || !communityId) return false;

    const communities = this.getCommunities();
    const community = communities.find((c) => c.id === communityId);
    if (!community) return false;

    const members = StorageService.get(CONFIG.STORAGE_KEYS.MEMBERS, {});
    const memberList = new Set(members?.[communityId] ?? []);

    if (action === 'join') {
      memberList.add(email);
    } else if (action === 'leave') {
      memberList.delete(email);
    } else {
      return false;
    }

    members[communityId] = [...memberList];

    const index = communities.findIndex((c) => c.id === communityId);
    if (index !== -1) {
      communities[index].memberCount = memberList.size;
    }

    StorageService.set(CONFIG.STORAGE_KEYS.MEMBERS, members);
    StorageService.set(CONFIG.STORAGE_KEYS.COMMUNITIES, communities);
    return true;
  }
}

class CommunityCard {
  static create(community, email, isMember) {
    const safeName = Sanitizer.escape(community?.name || 'Comunidade');

    // Identifica o campo de imagem (pode vir como 'image', 'avatar' ou 'img')
    const rawImage = community?.image || community?.avatar || community?.img;

    let communityImage = CONFIG.ASSETS.DEFAULT_AVATAR;
    let imageId = null;

    // Se for uma string Base64 ou URL padrão
    if (typeof rawImage === 'string' && rawImage.trim() !== '') {
      communityImage = rawImage;
    }
    // Se for o objeto retornado do IndexedDB { type: 'img', id: '...' }
    else if (rawImage && typeof rawImage === 'object' && rawImage.id) {
      imageId = rawImage.id;
    }

    const queryParams = new URLSearchParams({
      name: community.name ?? '',
      memberCount: String(community.memberCount ?? 0),
    });

    let actionButtonHTML = '';
    if (typeof email === 'string' && email.length > 0) {
      const btnClass = isMember ? 'leave' : 'join';
      const btnLabel = isMember ? 'Sair de' : 'Participar de';
      const btnText = isMember ? 'Sair' : 'Participar';

      actionButtonHTML = `
        <button class="btn-card-comunidade btn-${btnClass}" data-community-id="${community.id}" aria-label="${btnLabel} ${safeName}">${btnText}</button>
      `;
    } else {
      actionButtonHTML = `<p class="status-membro">Faça login para participar</p>`;
    }

    const card = document.createElement('a');
    card.href = `./comentariosComunidade.html?${queryParams.toString()}`;
    card.className = 'cardComunidade-link';
    card.dataset.communityId = community.id;

    card.innerHTML = `
      <div class="cardComunidade">
        <img ${imageId ? `data-image-id="${imageId}"` : ''} src="${communityImage}" alt="${safeName}" onerror="this.onerror=null; this.src='${CONFIG.ASSETS.DEFAULT_AVATAR}';" />
        <div class="contentCard">
          <div class="card-info">
            <h3>${safeName}</h3>
            <p>+${community.memberCount ?? 0} Membros</p>
          </div>
          <div class="card-actions">${actionButtonHTML}</div>
        </div>
      </div>
    `;

    // Se possui referência de imagem no IndexedDB, carrega ela de forma assíncrona
    if (imageId && window.imageStore?.load) {
      window.imageStore.load(imageId).then((src) => {
        if (src) {
          const imgEl = card.querySelector(`img[data-image-id="${imageId}"]`);
          if (imgEl) imgEl.src = src;
        }
      });
    }

    return card;
  }
}

class CommunitiesGrid {
  #containerId = 'communitiesList';

  render() {
    const container = document.getElementById(this.#containerId);
    if (!container) {
      console.warn('CommunitiesGrid: Container not found.');
      return;
    }

    let communities;
    try {
      communities = CommunityService.getCommunities();
    } catch (err) {
      console.error('CommunitiesGrid: Error fetching communities', err);
      container.innerHTML =
        '<p style="text-align:center;color:var(--color-error);padding:40px 0;">Erro ao carregar comunidades.</p>';
      return;
    }

    const email = AuthService.getActiveUserEmail();

    if (Array.isArray(communities) && communities.length > 0) {
      try {
        const cards = communities.map((community) => {
          const isMember = CommunityService.isMember(community.id, email);
          return CommunityCard.create(community, email, isMember);
        });
        container.replaceChildren(...cards);
      } catch (err) {
        console.error('CommunitiesGrid: Error rendering cards', err);
        container.innerHTML =
          '<p class="text-community">Erro ao renderizar comunidades.</p>';
      }
    } else {
      container.innerHTML = `
        <p class="text-community">
          Nenhuma comunidade criada ainda. Vá ao seu perfil para criar uma nova.
        </p>
      `;
    }

    this.#bindEventDelegation(container);
  }

  #bindEventDelegation(container) {
    container.addEventListener('click', (event) => this.#handleAction(event));

    container.addEventListener('keydown', (event) => {
      if (['Enter', ' ', 'Space'].includes(event.key)) {
        this.#handleAction(event);
      }
    });
  }

  #handleAction(event) {
    const button = event.target.closest('.btn-card-comunidade');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const communityId = button.dataset.communityId;
    const action = button.classList.contains('btn-leave') ? 'leave' : 'join';

    try {
      if (CommunityService.updateMembership(communityId, action)) {
        this.render();
      }
    } catch (err) {
      console.error('CommunitiesGrid: Error updating membership', err);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = new CommunitiesGrid();
  grid.render();
});

window.CommunitiesGrid = CommunitiesGrid;
