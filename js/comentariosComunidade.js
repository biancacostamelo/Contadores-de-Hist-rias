const CONFIG = {
  AUTH_MODAL_SELECTOR: '.auth-modal',
  STORAGE_KEYS: {
    LIKES: 'comentariosComunidade_likes',
    POSTS: 'comentariosComunidade_posts',
  },
  DEFAULT_AUTHOR: 'Leitor Voraz',
};

const state = { isLoggedIn: false };

class StorageService {
  static read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (error) {
      console.error(`[StorageService] Erro ao ler a chave "${key}":`, error);
      return {};
    }
  }

  static write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`[StorageService] Erro ao salvar a chave "${key}":`, error);
    }
  }

  static update(key, callback) {
    const data = this.read(key);
    const updatedData = callback(data) || data;
    this.write(key, updatedData);
    return updatedData;
  }
}

class CommentService {
  static getPostData(postId) {
    const allPosts = StorageService.read(CONFIG.STORAGE_KEYS.POSTS);
    return allPosts[postId] || { comments: [] };
  }

  static getCommentsByPost(postId) {
    const postData = this.getPostData(postId);
    return Array.isArray(postData) ? postData : postData.comments || [];
  }

  static addComment(postId, commentText) {
    if (!window.auth?.isLoggedIn()) return null;

    const session = window.auth.getSession();
    const currentUser = window.auth.getCurrentUser();
    const now = new Date();

    const newComment = {
      author: currentUser?.fullname || CONFIG.DEFAULT_AUTHOR,
      text: commentText,
      timestamp: now.toISOString(),
      emailHash: session ? session.email : null,
    };

    StorageService.update(CONFIG.STORAGE_KEYS.POSTS, (allPosts) => {
      if (!allPosts[postId]) allPosts[postId] = { comments: [] };
      if (Array.isArray(allPosts[postId]))
        allPosts[postId] = { comments: [...allPosts[postId]] };
      if (!Array.isArray(allPosts[postId].comments))
        allPosts[postId].comments = [];

      allPosts[postId].comments.push(newComment);
    });

    return newComment;
  }

  static editPost(postId, newContent) {
    let success = false;
    StorageService.update(CONFIG.STORAGE_KEYS.POSTS, (allPosts) => {
      if (allPosts[postId]) {
        allPosts[postId].content = newContent.trim();
        success = true;
      }
    });
    return success;
  }

  static editComment(postId, commentElement, newContent) {
    const commentsList = commentElement.closest('.comments-list');
    if (!commentsList || !postId) return false;

    const postIdAttr = commentsList
      .closest('[data-post-id]')
      ?.getAttribute('data-post-id');
    if (!postIdAttr) return false;

    StorageService.update(CONFIG.STORAGE_KEYS.POSTS, (allPosts) => {
      if (allPosts[postIdAttr]) {
        const commentIndex = Array.from(
          commentsList.querySelectorAll('.comment-item'),
        ).indexOf(commentElement);
        if (
          allPosts[postIdAttr].comments &&
          allPosts[postIdAttr].comments[commentIndex]
        ) {
          allPosts[postIdAttr].comments[commentIndex].text = newContent.trim();
        }
      }
    });

    FeedUI.renderCommentsList(postIdAttr);
    return true;
  }

  static deleteComment(postId, commentElement) {
    const commentsList = commentElement.closest('.comments-list');
    if (!commentsList || !postId) return false;

    const postIdAttr = commentsList
      .closest('[data-post-id]')
      ?.getAttribute('data-post-id');
    if (!postIdAttr) return false;

    StorageService.update(CONFIG.STORAGE_KEYS.POSTS, (allPosts) => {
      if (allPosts[postIdAttr]) {
        const commentIndex = Array.from(
          commentsList.querySelectorAll('.comment-item'),
        ).indexOf(commentElement);
        if (
          allPosts[postIdAttr].comments &&
          allPosts[postIdAttr].comments[commentIndex]
        ) {
          allPosts[postIdAttr].comments.splice(commentIndex, 1);
        }
      }
    });

    FeedUI.renderCommentsList(postIdAttr);
    return true;
  }

  static formatRelativeTime(dateInput) {
    const diffMs = new Date() - new Date(dateInput);
    const hours = Math.floor(Math.abs(diffMs) / 3600000);
    const minutes = Math.floor(Math.abs(diffMs) / 60000) % 60;

    if (hours > 0) return `há ${hours}h`;
    if (minutes > 0) return `há ${minutes}min`;
    return 'agora';
  }

  static generateAvatarHtml(author, avatar) {
    if (avatar) {
      return `<img src="${avatar}" alt="" width="36" height="36" loading="lazy">`;
    }
    const initials = (author || CONFIG.DEFAULT_AUTHOR)
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return `<span class="avatar-initials">${initials}</span>`;
  }
}

class LikeService {
  static isLiked(postId) {
    return Boolean(StorageService.read(CONFIG.STORAGE_KEYS.LIKES)[postId]);
  }

  static toggleLike(postId) {
    let newState = false;
    StorageService.update(CONFIG.STORAGE_KEYS.LIKES, (allLikes) => {
      allLikes[postId] = !allLikes[postId];
      newState = allLikes[postId];
    });
    return newState;
  }
}

class FeedUI {
  static checkAuthOrShowModal() {
    if (!window.auth?.isLoggedIn()) {
      FeedUI.toggleAuthModal(true);
      return false;
    }
    return true;
  }

  static initializeAllPosts() {
    const feedContainer = document.querySelector('.feed');
    if (!feedContainer) return;
    FeedUI.rebuildFeedFromStorage(feedContainer);
  }

  static rebuildFeedFromStorage(feedContainer) {
    const allPostsData = StorageService.read(CONFIG.STORAGE_KEYS.POSTS);

    feedContainer.querySelectorAll('.post-card').forEach((card) => {
      const postId = card.getAttribute('data-post-id');
      if (allPostsData[postId]) card.remove();
    });

    const fragment = document.createDocumentFragment();

    Object.entries(allPostsData).forEach(([postId, postObj]) => {
      if (
        postObj?.content &&
        !document.querySelector(`[data-post-id="${postId}"]`)
      ) {
        const postElement = FeedUI.createPostCardElement(
          postObj.content,
          postId,
          postObj.author,
          postObj.timestamp,
        );
        fragment.appendChild(postElement);
      }
    });

    const postModal = document.getElementById('modal-criar-post');
    if (postModal) {
      postModal.after(fragment);
    } else {
      feedContainer.prepend(fragment);
    }

    document.querySelectorAll('.post-card').forEach((postCard) => {
      const postId = postCard.getAttribute('data-post-id');
      this.renderCommentsList(postId);
      this.updateLikeButtonState(postCard, LikeService.isLiked(postId));
      this.updateCommentFormState(postCard);
      this.toggleEditVisibility(postCard);
    });
  }

  static createPostCardElement(
    content,
    postId,
    author = null,
    timestamp = null,
  ) {
    const currentUser = window.auth?.getCurrentUser();
    const authorName = author || currentUser?.fullname || 'Você';
    const displayTime = timestamp
      ? CommentService.formatRelativeTime(timestamp)
      : 'agora';
    const isoTime = timestamp || new Date().toISOString();

    const template = document.createElement('template');
    template.innerHTML = `
      <article class="post-card" data-post-id="${postId}">
        <header class="post-header">
          <div class="user-avatar" aria-hidden="true"></div>
          <div class="user-info">
            <h2><span class="author-name"></span> <small class="username"></small></h2>
            <time datetime="${isoTime}" class="post-time">${displayTime}</time>
          </div>
          <button class="btn-more" aria-label="Mais opções deste post" aria-haspopup="menu">•••</button>
          <nav class="context-menu" hidden aria-label="Menu do post">
            <button data-action="edit">✏️ Editar</button>
            <button>💾 Salvar publicação</button>
            <button>⚠️ Denunciar</button>
            <button>👤 Bloquear usuário</button>
          </nav>
        </header>

        <div class="post-body">
          <p class="post-content"></p>
        </div>

        <footer class="post-actions">
          <button class="action-btn like-btn" aria-label="Curtir" aria-pressed="false">
            <span class="heart-icon">🤍</span>
          </button>
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

    const element = template.content.firstElementChild;
    element.querySelector('.author-name').textContent = authorName;
    element.querySelector('.username').textContent = `@${authorName}`;
    element.querySelector('.post-content').textContent = content;

    return element;
  }

  static addNewPost(content) {
    if (!window.auth?.isLoggedIn()) return false;

    const postId = `post-${Date.now()}`;
    const currentUser = window.auth?.getCurrentUser();
    const timestamp = new Date().toISOString();
    const author = currentUser?.fullname || 'Você';

    StorageService.update(CONFIG.STORAGE_KEYS.POSTS, (allPosts) => {
      allPosts[postId] = { content, author, timestamp, comments: [] };
    });

    const postElement = FeedUI.createPostCardElement(
      content,
      postId,
      author,
      timestamp,
    );
    const postModal = document.getElementById('modal-criar-post');
    const feedContainer = document.querySelector('.feed');

    if (postModal) {
      postModal.after(postElement);
    } else if (feedContainer) {
      feedContainer.prepend(postElement);
    }

    this.renderCommentsList(postId);
    this.updateLikeButtonState(postElement, false);
    this.updateCommentFormState(postElement);
    this.toggleEditVisibility(postElement);
  }

  static renderCommentsList(postId) {
    const listContainer = document.querySelector(
      `[data-post-id="${postId}"] .comments-list`,
    );
    if (!listContainer) return;

    const comments = CommentService.getCommentsByPost(postId);
    const allUsers = window.auth?.getUsers() || {};
    const currentUser = window.auth?.getCurrentUser();
    const isLoggedIn = Boolean(window.auth?.isLoggedIn());

    listContainer.innerHTML = '';

    comments.forEach((comment) => {
      const li = document.createElement('li');
      li.className = 'comment-item';
      li.setAttribute('role', 'listitem');

      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'comment-avatar';
      const avatarUrl =
        comment.emailHash && allUsers[comment.emailHash]?.avatar;
      if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = '';
        img.width = 36;
        img.height = 36;
        img.loading = 'lazy';
        avatarDiv.appendChild(img);
      } else {
        const authorName = comment.author || CONFIG.DEFAULT_AUTHOR;
        const initials = authorName
          .split(' ')
          .map((word) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        const span = document.createElement('span');
        span.className = 'avatar-initials';
        span.textContent = initials;
        avatarDiv.appendChild(span);
      }

      const commentBody = document.createElement('div');
      commentBody.className = 'comment-body';

      const header = document.createElement('header');
      header.className = 'comment-header';

      const usernameSpan = document.createElement('span');
      usernameSpan.className = 'comment-username';
      usernameSpan.textContent = comment.author || CONFIG.DEFAULT_AUTHOR;
      header.appendChild(usernameSpan);

      const timeEl = document.createElement('time');
      timeEl.className = 'comment-time';
      timeEl.setAttribute('datetime', comment.timestamp);
      timeEl.textContent = CommentService.formatRelativeTime(comment.timestamp);
      header.appendChild(timeEl);

      if (isLoggedIn && currentUser?.email === comment.emailHash) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit-comment';
        editBtn.setAttribute('aria-label', 'Editar comentário');
        editBtn.textContent = '✏️ Editar';
        header.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-comment';
        deleteBtn.setAttribute('aria-label', 'Excluir comentário');
        deleteBtn.textContent = '🗑️ Excluir';
        header.appendChild(deleteBtn);
      }

      commentBody.appendChild(header);

      const textP = document.createElement('p');
      textP.className = 'comment-text';
      textP.textContent = comment.text;
      commentBody.appendChild(textP);

      li.appendChild(avatarDiv);
      li.appendChild(commentBody);
      listContainer.appendChild(li);
    });
  }

  static isPostOwner(postCard) {
    const postId = postCard.getAttribute('data-post-id');
    const postData = CommentService.getPostData(postId);
    const currentUser = window.auth?.getCurrentUser();

    return Boolean(
      window.auth?.isLoggedIn() &&
      postData?.author &&
      postData.author === currentUser?.fullname,
    );
  }

  static toggleEditVisibility(postCard) {
    const editBtn = postCard.querySelector('[data-action="edit"]');
    if (editBtn) editBtn.hidden = !FeedUI.isPostOwner(postCard);
  }

  static updateCommentFormState(postCard) {
    const isLoggedIn = Boolean(window.auth?.isLoggedIn());
    const commentInput = postCard.querySelector('.comment-input');
    const sendButton = postCard.querySelector('.send-comment-btn');

    if (commentInput) {
      commentInput.disabled = !isLoggedIn;
      commentInput.placeholder = isLoggedIn
        ? 'Escreva um comentário...'
        : 'Faça login para comentar';
    }

    if (sendButton) {
      sendButton.hidden = !isLoggedIn;
      sendButton.setAttribute(
        'aria-label',
        isLoggedIn ? 'Enviar comentário' : '',
      );
    }
  }

  static updateLikeButtonState(postCard, isLiked) {
    const likeBtn = postCard.querySelector('.like-btn');
    if (!likeBtn) return;

    likeBtn.classList.toggle('liked', isLiked);
    likeBtn.setAttribute('aria-pressed', String(isLiked));

    const heartIcon = likeBtn.querySelector('.heart-icon');
    if (heartIcon) heartIcon.textContent = isLiked ? '❤️' : '🤍';
  }

  static showAccessibleError(message) {
    const errorContainer = document.getElementById('error-alert-container');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.hidden = false;
      setTimeout(() => {
        errorContainer.textContent = '';
        errorContainer.hidden = true;
      }, 5000);
    }
  }

  static submitNewComment(postCard) {
    const inputElement = postCard.querySelector('.comment-input');
    const commentText = inputElement?.value.trim();
    if (!commentText) return;

    const postId = postCard.getAttribute('data-post-id');
    CommentService.addComment(postId, commentText);
    this.renderCommentsList(postId);
    inputElement.value = '';
  }

  static toggleAuthModal(shouldOpen) {
    const authModal = document.querySelector(CONFIG.AUTH_MODAL_SELECTOR);
    if (!authModal) return;

    authModal.hidden = !shouldOpen;
    if (shouldOpen) authModal.querySelector('[data-close]')?.focus();
  }

  static closeAllContextMenus(exceptMenu = null) {
    document.querySelectorAll('.context-menu.show').forEach((menu) => {
      if (menu === exceptMenu) return;
      menu.classList.remove('show');
      menu.hidden = true;
      menu
        .closest('.post-card')
        ?.querySelector('.btn-more')
        ?.setAttribute('aria-expanded', 'false');
    });
  }

  static handleContextMenuToggle(postCard, moreButtonElement) {
    const contextMenu = postCard.querySelector('.context-menu');
    if (!contextMenu) return;

    this.closeAllContextMenus(contextMenu);
    const isNowOpen = contextMenu.classList.toggle('show');
    contextMenu.hidden = !isNowOpen;
    moreButtonElement.setAttribute('aria-expanded', String(isNowOpen));
  }

  static handlePostBodyClick(postCard) {
    if (!FeedUI.checkAuthOrShowModal()) return;

    const commentInput = postCard.querySelector('.comment-input');
    if (commentInput && !commentInput.disabled) {
      commentInput.focus();
    }
  }

  static openEditModal(postCard) {
    const postId = postCard.getAttribute('data-post-id');
    const postData = CommentService.getPostData(postId);
    const postBody = postCard.querySelector('.post-body');

    if (!postData.content || !postBody) return;

    const originalContent = postData.content;
    const editForm = document.createElement('form');
    editForm.className = 'edit-form';
    editForm.innerHTML = `
      <textarea class="edit-textarea" rows="4"></textarea>
      <div class="edit-actions">
        <button type="button" class="btn-save-edit">💾 Salvar</button>
        <button type="button" class="btn-cancel-edit">Cancelar</button>
      </div>
    `;

    const textarea = editForm.querySelector('.edit-textarea');
    textarea.value = originalContent;
    postBody.replaceWith(editForm);
    textarea.focus();

    const handleSave = () => {
      const newContent = textarea.value.trim();
      if (!newContent) {
        FeedUI.showAccessibleError('O conteúdo não pode estar vazio.');
        return;
      }
      CommentService.editPost(postId, newContent);
      FeedUI.initializeAllPosts();
    };

    editForm.addEventListener('click', (event) => {
      event.stopPropagation();

      if (event.target.matches('.btn-save-edit')) handleSave();
      if (event.target.matches('.btn-cancel-edit')) {
        const restoredBody = document.createElement('div');
        restoredBody.className = 'post-body';
        restoredBody.innerHTML = `<p class="post-content"></p>`;
        restoredBody.querySelector('.post-content').textContent =
          originalContent;
        editForm.replaceWith(restoredBody);
      }
    });

    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        handleSave();
      }
    });
  }

  static openEditComment(commentItem, postId) {
    const commentText = commentItem.querySelector('.comment-text');
    if (!commentText) return;

    const originalContent = commentText.textContent;
    const capturedCommentItem = commentItem.closest('.comment-item');
    const editForm = document.createElement('form');
    editForm.className = 'edit-comment-form';
    editForm.innerHTML = `
      <textarea class="edit-comment-textarea" rows="3"></textarea>
      <div class="edit-comment-actions">
        <button type="button" class="btn-save-edit-comment">💾 Salvar</button>
        <button type="button" class="btn-cancel-edit-comment">Cancelar</button>
      </div>
    `;

    const textarea = editForm.querySelector('.edit-comment-textarea');
    textarea.value = originalContent;
    commentText.replaceWith(editForm);
    textarea.focus();

    const handleSave = () => {
      const newContent = textarea.value.trim();
      if (!newContent) {
        FeedUI.showAccessibleError('O conteúdo não pode estar vazio.');
        return;
      }
      CommentService.editComment(postId, capturedCommentItem, newContent);
    };

    editForm.addEventListener('click', (event) => {
      event.stopPropagation();

      if (event.target.matches('.btn-save-edit-comment')) handleSave();
      if (event.target.matches('.btn-cancel-edit-comment')) {
        const restoredText = document.createElement('p');
        restoredText.className = 'comment-text';
        restoredText.textContent = originalContent;
        editForm.replaceWith(restoredText);
      }
    });

    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        handleSave();
      }
    });
  }

  static openDeleteComment(commentItem, postId) {
    const commentText = commentItem.querySelector('.comment-text');
    const modal = document.getElementById('delete-confirmation-modal');
    if (!modal || !commentText) return;

    const previewBlock = modal.querySelector('.delete-preview');
    if (previewBlock) previewBlock.textContent = commentText.textContent;

    const handleConfirm = (e) => {
      if (e.submitter?.value === 'cancel') {
        modal.removeEventListener('submit', handleConfirm);
        return;
      }

      e.preventDefault();
      CommentService.deleteComment(postId, commentItem);
      commentItem.remove();
      modal.close();
      modal.removeEventListener('submit', handleConfirm);
    };

    modal.addEventListener('submit', handleConfirm);
    modal.showModal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  FeedUI.initializeAllPosts();

  const createPostBtn = document.getElementById('create-new-post-btn');
  const postModal = document.querySelector('#modal-criar-post');
  const postInput = document.querySelector('#input-novo-post');

  createPostBtn?.addEventListener('click', () => {
    if (!FeedUI.checkAuthOrShowModal()) return;
    postModal?.showModal();
    postInput?.focus();
  });

  postModal?.querySelector('form')?.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;

    e.preventDefault();
    const content = postInput?.value.trim();

    if (!content) {
      FeedUI.showAccessibleError('O conteúdo não pode estar vazio.');
      return;
    }

    if (FeedUI.addNewPost(content)) {
      postModal.close();
    }
  });

  postModal?.addEventListener('close', () => {
    if (postInput) postInput.value = '';
  });

  const feedContainer = document.querySelector('.feed');
  feedContainer?.addEventListener('click', (event) => {
    const target = event.target;
    const postCard = target.closest('.post-card');
    if (!postCard) return;

    if (target.closest('.post-body')) {
      FeedUI.handlePostBodyClick(postCard);
      return;
    }

    if (target.closest('.comment-toggle-btn')) {
      event.stopPropagation();
      const postId = postCard.getAttribute('data-post-id');
      FeedUI.renderCommentsList(postId);
      postCard.querySelector('.comments-section')?.classList.toggle('show');
      return;
    }

    if (target.closest('.like-btn')) {
      const postId = postCard.getAttribute('data-post-id');
      const isLikedNow = LikeService.toggleLike(postId);
      FeedUI.updateLikeButtonState(postCard, isLikedNow);
      return;
    }

    if (target.matches('.send-comment-btn')) {
      if (!FeedUI.checkAuthOrShowModal()) return;
      FeedUI.submitNewComment(postCard);
      return;
    }

    if (target.matches('.btn-more')) {
      event.stopPropagation();
      FeedUI.handleContextMenuToggle(postCard, target);
      return;
    }

    if (target.matches('.btn-edit-comment')) {
      event.stopPropagation();
      const commentItem = target.closest('.comment-item');
      if (!commentItem) return;
      const editPostId = postCard.getAttribute('data-post-id');
      FeedUI.openEditComment(commentItem, editPostId);
      return;
    }

    if (target.matches('.btn-delete-comment')) {
      event.stopPropagation();
      const commentItem = target.closest('.comment-item');
      if (!commentItem) return;
      const deletePostId = postCard.getAttribute('data-post-id');
      FeedUI.openDeleteComment(commentItem, deletePostId);
      return;
    }

    const actionButton = target.closest('.context-menu button');
    if (actionButton) {
      event.stopPropagation();
      actionButton
        .closest('.context-menu')
        ?.querySelectorAll('button')
        .forEach((btn) => btn.classList.remove('active'));
      actionButton.classList.add('active');

      if (actionButton.textContent.includes('Bloquear')) {
        postCard.remove();
      } else if (
        actionButton.dataset.action === 'edit' ||
        actionButton.textContent.includes('Editar')
      ) {
        if (!FeedUI.checkAuthOrShowModal()) return;
        FeedUI.openEditModal(postCard);
      }
    }
  });

  feedContainer?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && event.target.matches('.comment-input')) {
      if (!FeedUI.checkAuthOrShowModal()) return;
      event.preventDefault();
      FeedUI.submitNewComment(event.target.closest('.post-card'));
    }
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => FeedUI.toggleAuthModal(false));
  });

  document.addEventListener('keydown', (event) => {
    const authModal = document.querySelector(CONFIG.AUTH_MODAL_SELECTOR);
    if (event.key === 'Escape' && authModal && !authModal.hidden) {
      FeedUI.toggleAuthModal(false);
    }
  });

  document.addEventListener('click', () => FeedUI.closeAllContextMenus());

  window.addEventListener('authStateChange', () => FeedUI.initializeAllPosts());
  window.addEventListener('storage', () => FeedUI.initializeAllPosts());
});
