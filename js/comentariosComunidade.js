document.addEventListener('DOMContentLoaded', () => {
  const feed = document.querySelector('.feed');
  if (!feed) return;

  feed.addEventListener('click', (e) => {
    const target = e.target;
    const targetCard = target.closest('.post-card');
    if (!targetCard) return;

    if (target.closest('.comment-toggle-btn')) {
      const commentSection = targetCard.querySelector('.comments-section');
      commentSection.classList.toggle('show');
    } else if (target.closest('.like-btn')) {
      const button = target.closest('.like-btn');
      const isLiked = button.classList.toggle('liked');
      const heartIcon = button.querySelector('.heart-icon');

      heartIcon.textContent = isLiked ? '❤️' : '🤍';
      button.setAttribute('aria-pressed', isLiked);
    } else if (target.matches('.send-comment-btn')) {
      handleCommentSubmit(targetCard);
    } else if (target.matches('.btn-more')) {
      e.stopPropagation();
      const contextMenu = targetCard.querySelector('.context-menu');
      closeAllMenus(contextMenu);

      const isOpen = contextMenu.classList.toggle('show');
      contextMenu.hidden = !isOpen;
      target.setAttribute('aria-expanded', isOpen);
    } else if (target.closest('.context-menu button')) {
      e.stopPropagation();
      const btn = target.closest('button');
      const contextMenu = btn.closest('.context-menu');

      contextMenu
        .querySelectorAll('button')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.textContent.includes('Bloquear')) {
        targetCard.remove();
      }
    }
  });

  feed.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.matches('.comment-input')) {
      e.preventDefault();
      const targetCard = e.target.closest('.post-card');
      handleCommentSubmit(targetCard);
    }
  });

  document.addEventListener('click', () => closeAllMenus());

  function handleCommentSubmit(card) {
    const input = card.querySelector('.comment-input');
    const list = card.querySelector('.comments-list');
    const commentText = input.value.trim();

    if (commentText !== '') {
      const newComment = document.createElement('li');
      newComment.textContent = commentText;
      list.appendChild(newComment);
      input.value = '';
    }
  }

  function closeAllMenus(exceptMenu = null) {
    document.querySelectorAll('.context-menu.show').forEach((menu) => {
      if (menu !== exceptMenu) {
        menu.classList.remove('show');
        menu.hidden = true;
        const btnMore = menu.closest('.post-card').querySelector('.btn-more');
        if (btnMore) btnMore.setAttribute('aria-expanded', 'false');
      }
    });
  }
});
