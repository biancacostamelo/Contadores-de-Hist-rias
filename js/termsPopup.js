const termsPopup = (() => {
  let popup = null;
  let closeBtn = null;
  let previouslyFocused = null;

  const htmlTemplate = `
   <div class="terms-popup" role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div class="terms-popup__backdrop" data-action="close" aria-hidden="true"></div>
      <article class="terms-popup__card">
        <header class="terms-popup__header">
          <h2 id="terms-title" class="terms-popup__title">Termos e Condições de Uso</h2>
          <button type="button" class="terms-popup__close-btn" data-action="close" aria-label="Fechar termos">✕</button>
        </header>
        <div class="terms-popup__body">
          <div class="terms-popup__text">
            <p>
              Bem-vindo à nossa plataforma. Ao acessar, navegar ou utilizar nosso
              site, você concorda em cumprir e estar vinculado aos seguintes
              Termos de Uso. Se você não concordar com qualquer parte destes
              termos, não deverá utilizar nossos serviços.
            </p>

            <p><strong>1. Objeto do Serviço</strong></p>
            <p>
              A plataforma atua como um ecossistema de facilitação e intermediação
              de vendas para criadores independentes de obras digitais (incluindo
              livros, quadrinhos, mangás e portfólios visuais). Nós fornecemos a
              tecnologia para exposição das obras e o processamento automatizado
              de pagamentos.
            </p>

            <p><strong>2. Cadastro e Responsabilidade das Contas</strong></p>
            <p>
              Para publicar ou comprar obras, o usuário deve realizar um cadastro
              fornecendo dados válidos e atualizados. O usuário é o único
              responsável por manter a confidencialidade de sua senha e por todas
              as atividades que ocorram sob sua conta. Menores de idade devem
              utilizar a plataforma sob a supervisão e autorização de seus
              responsáveis legais.
            </p>

            <p><strong>3. Direitos Autorais e Propriedade Intelectual</strong></p>
            <p>
              <strong>Propriedade das Obras:</strong> Todo autor que publica na plataforma retém
              100% dos direitos autorais de sua propriedade intelectual. A
              plataforma não adquire qualquer direito de propriedade sobre as
              obras cadastradas.<br>
              <strong>Conteúdo Proibido:</strong> É estritamente proibido
              publicar obras que configurem plágio, violação de direitos autorais
              de terceiros, ou que contenham conteúdo ilegal, ofensivo ou que
              promova o ódio. O descumprimento resultará na remoção imediata da
              obra e banimento da conta.
            </p>

            <p><strong>4. Modelo Financeiro, Taxas e Repasses</strong></p>
            <p>
              <strong>Preço de Venda:</strong> O autor define livremente o valor de sua obra (com
              base nas médias e parâmetros sugeridos pela plataforma).<br>
              <strong>Comissão:</strong> A plataforma retém uma taxa de comissão de 10% sobre o valor bruto de
              cada transação realizada dentro do site.<br>
              <strong>Taxa de Gateway:</strong> Sobre o valor retido pela plataforma, incide a taxa de processamento
              financeiro do gateway de pagamento (1% via PIX).<br>
              <strong>Repasse (90%):</strong> Os 90% restantes do valor da venda são repassados ao autor através da
              chave PIX cadastrada em seu perfil, conforme o cronograma financeiro
              padrão de repasses da plataforma.
            </p>

            <p><strong>5. Limitação de Responsabilidade</strong></p>
            <p>
              A plataforma empenha-se para manter o serviço online e seguro, mas
              não se responsabiliza por eventuais instabilidades técnicas
              temporárias de servidores terceiros ou do processador de pagamentos
              (gateway).
            </p>
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
