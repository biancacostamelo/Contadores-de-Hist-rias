'use strict';
const CONFIG = Object.freeze({
  STORAGE_KEYS: {
    COMMUNITIES: 'writersCommunity_communities',
    MEMBERS: 'writersCommunity_members',
  },
  ASSETS: {
    DEFAULT_AVATAR: '../assets/Logo Variante 1.svg',
  },
});

// Shared ImageStore instance for loading community images from IndexedDB
const imageStore = new ImageStore();

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
    const rawImage = community?.image || community?.avatar || community?.img;

    let communityImage = '';
    let imageId = null;

    if (typeof rawImage === 'string' && rawImage.trim() !== '') {
      communityImage = rawImage;
    } else if (rawImage && typeof rawImage === 'object' && rawImage.id) {
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

    // Se tiver imageId, não coloca src inicial (carrega via JS para não piscar)
    // O onerror só entra em ação se a imagem de fato falhar em carregar
    card.innerHTML = `
      <div class="cardComunidade">
        <img ${imageId ? `data-image-id="${imageId}"` : `src="${communityImage}"`} 
             alt="${safeName}" 
             onerror="this.onerror=null; this.src='${CONFIG.ASSETS.DEFAULT_AVATAR}';" />
        <div class="contentCard">
          <div class="card-info">
            <h3>${safeName}</h3>
            <p>+${community.memberCount ?? 0} Membros</p>
          </div>
          <div class="card-actions">${actionButtonHTML}</div>
        </div>
      </div>
    `;

    if (imageId) {
      const imgEl = card.querySelector(`img[data-image-id="${imageId}"]`);
      imageStore.load(imageId).then((src) => {
        if (src && imgEl) {
          imgEl.src = src;
        } else if (imgEl) {
          // Se não achar no IndexedDB, usa a fallback
          imgEl.src = CONFIG.ASSETS.DEFAULT_AVATAR;
        }
      });
    }

    return card;
  }
}

class CommunitiesGrid {
  #containerId = 'communitiesList';
  #container = null;

  render() {
    if (!this.#container) {
      this.#container = document.getElementById(this.#containerId);
      if (!this.#container) {
        console.warn('CommunitiesGrid: Container não encontrado.');
        return;
      }
      this.#bindEventDelegation(this.#container);
    }

    let communities;
    try {
      communities = CommunityService.getCommunities();
    } catch (err) {
      console.error('CommunitiesGrid: Erro ao buscar comunidades', err);
      this.#container.innerHTML =
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
        this.#container.replaceChildren(...cards);
      } catch (err) {
        console.error('CommunitiesGrid: Erro ao renderizar cards', err);
        this.#container.innerHTML =
          '<p class="text-community">Erro ao renderizar comunidades.</p>';
      }
    } else {
      this.#container.innerHTML = `
        <p class="text-community">
          Nenhuma comunidade criada ainda. Vá ao seu perfil para criar uma nova.
        </p>
      `;
    }
  }

  #bindEventDelegation(container) {
    if (container.dataset.eventsBound) return;
    container.dataset.eventsBound = 'true';

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
    const isLeave = button.classList.contains('btn-leave');
    const action = isLeave ? 'leave' : 'join';

    try {
      if (CommunityService.updateMembership(communityId, action)) {
        this.#updateCardUI(communityId, action === 'join');
      }
    } catch (err) {
      console.error('CommunitiesGrid: Erro ao atualizar membresia', err);
    }
  }

  #updateCardUI(communityId, isNowMember) {
    const card = this.#container.querySelector(
      `[data-community-id="${communityId}"]`,
    );
    if (!card) return;

    // 1. Atualiza botão
    const btn = card.querySelector('.btn-card-comunidade');
    if (btn) {
      const safeName = card.querySelector('h3')?.textContent || 'Comunidade';
      btn.className = `btn-card-comunidade btn-${isNowMember ? 'leave' : 'join'}`;
      btn.setAttribute(
        'aria-label',
        `${isNowMember ? 'Sair de' : 'Participar de'} ${safeName}`,
      );
      btn.textContent = isNowMember ? 'Sair' : 'Participar';
    }

    // 2. Atualiza contagem
    const countEl = card.querySelector('.card-info p');
    if (countEl) {
      const communities = CommunityService.getCommunities();
      const targetCommunity = communities.find((c) => c.id === communityId);
      if (targetCommunity) {
        countEl.textContent = `+${targetCommunity.memberCount ?? 0} Membros`;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = new CommunitiesGrid();
  grid.render();
});

window.CommunitiesGrid = CommunitiesGrid;
