const CONFIG = {
  AUTH_MODAL_SELECTOR: '.auth-modal',
  STORAGE_KEYS: {
    LIKES: 'comentariosComunidade_likes',
    POSTS: 'comentariosComunidade_posts',
  },
  DEFAULT_AUTHOR: 'Leitor Voraz',
  COMMUNITIES_KEY: 'writersCommunity_communities',
  IMAGE_DB_NAME: 'writersCommunityImages',
  IMAGE_STORE_NAME: 'images',
};

let activeCommunity = null;

const imageStore = {
  db: null,

  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.IMAGE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(CONFIG.IMAGE_STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async load(id) {
    if (!id) return null;
    await this.open();
    return new Promise((resolve) => {
      const store = this.db.transaction(CONFIG.IMAGE_STORE_NAME).objectStore(CONFIG.IMAGE_STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => resolve(null);
    });
  },
};

const getCommunityKey = (name) =>
  `${CONFIG.STORAGE_KEYS.POSTS}_${(name || '').replace(/\s+/g, '_').toLowerCase()}`;

class StorageService {
  static read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  static write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error(`[StorageService] Error writing "${key}":`, err);
    }
  }

  static update(key, updater) {
    const data = this.read(key);
    const updated = updater(data) || data;
    this.write(key, updated);
    return updated;
  }
}

class CommunityService {
  static getCommunities() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.COMMUNITIES_KEY)) || [];
    } catch {
      return [];
    }
  }

  static getCommunity(name) {
    const communities = this.getCommunities();
    return communities.find((c) => c.name.toLowerCase() === (name || '').toLowerCase());
  }
}

class CommentService {
  static getStorageKey = () => getCommunityKey(activeCommunity);

  static getPost(postId) {
    return (
      StorageService.read(this.getStorageKey())[postId] || { comments: [] }
    );
  }

  static addComment(postId, text) {
    if (!window.auth?.isLoggedIn()) return null;
    const user = window.auth.getCurrentUser();
    const newComment = {
      author: user?.fullname || CONFIG.DEFAULT_AUTHOR,
      text,
      timestamp: new Date().toISOString(),
      emailHash: window.auth.getSession()?.email || null,
    };

    StorageService.update(this.getStorageKey(), (posts) => {
      posts[postId] = posts[postId] || { comments: [] };
      if (Array.isArray(posts[postId]))
        posts[postId] = { comments: [...posts[postId]] };
      posts[postId].comments = posts[postId].comments || [];
      posts[postId].comments.push(newComment);
    });

    return newComment;
  }

  static updatePostContent(postId, content) {
    StorageService.update(this.getStorageKey(), (posts) => {
      if (posts[postId]) posts[postId].content = content.trim();
    });
  }

  static mutateComment(postId, commentEl, actionFn) {
    const list = commentEl.closest('.comments-list');
    const targetId = list?.closest('[data-post-id]')?.dataset.postId || postId;
    if (!targetId) return;

    StorageService.update(this.getStorageKey(), (posts) => {
      const comments = posts[targetId]?.comments;
      if (!comments) return;
      const index = Array.from(list.children).indexOf(commentEl);
      if (index !== -1) actionFn(comments, index);
    });

    FeedUI.renderCommentsList(targetId);
  }

  static formatRelativeTime(date) {
    const diffMs = new Date() - new Date(date);
    const hours = Math.floor(Math.abs(diffMs) / 36e5);
    const mins = Math.floor(Math.abs(diffMs) / 6e4) % 60;
    return hours > 0 ? `há ${hours}h` : mins > 0 ? `há ${mins}min` : 'agora';
  }

  static getInitials(name) {
    return (name || CONFIG.DEFAULT_AUTHOR)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}

class LikeService {
  static isLiked(postId) {
    return Boolean(StorageService.read(CONFIG.STORAGE_KEYS.LIKES)[postId]);
  }

  static toggle(postId) {
    let state = false;
    StorageService.update(CONFIG.STORAGE_KEYS.LIKES, (likes) => {
      likes[postId] = !likes[postId];
      state = likes[postId];
    });
    return state;
  }
}

async function loadCommunityBanner() {
  const bannerEl = document.getElementById('communityBannerImg');
  if (!bannerEl) return;

  const community = CommunityService.getCommunity(activeCommunity);
  if (!community?.banner) return;

  let src = null;
  if (typeof community.banner === 'object' && community.banner.type === 'img') {
    src = await imageStore.load(community.banner.id);
  } else if (typeof community.banner === 'string') {
    src = community.banner;
  }

  if (src) {
    bannerEl.style.backgroundImage = `url('${src}')`;
  }
}

class FeedUI {
  static async initCommunityBanner() {
    await loadCommunityBanner();
  }

  static checkAuth() {
    if (!window.auth?.isLoggedIn()) {
      this.toggleAuthModal(true);
      return false;
    }
    return true;
  }

  static renderAllPosts() {
    const feed = document.querySelector('.feed');
    if (!feed) return;

    const posts = StorageService.read(CommentService.getStorageKey());
    feed.querySelectorAll('.post-card').forEach((card) => card.remove());

    const fragment = document.createDocumentFragment();
    Object.entries(posts).forEach(([id, data]) => {
      if (data?.content)
        fragment.appendChild(
          this.buildPostCard(data.content, id, data.author, data.timestamp),
        );
    });
    feed.appendChild(fragment);

    feed.querySelectorAll('.post-card').forEach((card) => {
      const id = card.dataset.postId;
      this.renderCommentsList(id);
      this.updateLikeButton(card, LikeService.isLiked(id));
      this.updateCommentFormState(card);
      this.toggleEditVisibility(card);
    });
  }

  static buildPostCard(content, id, author, timestamp) {
    const user = window.auth?.getCurrentUser();
    const name = author || user?.fullname || 'Você';
    const isoTime = timestamp || new Date().toISOString();
    const tpl = document.createElement('template');

    tpl.innerHTML = `
      <article class="post-card" data-post-id="${id}">
        <header class="post-header">
          <div class="user-avatar" aria-hidden="true"></div>
          <div class="user-info">
            <h2><span class="author-name"></span> <small class="username"></small></h2>
            <time datetime="${isoTime}" class="post-time">${CommentService.formatRelativeTime(isoTime)}</time>
          </div>
          <button class="btn-more" aria-label="Mais opções" aria-haspopup="menu">•••</button>
          <nav class="context-menu" hidden aria-label="Menu do post">
            <button data-action="edit-post">✏️ Editar</button>
            <button data-action="save-post">💾 Salvar publicação</button>
            <button data-action="report-post">⚠️ Denunciar</button>
            <button data-action="block-user">👤 Bloquear usuário</button>
          </nav>
        </header>
        <div class="post-body"><p class="post-content"></p></div>
        <footer class="post-actions">
          <button class="action-btn like-btn" aria-label="Curtir" aria-pressed="false"><span class="heart-icon">🤍</span></button>
          <button class="action-btn comment-toggle-btn" aria-label="Comentar">💬</button>
          <button class="action-btn" aria-label="Ler mangá">📖</button>
        </footer>
        <div class="comments-section">
          <div class="comment-form">
            <input type="text" class="comment-input" placeholder="Escreva um comentário...">
            <button class="send-comment-btn">Enviar</button>
          </div>
          <ul class="comments-list"></ul>
        </div>
      </article>
    `.trim();

    const el = tpl.content.firstElementChild;
    el.querySelector('.author-name').textContent = name;
    el.querySelector('.username').textContent = `@${name}`;
    el.querySelector('.post-content').textContent = content;
    return el;
  }

  static addPost(content) {
    if (!this.checkAuth()) return false;
    const id = `post-${Date.now()}`;
    const author = window.auth?.getCurrentUser()?.fullname || 'Você';
    const timestamp = new Date().toISOString();

    StorageService.update(CommentService.getStorageKey(), (posts) => {
      posts[id] = { content, author, timestamp, comments: [] };
    });

    const card = this.buildPostCard(content, id, author, timestamp);
    const postModal = document.getElementById('modal-criar-post');
    const feed = document.querySelector('.feed');

    if (postModal) postModal.after(card);
    else feed?.prepend(card);

    this.renderCommentsList(id);
    this.updateLikeButton(card, false);
    this.updateCommentFormState(card);
    this.toggleEditVisibility(card);
    return true;
  }

  static renderCommentsList(postId) {
    const container = document.querySelector(
      `[data-post-id="${postId}"] .comments-list`,
    );
    if (!container) return;

    const comments = CommentService.getPost(postId).comments || [];
    const users = window.auth?.getUsers() || {};
    const currentUser = window.auth?.getCurrentUser();
    const isLoggedIn = Boolean(window.auth?.isLoggedIn());

    const items = comments.map((c) => {
      const li = document.createElement('li');
      li.className = 'comment-item';
      li.setAttribute('role', 'listitem');

      const avatarUrl = c.emailHash && users[c.emailHash]?.avatar;
      const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" alt="" width="36" height="36" loading="lazy">`
        : `<span class="avatar-initials">${CommentService.getInitials(c.author)}</span>`;

      const isOwner = isLoggedIn && currentUser?.email === c.emailHash;
      const actionsHtml = isOwner
        ? `<button class="btn-edit-comment" data-action="edit-comment" aria-label="Editar">✏️ Editar</button>
           <button class="btn-delete-comment" data-action="delete-comment" aria-label="Excluir">🗑️ Excluir</button>`
        : '';

      li.innerHTML = `
        <div class="comment-avatar">${avatarHtml}</div>
        <div class="comment-body">
          <header class="comment-header">
            <span class="comment-username"></span>
            <time class="comment-time" datetime="${c.timestamp}">${CommentService.formatRelativeTime(c.timestamp)}</time>
            ${actionsHtml}
          </header>
          <p class="comment-text"></p>
        </div>
      `;

      li.querySelector('.comment-username').textContent =
        c.author || CONFIG.DEFAULT_AUTHOR;
      li.querySelector('.comment-text').textContent = c.text;
      return li;
    });

    container.replaceChildren(...items);
  }

  static isOwner(card) {
    const post = CommentService.getPost(card.dataset.postId);
    const user = window.auth?.getCurrentUser();
    return Boolean(
      window.auth?.isLoggedIn() &&
      post?.author &&
      post.author === user?.fullname,
    );
  }

  static toggleEditVisibility(card) {
    const btn = card.querySelector('[data-action="edit-post"]');
    if (btn) btn.hidden = !this.isOwner(card);
  }

  static updateCommentFormState(card) {
    const loggedIn = Boolean(window.auth?.isLoggedIn());
    const input = card.querySelector('.comment-input');
    const btn = card.querySelector('.send-comment-btn');

    if (input) {
      input.disabled = !loggedIn;
      input.placeholder = loggedIn
        ? 'Escreva um comentário...'
        : 'Faça login para comentar';
    }
    if (btn) {
      btn.hidden = !loggedIn;
      btn.setAttribute('aria-label', loggedIn ? 'Enviar comentário' : '');
    }
  }

  static updateLikeButton(card, isLiked) {
    const btn = card.querySelector('.like-btn');
    if (!btn) return;
    btn.classList.toggle('liked', isLiked);
    btn.setAttribute('aria-pressed', String(isLiked));
    const icon = btn.querySelector('.heart-icon');
    if (icon) icon.textContent = isLiked ? '❤️' : '🤍';
  }

  static showAccessibleError(msg) {
    const container = document.getElementById('error-alert-container');
    if (!container) return;
    container.textContent = msg;
    container.hidden = false;
    setTimeout(() => {
      container.textContent = '';
      container.hidden = true;
    }, 5000);
  }

  static submitComment(card) {
    const input = card.querySelector('.comment-input');
    const text = input?.value.trim();
    if (!text) return;

    CommentService.addComment(card.dataset.postId, text);
    this.renderCommentsList(card.dataset.postId);
    input.value = '';
  }

  static toggleAuthModal(show) {
    const modal = document.querySelector(CONFIG.AUTH_MODAL_SELECTOR);
    if (!modal) return;
    modal.hidden = !show;
    if (show) modal.querySelector('[data-close]')?.focus();
  }

  static closeContextMenus(except = null) {
    document.querySelectorAll('.context-menu.show').forEach((menu) => {
      if (menu === except) return;
      menu.classList.remove('show');
      menu.hidden = true;
      menu
        .closest('.post-card')
        ?.querySelector('.btn-more')
        ?.setAttribute('aria-expanded', 'false');
    });
  }

  static toggleContextMenu(card, btn) {
    const menu = card.querySelector('.context-menu');
    if (!menu) return;
    this.closeContextMenus(menu);
    const isOpen = menu.classList.toggle('show');
    menu.hidden = !isOpen;
    btn.setAttribute('aria-expanded', String(isOpen));
  }

  static inlineEditor({ targetEl, initialValue, onSave }) {
    const form = document.createElement('form');
    form.className = 'edit-inline-form';
    form.innerHTML = `
      <textarea class="edit-textarea" rows="3"></textarea>
      <div class="edit-actions">
        <button type="button" class="btn-save">💾 Salvar</button>
        <button type="button" class="btn-cancel">Cancelar</button>
      </div>
    `;

    const textarea = form.querySelector('.edit-textarea');
    textarea.value = initialValue;
    targetEl.replaceWith(form);
    textarea.focus();

    const handleSave = () => {
      const val = textarea.value.trim();
      if (!val)
        return FeedUI.showAccessibleError('O conteúdo não pode estar vazio.');
      onSave(val);
    };

    form.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.matches('.btn-save')) handleSave();
      if (e.target.matches('.btn-cancel')) form.replaceWith(targetEl);
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    });
  }

  static openEditModal(card) {
    const id = card.dataset.postId;
    const post = CommentService.getPost(id);
    const body = card.querySelector('.post-body');
    if (!post.content || !body) return;

    this.inlineEditor({
      targetEl: body,
      initialValue: post.content,
      onSave: (val) => {
        CommentService.updatePostContent(id, val);
        FeedUI.renderAllPosts();
      },
    });
  }

  static openEditComment(commentEl, postId) {
    const textEl = commentEl.querySelector('.comment-text');
    if (!textEl) return;

    this.inlineEditor({
      targetEl: textEl,
      initialValue: textEl.textContent,
      onSave: (val) =>
        CommentService.mutateComment(
          postId,
          commentEl,
          (arr, idx) => (arr[idx].text = val),
        ),
    });
  }

  static openDeleteComment(commentEl, postId) {
    const textEl = commentEl.querySelector('.comment-text');
    const modal = document.getElementById('delete-confirmation-modal');
    if (!modal || !textEl) return;

    const preview = modal.querySelector('.delete-preview');
    if (preview) preview.textContent = textEl.textContent;

    modal.addEventListener(
      'submit',
      (e) => {
        if (e.submitter?.value !== 'cancel') {
          e.preventDefault();
          CommentService.mutateComment(postId, commentEl, (arr, idx) =>
            arr.splice(idx, 1),
          );
          commentEl.remove();
          modal.close();
        }
      },
      { once: true },
    );

    modal.showModal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  activeCommunity = params.get('name');
  const memberCount = params.get('memberCount');

  if (activeCommunity) {
    const nameEl = document.getElementById('community-name');
    if (nameEl) nameEl.textContent = activeCommunity;
  }

  if (memberCount) {
    const statsEl = document.getElementById('community-stats');
    if (statsEl)
      statsEl.textContent = `${Number(memberCount).toLocaleString('pt-BR')} participantes`;
  }

  FeedUI.initCommunityBanner();
  FeedUI.renderAllPosts();

  const postModal = document.querySelector('#modal-criar-post');
  const postInput = document.querySelector('#input-novo-post');

  document
    .getElementById('create-new-post-btn')
    ?.addEventListener('click', () => {
      if (!FeedUI.checkAuth()) return;
      postModal?.showModal();
      postInput?.focus();
    });

  postModal?.querySelector('form')?.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const content = postInput?.value.trim();
    if (!content)
      return FeedUI.showAccessibleError('O conteúdo não pode estar vazio.');
    if (FeedUI.addPost(content)) postModal.close();
  });

  postModal?.addEventListener('close', () => {
    if (postInput) postInput.value = '';
  });

  const feed = document.querySelector('.feed');

  feed?.addEventListener('click', (e) => {
    const card = e.target.closest('.post-card');
    if (!card) return;

    const postId = card.dataset.postId;
    const actionTarget = e.target.closest('[data-action]');
    const action = actionTarget?.dataset.action;

    if (e.target.closest('.post-body')) {
      if (FeedUI.checkAuth()) card.querySelector('.comment-input')?.focus();
      return;
    }

    if (e.target.closest('.comment-toggle-btn')) {
      e.stopPropagation();
      FeedUI.renderCommentsList(postId);
      card.querySelector('.comments-section')?.classList.toggle('show');
      return;
    }

    if (e.target.closest('.like-btn')) {
      FeedUI.updateLikeButton(card, LikeService.toggle(postId));
      return;
    }

    if (e.target.matches('.send-comment-btn')) {
      if (FeedUI.checkAuth()) FeedUI.submitComment(card);
      return;
    }

    if (e.target.matches('.btn-more')) {
      e.stopPropagation();
      FeedUI.toggleContextMenu(card, e.target);
      return;
    }

    if (action) {
      e.stopPropagation();

      if (action === 'edit-comment') {
        FeedUI.openEditComment(e.target.closest('.comment-item'), postId);
      } else if (action === 'delete-comment') {
        FeedUI.openDeleteComment(e.target.closest('.comment-item'), postId);
      } else if (action === 'edit-post') {
        if (FeedUI.checkAuth()) FeedUI.openEditModal(card);
      } else if (action === 'block-user') {
        card.remove();
      }
    }
  });

  feed?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.matches('.comment-input')) {
      if (!FeedUI.checkAuth()) return;
      e.preventDefault();
      FeedUI.submitComment(e.target.closest('.post-card'));
    }
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => FeedUI.toggleAuthModal(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') FeedUI.toggleAuthModal(false);
  });

  document.addEventListener('click', () => FeedUI.closeContextMenus());

  window.addEventListener('authStateChange', () => FeedUI.renderAllPosts());
  window.addEventListener('storage', () => FeedUI.renderAllPosts());
});
