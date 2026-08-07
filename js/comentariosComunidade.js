const CONFIG = Object.freeze({
  AUTH_MODAL_SELECTOR: '.auth-modal',
  STORAGE_KEYS: {
    LIKES: 'comentariosComunidade_likes',
    POSTS: 'comentariosComunidade_posts',
  },
  DEFAULT_AUTHOR: 'Leitor Voraz',
  COMMUNITIES_KEY: 'writersCommunity_communities',
  IMAGE_DB_NAME: 'writersCommunityImages',
  IMAGE_STORE_NAME: 'images',
});

class Comment {
  constructor({
    author,
    text,
    timestamp = new Date().toISOString(),
    emailHash = null,
  }) {
    this.author = author || CONFIG.DEFAULT_AUTHOR;
    this.text = text;
    this.timestamp = timestamp;
    this.emailHash = emailHash;
  }

  get initials() {
    return this.author
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get relativeTime() {
    const diffMs = new Date() - new Date(this.timestamp);
    const hours = Math.floor(Math.abs(diffMs) / 36e5);
    const mins = Math.floor(Math.abs(diffMs) / 6e4) % 60;

    if (hours > 0) return `há ${hours}h`;
    if (mins > 0) return `há ${mins}min`;
    return 'agora';
  }
}

class Post {
  constructor({
    id,
    content,
    author,
    timestamp = new Date().toISOString(),
    comments = [],
    authorEmailHash = null,
  }) {
    this.id = id || `post-${Date.now()}`;
    this.content = content;
    this.author = author || 'Você';
    this.timestamp = timestamp;
    this.comments = comments.map((c) =>
      c instanceof Comment ? c : new Comment(c),
    );
    this.authorEmailHash = authorEmailHash;
  }

  get relativeTime() {
    return new Comment({ timestamp: this.timestamp }).relativeTime;
  }
}

class ImageRepository {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.IMAGE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(CONFIG.IMAGE_STORE_NAME, {
          keyPath: 'id',
        });
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async load(id) {
    if (!id) return null;
    try {
      await this.open();
      return new Promise((resolve) => {
        const transaction = this.db.transaction(CONFIG.IMAGE_STORE_NAME);
        const store = transaction.objectStore(CONFIG.IMAGE_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => resolve(null);
      });
    } catch (err) {
      console.error('[ImageRepository] Erro ao carregar imagem:', err);
      return null;
    }
  }

  async resolveAvatarUrl(emailHash, authorName) {
    const users = window.auth?.getUsers() || {};
    let avatarRef = null;

    if (emailHash && users[emailHash]) {
      avatarRef = users[emailHash].avatar;
    } else if (authorName) {
      const matchedUser = Object.values(users).find(
        (u) => u.fullname === authorName,
      );
      avatarRef = matchedUser?.avatar;
    }

    if (!avatarRef) return null;

    if (typeof avatarRef === 'object' && avatarRef.type === 'img') {
      return await this.load(avatarRef.id);
    }
    if (typeof avatarRef === 'string') {
      return avatarRef;
    }
    return null;
  }
}

const imageRepository = new ImageRepository();

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
      console.error(`[StorageService] Erro ao gravar "${key}":`, err);
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
  static activeCommunity = null;

  static setActiveCommunity(name) {
    this.activeCommunity = name;
  }

  static get StorageKey() {
    const name = (this.activeCommunity || '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    return `${CONFIG.STORAGE_KEYS.POSTS}_${name}`;
  }

  static getCommunities() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.COMMUNITIES_KEY)) || [];
    } catch {
      return [];
    }
  }

  static getCommunity(name) {
    return this.getCommunities().find(
      (c) => c.name.toLowerCase() === (name || '').toLowerCase(),
    );
  }
}
class PostService {
  static getPost(postId) {
    const data = StorageService.read(CommunityService.StorageKey)[postId];
    return data ? new Post(data) : new Post({ id: postId });
  }

  static getAllPosts() {
    const data = StorageService.read(CommunityService.StorageKey);
    return Object.entries(data)
      .filter(([_, value]) => Boolean(value?.content))
      .map(([id, value]) => new Post({ id, ...value }));
  }

  static createPost(content) {
    if (!window.auth?.isLoggedIn()) return null;

    const user = window.auth.getCurrentUser();
    const session = window.auth.getSession();
    const post = new Post({
      content,
      author: user?.fullname,
      authorEmailHash: session?.email || null,
    });

    StorageService.update(CommunityService.StorageKey, (posts) => {
      posts[post.id] = post;
    });

    return post;
  }

  static updatePostContent(postId, content) {
    StorageService.update(CommunityService.StorageKey, (posts) => {
      if (posts[postId]) posts[postId].content = content.trim();
    });
  }

  static addComment(postId, text) {
    if (!window.auth?.isLoggedIn()) return null;

    const user = window.auth.getCurrentUser();
    const comment = new Comment({
      author: user?.fullname,
      text,
      emailHash: window.auth.getSession()?.email || null,
    });

    StorageService.update(CommunityService.StorageKey, (posts) => {
      posts[postId] = posts[postId] || { comments: [] };
      if (!Array.isArray(posts[postId].comments)) posts[postId].comments = [];
      posts[postId].comments.push(comment);
    });

    return comment;
  }

  static mutateComment(postId, commentIndex, actionFn) {
    StorageService.update(CommunityService.StorageKey, (posts) => {
      const comments = posts[postId]?.comments;
      if (comments && comments[commentIndex]) {
        actionFn(comments, commentIndex);
      }
    });
  }

  static deletePost(postId) {
    StorageService.update(CommunityService.StorageKey, (posts) => {
      delete posts[postId];
    });
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

class FeedUI {
  static async loadCommunityBanner() {
    const bannerEl = document.querySelector('.community-banner');
    if (!bannerEl) return;

    const community = CommunityService.getCommunity(
      CommunityService.activeCommunity,
    );
    if (!community?.banner) return;

    let src = null;
    if (
      typeof community.banner === 'object' &&
      community.banner.type === 'img'
    ) {
      src = await imageRepository.load(community.banner.id);
    } else if (typeof community.banner === 'string') {
      src = community.banner;
    }

    if (src) bannerEl.style.backgroundImage = `url('${src}')`;
  }

  static checkAuth() {
    if (!window.auth?.isLoggedIn()) {
      this.toggleAuthModal(true);
      return false;
    }
    return true;
  }

  static async renderAllPosts() {
    const feed = document.querySelector('.feed');
    if (!feed) return;

    const posts = PostService.getAllPosts();
    feed.querySelectorAll('.post-card').forEach((card) => card.remove());

    const fragment = document.createDocumentFragment();
    for (const post of posts) {
      const card = await this.buildPostCard(post);
      fragment.appendChild(card);
    }
    feed.appendChild(fragment);

    feed.querySelectorAll('.post-card').forEach((card) => {
      const id = card.dataset.postId;
      this.renderCommentsList(id);
      this.updateLikeButton(card, LikeService.isLiked(id));
      this.updateCommentFormState(card);
      this.toggleEditVisibility(card);
    });
  }

  static async buildPostCard(post) {
    const user = window.auth?.getCurrentUser();
    const name = post.author || user?.fullname || 'Você';
    const tpl = document.createElement('template');

    tpl.innerHTML = `
      <article class="post-card" data-post-id="${post.id}">
        <header class="post-header">
          <div class="user-avatar" aria-hidden="true"></div>
          <div class="user-info">
            <h2><span class="author-name"></span> <small class="username"></small></h2>
            <time datetime="${post.timestamp}" class="post-time">${post.relativeTime}</time>
          </div>
          <button class="btn-more" aria-label="Mais opções" aria-haspopup="menu">•••</button>
          <nav class="context-menu" hidden aria-label="Menu do post">
            <button data-action="edit-post">✏️ Editar</button>
            <button data-action="delete-post">🗑️ Excluir publicação</button>
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
    el.querySelector('.post-content').textContent = post.content;

    const avatarEl = el.querySelector('.user-avatar');
    if (avatarEl) {
      const avatarUrl = await imageRepository.resolveAvatarUrl(
        post.authorEmailHash,
        name,
      );
      avatarEl.innerHTML = avatarUrl
        ? `<img src="${avatarUrl}" alt="" width="40" height="40" loading="lazy">`
        : `<span class="author-avatar-initials" aria-hidden="true">${new Comment({ author: name }).initials}</span>`;
    }

    return el;
  }

  static async renderCommentsList(postId) {
    const container = document.querySelector(
      `[data-post-id="${postId}"] .comments-list`,
    );
    if (!container) return;

    const post = PostService.getPost(postId);
    const currentUser = window.auth?.getCurrentUser();
    const isLoggedIn = Boolean(window.auth?.isLoggedIn());

    const items = await Promise.all(
      post.comments.map(async (c) => {
        const li = document.createElement('li');
        li.className = 'comment-item';
        li.setAttribute('role', 'listitem');

        const avatarUrl = await imageRepository.resolveAvatarUrl(
          c.emailHash,
          c.author,
        );
        const avatarHtml = avatarUrl
          ? `<img src="${avatarUrl}" alt="" width="36" height="36" loading="lazy">`
          : `<span class="avatar-initials">${c.initials}</span>`;

        const isOwner = isLoggedIn && currentUser?.email === c.emailHash;
        const actionsHtml = isOwner
          ? `<button class="btn-edit-comment" data-action="edit-comment" aria-label="Editar">✏️ Editar</button>
             <button class="btn-delete-comment-comunity" data-action="delete-comment" aria-label="Excluir">🗑️ Excluir</button>`
          : '';

        li.innerHTML = `
          <div class="comment-avatar">${avatarHtml}</div>
          <div class="comment-body">
            <header class="comment-header">
              <span class="comment-username"></span>
              <time class="comment-time" datetime="${c.timestamp}">${c.relativeTime}</time>
              ${actionsHtml}
            </header>
            <p class="comment-text"></p>
          </div>
        `;

        li.querySelector('.comment-username').textContent = c.author;
        li.querySelector('.comment-text').textContent = c.text;
        return li;
      }),
    );

    container.replaceChildren(...items);
  }

  static isOwner(card) {
    const post = PostService.getPost(card.dataset.postId);
    const session = window.auth?.getSession();
    return Boolean(
      window.auth?.isLoggedIn() &&
      post?.authorEmailHash &&
      session?.email === post.authorEmailHash,
    );
  }

  static isCommentOwner(commentEl) {
    const commentIndex = Array.from(
      commentEl.closest('.comments-list').children,
    ).indexOf(commentEl);
    const postId = commentEl.closest('.post-card')?.dataset.postId;
    const post = PostService.getPost(postId);
    if (!post || !post.comments[commentIndex]) return false;

    const session = window.auth?.getSession();
    return Boolean(
      window.auth?.isLoggedIn() &&
      post.comments[commentIndex].emailHash &&
      session?.email === post.comments[commentIndex].emailHash,
    );
  }

  static toggleEditVisibility(card) {
    const editBtn = card.querySelector('[data-action="edit-post"]');
    const deleteBtn = card.querySelector('[data-action="delete-post"]');
    const isOwner = this.isOwner(card);
    if (editBtn) editBtn.hidden = !isOwner;
    if (deleteBtn) deleteBtn.hidden = !isOwner;
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

    PostService.addComment(card.dataset.postId, text);
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
    const post = PostService.getPost(id);
    const body = card.querySelector('.post-body');
    if (!post.content || !body) return;

    this.inlineEditor({
      targetEl: body,
      initialValue: post.content,
      onSave: (val) => {
        PostService.updatePostContent(id, val);
        FeedUI.renderAllPosts();
      },
    });
  }

  static openEditComment(commentEl, postId) {
    const textEl = commentEl.querySelector('.comment-text');
    const list = commentEl.closest('.comments-list');
    const commentIndex = Array.from(list.children).indexOf(commentEl);

    if (!textEl || commentIndex === -1) return;

    this.inlineEditor({
      targetEl: textEl,
      initialValue: textEl.textContent,
      onSave: (val) => {
        PostService.mutateComment(postId, commentIndex, (comments, idx) => {
          comments[idx].text = val;
        });
        FeedUI.renderCommentsList(postId);
      },
    });
  }

  static openDeleteComment(commentEl, postId) {
    const textEl = commentEl.querySelector('.comment-text');
    const modal = document.getElementById('delete-confirmation-modal');
    const list = commentEl.closest('.comments-list');
    const commentIndex = Array.from(list.children).indexOf(commentEl);

    if (!modal || !textEl || commentIndex === -1) return;

    const preview = modal.querySelector('.delete-preview');
    if (preview) preview.textContent = textEl.textContent;

    modal.addEventListener(
      'submit',
      (e) => {
        if (e.submitter?.value !== 'cancel') {
          e.preventDefault();
          PostService.mutateComment(postId, commentIndex, (comments, idx) => {
            comments.splice(idx, 1);
          });
          commentEl.remove();
          modal.close();
        }
      },
      { once: true },
    );

    modal.showModal();
  }

  static openDeletePost(card) {
    const postId = card.dataset.postId;
    const post = PostService.getPost(postId);
    const body = card.querySelector('.post-body');
    const modal = document.getElementById('delete-confirmation-modal');

    if (!modal || !body || !post?.content) return;

    const preview = modal.querySelector('.delete-preview');
    if (preview) {
      const p = document.createElement('p');
      p.textContent = post.content;
      preview.replaceWith(p);
    }

    modal.addEventListener(
      'submit',
      (e) => {
        if (e.submitter?.value !== 'cancel') {
          e.preventDefault();
          PostService.deletePost(postId);
          card.remove();
          modal.close();
        }
      },
      { once: true },
    );

    modal.showModal();
  }
}

class AppController {
  static init() {
    const params = new URLSearchParams(window.location.search);
    CommunityService.setActiveCommunity(params.get('name'));

    if (CommunityService.activeCommunity) {
      const community = CommunityService.getCommunity(
        CommunityService.activeCommunity,
      );
      const nameEl = document.getElementById('community-name');
      const statsEl = document.getElementById('community-stats');
      const categoryEl = document.getElementById('community-category');

      if (nameEl) nameEl.textContent = CommunityService.activeCommunity;
      if (statsEl && community?.memberCount)
        statsEl.textContent = `${Number(community.memberCount).toLocaleString(
          'pt-BR',
        )} Membros`;
      if (categoryEl && community?.category)
        categoryEl.textContent = community.category;
    }

    FeedUI.loadCommunityBanner();
    FeedUI.renderAllPosts();
    this.bindEvents();
  }

  static bindEvents() {
    const postModal = document.querySelector('#modal-criar-post');
    const postInput = document.querySelector('#input-novo-post');
    const feed = document.querySelector('.feed');

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

      if (PostService.createPost(content)) {
        postModal.close();
        FeedUI.renderAllPosts();
      }
    });

    postModal?.addEventListener('close', () => {
      if (postInput) postInput.value = '';
    });

    feed?.addEventListener('click', (e) => this.handleFeedClick(e));
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
  }

  static handleFeedClick(e) {
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
        const commentEl = e.target.closest('.comment-item');
        if (!FeedUI.isCommentOwner(commentEl)) return;
        FeedUI.openEditComment(commentEl, postId);
      } else if (action === 'delete-comment') {
        const commentEl = e.target.closest('.comment-item');
        if (!FeedUI.isCommentOwner(commentEl)) return;
        FeedUI.openDeleteComment(commentEl, postId);
      } else if (action === 'edit-post') {
        if (!FeedUI.checkAuth()) return;
        if (!FeedUI.isOwner(card)) return;
        FeedUI.openEditModal(card);
      } else if (action === 'delete-post') {
        if (!FeedUI.checkAuth()) return;
        if (!FeedUI.isOwner(card)) return;
        FeedUI.openDeletePost(card);
      } else if (action === 'block-user') {
        card.remove();
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => AppController.init());
