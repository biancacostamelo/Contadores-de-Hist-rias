document.addEventListener('DOMContentLoaded', () => {
  // Elementos do Modal de Imagem
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImg');
  const modalUserAvatar = document.getElementById('modalUserAvatar');
  const modalUserName = document.getElementById('modalUserName');
  const modalUserHandle = document.getElementById('modalUserHandle');
  const closeBtn = document.getElementById('modalClose');

  // Elementos dos 3 Pontinhos do Post
  const optionsBtn = document.getElementById('postOptionsBtn');
  const optionsMenu = document.getElementById('postOptionsMenu');

  // Elementos de Interação
  const reactBtn = document.getElementById('reactBtn');
  const heartIcon = reactBtn ? reactBtn.querySelector('.heart-icon') : null;
  const sharePostBtn = document.getElementById('sharePostBtn');
  const quickShareBtn = document.getElementById('quickShareBtn');
  const commentForm = document.getElementById('commentForm');
  const commentInput = document.getElementById('commentInput');
  const commentsList = document.getElementById('commentsList');

  // Elementos do Modal de Exclusão de Comentário
  const deleteModal = document.getElementById('deleteConfirmModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');

  // Elementos do Modal de Confirmação de Divulgação
  const shareModal = document.getElementById('shareConfirmModal');
  const confirmShareBtn = document.getElementById('confirmShareBtn');
  const cancelShareBtn = document.getElementById('cancelShareBtn');
  const closeShareModalBtn = document.getElementById('closeShareModalBtn');

  // Elementos do Modal de Compartilhamento (Redes / Link)
  const shareMenuModal = document.getElementById('shareMenuModal');
  const closeShareMenuBtn = document.getElementById('closeShareMenuBtn');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const btnCopyShareInput = document.getElementById('btnCopyShareInput');
  const btnShareInstagram = document.getElementById('btnShareInstagram');
  const btnShareTikTok = document.getElementById('btnShareTikTok');
  const btnShareNative = document.getElementById('btnShareNative');

  // Elementos do Modal de Redirecionamento
  const redirectModal = document.getElementById('redirectNoticeModal');
  const redirectMessage = document.getElementById('redirectMessage');
  const btnCancelRedirect = document.getElementById('btnCancelRedirect');
  const btnConfirmRedirect = document.getElementById('btnConfirmRedirect');

  let currentPostId = '';
  let commentToDeleteId = null;
  let pendingUrl = '';
  let redirectTimer = null;

  // Bancos de dados em memória
  const postCommentsStore = {};
  const postLikesStore = {};
  const postSharesStore = {};

  function isUserLoggedIn() {
    const sessionData = localStorage.getItem('writersCommunity_session');

    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      return Boolean(session && session.token);
    } catch (error) {
      return false;
    }
  }

  function updateModalAuthUI() {
    const sidebar = document.querySelector('.modal-sidebar');
    if (!sidebar) return;

    const interactionBar = sidebar.querySelector('.interaction-bar');
    const commentsFilter = sidebar.querySelector('.comments-filter');
    const commentsList = sidebar.querySelector('#commentsList');
    const existingPrompt = sidebar.querySelector('.login-prompt-card');
    if (existingPrompt) existingPrompt.remove();

    const loggedIn = isUserLoggedIn();

    if (loggedIn) {
      // Logado
      if (interactionBar) interactionBar.style.display = '';
      if (commentsFilter) commentsFilter.style.display = '';
      if (commentsList) commentsList.style.display = '';
    } else {
      // Deslogado
      if (interactionBar) interactionBar.style.display = 'none';
      if (commentsFilter) commentsFilter.style.display = 'none';
      if (commentsList) commentsList.style.display = 'none';

      const loginCard = document.createElement('div');
      loginCard.className = 'login-prompt-card';

      loginCard.innerHTML = `
      <div class="login-prompt-inner">
        <h3 class="login-prompt-title">
          Não fique de fora
        </h3>
        <p class="login-prompt-text">
          Faça login ou crie sua conta para reagir, comentar e interagir com a comunidade.
        </p>
        <button id="modalLoginBtn" class="login-prompt-btn">
          Fazer Login
        </button>
      </div>
    `;

      sidebar.appendChild(loginCard);

      const modalLoginBtn = document.getElementById('modalLoginBtn');
      if (modalLoginBtn) {
        modalLoginBtn.addEventListener('click', () => {
          const isInsidePages = window.location.pathname.includes('/pages/');
          window.location.href = isInsidePages
            ? './login.html'
            : './pages/login.html';
        });
      }
    }
  }

  // 1. ABRIR MODAL PRINCIPAL
  const postElements = Array.from(
    document.querySelectorAll('.postsHome .posts'),
  );

  postElements.forEach((post) => {
    const link = post.querySelector('a');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        const postImg = post.querySelector('.pt-img-fundo')?.src || '';
        const userImg = post.querySelector('.avatar-autor')?.src || '';
        const artTitle =
          post.querySelector('.nome')?.innerText.trim() || 'Publicação';

        const rawHandleText =
          post.querySelector('.arroba-autor')?.innerText || '@crismiguel';
        const handleMatch = rawHandleText.match(/@[^\s]+/);
        const userHandle = handleMatch ? handleMatch[0] : '@crismiguel';

        currentPostId = artTitle;

        if (modalImg) modalImg.src = postImg;
        if (modalUserAvatar) modalUserAvatar.src = userImg;
        if (modalUserName) modalUserName.innerText = artTitle;
        if (modalUserHandle) modalUserHandle.innerText = userHandle;

        if (!postCommentsStore[currentPostId]) {
          postCommentsStore[currentPostId] = [];
        }

        if (postLikesStore[currentPostId] === undefined) {
          postLikesStore[currentPostId] = false;
        }

        if (postSharesStore[currentPostId] === undefined) {
          postSharesStore[currentPostId] = false;
        }

        updateModalAuthUI();
        updateLikeUI();
        updateShareUI();
        resetModalState();
        renderComments();

        if (modal) {
          modal.classList.add('active');
          modal.setAttribute('aria-hidden', 'false');
        }
        document.body.style.overflow = 'hidden';
      });
    }
  });

  function updateLikeUI() {
    const isLiked = !!postLikesStore[currentPostId];
    if (heartIcon) heartIcon.innerText = isLiked ? '❤️' : '🤍';
    if (reactBtn) reactBtn.classList.toggle('active', isLiked);
  }

  // Botão de divulgar
  function updateShareUI() {
    if (!sharePostBtn) return;
    const isShared = !!postSharesStore[currentPostId];
    const shareText = sharePostBtn.querySelector('small');

    if (isShared) {
      sharePostBtn.classList.add('shared');
      if (shareText) shareText.innerText = 'Divulgado';
    } else {
      sharePostBtn.classList.remove('shared');
      if (shareText) shareText.innerText = 'Divulgar';
    }
  }

  function resetModalState() {
    if (commentInput) commentInput.value = '';
    if (optionsMenu) optionsMenu.classList.remove('show', 'active');
  }

  // 2. RENDERIZAR COMENTÁRIOS E MENU DROPDOWN DE CADA UM
  function renderComments() {
    if (!commentsList) return;

    const comments = postCommentsStore[currentPostId] || [];

    if (comments.length === 0) {
      commentsList.innerHTML = `<div style="text-align: center; color: var(--text-secondary); margin-top: 20px; font-size: 0.9rem;">Sem comentários</div>`;
      return;
    }

    commentsList.innerHTML = '';
    comments.forEach((comment) => {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment-item';
      commentDiv.dataset.id = comment.id;

      commentDiv.style.display = 'flex';
      commentDiv.style.justifyContent = 'space-between';
      commentDiv.style.alignItems = 'center';

      commentDiv.innerHTML = `
        <div class="comment-content" style="flex: 1; padding-right: 10px;">
          <strong>${comment.author}</strong>
          <span class="comment-text">${escapeHtml(comment.text)}</span>
        </div>
        ${
          comment.isMine
            ? `
            <div class="comment-options-wrapper">
              <button class="comment-options-btn" title="Opções">⋮</button>
              <div class="comment-options-dropdown">
                <button class="comment-dropdown-item btn-edit-comment">
                  <span>✏️</span> Editar
                </button>
                <button class="comment-dropdown-item danger btn-delete-comment">
                  <span>🗑️</span> Excluir
                </button>
              </div>
            </div>
            `
            : ''
        }
      `;

      if (comment.isMine) {
        const optionsBtn = commentDiv.querySelector('.comment-options-btn');
        const dropdown = commentDiv.querySelector('.comment-options-dropdown');
        const editBtn = commentDiv.querySelector('.btn-edit-comment');
        const deleteBtn = commentDiv.querySelector('.btn-delete-comment');

        optionsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document
            .querySelectorAll('.comment-options-dropdown')
            .forEach((d) => {
              if (d !== dropdown) d.style.display = 'none';
            });
          dropdown.style.display =
            dropdown.style.display === 'block' ? 'none' : 'block';
        });

        editBtn.addEventListener('click', () => {
          dropdown.style.display = 'none';
          handleEditComment(comment.id, commentDiv);
        });

        deleteBtn.addEventListener('click', () => {
          dropdown.style.display = 'none';
          handleDeleteComment(comment.id);
        });
      }

      commentsList.appendChild(commentDiv);
    });
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.comment-options-dropdown').forEach((d) => {
      d.style.display = 'none';
    });
  });

  // 3. ENVIAR COMENTÁRIO
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = commentInput.value.trim();

      if (text !== '') {
        const newComment = {
          id: Date.now(),
          author: '@você',
          text: text,
          isMine: true,
        };

        postCommentsStore[currentPostId].unshift(newComment);
        commentInput.value = '';
        renderComments();
        commentsList.scrollTop = 0;
      }
    });
  }

  // 4. EDITAR COMENTÁRIO
  function handleEditComment(commentId, commentDiv) {
    const textSpan = commentDiv.querySelector('.comment-text');
    const currentText = textSpan ? textSpan.innerText : '';

    commentDiv.innerHTML = `
      <div class="edit-comment-wrapper">
        <input type="text" class="edit-comment-input" value="${escapeHtml(currentText)}" />
        <button class="btn-save-edit">Salvar</button>
      </div>
    `;

    const editInput = commentDiv.querySelector('.edit-comment-input');
    const saveBtn = commentDiv.querySelector('.btn-save-edit');

    editInput.focus();

    const saveAction = () => {
      const updatedText = editInput.value.trim();
      if (updatedText !== '') {
        const commentObj = postCommentsStore[currentPostId].find(
          (c) => c.id === commentId,
        );
        if (commentObj) {
          commentObj.text = updatedText;
        }
      }
      renderComments();
    };

    saveBtn.addEventListener('click', saveAction);
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveAction();
      }
    });
  }

  // 5. EXCLUIR COMENTÁRIO
  function handleDeleteComment(commentId) {
    commentToDeleteId = commentId;
    if (deleteModal) {
      deleteModal.classList.add('active');
    }
  }

  function closeDeleteModal() {
    if (deleteModal) {
      deleteModal.classList.remove('active');
    }
    commentToDeleteId = null;
  }

  if (cancelDeleteBtn)
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  if (closeDeleteModalBtn)
    closeDeleteModalBtn.addEventListener('click', closeDeleteModal);

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      if (commentToDeleteId !== null) {
        postCommentsStore[currentPostId] = postCommentsStore[
          currentPostId
        ].filter((c) => c.id !== commentToDeleteId);
        renderComments();
      }
      closeDeleteModal();
    });
  }

  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 6. FUNCIONALIDADE DOS 3 PONTINHOS DO POST
  if (optionsBtn && optionsMenu) {
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      optionsMenu.classList.toggle('active');
      optionsMenu.classList.toggle('show');
    });

    // COPIAR LINK
    const copyBtn = document.getElementById('btnCopyLink');
    const copyToast = document.getElementById('copyLinkToast');
    let toastTimeout;

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        optionsMenu.classList.remove('active', 'show');

        if (copyToast) {
          clearTimeout(toastTimeout);
          copyToast.classList.add('active');
          copyToast.setAttribute('aria-hidden', 'false');

          toastTimeout = setTimeout(() => {
            copyToast.classList.remove('active');
            copyToast.setAttribute('aria-hidden', 'true');
          }, 3000);
        }
      });
    }

    // DENUNCIAR PUBLICAÇÃO
    const reportBtn = document.getElementById('btnReport');
    const reportModal = document.getElementById('reportModal');
    const reportStepForm = document.getElementById('reportStepForm');
    const reportStepSuccess = document.getElementById('reportStepSuccess');
    const reportForm = document.getElementById('reportForm');
    const chkOther = document.getElementById('chkOtherReason');
    const otherWrapper = document.getElementById('otherReasonWrapper');
    const btnCancelReport = document.getElementById('btnCancelReport');
    const btnOkSuccess = document.getElementById('btnOkSuccess');

    const closeReportModal = () => {
      if (reportModal) {
        reportModal.classList.remove('active');
        reportModal.setAttribute('aria-hidden', 'true');

        setTimeout(() => {
          if (reportForm) reportForm.reset();
          if (otherWrapper) otherWrapper.classList.remove('show');
          if (reportStepForm) reportStepForm.classList.remove('d-none');
          if (reportStepSuccess) reportStepSuccess.classList.add('d-none');
        }, 250);
      }
    };

    if (reportBtn && reportModal) {
      reportBtn.addEventListener('click', () => {
        optionsMenu.classList.remove('active', 'show');
        reportModal.classList.add('active');
        reportModal.setAttribute('aria-hidden', 'false');
      });
    }

    if (btnCancelReport) {
      btnCancelReport.addEventListener('click', closeReportModal);
    }

    if (btnOkSuccess) {
      btnOkSuccess.addEventListener('click', closeReportModal);
    }

    if (chkOther && otherWrapper) {
      chkOther.addEventListener('change', () => {
        if (chkOther.checked) {
          otherWrapper.classList.add('show');
        } else {
          otherWrapper.classList.remove('show');
        }
      });
    }

    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const selected = reportForm.querySelectorAll(
          'input[name="reason"]:checked',
        );
        if (selected.length === 0) {
          alert('Por favor, selecione ao menos um motivo para a denúncia.');
          return;
        }

        if (reportStepForm && reportStepSuccess) {
          reportStepForm.classList.add('d-none');
          reportStepSuccess.classList.remove('d-none');
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!optionsMenu.contains(e.target) && e.target !== optionsBtn) {
        optionsMenu.classList.remove('active', 'show');
      }
      if (reportModal && e.target === reportModal) {
        closeReportModal();
      }
    });
  }

  // 7. MODAL DE CONFIRMAÇÃO DE DIVULGAÇÃO
  function openShareModal() {
    if (postSharesStore[currentPostId]) return;

    if (shareModal) {
      shareModal.classList.add('active');
      shareModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeShareModal() {
    if (shareModal) {
      shareModal.classList.remove('active');
      shareModal.setAttribute('aria-hidden', 'true');
    }
  }

  if (sharePostBtn) {
    sharePostBtn.addEventListener('click', openShareModal);
  }

  if (cancelShareBtn) cancelShareBtn.addEventListener('click', closeShareModal);
  if (closeShareModalBtn)
    closeShareModalBtn.addEventListener('click', closeShareModal);

  if (confirmShareBtn) {
    confirmShareBtn.addEventListener('click', () => {
      postSharesStore[currentPostId] = true;
      updateShareUI();
      closeShareModal();
    });
  }

  if (shareModal) {
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) closeShareModal();
    });
  }

  // 8. Lógica do modal compartilhar
  function openShareMenuModal(e) {
    if (e) e.stopPropagation();

    if (shareMenuModal) {
      if (shareLinkInput) {
        shareLinkInput.value = window.location.href;
      }

      shareMenuModal.classList.add('active');
      shareMenuModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeShareMenuModal() {
    if (shareMenuModal) {
      shareMenuModal.classList.remove('active');
      shareMenuModal.setAttribute('aria-hidden', 'true');
    }
  }

  if (quickShareBtn) {
    quickShareBtn.addEventListener('click', openShareMenuModal);
  }

  if (closeShareMenuBtn) {
    closeShareMenuBtn.addEventListener('click', closeShareMenuModal);
  }

  if (shareMenuModal) {
    shareMenuModal.addEventListener('click', (e) => {
      if (e.target === shareMenuModal) closeShareMenuModal();
    });
  }

  // Copiar link do modal
  if (btnCopyShareInput && shareLinkInput) {
    btnCopyShareInput.addEventListener('click', () => {
      navigator.clipboard.writeText(shareLinkInput.value).then(() => {
        const originalText = btnCopyShareInput.innerText;
        btnCopyShareInput.innerText = 'Copiado!';

        setTimeout(() => {
          btnCopyShareInput.innerText = originalText;
        }, 2000);
      });
    });
  }

  // Compartilhamento Nativo (Web Share API)
  if (btnShareNative) {
    btnShareNative.addEventListener('click', async () => {
      const shareData = {
        title: currentPostId || 'Publicação',
        text: `Confira esta publicação: ${currentPostId}`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.log('Compartilhamento cancelado:', err);
        }
      } else {
        navigator.clipboard.writeText(window.location.href);
        triggerRedirectModal('Clipboard', '');
      }
    });
  }

  // Modal de redirecionamento
  function triggerRedirectModal(networkName, url) {
    navigator.clipboard.writeText(window.location.href);

    pendingUrl = url;

    closeShareMenuModal();

    if (redirectMessage) {
      if (networkName === 'Clipboard') {
        redirectMessage.innerText =
          'Link copiado para a área de transferência!';
      } else {
        redirectMessage.innerText = `Link copiado! Redirecionando para o ${networkName} em instantes...`;
      }
    }

    if (redirectModal) {
      redirectModal.classList.add('active');
      redirectModal.setAttribute('aria-hidden', 'false');
    }

    if (pendingUrl) {
      clearTimeout(redirectTimer);
      redirectTimer = setTimeout(() => {
        executeRedirect();
      }, 2500);
    }
  }

  function executeRedirect() {
    clearTimeout(redirectTimer);
    closeRedirectModal();
    if (pendingUrl) {
      window.open(pendingUrl, '_blank');
    }
  }

  function closeRedirectModal() {
    clearTimeout(redirectTimer);
    if (redirectModal) {
      redirectModal.classList.remove('active');
      redirectModal.setAttribute('aria-hidden', 'true');
    }
  }

  // Disparador dos botões Instagram e TikTok
  if (btnShareInstagram) {
    btnShareInstagram.addEventListener('click', () => {
      triggerRedirectModal('Instagram', 'https://www.instagram.com');
    });
  }

  if (btnShareTikTok) {
    btnShareTikTok.addEventListener('click', () => {
      triggerRedirectModal('TikTok', 'https://www.tiktok.com');
    });
  }

  if (btnConfirmRedirect) {
    btnConfirmRedirect.addEventListener('click', executeRedirect);
  }

  if (btnCancelRedirect) {
    btnCancelRedirect.addEventListener('click', closeRedirectModal);
  }

  if (redirectModal) {
    redirectModal.addEventListener('click', (e) => {
      if (e.target === redirectModal) closeRedirectModal();
    });
  }

  // 9. FECHAR MODAL PRINCIPAL
  function closeModal() {
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (redirectModal && redirectModal.classList.contains('active')) {
        closeRedirectModal();
      } else if (
        shareMenuModal &&
        shareMenuModal.classList.contains('active')
      ) {
        closeShareMenuModal();
      } else if (shareModal && shareModal.classList.contains('active')) {
        closeShareModal();
      } else if (deleteModal && deleteModal.classList.contains('active')) {
        closeDeleteModal();
      } else if (modal && modal.classList.contains('active')) {
        closeModal();
      }
    }
  });

  // 10. BOTÃO REAGIR
  if (reactBtn) {
    reactBtn.addEventListener('click', () => {
      postLikesStore[currentPostId] = !postLikesStore[currentPostId];
      updateLikeUI();
    });
  }
});
