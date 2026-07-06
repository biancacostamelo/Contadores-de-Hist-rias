const btnTheme = document.getElementById('btnTheme');

btnTheme.addEventListener('click', (e) => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
});
