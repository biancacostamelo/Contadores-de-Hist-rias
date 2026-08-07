document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox-overlay');
  const lightboxImg = document.getElementById('lightbox-img');
  const btnFechar = document.getElementById('lightbox-fechar');

  // EVENTO DE CLIQUE NAS ARTES COM A CLASSE .posts-topicos
  document.addEventListener('click', (event) => {
    // Verifica se o clique ocorreu dentro de um card .posts-topicos
    const cardClicado = event.target.closest('.posts-topicos');

    if (cardClicado) {
      // Pega a imagem que está dentro do .posts-topicos clicado
      const img = cardClicado.querySelector('img');

      if (img && img.src) {
        lightboxImg.src = img.src;
        lightbox.classList.add('ativo');
        document.body.style.overflow = 'hidden'; // Evita rolagem da página ao fundo
      }
    }
  });

  // FUNÇÃO PARA FECHAR
  function fecharLightbox() {
    lightbox.classList.remove('ativo');
    lightboxImg.src = '';
    document.body.style.overflow = 'auto'; // Reabilita a rolagem
  }

  // EVENTOS PARA FECHAR
  if (btnFechar) {
    btnFechar.addEventListener('click', fecharLightbox);
  }

  // Fechar ao clicar fora da imagem (no overlay escuro)
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      fecharLightbox();
    }
  });

  // Fechar com a tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('ativo')) {
      fecharLightbox();
    }
  });
});
