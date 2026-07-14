const termsPopup = (() => {
  let popup = null;
  let closeBtn = null;
  let previouslyFocused = null;

  const htmlTemplate = `
    <div class="terms-popup" role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div class="terms-popup__backdrop" data-action="close" aria-hidden="true"></div>
      <article class="terms-popup__card">
        <header class="terms-popup__header">
          <h2 id="terms-title" class="terms-popup__title">Termos de Uso e Diretrizes da Comunidade</h2>
          <button type="button" class="terms-popup__close-btn" data-action="close" aria-label="Fechar termos">✕</button>
        </header>
        <div class="terms-popup__body">
          <div class="terms-popup__text">
            <p><strong>1. Aceitação dos Termos</strong></p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
            <p><strong>2. Uso da Plataforma</strong></p>
            <p>Duis aute irure dolor in reprehenderit in voluptate...</p>
            <p><strong>3. Contas de Usuário</strong></p>
            <p>Sed ut perspiciatis unde omnis iste natus error...</p>
            <p><strong>4. Privacidade e Dados</strong></p>
            <p>At vero eos et accusamus et iusto dignissimos...</p>
            <p><strong>5. Propriedade Intelectual</strong></p>
            <p>Quis autem vel eum iure reprehenderit...</p>
            <p><strong>6. Limitação de Responsabilidade</strong></p>
            <p>Nam libero tempore cum sociis natoque...</p>
            <p><strong>7. Alterações nos Termos</strong></p>
            <p>Fusce dapibus, tellus ac cursus commodo...</p>
          </div>
        </div>
      </article>
    </div>
  `;

  function createPopup() {
    if (popup) return;

    document.body.insertAdjacentHTML('beforeend', htmlTemplate);
    popup = document.querySelector('.terms-popup');
    closeBtn = popup.querySelector('.terms-popup__close-btn');
    popup.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="close"]')) hide();
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      hide();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = popup.querySelectorAll('button, [tabindex="0"]');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  function show() {
    createPopup();

    previouslyFocused = document.activeElement;
    popup.classList.add('is-visible');
    closeBtn.focus();
    document.addEventListener('keydown', handleKeyDown);
  }

  function hide() {
    if (!popup) return;

    popup.classList.remove('is-visible');
    if (previouslyFocused) previouslyFocused.focus();

    document.removeEventListener('keydown', handleKeyDown);
  }

  return {
    initPage: () => {
      document
        .getElementById('open-terms-btn')
        .addEventListener('click', (e) => {
          e.stopPropagation();
          show();
        });
    },
    show,
    hide,
  };
})();

document.addEventListener('DOMContentLoaded', termsPopup.initPage);
