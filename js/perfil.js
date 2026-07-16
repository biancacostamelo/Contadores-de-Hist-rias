(() => {
  'use strict';

  const MAX_DRAFTS_LIMIT = 3;
  const DEFAULT_PLACEHOLDER = '<p>Comece a escrever sua história aqui...</p>';

  const state = {
    title: '',
    category: 'Conto',
    content: '',
    activeDraftIndex: null,
    activeStoryIndex: null,
  };

  const DOM = {
    writingArea: document.getElementById('writingArea'),
    titleInput: document.getElementById('storyTitleInput'),
    categorySelect: document.getElementById('storyCategorySelect'),
    styleSelect: document.getElementById('paragraphStyle'),
    fontSizeSelect: document.getElementById('fontSizeSelect'),
    toolbar: document.querySelector('.editor-toolbar'),

    btnInsertImage: document.getElementById('btnInsertImage'),
    imageFileInput: document.getElementById('imageFileInput'),
    btnInsertLink: document.getElementById('btnInsertLink'),

    storiesGrid: document.getElementById('storyContent'),
    draftsContainer: document.getElementById('draftsContainer'),

    btnPublishStory: document.getElementById('btnContinueEditor'),
    btnSaveDraft: document.getElementById('btnSaveDraft'),
  };

  const convertToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  function sanitizeHTML(html) {
    if (!html || typeof html !== 'string') return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const firstP = tempDiv.querySelector('p');
    if (
      firstP &&
      firstP.textContent.trim() === 'Comece a escrever sua história aqui...'
    ) {
      return '';
    }

    const hasText = tempDiv.textContent.trim().length > 0;
    const hasImages = tempDiv.getElementsByTagName('img').length > 0;
    if (!hasText && !hasImages) return '';

    return tempDiv.innerHTML
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*"(?:\\"|[^"])*"/gi, '')
      .replace(/\bon\w+\s*=\s*'(?:\\'|[^'])*'/gi, '')
      .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '');
  }

  function insertNodeAtCaret(node) {
    const selection = window.getSelection();
    if (
      selection.rangeCount > 0 &&
      DOM.writingArea?.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      const newRange = document.createRange();
      newRange.setStartAfter(node);
      newRange.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      DOM.writingArea?.appendChild(node);
    }
  }

  function updateEditorDOM(title = '', category = 'Conto', content = '') {
    state.title = title;
    state.category = category;
    state.content = content;

    if (DOM.titleInput) DOM.titleInput.value = title;
    if (DOM.categorySelect) DOM.categorySelect.value = category;
    if (DOM.writingArea) {
      DOM.writingArea.innerHTML = content || DEFAULT_PLACEHOLDER;
    }
  }

  const modais = {
    name: {
      modal: document.getElementById('editModalName'),
      openBtn: document.getElementById('btnEditProfile'),
      closeBtns: [
        document.getElementById('btnCloseName'),
        document.getElementById('btnCancelName'),
      ],
      setupInput: document.getElementById('newUsername'),
      clearFn: () => {
        document.getElementById('newUsername').value = '';
        document.getElementById('username-error').textContent = '';
        document.getElementById('profileError').textContent = '';
      },
    },
    bio: {
      modal: document.getElementById('editModalBio'),
      openBtn: document.getElementById('btnEditBio'),
      closeBtns: [
        document.getElementById('btnCloseBio'),
        document.getElementById('btnCancelBio'),
      ],
      setupInput: document.getElementById('newBio'),
      clearFn: () => {
        const user = auth.getUsers()?.[auth.getSession()?.email];
        document.getElementById('newBio').value = user?.bio || '';
        document.getElementById('bio-error').textContent = '';
        document.getElementById('bioError').textContent = '';
      },
    },
    avatar: {
      modal: document.getElementById('editModalAvatar'),
      openBtn: document.getElementById('btnUploadAvatar'),
      closeBtns: [
        document.getElementById('btnCloseAvatar'),
        document.getElementById('btnCancelAvatar'),
      ],
      clearFn: () => {
        document.getElementById('avatarInput').value = '';
        document.getElementById('avatarError').textContent = '';
      },
    },
    banner: {
      modal: document.getElementById('editModalBanner'),
      openBtn: document.getElementById('btnUploadBanner'),
      closeBtns: [
        document.getElementById('btnCloseBanner'),
        document.getElementById('btnCancelBanner'),
      ],
      clearFn: () => {
        document.getElementById('bannerInput').value = '';
        document.getElementById('bannerError').textContent = '';
      },
    },
    stories: {
      modal: document.getElementById('editModalStory'),
      openBtn: document.getElementById('btnAddStory'),
      closeBtns: [document.getElementById('btnBackEditor')],
      clearFn: () => {
        state.activeDraftIndex = null;
        state.activeStoryIndex = null;
        updateEditorDOM();
      },
    },
  };

  function initModalEvents({ modal, openBtn, closeBtns, setupInput, clearFn }) {
    if (!modal) return;

    openBtn?.addEventListener('click', () => {
      modal.showModal();
      clearFn?.();
      if (setupInput) setTimeout(() => setupInput.focus(), 100);
    });

    closeBtns.forEach((btn) =>
      btn?.addEventListener('click', () => modal.close()),
    );

    modal.addEventListener('click', (event) => {
      const content = modal.querySelector('.modal-content');
      if (!content) return;
      // Don't close when clicking on drafts container or its children
      if (
        event.target.closest('#draftsContainer') ||
        event.target.closest('[data-draft-index]')
      ) {
        return;
      }
      const rect = content.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        modal.close();
      }
    });
  }

  Object.values(modais).forEach(initModalEvents);

  function setupProfileForm({
    formId,
    inputId,
    errorId,
    profileKey,
    modal,
    validationFn,
  }) {
    document.getElementById(formId)?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const session = auth.getSession();
      if (!session) return;

      const input = document.getElementById(inputId);
      const errorEl = document.getElementById(errorId);
      let value = input.files ? input.files[0] : input.value.trim();

      if (validationFn) {
        const errorMsg = validationFn(value);
        if (errorMsg) {
          errorEl.textContent = errorMsg;
          input.setAttribute('aria-invalid', 'true');
          return;
        }
      }

      try {
        if (input.files) {
          value = await convertToBase64(value);
        }
        const result = await auth.updateProfile(session.email, {
          [profileKey]: value,
        });
        if (result.success) {
          modal.close();
          loadUserProfile();
        } else {
          errorEl.textContent = result.message;
        }
      } catch (err) {
        console.error(err);
        errorEl.textContent = 'Erro ao processar as alterações.';
      }
    });
  }

  setupProfileForm({
    formId: 'editProfileForm',
    inputId: 'newUsername',
    errorId: 'username-error',
    profileKey: 'fullname',
    modal: modais.name.modal,
    validationFn: (val) =>
      !val
        ? 'O nome é obrigatório.'
        : val.length < 3
          ? 'O nome deve ter no mínimo 3 caracteres.'
          : null,
  });

  setupProfileForm({
    formId: 'editBioForm',
    inputId: 'newBio',
    errorId: 'bioError',
    profileKey: 'bio',
    modal: modais.bio.modal,
  });
  setupProfileForm({
    formId: 'avatarUploadForm',
    inputId: 'avatarInput',
    errorId: 'avatarError',
    profileKey: 'avatar',
    modal: modais.avatar.modal,
  });
  setupProfileForm({
    formId: 'bannerUploadForm',
    inputId: 'bannerInput',
    errorId: 'bannerError',
    profileKey: 'banner',
    modal: modais.banner.modal,
  });

  function initStoryEditor() {
    // Open story editor modal and render drafts
    modais.stories.modal?.addEventListener('toggle', () => {
      if (modais.stories.modal.opened) {
        const session = auth.getSession();
        const user = auth.getUsers()?.[session.email];
        renderDrafts(user?.drafts || []);
      }
    });

    DOM.titleInput?.addEventListener(
      'input',
      () => (state.title = DOM.titleInput.value.trim()),
    );
    DOM.categorySelect?.addEventListener(
      'change',
      () => (state.category = DOM.categorySelect.value),
    );

    DOM.styleSelect?.addEventListener('change', () => {
      document.execCommand(
        'formatBlock',
        false,
        DOM.styleSelect.value.toUpperCase(),
      );
      DOM.writingArea?.focus();
    });

    DOM.fontSizeSelect?.addEventListener('change', () => {
      const sizeMap = {
        1: '12px',
        2: '14px',
        3: '16px',
        4: '18px',
        5: '24px',
        6: '32px',
      };
      const selection = window.getSelection();
      if (
        !selection.rangeCount ||
        !DOM.writingArea?.contains(selection.anchorNode)
      )
        return;

      const parentEl = selection.anchorNode.parentElement;
      if (parentEl && DOM.writingArea.contains(parentEl)) {
        parentEl.style.fontSize = sizeMap[DOM.fontSizeSelect.value];
      }
    });

    DOM.toolbar?.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();

      let action = btn.dataset.action;
      if (action.toLowerCase() === 'strikethrough' || action === 'tachado') {
        action = 'strikeThrough';
      }

      document.execCommand(action, false, null);
      DOM.writingArea?.focus();
    });

    if (DOM.btnInsertImage && DOM.imageFileInput) {
      DOM.btnInsertImage.addEventListener('click', () =>
        DOM.imageFileInput.click(),
      );
      DOM.imageFileInput.addEventListener('change', async () => {
        const file = DOM.imageFileInput.files[0];
        if (!file || !DOM.writingArea) return;
        try {
          const base64Image = await convertToBase64(file);
          const img = document.createElement('img');
          img.src = base64Image;
          img.alt = 'Imagem inserida na história';
          img.style.cssText = 'max-width: 100%; height: auto;';
          insertNodeAtCaret(img);
          DOM.imageFileInput.value = '';
          state.content = DOM.writingArea.innerHTML;
        } catch (err) {
          console.error('Erro ao inserir imagem:', err);
        }
      });
    }

    DOM.btnInsertLink?.addEventListener('click', () => {
      const url = prompt('Insira a URL do link:');
      if (!url || !DOM.writingArea) return;

      const selection = window.getSelection();
      const hasSelection =
        selection.rangeCount > 0 &&
        DOM.writingArea.contains(selection.anchorNode) &&
        selection.toString().trim().length > 0;

      if (hasSelection && document.queryCommandSupported('createLink')) {
        document.execCommand('createLink', false, url);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = url;
        insertNodeAtCaret(a);
      }
      DOM.writingArea.focus();
    });

    if (DOM.writingArea) {
      DOM.writingArea.addEventListener(
        'input',
        () => (state.content = DOM.writingArea.innerHTML),
      );
      DOM.writingArea.addEventListener('focus', () => {
        if (
          DOM.writingArea.querySelector('p')?.textContent.trim() ===
          'Comece a escrever sua história aqui...'
        ) {
          DOM.writingArea.innerHTML = '';
        }
      });
      DOM.writingArea.addEventListener('blur', () => {
        if (!DOM.writingArea.innerHTML.trim()) {
          DOM.writingArea.innerHTML = DEFAULT_PLACEHOLDER;
        }
      });
    }

    DOM.titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        DOM.writingArea?.focus();
      }
    });

    DOM.btnSaveDraft?.addEventListener('click', (e) => {
      e.preventDefault();
      saveDraft();
    });
  }

  async function saveDraft() {
    const session = auth.getSession();
    if (!session) return;

    const allUsers = auth.getUsers() || {};
    const currentDrafts = [...(allUsers[session.email]?.drafts || [])];

    const title = DOM.titleInput?.value.trim() || 'Rascunho Sem Título';
    const draftPayload = {
      title,
      type: DOM.categorySelect?.value || 'Conto',
      content: sanitizeHTML(DOM.writingArea?.innerHTML || ''),
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    if (state.activeDraftIndex !== null) {
      currentDrafts[state.activeDraftIndex] = draftPayload;
    } else {
      if (currentDrafts.length >= MAX_DRAFTS_LIMIT) {
        if (
          !confirm(
            'Você atingiu o limite de 3 rascunhos. Deseja sobrescrever o mais antigo?',
          )
        )
          return;
        currentDrafts.pop();
      }
      currentDrafts.unshift(draftPayload);
      state.activeDraftIndex = 0;
    }

    const result = await auth.updateProfile(session.email, {
      drafts: currentDrafts,
    });
    if (result.success) {
      showToast('Rascunho salvo com sucesso!');
      loadUserProfile();
    }
  }

  window.loadDraftToEditor = function (index) {
    const session = auth.getSession();
    const draft = auth.getUsers()?.[session?.email]?.drafts?.[index];
    if (!draft) return;

    state.activeDraftIndex = index;
    state.activeStoryIndex = null;

    modais.stories.modal.showModal();
    setTimeout(
      () => updateEditorDOM(draft.title, draft.type, draft.content),
      100,
    );
  };

  window.deleteDraft = async function (index, event) {
    event.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este rascunho?')) return;

    const session = auth.getSession();
    const currentDrafts = [...(auth.getUsers()?.[session.email]?.drafts || [])];
    currentDrafts.splice(index, 1);

    const result = await auth.updateProfile(session.email, {
      drafts: currentDrafts,
    });
    if (result.success) {
      state.activeDraftIndex = null;
      loadUserProfile();
    }
  };

  DOM.btnPublishStory?.addEventListener('click', async (e) => {
    e.preventDefault();
    const session = auth.getSession();
    if (!session) return;

    const title = DOM.titleInput?.value.trim() || 'Sem título';
    const cleanedContent = sanitizeHTML(DOM.writingArea?.innerHTML || '');
    const user = auth.getUsers()?.[session.email];

    const currentStories = [...(user?.stories || [])];
    const currentDrafts = [...(user?.drafts || [])];

    const storyPayload = {
      title,
      type: DOM.categorySelect?.value || 'Conto',
      content: cleanedContent,
      cover: `https://via.placeholder.com/150x220?text=${encodeURIComponent(title)}`,
    };

    if (state.activeStoryIndex !== null) {
      currentStories[state.activeStoryIndex] = {
        ...currentStories[state.activeStoryIndex],
        ...storyPayload,
      };
    } else {
      storyPayload.createdAt = new Date().toLocaleDateString('pt-BR');
      currentStories.unshift(storyPayload);
    }

    if (state.activeDraftIndex !== null) {
      currentDrafts.splice(state.activeDraftIndex, 1);
    }

    const result = await auth.updateProfile(session.email, {
      stories: currentStories,
      drafts: currentDrafts,
    });

    if (result.success) {
      modais.stories.modal.close();
      state.activeStoryIndex = null;
      state.activeDraftIndex = null;
      loadUserProfile();
    } else {
      showToast(result.message || 'Erro ao salvar história.', 'error');
    }
  });

  DOM.storiesGrid?.addEventListener('click', (event) => {
    if (
      event.target.closest('.btn-edit-story') ||
      event.target.closest('[data-action]')
    )
      return;

    const card = event.target.closest('[data-story-index]');
    if (!card) return;

    const index = parseInt(card.getAttribute('data-story-index'), 10);
    const session = auth.getSession();
    const story = auth.getUsers()?.[session?.email]?.stories?.[index];
    if (!story) return;

    state.activeStoryIndex = index;
    state.activeDraftIndex = null;

    modais.stories.modal.showModal();
    setTimeout(
      () => updateEditorDOM(story.title, story.type, story.content),
      100,
    );
  });

  DOM.draftsContainer?.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('[data-delete-draft-index]');
    if (deleteBtn) {
      const index = parseInt(
        deleteBtn.getAttribute('data-delete-draft-index'),
        10,
      );
      window.deleteDraft(index, event);
      return;
    }

    const card = event.target.closest('[data-draft-index]');
    if (!card) return;

    const index = parseInt(card.getAttribute('data-draft-index'), 10);
    const session = auth.getSession();
    const draft = auth.getUsers()?.[session?.email]?.drafts?.[index];
    if (!draft) return;

    state.activeDraftIndex = index;
    state.activeStoryIndex = null;

    modais.stories.modal.showModal();
    setTimeout(
      () => updateEditorDOM(draft.title, draft.type, draft.content),
      100,
    );
  });

  function checkAuth() {
    if (!auth.isLoggedIn()) {
      window.location.href = '../pages/login.html';
      return false;
    }
    return true;
  }

  function loadUserProfile() {
    const session = auth.getSession();
    if (!session) return;

    const user = auth.getUsers()?.[session.email];

    const elements = {
      name: document.getElementById('perfilName'),
      bio: document.getElementById('perfilBio'),
      avatar: document.getElementById('avatarImg'),
      banner: document.getElementById('bannerBg'),
    };

    if (elements.name)
      elements.name.textContent = session.fullname || 'Leitor Voraz';
    if (elements.bio)
      elements.bio.textContent =
        user?.bio || 'Leitor Voraz · Ofensiva de 0 Dias';
    if (elements.avatar)
      elements.avatar.src = user?.avatar || 'https://via.placeholder.com/150';
    if (elements.banner && user?.banner) {
      elements.banner.style.backgroundImage = `url('${user.banner}')`;
    }

    renderStories(user?.stories || []);
    renderDrafts(user?.drafts || []);
  }

  function renderDrafts(drafts) {
    if (!DOM.draftsContainer) return;

    if (drafts.length === 0) {
      DOM.draftsContainer.innerHTML = `
        <p class="empty-message-modal">
          Nenhum rascunho salvo no momento (máximo de ${MAX_DRAFTS_LIMIT}).
        </p>`;
      return;
    }

    DOM.draftsContainer.innerHTML = drafts
      .map(
        (draft, index) => `
      <div class="cardDraft" data-draft-index="${index}" style="cursor:pointer">
        <div class="draft-header">
          <div>
            <h4 class="draft-title">${draft.title}</h4>
            <span class="draft-meta">${draft.type} • Editado às ${draft.updatedAt}</span>
          </div>
          <button class="btn-delete-draft" data-delete-draft-index="${index}" aria-label="Excluir rascunho ${draft.title}">✕</button>
        </div>
      </div>`,
      )
      .join('');
  }

  function renderStories(stories) {
    if (!DOM.storiesGrid) return;

    if (stories.length === 0) {
      DOM.storiesGrid.innerHTML = `
        <p class="empty-message" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">
          Nenhuma história adicionada ainda.
        </p>`;
      return;
    }

    const coverUrl = '../assets/img/capaPadraoHistorias.png';
    DOM.storiesGrid.innerHTML = stories
      .map(
        (story, index) => `
        <div class="cardPerfil" data-story-index="${index}" style="background-image: url('${coverUrl}');">
          <div class="contentCard">
            <div>
              <h3>${story.title || 'Sem título'}</h3>
              <p>${story.type || 'Gênero'}</p>
            </div>
          </div>
        </div>`,
      )
      .join('');
  }

  // Armazena o timer para evitar fechamento precoce em cliques rápidos
  let toastTimeout = null;

  // Elementos cacheados (buscados apenas uma vez no carregamento)
  const toastModal = document.getElementById('toastModal');
  const toastMessage = document.getElementById('toastMessage');
  const btnToastClose = document.getElementById('btnToastClose');

  // Inicializa os eventos apenas UMA vez
  if (toastModal && toastMessage) {
    const closeToast = () => toastModal.close();

    btnToastClose?.addEventListener('click', closeToast);

    // Fecha ao clicar fora (no backdrop)
    toastModal.addEventListener('click', (event) => {
      const content = toastModal.querySelector('.toast-content');
      if (!content) return;

      const rect = content.getBoundingClientRect();
      const clickedOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;

      if (clickedOutside) closeToast();
    });
  }

  /**
   * Exibe a notificação toast.
   * @param {string} message - Mensagem do toast.
   * @param {'success' | 'error'} type - Tipo do toast.
   */
  function showToast(message, type = 'success') {
    if (!toastModal || !toastMessage) return;

    clearTimeout(toastTimeout);

    toastMessage.textContent = message;

    toastModal.style.backgroundColor =
      type === 'error' ? 'var(--color-error)' : 'var(--color-success)';

    if (!toastModal.open) {
      toastModal.showModal();
    }

    toastTimeout = setTimeout(() => {
      toastModal.close();
    }, 3000);
  }
  if (checkAuth()) {
    loadUserProfile();
    initStoryEditor();
  }
})();
