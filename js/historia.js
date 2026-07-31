(() => {
  'use strict';

  const CONFIG = Object.freeze({
    STORAGE_KEY: 'historia_feedbacks',
    DB_NAME: 'writersCommunityImages',
    STORE_NAME: 'images',
    MAX_STORIES: 50,
  });

  const select = (selector, scope = document) =>
    scope?.querySelector(selector) ?? null;
  const selectAll = (selector, scope = document) =>
    Array.from(scope?.querySelectorAll(selector) ?? []);

  const DOM = {
    formContainer: select('#form-container'),
    loginMessage: select('#login-required-message'),
    feedbackList: select('.feedback-list'),
    recebidosTitulo: select('.recebidos-titulo'),
    btnToggleSidebar: select('#btn-toggle-sidebar'),
    historiaSidebar: select('.historia-sidebar'),
    layout: select('.historia-layout'),
    tituloHistoria: select('#titulo-historia'),
    categoriaLabel: select('#historiaCategoria'),
    corpoContainer: select('#historiaCorpoContainer'),

    toggle: (element, className, force) =>
      element?.classList.toggle(className, force),

    createElement(tag, attributes = {}, children = []) {
      const element = document.createElement(tag);
      Object.entries(attributes).forEach(([key, value]) => {
        if (key in element) element[key] = value;
        else element.setAttribute(key, value);
      });
      children.forEach((child) =>
        element.append(typeof child === 'string' ? child : child),
      );
      return element;
    },
  };

  const AuthService = {
    isLoggedIn: () => Boolean(window.auth?.isLoggedIn()),
    getUserName: () => window.auth?.getSession()?.fullname || 'Anônimo',
  };

  const ImageStore = {
    db: null,
    async getDB() {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, 1);
        request.onsuccess = () => resolve((this.db = request.result));
        request.onerror = () => reject(request.error);
      });
    },

    async loadImage(id) {
      if (!id) return null;
      try {
        const db = await this.getDB();
        return new Promise((resolve) => {
          const request = db
            .transaction(CONFIG.STORE_NAME, 'readonly')
            .objectStore(CONFIG.STORE_NAME)
            .get(id);
          request.onsuccess = () => resolve(request.result?.data || null);
          request.onerror = () => resolve(null);
        });
      } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        return null;
      }
    },
  };

  const StoryManager = {
    stories: [],
    currentStoryIndex: 0,

    async load() {
      const users = window.auth?.getUsers?.() || {};
      this.stories = Object.values(users)
        .flatMap((user) => user.stories || [])
        .slice(0, CONFIG.MAX_STORIES);

      const urlIndex = Number.parseInt(
        new URLSearchParams(window.location.search).get('story'),
        10,
      );
      const isValidIndex =
        Number.isInteger(urlIndex) &&
        urlIndex >= 0 &&
        urlIndex < this.stories.length;

      if (!this.stories.length) return this.renderEmpty();
      await this.select(isValidIndex ? urlIndex : 0);
    },

    renderEmpty() {
      if (DOM.corpoContainer)
        DOM.corpoContainer.innerHTML =
          '<p class="empty-message">Nenhuma história encontrada.</p>';
      if (DOM.tituloHistoria) DOM.tituloHistoria.hidden = true;
      if (DOM.categoriaLabel) DOM.categoriaLabel.textContent = '—';
    },

    async select(index) {
      this.currentStoryIndex = index;
      const story = this.stories[index];
      if (!story) return;

      if (DOM.categoriaLabel)
        DOM.categoriaLabel.textContent = (story.type || 'Conto').toUpperCase();
      if (DOM.tituloHistoria) {
        DOM.tituloHistoria.hidden = false;
        DOM.tituloHistoria.textContent = story.title || 'Sem título';
      }

      await this.renderContent(story.content);
    },

    async renderContent(rawHtml = '') {
      if (!DOM.corpoContainer) return;

      const cleanHtml = rawHtml
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/\bon\w+\s*=/g, '')
        .trim();

      if (!cleanHtml) {
        DOM.corpoContainer.innerHTML =
          '<p class="empty-message">Esta história não possui conteúdo ainda.</p>';
        return;
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml;
      const children = tempDiv.children.length
        ? [...tempDiv.children]
        : [tempDiv];

      const fragment = document.createDocumentFragment();
      children.forEach((element) => {
        fragment.appendChild(
          DOM.createElement('section', {
            className: 'paragrafo-secao',
            innerHTML: element.innerHTML || cleanHtml,
          }),
        );
      });

      DOM.corpoContainer.replaceChildren(fragment);
      await this.restoreImages(DOM.corpoContainer);
    },

    async restoreImages(container) {
      const imageElements = container.querySelectorAll('img[data-image-id]');
      await Promise.all(
        [...imageElements].map(async (img) => {
          const src = await ImageStore.loadImage(img.dataset.imageId);
          if (src) img.src = src;
        }),
      );
    },
  };

  const FeedbackManager = {
    getAll: () => JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]'),
    getForStory: (storyIndex) =>
      FeedbackManager.getAll().filter(
        (feedback) => feedback.storyIndex === storyIndex,
      ),

    delete(id, storyIndex) {
      const feedbacks = this.getAll();
      const filtered = feedbacks.filter((fb) => fb.id !== id);
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(filtered));
      this.loadAll(storyIndex);
    },

    add(tipo, texto, autor, storyIndex) {
      const feedbacks = this.getAll();
      const newFeedback = {
        id: `fb-${Date.now()}`,
        storyIndex,
        tipo,
        texto: texto.trim(),
        autor: autor.trim() || 'Anônimo',
      };

      feedbacks.push(newFeedback);
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(feedbacks));

      this.renderItem(newFeedback, true);
      this.updateCounter(this.getForStory(storyIndex).length);
    },

    createFeedbackNode({ id, tipo, texto, autor }) {
      const isElogio = tipo === 'elogio';
      const currentUser = AuthService.isLoggedIn()
        ? AuthService.getUserName()
        : null;
      const showDeleteButton = currentUser && autor === currentUser;

      return DOM.createElement(
        'li',
        { className: 'feedback-item', 'data-id': id },
        [
          DOM.createElement('span', {
            className: `feedback-badge ${isElogio ? 'elogio-badge' : 'melhoria-badge'}`,
            textContent: isElogio ? 'ELOGIO' : 'COMENTÁRIO',
          }),
          DOM.createElement('p', {
            className: 'feedback-texto',
            textContent: texto,
          }),
          DOM.createElement('cite', {
            className: 'feedback-autor',
            textContent: `— ${autor}`,
          }),
          showDeleteButton
            ? DOM.createElement(
                'button',
                {
                  className: 'btn-delete-feedback',
                  'data-id': id,
                  type: 'button',
                  title: 'Excluir feedback',
                  ariaLabel: 'Excluir feedback',
                  textContent: 'Excluir',
                },
              )
            : null,
        ].filter(Boolean),
      );
    },

    renderItem(dados, prepend = false) {
      if (!DOM.feedbackList) return;
      const node = this.createFeedbackNode(dados);
      DOM.feedbackList[prepend ? 'prepend' : 'appendChild'](node);
    },

    loadAll() {
      if (!DOM.feedbackList || !StoryManager.stories.length) return;
      const feedbacks = this.getForStory(StoryManager.currentStoryIndex ?? 0);
      DOM.feedbackList.replaceChildren(
        ...feedbacks.map((feedback) => this.createFeedbackNode(feedback)),
      );
      this.updateCounter(feedbacks.length);
    },

    updateCounter: (count) => {
      if (DOM.recebidosTitulo)
        DOM.recebidosTitulo.textContent = `Feedbacks Recebidos (${count})`;
    },
  };

  const UI = {
    setupDeleteButtons() {
      DOM.feedbackList?.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.btn-delete-feedback');
        if (!deleteBtn) return;

        const id = deleteBtn.dataset.id;
        const feedbackItem = deleteBtn.closest('.feedback-item');
        if (!id || !feedbackItem) return;

        const confirmDelete = window.confirm(
          'Tem certeza que deseja excluir este feedback?',
        );
        if (!confirmDelete) return;

        FeedbackManager.delete(id, StoryManager.currentStoryIndex ?? 0);
      });
    },

    setupForms() {
      [
        { selector: '#painel-elogio', tipo: 'elogio' },
        { selector: '#painel-comentarios', tipo: 'comentario' },
      ].forEach(({ selector, tipo }) => {
        const panel = select(selector);
        if (!panel) return;

        const textarea = select(
          '.feedback-textarea:not(.feedback-autor-input)',
          panel,
        );
        const btnEnviar = select('.btn-enviar-feedback', panel);
        const errorMsg = select('.feedback-erro', panel);
        const autorInput = select('.feedback-autor-input', panel);

        if (!textarea || !btnEnviar) return;

        textarea.addEventListener(
          'input',
          () => errorMsg && (errorMsg.textContent = ''),
        );

        btnEnviar.addEventListener('click', () => {
          const text = textarea.value.trim();
          if (!text) {
            if (errorMsg)
              errorMsg.textContent =
                'Por favor, preencha este campo antes de enviar.';
            return textarea.focus();
          }

          FeedbackManager.add(
            tipo,
            text,
            autorInput?.value || AuthService.getUserName(),
            StoryManager.currentStoryIndex ?? 0,
          );
          textarea.value = '';
          this.resetAuthorFields();
          this.animateButtonSuccess(btnEnviar);
        });
      });
    },

    animateButtonSuccess(button) {
      const originalText = button.textContent;
      button.textContent = 'Enviado ✓';
      button.style.backgroundColor = '#388e3c';
      setTimeout(
        () =>
          Object.assign(button, {
            textContent: originalText,
            style: { backgroundColor: '' },
          }),
        2000,
      );
    },

    resetAuthorFields() {
      selectAll('.feedback-autor-input').forEach(
        (field) => (field.value = AuthService.getUserName()),
      );
    },

    setupTabs() {
      document.addEventListener('click', (event) => {
        const tabBtn = event.target.closest('.tab-btn[role]');
        if (!tabBtn) return;

        selectAll('.feedback-tabs .tab-btn').forEach((btn) => {
          const isSelected = btn === tabBtn;
          const panel = select(btn.getAttribute('aria-controls'));

          DOM.toggle(btn, 'active', isSelected);
          btn.setAttribute('aria-selected', isSelected);

          if (panel) {
            panel.hidden = !isSelected;
            DOM.toggle(panel, 'active', isSelected);
          }
        });
      });
    },

    setupSidebar() {
      DOM.btnToggleSidebar?.addEventListener('click', () => {
        DOM.layout?.classList.toggle('expandido');
        if (DOM.historiaSidebar) {
          const isHidden = DOM.historiaSidebar.classList.toggle('is-hidden');
          DOM.btnToggleSidebar.setAttribute(
            'aria-label',
            `${isHidden ? 'Mostrar' : 'Ocultar'} painel de feedbacks`,
          );
        }
      });
    },
  };

  document.addEventListener('DOMContentLoaded', async () => {
    UI.setupTabs();
    UI.setupSidebar();

    const loggedIn = AuthService.isLoggedIn();
    DOM.toggle(DOM.formContainer, 'form-hidden', !loggedIn);
    DOM.toggle(DOM.loginMessage, 'login-required-hidden', loggedIn);

    if (loggedIn) {
      UI.resetAuthorFields();
      UI.setupForms();
      window.HistryCard?.render?.();
    }

    await StoryManager.load();
    UI.setupDeleteButtons();
    FeedbackManager.loadAll();
  });
})();
