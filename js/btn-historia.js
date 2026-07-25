const btn = document.getElementById('btn-toggle-sidebar');
const layout = document.querySelector('.historia-layout');

btn.addEventListener('click', () => {
  layout.classList.toggle('expandido');
});
