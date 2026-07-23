(() => {
  'use strict';

  const STORAGE_KEY = 'historia_feedbacks';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const dom = {
    formContainer: $('#form-container'),
    loginMessage: $('#login-required-message'),
    feedbackList: $('.feedback-list'),
    recebidosTitulo: $('.recebidos-titulo'),
    btnToggleSidebar: $('#btn-toggle-sidebar'),
    historiaSidebar: $('.historia-sidebar'),
    tituloHistoria: $('#titulo-historia'),
    categoriaLabel: $('#historiaCategoria'),
    corpoContainer: $('#historiaCorpoContainer'),
  };

  const Auth = {
    isLoggedIn: () => !!window.auth?.isLoggedIn(),
    getUser: () => {
      if (!Auth.isLoggedIn()) return null;
      const session = window.auth.getSession();
      const users = window.auth.getUsers?.() || {};
      return session ? users[session.email] : null;
    },
    getUserName: () => window.auth?.getSession()?.fullname || 'Anônimo',
  };

  const StoryManager = {
    state: { stories: [], currentIndex: -1 },

    load() {
      const users = window.auth?.getUsers?.() || {};

      // Always use the global flattened array so cross-user story links work.
      this.state.stories = Object.values(users)
        .flatMap((u) => u.stories || [])
        .slice(0, 50);

      const params = new URLSearchParams(window.location.search);
      const urlIndex = parseInt(params.get('story'), 10);
      const isValidIndex =
        urlIndex >= 0 && urlIndex < this.state.stories.length;

      if (!this.state.stories.length) {
        this.renderEmpty();
      } else {
        this.select(isValidIndex ? urlIndex : 0);
      }
    },

    renderEmpty() {
      dom.corpoContainer.innerHTML =
        '<p class="empty-message">Nenhuma história encontrada. Crie sua história na página de perfil.</p>';
      if (dom.tituloHistoria) dom.tituloHistoria.hidden = true;
      if (dom.categoriaLabel) dom.categoriaLabel.textContent = '—';
    },

    select(index) {
      const story = this.state.stories[index];
      if (!story) return;

      this.state.currentIndex = index;
      if (dom.categoriaLabel)
        dom.categoriaLabel.textContent = (story.type || 'Conto').toUpperCase();
      if (dom.tituloHistoria) {
        dom.tituloHistoria.hidden = false;
        dom.tituloHistoria.textContent = story.title || 'Sem título';
      }

      this.renderContent(story.content);
    },

    renderContent(rawHtml) {
      const cleanHtml = (rawHtml || '')
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/\bon\w+\s*=/g, '');

      dom.corpoContainer.innerHTML = '';
      if (!cleanHtml) {
        dom.corpoContainer.innerHTML =
          '<p class="empty-message">Esta história não possui conteúdo ainda.</p>';
        return;
      }

      const temp = document.createElement('div');
      temp.innerHTML = cleanHtml;
      const children = [...temp.children];

      const nodesToAppend = children.length ? children : [temp];
      nodesToAppend.forEach((node) => {
        const section = document.createElement('section');
        section.className = 'paragrafo-secao';
        if (children.length) section.append(...node.childNodes);
        else section.innerHTML = cleanHtml;
        dom.corpoContainer.appendChild(section);
      });
    },
  };

  const FeedbackManager = {
    getAll: () => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch {
        return [];
      }
    },

    add(tipo, texto, autor) {
      const list = this.getAll();
      const item = {
        id: `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        tipo,
        texto: texto.trim(),
        autor: autor.trim() || 'Anônimo',
        data: new Date().toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      };

      list.push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      this.renderItem(item, true);
      this.updateCounter(list.length);
    },

    renderItem(dados, prepend = false) {
      if (!dom.feedbackList) return;

      const isElogio = dados.tipo === 'elogio';
      const li = document.createElement('li');
      li.className = 'feedback-item';
      li.dataset.id = dados.id;

      li.innerHTML = `
        <span class="feedback-badge ${isElogio ? 'elogio-badge' : 'melhoria-badge'}">
          ${isElogio ? 'ELOGIO' : 'COMENTÁRIO'}
        </span>
        <p class="feedback-texto"></p>
        <cite class="feedback-autor"></cite>
      `;

      li.querySelector('.feedback-texto').textContent = dados.texto;
      li.querySelector('.feedback-autor').textContent = `— ${dados.autor}`;

      dom.feedbackList[prepend ? 'prepend' : 'appendChild'](li);
    },

    loadAll() {
      if (!dom.feedbackList) return;
      const list = this.getAll();
      dom.feedbackList.innerHTML = '';
      list.forEach((fb) => this.renderItem(fb));
      this.updateCounter(list.length);
    },

    updateCounter(count) {
      if (dom.recebidosTitulo)
        dom.recebidosTitulo.textContent = `Feedbacks Recebidos (${count})`;
    },
  };

  const UI = {
    setupForms() {
      const panels = [
        { id: '#painel-elogio', tipo: 'elogio' },
        { id: '#painel-comentarios', tipo: 'comentario' },
      ];

      panels.forEach(({ id, tipo }) => {
        const panel = $(id);
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

          FeedbackManager.add(
            tipo,
            text,
            autorInput?.value || Auth.getUserName(),
          );
          textarea.value = '';
          this.resetAuthorFields();

          const origText = btnEnviar.textContent;
          btnEnviar.textContent = 'Enviado ✓';
          btnEnviar.style.backgroundColor = '#388e3c';
          setTimeout(() => {
            btnEnviar.textContent = origText;
            btnEnviar.style.backgroundColor = '';
          }, 2000);
        });
      });
    },

    resetAuthorFields() {
      const name = Auth.getUserName();
      $$('.feedback-autor-input').forEach((field) => (field.value = name));
    },

    setupTabs() {
      document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn[role]');
        if (!tabBtn) return;

        $$('.feedback-tabs .tab-btn').forEach((btn) => {
          const isSelected = btn === tabBtn;
          const panel = $(btn.getAttribute('aria-controls'));

          btn.classList.toggle('active', isSelected);
          btn.setAttribute('aria-selected', isSelected);

          if (panel) {
            panel.hidden = !isSelected;
            panel.classList.toggle('active', isSelected);
          }
        });
      });
    },

    setupSidebar() {
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

  document.addEventListener('DOMContentLoaded', () => {
    UI.setupTabs();
    UI.setupSidebar();

    const isLoggedIn = Auth.isLoggedIn();
    dom.formContainer?.classList.toggle('form-hidden', !isLoggedIn);
    dom.loginMessage?.classList.toggle('login-required-hidden', isLoggedIn);

    if (isLoggedIn) {
      UI.resetAuthorFields();
      UI.setupForms();
      window.HistryCard?.render?.();
    }

    StoryManager.load();
    FeedbackManager.loadAll();
  });
})();
