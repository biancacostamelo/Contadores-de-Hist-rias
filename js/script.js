const btnTheme = document.getElementById('btnTheme');

btnTheme.addEventListener('click', (e) => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
});

const btnSecondary = document.getElementById('menu-btn')
const menuOpcoes = document.getElementById('menu-opcoes')

btnSecondary.addEventListener('click', (e) => {
  menuOpcoes.classList.toggle('menu-opcoes-active')
})