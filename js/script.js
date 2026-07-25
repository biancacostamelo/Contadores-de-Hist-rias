const btnMenu = document.getElementById('btn-menu');
const dropdownMenu = document.getElementById('dropdown-menu');
const btnTheme = document.getElementById('btn-theme');

btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle('active');
});

btnTheme.addEventListener('click', (e) => {
  e.stopPropagation();

  document.body.classList.toggle('dark-theme');
});

document.addEventListener('click', (e) => {
  if (!dropdownMenu.contains(e.target) && !btnMenu.contains(e.target)) {
    dropdownMenu.classList.remove('active');
  }
});
