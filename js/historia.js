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
      storySelector: 'storySelector',
      tituloHistoria: 'titulo-historia',
      categoriaLabel: 'historiaCategoria',
      corpoContainer: 'historiaCorpoContainer',
    },
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];

  const dom = {};
  Object.entries(CONFIG.DOM_IDS).forEach(([key, selector]) => {
    dom[key] =
      typeof selector === 'string' && !selector.includes('.')
        ? $(`#${selector}`)
        : $(selector);
  });

  const StoryManager = {
    state: { stories: [], currentIndex: -1 },

    load() {
      if (
        !dom.storySelector ||
        !dom.tituloHistoria ||
        !dom.categoriaLabel ||
        !dom.corpoContainer
      )
        return;

      const isLoggedIn = !!window.auth?.isLoggedIn();
      this.state.stories = [];

      if (isLoggedIn) {
        const session = window.auth.getSession();
        const allUsers =
          typeof window.auth.getUsers === 'function'
            ? window.auth.getUsers()
            : {};
        const currentUser = session && allUsers[session.email];
        this.state.stories = currentUser?.stories || [];
      }

      dom.storySelector.innerHTML = '';

      if (this.state.stories.length === 0) {
        this._renderEmpty();
      } else {
        this._populateSelector(this.state.stories);
        this.select(0);
      }
    },

    _renderEmpty() {
      const opt = document.createElement('option');
      opt.value = '-1';
      opt.textContent = 'Nenhuma história encontrada.';
      dom.storySelector.appendChild(opt);
      dom.corpoContainer.innerHTML =
        '<p class="empty-message">Nenhuma história encontrada. Crie sua história na página de perfil.</p>';
      dom.tituloHistoria.hidden = true;
      dom.categoriaLabel.textContent = '—';
    },

    _populateSelector(stories) {
      const placeholder = document.createElement('option');
      placeholder.value = '-1';
      placeholder.disabled = true;
      placeholder.textContent = 'Selecione uma história...';
      dom.storySelector.appendChild(placeholder);

      stories.forEach((story, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${i + 1}. ${story.title || 'Sem título'}`;
        dom.storySelector.appendChild(opt);
      });
    },

    select(index) {
      if (index < 0 || index >= this.state.stories.length) return;

      const story = this.state.stories[index];
      this.state.currentIndex = index;
      dom.storySelector.value = String(index);

      dom.categoriaLabel.textContent = (story.type || 'Conto').toUpperCase();
      dom.tituloHistoria.hidden = false;
      dom.tituloHistoria.textContent = story.title || 'Sem título';

      const cleanContent = this.sanitize(story.content);
      dom.corpoContainer.innerHTML = '';

      if (!cleanContent) {
        dom.corpoContainer.innerHTML =
          '<p class="empty-message">Esta história não possui conteúdo ainda.</p>';
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanContent;

        [...tempDiv.children].forEach((child) => {
          const section = document.createElement('section');
          section.className = 'paragrafo-secao';
          while (child.firstChild) section.appendChild(child.firstChild);
          dom.corpoContainer.appendChild(section);
        });

        if (!tempDiv.children.length && tempDiv.textContent.trim()) {
          const section = document.createElement('section');
          section.className = 'paragrafo-secao';
          section.innerHTML = cleanContent;
          dom.corpoContainer.appendChild(section);
        }
      }
    },

    sanitize(html) {
      if (!html || typeof html !== 'string') return '';
      return html.replace(/<script[^>]*>/gi, '').replace(/\bon\w+\s*=/g, '');
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
      this._updateCounter(list.length);
    },

    renderItem(dados) {
      if (!dom.feedbackList || !dom.recebidosTitulo) return;

      const item = document.createElement('li');
      item.className = 'feedback-item';
      item.dataset.id = dados.id;

      const badgeClass =
        dados.tipo === 'elogio' ? 'elogio-badge' : 'melhoria-badge';
      const badgeText = dados.tipo === 'elogio' ? 'ELOGIO' : 'COMENTÁRIO';

      item.innerHTML = `
        <span class="feedback-badge ${badgeClass}">${badgeText}</span>
        <p class="feedback-texto"></p>
        <cite class="feedback-autor"></cite>
      `;

      item.querySelector('.feedback-texto').textContent = dados.texto;
      item.querySelector('.feedback-autor').textContent = `— ${dados.autor}`;

      dom.feedbackList.prepend(item);
    },

    loadAll() {
      if (!dom.feedbackList || !dom.recebidosTitulo) return;
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
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const textarea = panel.querySelector(
          '.feedback-textarea:not(.feedback-autor-input)',
        );
        const errorContainer = panel.querySelector('.feedback-erro');
        const autorInput = panel.querySelector('.feedback-autor-input');
        const btnEnviar = panel.querySelector('.btn-enviar-feedback');

        if (!textarea || !errorContainer || !btnEnviar) return;

        textarea.addEventListener('input', () => {
          errorContainer.textContent = '';
          textarea.classList.remove('invalid');
        });

        btnEnviar.addEventListener('click', () => {
          const text = textarea.value.trim();
          if (!text) {
            errorContainer.textContent =
              'Por favor, preencha este campo antes de enviar.';
            textarea.focus();
            return;
          }

          const fb = new Feedback(tipo, text, autorInput?.value || 'Anônimo');
          FeedbackManager.add(fb);
          FeedbackManager.renderItem(fb);

          textarea.value = '';
          if (autorInput)
            autorInput.value = window.auth?.getSession()?.fullname || '';

          this._showSuccess(btnEnviar);
        });
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
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn || !tabBtn.getAttribute('role')) return;

        const isActive = tabBtn.classList.contains('active');
        const panelId = tabBtn.getAttribute('aria-controls');

        $$('.feedback-tabs .tab-btn').forEach((t) => {
          const panel = document.getElementById(
            t.getAttribute('aria-controls'),
          );
          t.classList.toggle('active', !isActive);
          if (panel) {
            panel.hidden = !isActive;
            panel.classList.toggle('active', !isActive);
          }
        });

        tabBtn.classList.add('active');
        tabBtn.setAttribute('aria-selected', 'true');
        const activePanel = document.getElementById(panelId);
        if (activePanel) {
          activePanel.hidden = false;
          activePanel.classList.add('active');
        }
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
      const isLoggedIn = !!window.auth?.isLoggedIn();
      if (dom.formContainer)
        dom.formContainer.classList.toggle('form-hidden', !isLoggedIn);
      if (dom.loginMessage)
        dom.loginMessage.classList.toggle('login-required-hidden', isLoggedIn);
      return isLoggedIn;
    },

    populateAuthorFields() {
      const name = window.auth?.getSession()?.fullname;
      if (!name) return;
      CONFIG.FORMS.forEach(({ panelId }) => {
        const field = document
          .getElementById(panelId)
          ?.querySelector('.feedback-autor-input');
        if (field) field.value = name;
      });
    },
  };

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

  function init() {
    TabManager.init();
    SidebarToggle.init();

    const isLoggedIn = AuthIntegration.handleState();
    if (isLoggedIn) {
      AuthIntegration.populateAuthorFields();
      FormHandler.setup();
    }

    StoryManager.load();
    FeedbackManager.loadAll();

    dom.storySelector?.addEventListener('change', () => {
      const index = parseInt(dom.storySelector.value, 10);
      StoryManager.select(index);
    });
  }
  init();
})();
