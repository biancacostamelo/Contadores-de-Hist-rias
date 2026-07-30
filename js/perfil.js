(() => {
  'use strict';

  const MAX_DRAFTS = 3;
  const DEFAULT_PLACEHOLDER = '<p>Comece a escrever sua história aqui...</p>';
  const DEFAULT_IMG = '../assets/img/capaPadraoHistorias.png';

  const DB_NAME = 'writersCommunityImages';
  const STORE_NAME = 'images';

  const imageStore = {
    db: null,

    async open() {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        request.onerror = () => reject(request.error);
      });
    },

    async save(file) {
      await this.open();
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const base64 =
        typeof file === 'string' ? file : await convertToBase64(file);
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ id, data: base64 });
        req.onsuccess = () => resolve(id);
        req.onerror = () => reject(req.error);
      });
    },

    async load(id) {
      if (!id) return null;
      await this.open();
      return new Promise((resolve) => {
        const store = this.db.transaction(STORE_NAME).objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => resolve(null);
      });
    },

    async remove(id) {
      if (!id) return;
      await this.open();
      return new Promise((resolve) => {
        const store = this.db
          .transaction(STORE_NAME, 'readwrite')
          .objectStore(STORE_NAME);
        store.delete(id);
        resolve();
      });
    },
  };

  const state = {
    title: '',
    category: 'Conto',
    content: '',
    activeDraftIndex: null,
    activeStoryIndex: null,
  };

  const getEl = (id) => document.getElementById(id);

  const DOM = {
    writingArea: getEl('writingArea'),
    titleInput: getEl('storyTitleInput'),
    categorySelect: getEl('storyCategorySelect'),
    styleSelect: getEl('paragraphStyle'),
    fontSizeSelect: getEl('fontSizeSelect'),
    toolbar: document.querySelector('.editor-toolbar'),
    btnInsertImage: getEl('btnInsertImage'),
    imageFileInput: getEl('imageFileInput'),
    storiesGrid: getEl('storyContent'),
    draftsContainer: getEl('draftsContainer'),
    btnPublishStory: getEl('btnContinueEditor'),
    btnSaveDraft: getEl('btnSaveDraft'),
    toastModal: getEl('toastModal'),
    toastMessage: getEl('toastMessage'),
    confirmModal: getEl('editModalConfirmDraft'),
    btnCloseConfirm: getEl('btnCloseConfirmDraft'),
    btnCancelConfirm: getEl('btnCancelConfirmDraft'),
    btnOverrideConfirm: getEl('btnOverrideConfirmDraft'),

    confirmDeleteStoryModal: getEl('editModalConfirmDeleteStory'),
    btnCloseConfirmDeleteStory: getEl('btnCloseConfirmDeleteStory'),
    btnCancelConfirmDeleteStory: getEl('btnCancelConfirmDeleteStory'),
    btnOverrideConfirmDeleteStory: getEl('btnOverrideConfirmDeleteStory'),
  };

  const getCurrentUser = () => auth.getUsers()?.[auth.getSession()?.email];

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
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type))
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
    const text = temp.textContent.trim();
    if (
      text === 'Comece a escrever sua história aqui...' ||
      (!text && !temp.getElementsByTagName('img').length)
    ) {
      return '';
    }
    return temp.innerHTML
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  };

  const extractAndStoreImages = async (html) => {
    if (!html || typeof html !== 'string') return { content: '', images: {} };
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const imgElements = Array.from(temp.querySelectorAll('img'));
    const storedRefs = {};

    for (const img of imgElements) {
      const src = img.src || '';
      if (src.startsWith('data:')) {
        try {
          const id = await imageStore.save(src);
          storedRefs[src] = { type: 'img', id };
          img.removeAttribute('src');
          img.dataset.imageId = id;
        } catch {
          img.remove();
        }
      }
    }

    const cleanedHTML = temp.innerHTML
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    return { content: cleanedHTML, images: storedRefs };
  };

  const updateEditorDOM = async (
    title = '',
    category = 'Conto',
    content = '',
  ) => {
    Object.assign(state, { title, category, content });
    if (DOM.titleInput) DOM.titleInput.value = title;
    if (DOM.categorySelect) DOM.categorySelect.value = category;
    if (DOM.writingArea) {
      DOM.writingArea.innerHTML = content || DEFAULT_PLACEHOLDER;
      await restoreImagesInElement(DOM.writingArea);
    }
  };

  const showConfirmDialog = ({ title, message, confirmText } = {}) =>
    new Promise((resolve) => {
      if (!DOM.confirmModal) return resolve(false);

      const titleEl = DOM.confirmModal.querySelector('h3, h2, .modal-title');
      const msgEl = DOM.confirmModal.querySelector('p, .modal-message');

      const originalTitle = titleEl?.textContent || '';
      const originalMsg = msgEl?.textContent || '';
      const originalConfirmText = DOM.btnOverrideConfirm?.textContent || '';

      if (title && titleEl) titleEl.textContent = title;
      if (message && msgEl) msgEl.textContent = message;
      if (confirmText && DOM.btnOverrideConfirm)
        DOM.btnOverrideConfirm.textContent = confirmText;

      const handleClose = (result) => {
        DOM.confirmModal.close();
        if (titleEl) titleEl.textContent = originalTitle;
        if (msgEl) msgEl.textContent = originalMsg;
        if (DOM.btnOverrideConfirm)
          DOM.btnOverrideConfirm.textContent = originalConfirmText;
        resolve(result);
      };

      DOM.btnCloseConfirm?.addEventListener('click', () => handleClose(false), {
        once: true,
      });
      DOM.btnCancelConfirm?.addEventListener(
        'click',
        () => handleClose(false),
        { once: true },
      );
      DOM.btnOverrideConfirm?.addEventListener(
        'click',
        () => handleClose(true),
        { once: true },
      );

      DOM.confirmModal.showModal();
    });

  let toastTimeout = null;
  const showToast = (message, type = 'success') => {
    if (!DOM.toastModal || !DOM.toastMessage) return;
    clearTimeout(toastTimeout);
    DOM.toastMessage.textContent = message;
    DOM.toastModal.style.backgroundColor = `var(--color-${type})`;
    if (!DOM.toastModal.open) DOM.toastModal.showModal();
    toastTimeout = setTimeout(() => DOM.toastModal.close(), 3000);
  };

  const formsConfig = [
    {
      form: 'editProfileForm',
      input: 'newUsername',
      err: 'username-error',
      key: 'fullname',
      modal: getEl('editModalName'),
      openBtn: 'btnEditProfile',
      closeBtns: ['btnCloseName', 'btnCancelName'],
      validate: (v) =>
        !v
          ? 'O nome é obrigatório.'
          : v.length < 3
            ? 'Mínimo de 3 caracteres.'
            : null,
      clear: (i, e) => {
        i.value = '';
        e.textContent = '';
      },
    },
    {
      form: 'editBioForm',
      input: 'newBio',
      err: 'bio-error',
      key: 'bio',
      modal: getEl('editModalBio'),
      openBtn: 'btnEditBio',
      closeBtns: ['btnCloseBio', 'btnCancelBio'],
      clear: (i, e) => {
        i.value = getCurrentUser()?.bio || '';
        e.textContent = '';
      },
    },
    {
      form: 'avatarUploadForm',
      input: 'avatarInput',
      err: 'avatar-error',
      key: 'avatar',
      modal: getEl('editModalAvatar'),
      openBtn: 'btnUploadAvatar',
      closeBtns: ['btnCloseAvatar', 'btnCancelAvatar'],
      validate: validateImage,
    },
    {
      form: 'bannerUploadForm',
      input: 'bannerInput',
      err: 'banner-error',
      key: 'banner',
      modal: getEl('editModalBanner'),
      openBtn: 'btnUploadBanner',
      closeBtns: ['btnCloseBanner', 'btnCancelBanner'],
      validate: validateImage,
    },
  ];

  const communityFormConfig = {
    form: 'createCommunityForm',
    input: 'communityName',
    imageInput: 'communityImageInput',
    err: 'community-error',
    modal: getEl('editModalCreateCommunity'),
    openBtn: 'btnCreateCommunity',
    closeBtns: ['btnCloseCreateCommunity', 'btnCancelCreateCommunity'],
    validate: (v) =>
      !v
        ? 'O nome da comunidade é obrigatório.'
        : v.length < 3
          ? 'Mínimo de 3 caracteres.'
          : null,
  };

  formsConfig.forEach(
    ({ form, input, err, key, modal, openBtn, closeBtns, validate, clear }) => {
      if (!modal) return;

      getEl(openBtn)?.addEventListener('click', () => {
        modal.showModal();
        const inputEl = getEl(input);
        const errEl = getEl(err);
        if (clear) clear(inputEl, errEl);
        else {
          if (inputEl) inputEl.value = '';
          if (errEl) errEl.textContent = '';
        }
        if (inputEl) setTimeout(() => inputEl.focus(), 100);
      });

      closeBtns?.forEach((id) =>
        getEl(id)?.addEventListener('click', () => modal.close()),
      );

      modal.addEventListener('click', (e) => {
        const content = modal.querySelector('.modal-content, .toast-content');
        if (
          !content ||
          e.target.closest('#draftsContainer, [data-draft-index]')
        )
          return;
        const r = content.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        ) {
          modal.close();
        }
      });

      getEl(form)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const session = auth.getSession();
        if (!session) return;

        const inputEl = getEl(input);
        const errorEl = getEl(err);
        let val = inputEl.files ? inputEl.files[0] : inputEl.value.trim();

        if (validate) {
          const errorMsg = validate(val);
          if (errorMsg) {
            if (errorEl) errorEl.textContent = errorMsg;
            return inputEl.setAttribute('aria-invalid', 'true');
          }
        }

        try {
          if ((key === 'avatar' || key === 'banner') && inputEl.files) {
            const id = await imageStore.save(val);
            val = { type: 'img', id };
          }
          const res = await auth.updateProfile(session.email, { [key]: val });
          if (res.success) {
            modal.close();
            loadUserProfile();
          } else if (errorEl) errorEl.textContent = res.message;
        } catch {
          if (errorEl) errorEl.textContent = 'Erro ao processar as alterações.';
        }
      });
    },
  );

  const communityModal = getEl('editModalCreateCommunity');
  if (communityModal) {
    getEl('btnCreateCommunity')?.addEventListener('click', () => {
      communityModal.showModal();
      const inputEl = getEl('communityName');
      const errEl = getEl('community-error');
      if (inputEl) inputEl.value = '';
      if (errEl) errEl.textContent = '';
      if (inputEl) setTimeout(() => inputEl.focus(), 100);
    });

    ['btnCloseCreateCommunity', 'btnCancelCreateCommunity'].forEach((id) =>
      getEl(id)?.addEventListener('click', () => communityModal.close()),
    );

    communityModal.addEventListener('click', (e) => {
      const content = communityModal.querySelector('.modal-content');
      if (
        !content ||
        e.target.closest('#draftsContainer, [data-draft-index]')
      )
        return;
      const r = content.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      ) {
        communityModal.close();
      }
    });

    getEl('createCommunityForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const session = auth.getSession();
      if (!session) return;

      const inputEl = getEl('communityName');
      const errEl = getEl('community-error');
      let val = inputEl.value.trim();

      const errorMsg = communityFormConfig.validate(val);
      if (errorMsg) {
        if (errEl) errEl.textContent = errorMsg;
        return inputEl.setAttribute('aria-invalid', 'true');
      }

      try {
        let imageRef = null;
        const imageInputEl = getEl('communityImageInput');
        if (imageInputEl?.files?.[0]) {
          const imgFile = imageInputEl.files[0];
          const imgErr = validateImage(imgFile);
          if (!imgErr) {
            const imgId = await imageStore.save(imgFile);
            imageRef = { type: 'img', id: imgId };
          }
        }

        const communityData = {
          name: val,
          createdAt: new Date().toLocaleDateString('pt-BR'),
          ...(imageRef && { image: imageRef }),
        };

        // Add to global communities list (used by comunidade.html)
        const globalCommunities = JSON.parse(localStorage.getItem('writersCommunity_communities') || '[]');
        const newGlobalCommunity = {
          id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...communityData,
          memberCount: 1,
        };
        globalCommunities.unshift(newGlobalCommunity);
        localStorage.setItem('writersCommunity_communities', JSON.stringify(globalCommunities));

        // Add to user's personal communities list (used by perfil.html)
        const currentUser = getCurrentUser();
        const userCommunities = [...(currentUser?.communities || [])];
        const newPersonalCommunity = {
          id: newGlobalCommunity.id,
          ...communityData,
        };
        userCommunities.unshift(newPersonalCommunity);

        const res = await auth.updateProfile(session.email, {
          communities: userCommunities,
        });
        if (res.success) {
          communityModal.close();
          loadUserProfile();
        } else if (errEl) errEl.textContent = res.message;
      } catch {
        if (errEl)
          errEl.textContent = 'Erro ao criar a comunidade.';
      }
    });
  }

  function initStoryEditor() {
    const storyModal = getEl('editModalStory');
    getEl('btnAddStory')?.addEventListener('click', () =>
      storyModal?.showModal(),
    );
    getEl('btnBackEditor')?.addEventListener('click', () =>
      storyModal?.close(),
    );

    storyModal?.addEventListener('toggle', () => {
      if (storyModal.open) renderDrafts(getCurrentUser()?.drafts || []);
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

    DOM.toolbar?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const sel = window.getSelection();

      if (!sel || !sel.rangeCount || !DOM.writingArea?.contains(sel.anchorNode))
        return;

      if (action.toLowerCase().includes('tack') || action === 'strikeThrough') {
        const range = sel.getRangeAt(0);
        if (!range.collapsed) {
          const strikeNode = document.createElement('s');
          strikeNode.appendChild(range.extractContents());
          range.insertNode(strikeNode);
        }
      } else {
        document.execCommand(action, false, null);
      }

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
          const base64 = await convertToBase64(file);
          const imgId = await imageStore.save(base64);

          const img = document.createElement('img');
          img.src = base64; // Exibe o Base64 na hora para aparecer imediatamente
          img.alt = 'Imagem inserida na história';
          img.style.cssText = 'max-width: 100%; height: auto;';
          img.dataset.imageId = imgId;

          const sel = window.getSelection();
          if (sel.rangeCount > 0 && DOM.writingArea.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
          } else {
            DOM.writingArea.appendChild(img);
          }

          DOM.imageFileInput.value = '';
          state.content = DOM.writingArea.innerHTML;
        } catch (e) {
          console.error('Erro ao inserir imagem:', e);
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

    const drafts = [...(getCurrentUser()?.drafts || [])];
    const extracted = await extractAndStoreImages(
      DOM.writingArea?.innerHTML || '',
    );
    const payload = {
      title: DOM.titleInput?.value.trim() || 'Rascunho Sem Título',
      type: DOM.categorySelect?.value || 'Conto',
      content: sanitizeHTML(extracted.content),
      updatedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    if (state.activeDraftIndex !== null) {
      drafts[state.activeDraftIndex] = payload;
    } else {
      if (drafts.length >= MAX_DRAFTS) {
        const override = await showConfirmDialog();
        if (!override) return;
        drafts.pop();
      }
      drafts.unshift(payload);
      state.activeDraftIndex = null;
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

    const user = getCurrentUser();
    const stories = [...(user?.stories || [])];
    const drafts = [...(user?.drafts || [])];

    const extracted = await extractAndStoreImages(
      DOM.writingArea?.innerHTML || '',
    );
    const payload = {
      title: DOM.titleInput?.value.trim() || 'Sem título',
      type: DOM.categorySelect?.value || 'Conto',
      content: sanitizeHTML(extracted.content),
      cover: DEFAULT_IMG,
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
      getEl('editModalStory')?.close();
      state.activeStoryIndex = state.activeDraftIndex = null;
      loadUserProfile();
    } else showToast(res.message || 'Erro ao salvar história.', 'error');
  });

  DOM.storiesGrid?.addEventListener('click', async (e) => {
    const isReadOnlyMode = document.querySelector('.edit-profile-section')?.style.display === 'none';
    if (isReadOnlyMode) return;

    const delBtn = e.target.closest('[data-delete-story-index]');
    if (delBtn) {
      e.stopPropagation();

      const confirmed = await showConfirmDialog({
        title: 'Excluir História',
        message:
          'Tem certeza que deseja excluir esta história permanentemente?',
        confirmText: 'Excluir',
      });

      if (!confirmed) return;

      const session = auth.getSession();
      const stories = [...(getCurrentUser()?.stories || [])];
      stories.splice(+delBtn.dataset.deleteStoryIndex, 1);
      if ((await auth.updateProfile(session.email, { stories })).success) {
        state.activeStoryIndex = null;
        showToast('História excluída com sucesso!');
        loadUserProfile();
      }
      return;
    }

    const card = e.target.closest('[data-story-index]');
    if (!card || e.target.closest('.btn-edit-story, [data-action]')) return;
    const index = +card.dataset.storyIndex;
    const story = getCurrentUser()?.stories?.[index];
    if (!story) return;

    state.activeStoryIndex = index;
    state.activeDraftIndex = null;
    getEl('editModalStory')?.showModal();
    await updateEditorDOM(story.title, story.type, story.content);
  });

  DOM.draftsContainer?.addEventListener('click', async (e) => {
    const isReadOnlyMode = document.querySelector('.edit-profile-section')?.style.display === 'none';
    if (isReadOnlyMode) return;

    const delBtn = e.target.closest('[data-delete-draft-index]');
    if (delBtn) {
      e.stopPropagation();

      const confirmed = await showConfirmDialog({
        title: 'Excluir Rascunho',
        message:
          'Tem certeza que deseja excluir este rascunho permanentemente?',
        confirmText: 'Excluir',
      });

      if (!confirmed) return;

      const session = auth.getSession();
      const drafts = [...(getCurrentUser()?.drafts || [])];
      drafts.splice(+delBtn.dataset.deleteDraftIndex, 1);
      if ((await auth.updateProfile(session.email, { drafts })).success) {
        state.activeDraftIndex = null;
        showToast('Rascunho excluído com sucesso!');
        loadUserProfile();
      }
      return;
    }

    const card = e.target.closest('[data-draft-index]');
    if (!card) return;
    const index = +card.dataset.draftIndex;
    const draft = getCurrentUser()?.drafts?.[index];
    if (!draft) return;

    state.activeDraftIndex = index;
    state.activeStoryIndex = null;
    getEl('editModalStory')?.showModal();
    await updateEditorDOM(draft.title, draft.type, draft.content);
  });

  const communitiesList = getEl('communitiesList');
  if (communitiesList) {
    communitiesList.addEventListener('click', async (e) => {
      const isReadOnlyMode = document.querySelector('.edit-profile-section')?.style.display === 'none';
      if (isReadOnlyMode) return;

      const delBtn = e.target.closest('[data-delete-community-index]');
      if (delBtn) {
        e.stopPropagation();

        const confirmed = await showConfirmDialog({
          title: 'Excluir Comunidade',
          message:
            'Tem certeza que deseja excluir esta comunidade permanentemente? Todos os membros serão removidos.',
          confirmText: 'Excluir',
        });

        if (!confirmed) return;

        const session = auth.getSession();
        const communities = [...(getCurrentUser()?.communities || [])];
        communities.splice(+delBtn.dataset.deleteCommunityIndex, 1);
        if ((await auth.updateProfile(session.email, { communities })).success) {
          showToast('Comunidade excluída com sucesso!');
          loadUserProfile();
        }
        return;
      }
    });
  }

  const migrateStoredImages = async (user) => {
    if (!user || !auth.isLoggedIn()) return;
    const session = auth.getSession();
    let changed = false;

    const processContent = async (content) => {
      if (!content || typeof content !== 'string') return content;
      const temp = document.createElement('div');
      temp.innerHTML = content;
      const imgElements = Array.from(temp.querySelectorAll('img'));
      for (const img of imgElements) {
        const src = img.src || '';
        if (!src || !src.startsWith('data:')) continue;
        try {
          const id = await imageStore.save(src);
          img.removeAttribute('src');
          img.dataset.imageId = id;
          changed = true;
        } catch {}
      }
      return temp.innerHTML
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    };

    const stories = user?.stories || [];
    for (let i = 0; i < stories.length; i++) {
      const newContent = await processContent(stories[i].content);
      if (newContent !== stories[i].content) {
        stories[i] = { ...stories[i], content: newContent };
      }
    }

    const drafts = user?.drafts || [];
    for (let i = 0; i < drafts.length; i++) {
      const newContent = await processContent(drafts[i].content);
      if (newContent !== drafts[i].content) {
        drafts[i] = { ...drafts[i], content: newContent };
      }
    }

    if (changed) {
      await auth.updateProfile(session.email, { stories, drafts });
    }
  };

  async function loadUserProfile(viewEmailHash = null) {
    const session = auth.getSession();
    const isOwnProfile = !viewEmailHash && session;

    if (!isOwnProfile && viewEmailHash) {
      await imageStore.open();
      const users = auth.getUsers();
      const user = users?.[viewEmailHash];
      if (!user) return;

      const nameEl = getEl('perfilName');
      const bioEl = getEl('perfilBio');
      const avatarEl = getEl('avatarImg');
      const bannerEl = getEl('bannerBg');

      if (nameEl) nameEl.textContent = user.fullname || 'Membro';
      if (bioEl) bioEl.textContent = user.bio || 'Escritor apaixonado';
      if (avatarEl) {
        const avatarRef = user.avatar;
        if (avatarRef && typeof avatarRef === 'object' && avatarRef.type === 'img') {
          const src = await imageStore.load(avatarRef.id);
          avatarEl.src = src || DEFAULT_IMG;
        } else {
          avatarEl.src = avatarRef || DEFAULT_IMG;
        }
      }
      if (bannerEl) {
        const bannerRef = user.banner;
        if (bannerRef && typeof bannerRef === 'object' && bannerRef.type === 'img') {
          const src = await imageStore.load(bannerRef.id);
          bannerEl.style.backgroundImage = `url('${src || DEFAULT_IMG}')`;
        } else {
          bannerEl.style.backgroundImage = `url('${bannerRef || DEFAULT_IMG}')`;
        }
      }

      renderStories(user.stories || [], true);
      renderDrafts(user.drafts || [], true);
      renderCommunities(user.communities || [], true);

      await restoreImagesInElement(DOM.storiesGrid);
      await restoreImagesInElement(DOM.draftsContainer);
      await restoreImagesInElement(getEl('communitiesList'));
      return;
    }

    if (!session) return;
    await imageStore.open();
    await migrateStoredImages(getCurrentUser());
    const user = getCurrentUser();

    const nameEl = getEl('perfilName');
    const bioEl = getEl('perfilBio');
    const avatarEl = getEl('avatarImg');
    const bannerEl = getEl('bannerBg');

    if (nameEl) nameEl.textContent = session.fullname || 'Leitor Voraz';
    if (bioEl)
      bioEl.textContent = user?.bio || 'Leitor Voraz · Ofensiva de 0 Dias';
    if (avatarEl) {
      const avatarRef = user?.avatar;
      if (
        avatarRef &&
        typeof avatarRef === 'object' &&
        avatarRef.type === 'img'
      ) {
        const src = await imageStore.load(avatarRef.id);
        avatarEl.src = src || DEFAULT_IMG;
      } else {
        avatarEl.src = avatarRef || DEFAULT_IMG;
      }
    }
    if (bannerEl) {
      const bannerRef = user?.banner;
      if (
        bannerRef &&
        typeof bannerRef === 'object' &&
        bannerRef.type === 'img'
      ) {
        const src = await imageStore.load(bannerRef.id);
        bannerEl.style.backgroundImage = `url('${src || DEFAULT_IMG}')`;
      } else {
        bannerEl.style.backgroundImage = `url('${bannerRef || DEFAULT_IMG}')`;
      }
    }

    renderStories(user?.stories || [], false);
    renderDrafts(user?.drafts || [], false);
    renderCommunities(user?.communities || [], false);

    await restoreImagesInElement(DOM.storiesGrid);
    await restoreImagesInElement(DOM.draftsContainer);
    await restoreImagesInElement(getEl('communitiesList'));
  }

  function renderDrafts(drafts, isReadOnly = false) {
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
            </div>${isReadOnly ? '' : `<button class="btn-delete-draft" data-delete-draft-index="${i}" aria-label="Excluir rascunho ${escapeHTML(draft.title)}">✕</button>`}
          </div>
        </div>`,
      )
      .join('');
  }

  function renderStories(stories, isReadOnly = false) {
    if (!DOM.storiesGrid) return;
    if (!stories.length) {
      DOM.storiesGrid.innerHTML = `<p class="empty-message" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">Nenhuma história adicionada ainda.</p>`;
      return;
    }

    DOM.storiesGrid.innerHTML = stories
      .map(
        (story, i) => `
        <div class="cardPerfil" data-story-index="${i}" style="background-image: url('${DEFAULT_IMG}');">
          <div class="contentCard">
            <div>
              <h3>${escapeHTML(story.title || 'Sem título')}</h3>
              <p>${escapeHTML(story.type || 'Gênero')}</p>
            </div>${isReadOnly ? '' : `<button class="btn-delete-story" data-delete-story-index="${i}" aria-label="Excluir ${escapeHTML(story.title || 'história')}">✕</button>`}
          </div>
        </div>`,
      )
      .join('');
  }

  function renderCommunities(communities, isReadOnly = false) {
    const communitiesList = getEl('communitiesList');
    if (!communitiesList) return;
    if (!communities.length) {
      communitiesList.innerHTML = `<p class="empty-message" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">Nenhuma comunidade criada ainda.</p>`;
      return;
    }

    communitiesList.innerHTML = communities
      .map(
        (community, i) => `
        <div class="cardPerfil" data-community-index="${i}" style="background-image: url('${DEFAULT_IMG}');">
          <div class="contentCard">
            <div>
              <h3>${escapeHTML(community.name || 'Sem nome')}</h3>
              <p>${escapeHTML(community.createdAt || 'Data não informada')}</p>
            </div>${isReadOnly ? '' : `<button class="btn-delete-story" data-delete-community-index="${i}" aria-label="Excluir ${escapeHTML(community.name || 'comunidade')}">✕</button>`}
          </div>
        </div>`,
      )
      .join('');
  }

  async function restoreImagesInElement(element) {
    if (!element) return;
    const imgElements = element.querySelectorAll('img[data-image-id]');
    for (const img of imgElements) {
      const src = await imageStore.load(img.dataset.imageId);
      if (src) img.src = src;
    }
  }

  const emailParam = new URLSearchParams(window.location.search).get('view');
  const isLoggedIn = auth.isLoggedIn();

  if (!isLoggedIn) {
    if (emailParam) {
      loadUserProfile(emailParam);
      document.querySelectorAll('.edit-profile-section, .btn-update').forEach((el) => el.style.display = 'none');
      document.querySelectorAll('dialog.edit-modal').forEach((modal) => modal.style.display = 'none');
      document.getElementById('storyEditorArea')?.setAttribute('contenteditable', 'false');
      const uploadBtns = document.getElementById('btnUploadBanner');
      const avatarBtn = document.getElementById('btnUploadAvatar');
      if (uploadBtns) uploadBtns.style.display = 'none';
      if (avatarBtn) avatarBtn.style.display = 'none';
    } else {
      window.location.href = '../pages/login.html';
    }
  } else if (emailParam) {
    loadUserProfile(emailParam);
    document.querySelectorAll('.edit-profile-section, .btn-update').forEach((el) => el.style.display = 'none');
    document.querySelectorAll('dialog.edit-modal').forEach((modal) => modal.style.display = 'none');
    const uploadBtns = document.getElementById('btnUploadBanner');
    const avatarBtn = document.getElementById('btnUploadAvatar');
    if (uploadBtns) uploadBtns.style.display = 'none';
    if (avatarBtn) avatarBtn.style.display = 'none';
  } else {
    loadUserProfile();
    initStoryEditor();
  }
})();
