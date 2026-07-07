(() => {
  'use strict';

  const storyEditorState = {
    title: '',
    category: 'Conto',
    content: '',
    draftId: null,
  };

  let editingStoryIndex = null;

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

    const allUsers = typeof auth.getUsers === 'function' ? auth.getUsers() : {};
    const currentUserData = allUsers[session.email];

    const nameEl = document.getElementById('perfilName');
    const bioEl = document.getElementById('perfilBio');
    const avatarImg = document.getElementById('avatarImg');
    const bannerBg = document.getElementById('bannerBg');

    if (nameEl) nameEl.textContent = session.fullname || 'Leitor Voraz';
    if (bioEl)
      bioEl.textContent =
        currentUserData?.bio || 'Leitor Voraz · Ofensiva de 0 Dias';
    if (avatarImg)
      avatarImg.src =
        currentUserData?.avatar || 'https://via.placeholder.com/150';

    if (bannerBg && currentUserData?.banner) {
      bannerBg.style.backgroundImage = `url('${currentUserData.banner}')`;
    }
    renderStories(currentUserData?.stories || []);
  }

  function convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  function renderStories(stories) {
    const grid = document.getElementById('storyContent');
    if (!grid) return;

    if (stories.length === 0) {
      grid.innerHTML =
        '<p class="empty-message" style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">Nenhuma história adicionada ainda.</p>';
      return;
    }

    grid.innerHTML = stories
      .map((story, index) => {
        const coverUrl =
          '../assets/img/capaPadraoHistorias.png' ||
          '../assets/img/capaPadraoHistorias.png';

        return `
        <div class="cardPerfil" data-story-index="${index}" style="background-image: url('${coverUrl}');">
          <div class="contentCard">
            <div>
              <h3>${story.title || 'Sem título'}</h3>
              <p>${story.type || 'Gênero'}</p>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  function initModalControls({
    modal,
    openBtn,
    closeBtns,
    setupInput,
    clearFn,
  }) {
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
      const rect = modal
        .querySelector('.modal-content')
        .getBoundingClientRect();
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
        const allUsers =
          typeof auth.getUsers === 'function' ? auth.getUsers() : {};
        document.getElementById('newBio').value =
          allUsers[auth.getSession()?.email]?.bio || '';
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
        storyEditorState.title = '';
        storyEditorState.category = 'Conto';
        storyEditorState.content = '';
        const titleInput = document.getElementById('storyTitleInput');
        const categorySelect = document.getElementById('storyCategorySelect');
        const writingArea = document.getElementById('writingArea');

        if (titleInput) titleInput.value = '';
        if (categorySelect) categorySelect.value = 'Conto';
        if (writingArea) {
          writingArea.innerHTML =
            '<p>Comece a escrever sua história aqui...</p>';
        }
      },
    },
    editStory: {
      modal: document.getElementById('editModalEditStory'),
      openBtn: null,
      closeBtns: [
        document.getElementById('btnCloseEditStory'),
        document.getElementById('btnCancelEditStory'),
      ],
      setupInput: document.getElementById('editStoryTitle'),
      clearFn: () => {
        editingStoryIndex = null;
        const titleInput = document.getElementById('editStoryTitle');
        const categorySelect = document.getElementById('editStoryCategory');
        const coverInput = document.getElementById('editStoryCover');

        if (titleInput) titleInput.value = '';
        if (categorySelect) categorySelect.value = 'Conto';
        if (coverInput) coverInput.value = '';
      },
    },
  };

  Object.values(modais).forEach(initModalControls);

  document
    .getElementById('editProfileForm')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('newUsername');
      const errorEl = document.getElementById('username-error');
      const trimmed = input.value.trim();

      if (!trimmed || trimmed.length < 3) {
        errorEl.textContent = !trimmed
          ? 'O nome é obrigatório.'
          : 'O nome deve ter no mínimo 3 caracteres.';
        input.setAttribute('aria-invalid', 'true');
        return;
      }

      const session = auth.getSession();
      if (!session) return;

      try {
        const result = await auth.updateProfile(session.email, {
          fullname: trimmed,
        });
        if (result.success) {
          modais.name.modal.close();
          loadUserProfile();
        } else {
          document.getElementById('profileError').textContent = result.message;
        }
      } catch (err) {
        console.error(err);
      }
    });

  document
    .getElementById('editBioForm')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const session = auth.getSession();
      if (!session) return;

      try {
        const result = await auth.updateProfile(session.email, {
          bio: document.getElementById('newBio').value.trim(),
        });
        if (result.success) {
          modais.bio.modal.close();
          loadUserProfile();
        } else {
          document.getElementById('bioError').textContent = result.message;
        }
      } catch (err) {
        console.error(err);
      }
    });

  const storyContent = document.getElementById('storyContent');
  if (storyContent) {
    storyContent.addEventListener('click', (event) => {
      if (
        event.target.closest('.btn-edit-story') ||
        event.target.closest('[data-action]')
      )
        return;

      const card = event.target.closest('[data-story-index]');
      if (!card) return;

      const index = parseInt(card.getAttribute('data-story-index'), 10);
      const session = auth.getSession();
      if (!session) return;

      const allUsers =
        typeof auth.getUsers === 'function' ? auth.getUsers() : {};
      const currentUserData = allUsers[session.email];
      const stories = currentUserData?.stories || [];
      const storyToEdit = stories[index];
      if (!storyToEdit) return;

      editingStoryIndex = index;

      modais.stories.modal.showModal();

      setTimeout(() => {
        const titleInput = document.getElementById('storyTitleInput');
        const categorySelect = document.getElementById('storyCategorySelect');
        const writingArea = document.getElementById('writingArea');

        if (titleInput) titleInput.value = storyToEdit.title;
        if (categorySelect) categorySelect.value = storyToEdit.type;
        if (writingArea && storyToEdit.content) {
          writingArea.innerHTML = storyToEdit.content;
        } else if (writingArea) {
          writingArea.innerHTML = '';
        }

        storyEditorState.title = titleInput?.value || '';
        storyEditorState.category = categorySelect?.value || 'Conto';
        storyEditorState.content = writingArea?.innerHTML || '';
      }, 100);
    });
  }

  async function handleImageUpload(e, inputId, errorId, profileKey, modalObj) {
    e.preventDefault();
    const session = auth.getSession();
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);

    if (!session || !input.files[0]) return;

    try {
      const base64Image = await convertToBase64(input.files[0]);
      const result = await auth.updateProfile(session.email, {
        [profileKey]: base64Image,
      });
      if (result.success) {
        modalObj.close();
        loadUserProfile();
      } else {
        errorEl.textContent = result.message;
      }
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Erro ao processar imagem.';
    }
  }

  document
    .getElementById('avatarUploadForm')
    ?.addEventListener('submit', (e) =>
      handleImageUpload(
        e,
        'avatarInput',
        'avatarError',
        'avatar',
        modais.avatar.modal,
      ),
    );

  document
    .getElementById('bannerUploadForm')
    ?.addEventListener('submit', (e) =>
      handleImageUpload(
        e,
        'bannerInput',
        'bannerError',
        'banner',
        modais.banner.modal,
      ),
    );

  function initStoryEditor() {
    const writingArea = document.getElementById('writingArea');
    const storyTitleInput = document.getElementById('storyTitleInput');
    const storyCategorySelect = document.getElementById('storyCategorySelect');
    const paragraphStyleSelect = document.getElementById('paragraphStyle');
    const fontSizeSelect = document.getElementById('fontSizeSelect');

    if (storyTitleInput) {
      storyTitleInput.addEventListener('input', () => {
        storyEditorState.title = storyTitleInput.value.trim();
      });
    }

    if (storyCategorySelect) {
      storyCategorySelect.addEventListener('change', () => {
        storyEditorState.category = storyCategorySelect.value;
      });
    }

    if (paragraphStyleSelect) {
      paragraphStyleSelect.addEventListener('change', () => {
        const selection = window.getSelection();
        if (
          !selection.rangeCount ||
          !writingArea.contains(selection.anchorNode)
        )
          return;

        const currentElement = selection.anchorParent?.parentElement;
        if (currentElement && writingArea.contains(currentElement)) {
          const tagName = paragraphStyleSelect.value.toUpperCase();
          const newElement = document.createElement(tagName);
          while (currentElement.firstChild) {
            newElement.appendChild(currentElement.firstChild);
          }
          currentElement.parentNode.replaceChild(newElement, currentElement);
        }
      });
    }

    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', () => {
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
          !writingArea.contains(selection.anchorNode)
        )
          return;

        const currentElement = selection.anchorParent?.parentElement;
        if (currentElement && writingArea.contains(currentElement)) {
          currentElement.style.fontSize = sizeMap[fontSizeSelect.value];
        }
      });
    }

    const toolbar = document.querySelector('.editor-toolbar');
    if (toolbar) {
      toolbar.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        document.execCommand(action, false, null);
        writingArea.focus();
      });
    }

    const btnInsertImage = document.getElementById('btnInsertImage');
    const imageFileInput = document.getElementById('imageFileInput');
    if (btnInsertImage && imageFileInput) {
      btnInsertImage.addEventListener('click', () => {
        imageFileInput.click();
      });

      imageFileInput.addEventListener('change', () => {
        const file = imageFileInput.files[0];
        if (!file) return;

        convertToBase64(file)
          .then((base64Image) => {
            const img = document.createElement('img');
            img.src = base64Image;
            img.alt = 'Imagem inserida na história';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              range.setStartAfter(img);
              range.setEndAfter(img);
              selection.removeAllRanges();
              selection.addRange(range);
            }

            imageFileInput.value = '';
          })
          .catch(() => {
            console.error('Erro ao processar imagem');
          });
      });
    }

    const btnInsertLink = document.getElementById('btnInsertLink');
    if (btnInsertLink) {
      btnInsertLink.addEventListener('click', () => {
        const url = prompt('Insira a URL do link:');
        if (!url) return;
        document.execCommand('createLink', false, url);
        writingArea.focus();
      });
    }

    if (writingArea) {
      writingArea.addEventListener('input', () => {
        storyEditorState.content = writingArea.innerHTML;
      });
    }

    if (writingArea) {
      writingArea.addEventListener('focus', () => {
        const placeholder = writingArea.querySelector('p');
        if (
          placeholder &&
          placeholder.textContent === 'Comece a escrever sua história aqui...'
        ) {
          writingArea.innerHTML = '';
        }
      });

      if (storyTitleInput) {
        storyTitleInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            writingArea.focus();
          }
        });
      }
    }
  }

  const btnContinueEditor = document.getElementById('btnContinueEditor');
  if (btnContinueEditor) {
    btnContinueEditor.addEventListener('click', async () => {
      const session = auth.getSession();
      const writingArea = document.getElementById('writingArea');
      const storyTitleInput = document.getElementById('storyTitleInput');

      const title = storyTitleInput?.value.trim() || '';
      let content = writingArea?.innerHTML || '';

      if (!session) return;

      let cleanContent = content;
      if (content === '<p>Comece a escrever sua história aqui...</p>') {
        cleanContent = '';
      }

      try {
        const allUsers =
          typeof auth.getUsers === 'function' ? auth.getUsers() : {};
        const currentStories = [...(allUsers[session.email]?.stories || [])];

        if (editingStoryIndex !== null) {
          const existingStory = currentStories[editingStoryIndex];
          currentStories[editingStoryIndex] = {
            ...existingStory,
            title: title || 'Sem título',
            type: storyEditorState.category,
            content: cleanContent,
            cover:
              'https://via.placeholder.com/150x220?text=' +
              encodeURIComponent(title || 'Sem Título'),
          };

          const result = await auth.updateProfile(session.email, {
            stories: currentStories,
          });
          if (result.success) {
            modais.stories.modal.close();
            editingStoryIndex = null;
            loadUserProfile();
          }
        } else {
          const newStory = {
            title: title || 'Sem título',
            type: storyEditorState.category,
            content: cleanContent,
            cover:
              'https://via.placeholder.com/150x220?text=' +
              encodeURIComponent(title || 'Sem Título'),
            createdAt: new Date().toLocaleDateString('pt-BR'),
          };

          const result = await auth.updateProfile(session.email, {
            stories: [newStory, ...currentStories],
          });
          if (result.success) {
            modais.stories.modal.close();
            loadUserProfile();
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  initStoryEditor();

  const tabsList = document.querySelector('.tabs-list');
  if (tabsList) {
    const tabButtons = Array.from(tabsList.querySelectorAll('[data-tab]'));
    const panels = document.querySelectorAll('.tab-panel');

    function switchTab(clickedBtn) {
      tabButtons.forEach((btn) => {
        const isActive = btn === clickedBtn;
        btn.classList.toggle('tab-btn--active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });

      const targetId = clickedBtn.getAttribute('data-tab');
      panels.forEach((panel) => {
        panel.classList.toggle(
          'tab-panel--active',
          panel.id === `painel-${targetId}`,
        );
      });
    }

    tabsList.addEventListener('keydown', (e) => {
      const currentIndex = tabButtons.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (e.key === 'ArrowLeft') newIndex = Math.max(0, currentIndex - 1);
      else if (e.key === 'ArrowRight')
        newIndex = Math.min(tabButtons.length - 1, currentIndex + 1);
      else if (e.key === 'Home') newIndex = 0;
      else if (e.key === 'End') newIndex = tabButtons.length - 1;
      else return;

      e.preventDefault();
      tabButtons[newIndex].focus();
      switchTab(tabButtons[newIndex]);
    });

    tabButtons.forEach((btn) =>
      btn.addEventListener('click', () => switchTab(btn)),
    );
  }

  if (checkAuth()) {
    loadUserProfile();
  }
})();
