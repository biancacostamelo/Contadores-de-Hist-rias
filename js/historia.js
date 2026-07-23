(() => {
  'use strict';

  const CONFIG = {
    STORAGE_KEY: 'historia_feedbacks',
    FORMS: [
      { panelId: 'painel-elogio', tipo: 'elogio' },
      { panelId: 'painel-comentarios', tipo: 'comentario' },
    ],
    DOM_IDS: {
      formContainer: 'form-container',
      loginMessage: 'login-required-message',
      feedbackList: '.feedback-list',
      recebidosTitulo: '.recebidos-titulo',
      btnToggleSidebar: 'btn-toggle-sidebar',
      historiaSidebar: '.historia-sidebar',
      tituloHistoria: 'titulo-historia',
      categoriaLabel: 'historiaCategoria',
      corpoContainer: 'historiaCorpoContainer',
    },
  };

  const $ = (selector, root = document) =>
    typeof selector === 'string' &&
    !selector.includes('.') &&
    !selector.includes(' ')
      ? root.getElementById(selector)
      : root.querySelector(selector);

  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];

  const dom = {};
  Object.entries(CONFIG.DOM_IDS).forEach(([key, selector]) => {
    dom[key] = $(selector);
  });

  class Feedback {
    constructor(tipo, texto, autor) {
      this.id = `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.tipo = tipo;
      this.texto = texto.trim();
      this.autor = autor.trim() || 'Anônimo';
      this.data = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  const AuthManager = {
    isLoggedIn: () => !!window.auth?.isLoggedIn(),
    getUser: () => {
      if (!AuthManager.isLoggedIn()) return null;
      const session = window.auth.getSession();
      const allUsers =
        typeof window.auth.getUsers === 'function'
          ? window.auth.getUsers()
          : {};
      return session ? allUsers[session.email] : null;
    },
    getUserName: () => window.auth?.getSession()?.fullname || 'Anônimo',
  };

  const StoryManager = {
    state: { stories: [], currentIndex: -1 },

    load() {
      const user = AuthManager.getUser();

      if (user) {
        this.state.stories = user?.stories || [];
      } else {
        // Logged-out users see all community stories
        const allUsers = typeof window.auth.getUsers === 'function' ? window.auth.getUsers() : {};
        const allStories = Object.values(allUsers)
          .flatMap((u) => u.stories || [])
          .slice(0, 50);
        this.state.stories = allStories;
      }

      const urlIndex = this._getUrlParamIndex();

      if (this.state.stories.length === 0) {
        this._renderEmpty();
      } else if (
        urlIndex >= 0 &&
        urlIndex < this.state.stories.length
      ) {
        this.select(urlIndex);
      } else {
        // No valid URL param — show the first story by default
        this.select(0);
      }
    },

    _getUrlParamIndex() {
      const params = new URLSearchParams(window.location.search);
      const index = parseInt(params.get('story'), 10);
      return isNaN(index) ? -1 : index;
    },

    _renderEmpty() {
      dom.corpoContainer.innerHTML =
        '<p class="empty-message">Nenhuma história encontrada. Crie sua história na página de perfil.</p>';
      if (dom.tituloHistoria) dom.tituloHistoria.hidden = true;
      if (dom.categoriaLabel) dom.categoriaLabel.textContent = '—';
    },

    select(index) {
      if (index < 0 || index >= this.state.stories.length) return;

      const story = this.state.stories[index];
      this.state.currentIndex = index;

      if (dom.categoriaLabel)
        dom.categoriaLabel.textContent = (story.type || 'Conto').toUpperCase();
      if (dom.tituloHistoria) {
        dom.tituloHistoria.hidden = false;
        dom.tituloHistoria.textContent = story.title || 'Sem título';
      }

      this._renderContent(story.content);
    },

    _renderContent(rawHtml) {
      const cleanContent = this._sanitize(rawHtml);
      dom.corpoContainer.innerHTML = '';

      if (!cleanContent) {
        dom.corpoContainer.innerHTML =
          '<p class="empty-message">Esta história não possui conteúdo ainda.</p>';
        return;
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanContent;

      const children = [...tempDiv.children];
      if (children.length > 0) {
        children.forEach((child) => {
          const section = document.createElement('section');
          section.className = 'paragrafo-secao';
          section.append(...child.childNodes);
          dom.corpoContainer.appendChild(section);
        });
      } else {
        const section = document.createElement('section');
        section.className = 'paragrafo-secao';
        section.innerHTML = cleanContent;
        dom.corpoContainer.appendChild(section);
      }
    },

    _sanitize(html) {
      if (!html || typeof html !== 'string') return '';
      return html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/\bon\w+\s*=/g, '');
    },
  };

  const FeedbackManager = {
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
      } catch (e) {
        console.warn('[Feedback] Erro ao carregar do localStorage:', e);
        return [];
      }
    },

    add(fb) {
      const list = this.getAll();
      list.push(fb);
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(list));
      this.renderItem(fb, true);
      this._updateCounter(list.length);
    },

    renderItem(dados, prepend = false) {
      if (!dom.feedbackList) return;

      const item = document.createElement('li');
      item.className = 'feedback-item';
      item.dataset.id = dados.id;

      const isElogio = dados.tipo === 'elogio';
      const badgeClass = isElogio ? 'elogio-badge' : 'melhoria-badge';
      const badgeText = isElogio ? 'ELOGIO' : 'COMENTÁRIO';

      item.innerHTML = `
        <span class="feedback-badge ${badgeClass}">${badgeText}</span>
        <p class="feedback-texto"></p>
        <cite class="feedback-autor"></cite>
      `;

      item.querySelector('.feedback-texto').textContent = dados.texto;
      item.querySelector('.feedback-autor').textContent = `— ${dados.autor}`;

      prepend
        ? dom.feedbackList.prepend(item)
        : dom.feedbackList.appendChild(item);
    },

    loadAll() {
      if (!dom.feedbackList) return;
      const list = this.getAll();
      dom.feedbackList.innerHTML = '';
      list.forEach((dados) => this.renderItem(dados));
      this._updateCounter(list.length);
    },

    _updateCounter(count) {
      if (dom.recebidosTitulo) {
        dom.recebidosTitulo.textContent = `Feedbacks Recebidos (${count})`;
      }
    },
  };

  const FormHandler = {
    setup() {
      CONFIG.FORMS.forEach(({ panelId, tipo }) => {
        const panel = $(panelId);
        if (!panel) return;

        const textarea = $(
          '.feedback-textarea:not(.feedback-autor-input)',
          panel,
        );
        const errorContainer = $('.feedback-erro', panel);
        const autorInput = $('.feedback-autor-input', panel);
        const btnEnviar = $('.btn-enviar-feedback', panel);

        if (!textarea || !btnEnviar) return;

        textarea.addEventListener('input', () => {
          if (errorContainer) errorContainer.textContent = '';
          textarea.classList.remove('invalid');
        });

        btnEnviar.addEventListener('click', () => {
          const text = textarea.value.trim();
          if (!text) {
            if (errorContainer)
              errorContainer.textContent =
                'Por favor, preencha este campo antes de enviar.';
            textarea.focus();
            return;
          }

          const autor = autorInput?.value || AuthManager.getUserName();
          const fb = new Feedback(tipo, text, autor);

          FeedbackManager.add(fb);

          textarea.value = '';
          this._resetAuthorFields();
          this._showSuccess(btnEnviar);
        });
      });
    },

    _resetAuthorFields() {
      const name = AuthManager.getUserName();
      CONFIG.FORMS.forEach(({ panelId }) => {
        const field = $('.feedback-autor-input', $(panelId));
        if (field) field.value = name;
      });
    },

    _showSuccess(btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Enviado ✓';
      btn.style.backgroundColor = '#388e3c';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
      }, 2000);
    },
  };

  const TabManager = {
    init() {
      document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn[role]');
        if (!tabBtn) return;

        const targetPanelId = tabBtn.getAttribute('aria-controls');

        $$('.feedback-tabs .tab-btn').forEach((btn) => {
          const isSelected = btn === tabBtn;
          const panel = $(btn.getAttribute('aria-controls'));

          btn.classList.toggle('active', isSelected);
          btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');

          if (panel) {
            panel.hidden = !isSelected;
            panel.classList.toggle('active', isSelected);
          }
        });
      });
    },
  };

  const SidebarToggle = {
    init() {
      if (!dom.btnToggleSidebar || !dom.historiaSidebar) return;
      dom.btnToggleSidebar.addEventListener('click', () => {
        const isHidden = dom.historiaSidebar.classList.toggle('is-hidden');
        dom.btnToggleSidebar.setAttribute(
          'aria-label',
          `${isHidden ? 'Mostrar' : 'Ocultar'} painel de feedbacks`,
        );
      });
    },
  };

  const AuthIntegration = {
    handleState() {
      const isLoggedIn = AuthManager.isLoggedIn();

      dom.formContainer?.classList.toggle('form-hidden', !isLoggedIn);
      dom.loginMessage?.classList.toggle('login-required-hidden', isLoggedIn);

      return isLoggedIn;
    },
  };

  function init() {
    TabManager.init();
    SidebarToggle.init();

    const isLoggedIn = AuthIntegration.handleState();
    if (isLoggedIn) {
      FormHandler._resetAuthorFields();
      FormHandler.setup();
      if (typeof window.HistryCard?.render === 'function') {
        window.HistryCard.render();
      }
    }

    StoryManager.load();
    FeedbackManager.loadAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
