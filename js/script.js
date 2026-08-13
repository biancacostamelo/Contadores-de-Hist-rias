const STORAGE_KEY_SESSION = 'writersCommunity_session';

function isLoggedIn() {
  const raw = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    return false;
  }
}

const entrarBtn = document.getElementById('entrarBtn');
const criarBtn = document.getElementById('criarBtn');

function updateButtonsVisibility() {
  const loggedIn = isLoggedIn();

  if (entrarBtn) {
    entrarBtn.style.display = loggedIn ? 'none' : '';
  }

  if (criarBtn) {
    criarBtn.style.display = loggedIn ? '' : 'none';
  }
}

updateButtonsVisibility();

window.addEventListener('storage', () => updateButtonsVisibility());

const btnMenu = document.getElementById('btn-menu');
const dropdownMenu = document.getElementById('dropdown-menu');
const btnTheme = document.getElementById('btn-theme');

if (btnMenu && dropdownMenu) {
  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
  });
}

if (btnTheme) {
  btnTheme.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('dark-theme');
  });
}

document.addEventListener('click', (e) => {
  if (dropdownMenu && btnMenu) {
    if (!dropdownMenu.contains(e.target) && !btnMenu.contains(e.target)) {
      dropdownMenu.classList.remove('active');
    }
  }
});
