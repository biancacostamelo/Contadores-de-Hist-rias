document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox-overlay');
  const lightboxImg = document.getElementById('lightbox-img');
  const btnFechar = document.getElementById('lightbox-fechar');

  // EVENTO DE CLIQUE NAS ARTES COM A CLASSE .posts-topicos
  document.addEventListener('click', (event) => {
    const cardClicado = event.target.closest('.posts-topicos');

    if (cardClicado) {
      const img = cardClicado.querySelector('img');

      if (img && img.src) {
        lightboxImg.src = img.src;
        lightbox.classList.add('ativo');
        document.body.style.overflow = 'hidden';
      }
    }
  });

  // FUNÇÃO PARA FECHAR
  function fecharLightbox() {
    lightbox.classList.remove('ativo');
    lightboxImg.src = '';
    document.body.style.overflow = 'auto';
  }

  // EVENTOS PARA FECHAR
  if (btnFechar) {
    btnFechar.addEventListener('click', fecharLightbox);
  }

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
