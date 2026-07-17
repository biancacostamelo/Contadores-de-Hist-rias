(() => {
  'use strict';

  const MAX_DRAFTS_LIMIT = 3;
  const DEFAULT_PLACEHOLDER = '<p>Comece a escrever sua história aqui...</p>';
  const IMAGE_MAX_SIZE = 5 * 1024 * 1024;

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

    storiesGrid: document.getElementById('storyContent'),
    draftsContainer: document.getElementById('draftsContainer'),

    btnPublishStory: document.getElementById('btnContinueEditor'),
    btnSaveDraft: document.getElementById('btnSaveDraft'),
  };

  function validateImageFile(file) {
    if (!file || !file.name) return null;

    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.type)) {
      return 'Formato inválido. Apenas imagens PNG, JPEG, WebP ou GIF são aceitas.';
    }

    const maxSize = IMAGE_MAX_SIZE;
    if (file.size > maxSize) {
      return 'A imagem excede o limite de 5 MB.';
    }

    return null;
  }

  function convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  }

  function sanitizeHTML(html) {
    if (!html || typeof html !== 'string') return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Empty placeholder → return empty string
    if (
      tempDiv.querySelector('p')?.textContent.trim() ===
      'Comece a escrever sua história aqui...'
    ) {
      return '';
    }

    const hasText = tempDiv.textContent.trim().length > 0;
    const hasImages = tempDiv.getElementsByTagName('img').length > 0;
    if (!hasText && !hasImages) return '';

    // Strip scripts and inline event handlers
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

      // Move caret after the inserted node
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
        const input = document.getElementById('newUsername');
        if (input) input.value = '';
        const err = document.getElementById('username-error');
        if (err) err.textContent = '';
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
        const input = document.getElementById('newBio');
        if (input) input.value = user?.bio || '';
        const err = document.getElementById('bio-error');
        if (err) err.textContent = '';
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
        const input = document.getElementById('avatarInput');
        if (input) input.value = '';
        const err = document.getElementById('avatar-error');
        if (err) err.textContent = '';
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
        const input = document.getElementById('bannerInput');
        if (input) input.value = '';
        const err = document.getElementById('banner-error');
        if (err) err.textContent = '';
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

    // Close when clicking outside the content area
    modal.addEventListener('click', (event) => {
      const content = modal.querySelector('.modal-content');
      if (!content) return;

      // Prevent closing when interacting with drafts container
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

      // Run validation
      if (validationFn) {
        const errorMsg = validationFn(value);
        if (errorMsg) {
          errorEl.textContent = errorMsg;
          input.setAttribute('aria-invalid', 'true');
          return;
        }
      }

      try {
        if (input.files) value = await convertToBase64(value);

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

  const imageValidationFn = (file) => validateImageFile(file);

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
    errorId: 'bio-error',
    profileKey: 'bio',
    modal: modais.bio.modal,
  });

  // Image upload forms share the same validation helper
  setupProfileForm({
    formId: 'avatarUploadForm',
    inputId: 'avatarInput',
    errorId: 'avatar-error',
    profileKey: 'avatar',
    modal: modais.avatar.modal,
    validationFn: imageValidationFn,
  });
  setupProfileForm({
    formId: 'bannerUploadForm',
    inputId: 'bannerInput',
    errorId: 'banner-error',
    profileKey: 'banner',
    modal: modais.banner.modal,
    validationFn: imageValidationFn,
  });
  setupProfileForm({
    formId: 'imageUploadForm',
    inputId: 'imageInput',
    errorId: 'image-error',
    profileKey: 'galleryImages',
    modal: document.getElementById('editModalImage'),
    validationFn: imageValidationFn,
  });

  function initStoryEditor() {
    modais.stories.modal?.addEventListener('toggle', () => {
      if (modais.stories.modal.opened) {
        const session = auth.getSession();
        const user = auth.getUsers()?.[session.email];
        renderDrafts(user?.drafts || []);
      }
    });

    // Bind state to inputs
    DOM.titleInput?.addEventListener(
      'input',
      () => (state.title = DOM.titleInput.value.trim()),
    );
    DOM.categorySelect?.addEventListener(
      'change',
      () => (state.category = DOM.categorySelect.value),
    );

    // Toolbar: paragraph style
    DOM.styleSelect?.addEventListener('change', () => {
      document.execCommand(
        'formatBlock',
        false,
        DOM.styleSelect.value.toUpperCase(),
      );
      DOM.writingArea?.focus();
    });

    // Toolbar: font size
    const sizeMap = {
      1: '12px',
      2: '14px',
      3: '16px',
      4: '18px',
      5: '24px',
      6: '32px',
    };
    DOM.fontSizeSelect?.addEventListener('change', () => {
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

    // Toolbar: format buttons (bold, italic, etc.)
    DOM.toolbar?.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();

      let action = btn.dataset.action;
      if (action.toLowerCase() === 'strikethrough' || action === 'tachado')
        action = 'strikeThrough';

      document.execCommand(action, false, null);
      DOM.writingArea?.focus();
    });

    // Insert image from toolbar
    if (DOM.btnInsertImage && DOM.imageFileInput) {
      DOM.btnInsertImage.addEventListener('click', () =>
        DOM.imageFileInput.click(),
      );

      DOM.imageFileInput.addEventListener('change', async () => {
        const file = DOM.imageFileInput.files[0];
        if (!file || !DOM.writingArea) return;

        const validationError = validateImageFile(file);
        if (validationError) {
          showToast(validationError, 'error');
          DOM.imageFileInput.value = '';
          return;
        }

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

    // Writing area: auto-save content to state + placeholder logic
    if (DOM.writingArea) {
      DOM.writingArea.addEventListener(
        'input',
        () => (state.content = DOM.writingArea.innerHTML),
      );

      DOM.writingArea.addEventListener('focus', () => {
        const firstP = DOM.writingArea.querySelector('p');
        if (
          firstP?.textContent.trim() ===
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

    // Title → Enter focuses writing area
    DOM.titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        DOM.writingArea?.focus();
      }
    });

    // Save draft button
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
      if (
        currentDrafts.length >= MAX_DRAFTS_LIMIT &&
        !confirm(
          'Você atingiu o limite de 3 rascunhos. Deseja sobrescrever o mais antigo?',
        )
      )
        return;
      if (currentDrafts.length >= MAX_DRAFTS_LIMIT) currentDrafts.pop();
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
    updateEditorDOM(draft.title, draft.type, draft.content);
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

  // Publish / edit story button
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

    if (state.activeDraftIndex !== null)
      currentDrafts.splice(state.activeDraftIndex, 1);

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

  // Click handlers for story cards and draft cards (delegated)
  DOM.storiesGrid?.addEventListener('click', handleStoryClick);
  DOM.draftsContainer?.addEventListener('click', handleDraftClick);

  function handleStoryClick(event) {
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
    updateEditorDOM(story.title, story.type, story.content);
  }

  function handleDraftClick(event) {
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
    updateEditorDOM(draft.title, draft.type, draft.content);
  }

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

    const nameEl = document.getElementById('perfilName');
    const bioEl = document.getElementById('perfilBio');
    const avatarEl = document.getElementById('avatarImg');
    const bannerEl = document.getElementById('bannerBg');

    if (nameEl) nameEl.textContent = session.fullname || 'Leitor Voraz';
    if (bioEl)
      bioEl.textContent = user?.bio || 'Leitor Voraz · Ofensiva de 0 Dias';
    if (avatarEl)
      avatarEl.src = user?.avatar || 'https://via.placeholder.com/150';
    if (bannerEl && user?.banner)
      bannerEl.style.backgroundImage = `url('${user.banner}')`;

    renderStories(user?.stories || []);
    renderDrafts(user?.drafts || []);
  }

  function renderDrafts(drafts) {
    if (!DOM.draftsContainer) return;

    if (drafts.length === 0) {
      DOM.draftsContainer.innerHTML =
        '<p class="empty-message-modal">Nenhum rascunho salvo no momento (máximo de ' +
        MAX_DRAFTS_LIMIT +
        ').</p>';
      return;
    }

    DOM.draftsContainer.innerHTML = drafts
      .map(
        (draft, index) =>
          `<div class="cardDraft" data-draft-index="${index}" style="cursor:pointer">
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
      DOM.storiesGrid.innerHTML =
        '<p class="empty-message" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">Nenhuma história adicionada ainda.</p>';
      return;
    }

    const coverUrl = '../assets/img/capaPadraoHistorias.png';
    DOM.storiesGrid.innerHTML = stories
      .map(
        (story, index) =>
          `<div class="cardPerfil" data-story-index="${index}" style="background-image: url('${coverUrl}');">
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

  const toastModal = document.getElementById('toastModal');
  const toastMessage = document.getElementById('toastMessage');
  let toastTimeout = null;

  if (toastModal && toastMessage) {
    document
      .getElementById('btnToastClose')
      ?.addEventListener('click', () => toastModal.close());

    // Close on backdrop click
    toastModal.addEventListener('click', (event) => {
      const content = toastModal.querySelector('.toast-content');
      if (!content) return;

      const rect = content.getBoundingClientRect();
      const clickedOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (clickedOutside) toastModal.close();
    });
  }

  function showToast(message, type = 'success') {
    if (!toastModal || !toastMessage) return;

    clearTimeout(toastTimeout);
    toastMessage.textContent = message;
    toastModal.style.backgroundColor =
      type === 'error' ? 'var(--color-error)' : 'var(--color-success)';

    if (!toastModal.open) toastModal.showModal();

    toastTimeout = setTimeout(() => toastModal.close(), 3000);
  }

  if (checkAuth()) {
    loadUserProfile();
    initStoryEditor();
  }
})();
