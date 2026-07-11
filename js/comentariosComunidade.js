const AUTH_MODAL_SELECTOR = '.auth-modal';
const STORAGE_KEY_LIKES = 'comentariosComunidade_likes';
const STORAGE_KEY_POSTS = 'comentariosComunidade_posts';
const DEFAULT_AUTHOR_NAME = 'Leitor Voraz';
class StorageService {
  static read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (error) {
      console.error(`[StorageService] Failed to parse key "${key}":`, error);
      return {};
    }
  }

  static write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`[StorageService] Failed to write key "${key}":`, error);
    }
  }
}
class CommentService {
  static getCommentsByPost(postId) {
    const allPosts = StorageService.read(STORAGE_KEY_POSTS);
    return allPosts[postId] || [];
  }

  static addComment(postId, commentText) {
    const currentUser = window.auth?.getCurrentUser();
    const userEmail = currentUser?.email;
    const allUsers = window.auth?.getUsers() || {};

    const now = new Date();

    const newComment = {
      author: currentUser?.fullname || DEFAULT_AUTHOR_NAME,
      text: commentText,
      timestamp: now.toISOString(),
      avatar: userEmail ? allUsers[userEmail]?.avatar : null,
      timeDisplayString: this.formatRelativeTime(now),
    };

    const allPosts = StorageService.read(STORAGE_KEY_POSTS);
    allPosts[postId] = [...(allPosts[postId] || []), newComment];

    StorageService.write(STORAGE_KEY_POSTS, allPosts);
    return newComment;
  }

  static formatRelativeTime(dateInput) {
    const date = new Date(dateInput);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `há ${hours}h${minutes}`;
  }

  static generateAvatarHtml(comment) {
    if (comment.avatar) {
      return `<img src="${comment.avatar}" alt="" width="36" height="36" loading="lazy">`;
    }

    const initials = comment.author
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
    const allLikes = StorageService.read(STORAGE_KEY_LIKES);
    return Boolean(allLikes[postId]);
  }

  static toggleLike(postId) {
    const allLikes = StorageService.read(STORAGE_KEY_LIKES);
    allLikes[postId] = !allLikes[postId];

    StorageService.write(STORAGE_KEY_LIKES, allLikes);
    return allLikes[postId];
  }
}
class FeedUI {
  static initializeAllPosts() {
    document.querySelectorAll('.post-card').forEach((postCard) => {
      const postId = postCard.getAttribute('data-post-id');
      this.renderCommentsList(postId);
      this.updateLikeButtonState(postCard, LikeService.isLiked(postId));
    });
  }

  static renderCommentsList(postId) {
    const listContainer = document.querySelector(
      `[data-post-id="${postId}"] .comments-list`,
    );
    if (!listContainer) return;

    const comments = CommentService.getCommentsByPost(postId);

    listContainer.innerHTML = comments
      .map(
        (comment) => `
      <li class="comment-item" role="listitem">
        <div class="comment-avatar">
          ${CommentService.generateAvatarHtml(comment)}
        </div>
        <div class="comment-body">
          <header class="comment-header">
            <span class="comment-username">${comment.author}</span>
            <time class="comment-time" datetime="${comment.timestamp}">
              ${comment.timeDisplayString || CommentService.formatRelativeTime(comment.timestamp)}
            </time>
          </header>
          <p class="comment-text">${comment.text}</p>
        </div>
      </li>
    `,
      )
      .join('');
  }

  static updateLikeButtonState(postCard, isLiked) {
    const likeBtn = postCard.querySelector('.like-btn');
    if (!likeBtn) return;

    const heartIcon = likeBtn.querySelector('.heart-icon');

    likeBtn.classList.toggle('liked', isLiked);
    likeBtn.setAttribute('aria-pressed', String(isLiked));
    if (heartIcon) {
      heartIcon.textContent = isLiked ? '❤️' : '🤍';
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
    const authModal = document.querySelector(AUTH_MODAL_SELECTOR);
    if (!authModal) return;

    authModal.hidden = !shouldOpen;
    if (shouldOpen) {
      authModal.querySelector('[data-close]')?.focus();
    }
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
    moreButtonElement.setAttribute('aria-expanded', isNowOpen);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  FeedUI.initializeAllPosts();

  const feedContainer = document.querySelector('.feed');
  if (!feedContainer) return;

  feedContainer.addEventListener('click', (event) => {
    const target = event.target;
    const postCard = target.closest('.post-card');
    if (!postCard) return;

    if (
      target.closest('.comment-toggle-btn') &&
      !target.closest('.auth-modal-content')
    ) {
      if (!window.auth?.isLoggedIn()) {
        return FeedUI.toggleAuthModal(true);
      }
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
      FeedUI.submitNewComment(postCard);
      return;
    }

    if (target.matches('.btn-more')) {
      event.stopPropagation();
      FeedUI.handleContextMenuToggle(postCard, target);
      return;
    }

    if (target.closest('.context-menu button')) {
      event.stopPropagation();
      const actionButton = target.closest('button');
      const menu = actionButton.closest('.context-menu');

      menu
        .querySelectorAll('button')
        .forEach((btn) => btn.classList.remove('active'));
      actionButton.classList.add('active');

      if (actionButton.textContent.includes('Bloquear')) {
        postCard.remove();
      }
    }
  });

  feedContainer.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && event.target.matches('.comment-input')) {
      event.preventDefault();
      const postCard = event.target.closest('.post-card');
      FeedUI.submitNewComment(postCard);
    }
  });

  document.querySelectorAll('[data-close]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', () => FeedUI.toggleAuthModal(false));
  });

  document.addEventListener('keydown', (event) => {
    const authModal = document.querySelector(AUTH_MODAL_SELECTOR);
    if (event.key === 'Escape' && authModal && !authModal.hidden) {
      FeedUI.toggleAuthModal(false);
    }
  });

  document.addEventListener('click', () => FeedUI.closeAllContextMenus());
});
