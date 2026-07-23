(() => {
  'use strict';

  const MAX_DRAFTS = 3;
  const DEFAULT_PLACEHOLDER = '<p>Comece a escrever sua história aqui...</p>';
  const DEFAULT_IMG = '../assets/img/capaPadraoHistorias.png';

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
    toastModal: document.getElementById('toastModal'),
    toastMessage: document.getElementById('toastMessage'),
  };

  const escapeHTML = (str) =>
    String(str ?? '').replace(
      /[&<>"']/g,
      (m) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[m],
    );

  const validateImage = (file) => {
    if (!file?.name) return null;
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
        file.type,
      )
    )
      return 'Formato inválido. Apenas PNG, JPEG, WebP ou GIF.';
    return file.size > 5 * 1024 * 1024
      ? 'A imagem excede o limite de 5 MB.'
      : null;
  };

  const convertToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const sanitizeHTML = (html) => {
    if (!html || typeof html !== 'string') return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    if (
      temp.querySelector('p')?.textContent.trim() ===
      'Comece a escrever sua história aqui...'
    )
      return '';
    if (!temp.textContent.trim() && !temp.getElementsByTagName('img').length)
      return '';

    return temp.innerHTML
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  };

  const updateEditorDOM = (title = '', category = 'Conto', content = '') => {
    Object.assign(state, { title, category, content });
    if (DOM.titleInput) DOM.titleInput.value = title;
    if (DOM.categorySelect) DOM.categorySelect.value = category;
    if (DOM.writingArea)
      DOM.writingArea.innerHTML = content || DEFAULT_PLACEHOLDER;
  };

  let toastTimeout = null;
  const showToast = (message, type = 'success') => {
    if (!DOM.toastModal || !DOM.toastMessage) return;
    clearTimeout(toastTimeout);
    DOM.toastMessage.textContent = message;
    DOM.toastModal.style.backgroundColor = `var(--color-${type})`;
    if (!DOM.toastModal.open) DOM.toastModal.showModal();
    toastTimeout = setTimeout(() => DOM.toastModal.close(), 3000);
  };

  const modais = {
    name: {
      modal: document.getElementById('editModalName'),
      open: 'btnEditProfile',
      close: ['btnCloseName', 'btnCancelName'],
      input: 'newUsername',
      err: 'username-error',
      clear: (i, e) => {
        i.value = '';
        e.textContent = '';
      },
    },
    bio: {
      modal: document.getElementById('editModalBio'),
      open: 'btnEditBio',
      close: ['btnCloseBio', 'btnCancelBio'],
      input: 'newBio',
      err: 'bio-error',
      clear: (i, e) => {
        i.value = auth.getUsers()?.[auth.getSession()?.email]?.bio || '';
        e.textContent = '';
      },
    },
    avatar: {
      modal: document.getElementById('editModalAvatar'),
      open: 'btnUploadAvatar',
      close: ['btnCloseAvatar', 'btnCancelAvatar'],
      input: 'avatarInput',
      err: 'avatar-error',
    },
    banner: {
      modal: document.getElementById('editModalBanner'),
      open: 'btnUploadBanner',
      close: ['btnCloseBanner', 'btnCancelBanner'],
      input: 'bannerInput',
      err: 'banner-error',
    },
    stories: {
      modal: document.getElementById('editModalStory'),
      open: 'btnAddStory',
      close: ['btnBackEditor'],
      clear: () => updateEditorDOM(),
    },
  };

  Object.values(modais).forEach(({ modal, open, close, input, err, clear }) => {
    if (!modal) return;
    document.getElementById(open)?.addEventListener('click', () => {
      modal.showModal();
      const inputEl = document.getElementById(input);
      const errEl = document.getElementById(err);
      if (clear) clear(inputEl, errEl);
      else {
        if (inputEl) inputEl.value = '';
        if (errEl) errEl.textContent = '';
      }
      if (inputEl) setTimeout(() => inputEl.focus(), 100);
    });

    close.forEach((id) =>
      document
        .getElementById(id)
        ?.addEventListener('click', () => modal.close()),
    );

    modal.addEventListener('click', (e) => {
      const content = modal.querySelector('.modal-content, .toast-content');
      if (!content || e.target.closest('#draftsContainer, [data-draft-index]'))
        return;
      const r = content.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        modal.close();
    });
  });

  const formsConfig = [
    {
      form: 'editProfileForm',
      input: 'newUsername',
      err: 'username-error',
      key: 'fullname',
      modal: modais.name.modal,
      validate: (v) =>
        !v
          ? 'O nome é obrigatório.'
          : v.length < 3
            ? 'Mínimo de 3 caracteres.'
            : null,
    },
    {
      form: 'editBioForm',
      input: 'newBio',
      err: 'bio-error',
      key: 'bio',
      modal: modais.bio.modal,
    },
    {
      form: 'avatarUploadForm',
      input: 'avatarInput',
      err: 'avatar-error',
      key: 'avatar',
      modal: modais.avatar.modal,
      validate: validateImage,
    },
    {
      form: 'bannerUploadForm',
      input: 'bannerInput',
      err: 'banner-error',
      key: 'banner',
      modal: modais.banner.modal,
      validate: validateImage,
    },
    {
      form: 'imageUploadForm',
      input: 'imageInput',
      err: 'image-error',
      key: 'galleryImages',
      modal: document.getElementById('editModalImage'),
      validate: validateImage,
    },
  ];

  formsConfig.forEach(({ form, input, err, key, modal, validate }) => {
    document.getElementById(form)?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const session = auth.getSession();
      if (!session) return;

      const inputEl = document.getElementById(input);
      const errorEl = document.getElementById(err);
      let val = inputEl.files ? inputEl.files[0] : inputEl.value.trim();

      if (validate) {
        const errorMsg = validate(val);
        if (errorMsg) {
          if (errorEl) errorEl.textContent = errorMsg;
          return inputEl.setAttribute('aria-invalid', 'true');
        }
      }

      try {
        if (inputEl.files) val = await convertToBase64(val);
        const res = await auth.updateProfile(session.email, { [key]: val });
        if (res.success) {
          modal?.close();
          loadUserProfile();
        } else if (errorEl) errorEl.textContent = res.message;
      } catch {
        if (errorEl) errorEl.textContent = 'Erro ao processar as alterações.';
      }
    });
  });

  function initStoryEditor() {
    modais.stories.modal?.addEventListener('toggle', () => {
      if (modais.stories.modal.open)
        renderDrafts(auth.getUsers()?.[auth.getSession()?.email]?.drafts || []);
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
      const tag = DOM.styleSelect.value.toLowerCase();
      const sel = window.getSelection();
      if (sel.rangeCount && DOM.writingArea?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const block = document.createElement(tag);
        block.appendChild(range.extractContents());
        range.insertNode(block);
      }
      DOM.writingArea?.focus();
    });

    const sizeMap = {
      1: '12px',
      2: '14px',
      3: '16px',
      4: '18px',
      5: '24px',
      6: '32px',
    };
    DOM.fontSizeSelect?.addEventListener('change', () => {
      const sel = window.getSelection();
      if (!sel?.rangeCount || !DOM.writingArea?.contains(sel.anchorNode))
        return;
      const span = document.createElement('span');
      span.style.fontSize = sizeMap[DOM.fontSizeSelect.value];
      const range = sel.getRangeAt(0);
      span.appendChild(range.extractContents());
      range.insertNode(span);
    });

    DOM.toolbar?.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      const action = btn.dataset.action.toLowerCase().includes('tack')
        ? 'strikeThrough'
        : btn.dataset.action;
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

        const err = validateImage(file);
        if (err) return showToast(err, 'error');

        try {
          const img = document.createElement('img');
          img.src = await convertToBase64(file);
          img.alt = 'Imagem inserida na história';
          img.style.cssText = 'max-width: 100%; height: auto;';

          const sel = window.getSelection();
          if (sel.rangeCount > 0 && DOM.writingArea.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
          } else DOM.writingArea.appendChild(img);

          DOM.imageFileInput.value = '';
          state.content = DOM.writingArea.innerHTML;
        } catch (e) {
          console.error(e);
        }
      });
    }

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
        if (!DOM.writingArea.innerHTML.trim())
          DOM.writingArea.innerHTML = DEFAULT_PLACEHOLDER;
      });
    }

    DOM.titleInput?.addEventListener(
      'keydown',
      (e) =>
        e.key === 'Enter' && (e.preventDefault(), DOM.writingArea?.focus()),
    );
    DOM.btnSaveDraft?.addEventListener(
      'click',
      (e) => (e.preventDefault(), saveDraft()),
    );
  }

  async function saveDraft() {
    const session = auth.getSession();
    if (!session) return;

    const drafts = [...(auth.getUsers()?.[session.email]?.drafts || [])];
    const payload = {
      title: DOM.titleInput?.value.trim() || 'Rascunho Sem Título',
      type: DOM.categorySelect?.value || 'Conto',
      content: sanitizeHTML(DOM.writingArea?.innerHTML || ''),
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    if (state.activeDraftIndex !== null) {
      drafts[state.activeDraftIndex] = payload;
    } else {
      if (
        drafts.length >= MAX_DRAFTS &&
        !confirm('Limite de rascunhos atingido. Sobrescrever o mais antigo?')
      )
        return;
      if (drafts.length >= MAX_DRAFTS) drafts.pop();
      drafts.unshift(payload);
      state.activeDraftIndex = 0;
    }

    if ((await auth.updateProfile(session.email, { drafts })).success) {
      showToast('Rascunho salvo com sucesso!');
      loadUserProfile();
    }
  }

  DOM.btnPublishStory?.addEventListener('click', async (e) => {
    e.preventDefault();
    const session = auth.getSession();
    if (!session) return;

    const user = auth.getUsers()?.[session.email];
    const stories = [...(user?.stories || [])];
    const drafts = [...(user?.drafts || [])];
    const title = DOM.titleInput?.value.trim() || 'Sem título';

    const payload = {
      title,
      type: DOM.categorySelect?.value || 'Conto',
      content: sanitizeHTML(DOM.writingArea?.innerHTML || ''),
      cover: `${DEFAULT_IMG}`,
    };

    if (state.activeStoryIndex !== null) {
      stories[state.activeStoryIndex] = {
        ...stories[state.activeStoryIndex],
        ...payload,
      };
    } else {
      payload.createdAt = new Date().toLocaleDateString('pt-BR');
      stories.unshift(payload);
    }

    if (state.activeDraftIndex !== null)
      drafts.splice(state.activeDraftIndex, 1);

    const res = await auth.updateProfile(session.email, { stories, drafts });
    if (res.success) {
      modais.stories.modal.close();
      state.activeStoryIndex = state.activeDraftIndex = null;
      loadUserProfile();
    } else showToast(res.message || 'Erro ao salvar história.', 'error');
  });

  DOM.storiesGrid?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-story-index]');
    if (!card || e.target.closest('.btn-edit-story, [data-action]')) return;
    const index = +card.dataset.storyIndex;
    const story = auth.getUsers()?.[auth.getSession()?.email]?.stories?.[index];
    if (!story) return;

    state.activeStoryIndex = index;
    state.activeDraftIndex = null;
    modais.stories.modal.showModal();
    updateEditorDOM(story.title, story.type, story.content);
  });

  DOM.draftsContainer?.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-delete-draft-index]');
    if (delBtn) {
      e.stopPropagation();
      if (!confirm('Tem certeza que deseja excluir este rascunho?')) return;
      const session = auth.getSession();
      const drafts = [...(auth.getUsers()?.[session.email]?.drafts || [])];
      drafts.splice(+delBtn.dataset.deleteDraftIndex, 1);
      if ((await auth.updateProfile(session.email, { drafts })).success) {
        state.activeDraftIndex = null;
        loadUserProfile();
      }
      return;
    }

    const card = e.target.closest('[data-draft-index]');
    if (!card) return;
    const index = +card.dataset.draftIndex;
    const draft = auth.getUsers()?.[auth.getSession()?.email]?.drafts?.[index];
    if (!draft) return;

    state.activeDraftIndex = index;
    state.activeStoryIndex = null;
    modais.stories.modal.showModal();
    updateEditorDOM(draft.title, draft.type, draft.content);
  });

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
    if (avatarEl) avatarEl.src = user?.avatar || DEFAULT_IMG;
    if (bannerEl)
      bannerEl.style.backgroundImage = `url('${user?.banner || DEFAULT_IMG}')`;

    renderStories(user?.stories || []);
    renderDrafts(user?.drafts || []);
  }

  function renderDrafts(drafts) {
    if (!DOM.draftsContainer) return;
    if (!drafts.length) {
      DOM.draftsContainer.innerHTML = `<p class="empty-message-modal">Nenhum rascunho salvo no momento (máximo de ${MAX_DRAFTS}).</p>`;
      return;
    }

    DOM.draftsContainer.innerHTML = drafts
      .map(
        (draft, i) => `
        <div class="cardDraft" data-draft-index="${i}" style="cursor:pointer">
          <div class="draft-header">
            <div>
              <h4 class="draft-title">${escapeHTML(draft.title)}</h4>
              <span class="draft-meta">${escapeHTML(draft.type)} • Editado às ${escapeHTML(draft.updatedAt)}</span>
            </div>
            <button class="btn-delete-draft" data-delete-draft-index="${i}" aria-label="Excluir rascunho ${escapeHTML(draft.title)}">✕</button>
          </div>
        </div>`,
      )
      .join('');
  }

  function renderStories(stories) {
    if (!DOM.storiesGrid) return;
    if (!stories.length) {
      DOM.storiesGrid.innerHTML = `<p class="empty-message" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">Nenhuma história adicionada ainda.</p>`;
      return;
    }

    DOM.storiesGrid.innerHTML = stories
      .map(
        (story, i) => `
        <div class="cardPerfil" data-story-index="${i}" style="background-image: url(${DEFAULT_IMG}">
          <div class="contentCard">
            <div>
              <h3>${escapeHTML(story.title || 'Sem título')}</h3>
              <p>${escapeHTML(story.type || 'Gênero')}</p>
            </div>
          </div>
        </div>`,
      )
      .join('');
  }

  if (!auth.isLoggedIn()) {
    window.location.href = '../pages/login.html';
  } else {
    loadUserProfile();
    initStoryEditor();
  }
})();
