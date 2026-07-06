(() => {
  'use strict';
  const STORAGE_KEY_USERS = 'writersCommunity_users';
  const STORAGE_KEY_SESSION = 'writersCommunity_session';
  const SESSION_DURATION_MS = 60 * 60 * 1000;

  class User {
    constructor(passwordHash, fullname = '', bio = '') {
      this.passwordHash = passwordHash;
      this.fullname = fullname.trim();
      this.bio = bio.trim();
      this.createdAt = Date.now();
    }
  }

  const prefixes = [
    'Leitor',
    'Sonhador',
    'Criativo',
    'Curioso',
    'Explorador',
    'Inspirado',
    'Visionário',
    'Dedicado',
    'Poeta',
    'Autor',
    'Escritor',
    'Narrador',
    'Crônica',
    'Verso',
    'Estrofe',
    'Mito',
    'Lenda',
    'Saga',
    'Fábula',
    'Parábola',
  ];

  const suffixes = [
    'Literário',
    'Digital',
    'Noturno',
    'Estelar',
    'Mágico',
    'Poético',
    'Luminoso',
    'Aventureiro',
    'Sábio',
    'Criativo',
    'Brilhante',
    'Escuro',
    'Celestial',
    'Eterno',
    'Divino',
    'Real',
    'Fantasma',
    'Viajante',
    'Guardião',
    'Mestre',
  ];

  const generateRandomUsername = () => {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${prefix}${suffix}${num}`;
  };

  const activeForm =
    document.getElementById('loginForm') ||
    document.getElementById('signupForm');
  const isSignup = activeForm?.id === 'signupForm';

  const getUsers = () => {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : {};
  };

  const saveUsers = (users) =>
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  const getSession = () => {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }
    return session;
  };

  const saveSession = (token, email, fullname, expiresAt) => {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({ token, email, fullname, expiresAt }),
    );
  };

  const clearSession = () => localStorage.removeItem(STORAGE_KEY_SESSION);

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const registerUser = async (email, password, fullname, bio) => {
    const users = getUsers();
    if (users[email])
      return { success: false, message: 'Este e-mail já está cadastrado.' };

    const hashedPassword = await hashPassword(password);
    const displayName = fullname.trim() || generateRandomUsername();
    const displayBio = bio.trim() || 'Leitor Voraz · Ofensiva de 0 Dias';

    users[email] = new User(hashedPassword, displayName, displayBio);

    saveUsers(users);
    return { success: true, username: displayName };
  };

  const loginUser = async (email, password) => {
    const users = getUsers();
    const hashedPassword = await hashPassword(password);

    const invalidAuthResponse = {
      success: false,
      message: 'E-mail ou senha incorretos.',
    };

    if (!users[email]) return invalidAuthResponse;
    if (hashedPassword !== users[email].passwordHash)
      return invalidAuthResponse;

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    saveSession(token, email, users[email].fullname || '', expiresAt);
    return { success: true };
  };

  const updateProfile = async (email, updates) => {
    const users = getUsers();
    if (!users[email])
      return { success: false, message: 'Usuário não encontrado.' };

    if (updates.fullname && updates.fullname !== users[email].fullname) {
      const existingUser = Object.values(users).find(
        (user) => user.fullname === updates.fullname.trim(),
      );
      if (existingUser && existingUser.email !== email) {
        return {
          success: false,
          message: 'Este nome já está em uso por outro usuário.',
        };
      }
    }

    users[email] = { ...users[email], ...updates };
    saveUsers(users);

    const session = getSession();
    if (session && session.email === email) {
      saveSession(
        session.token,
        email,
        updates.fullname || users[email].fullname,
        session.expiresAt,
      );
    }

    return { success: true };
  };

  const validateFullname = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return { isValid: false, message: 'O nome é obrigatório.' };
    if (trimmed.length < 3)
      return {
        isValid: false,
        message: 'O nome deve ter no mínimo 3 caracteres.',
      };
    return { isValid: true, message: '' };
  };

  const validators = {
    fullname: validateFullname,
    ...(typeof formValidation !== 'undefined' && {
      'email-login': formValidation.validateEmail,
      'password-login': formValidation.validatePasswordLogin,
      'email-cadastro': formValidation.validateEmail,
      'password-cadastro': formValidation.validatePasswordStrength,
      'confirm-password': () => {
        const pass = document.getElementById('password-cadastro')?.value || '';
        const confirm =
          document.getElementById('confirm-password')?.value || '';
        return formValidation.validatePasswordMatch(pass, confirm);
      },
    }),
  };

  const validateField = (input) => {
    if (input.type === 'checkbox') {
      if (
        input.id !== 'terms-checkbox' ||
        typeof formValidation === 'undefined'
      )
        return true;
      const errorContainer = document.getElementById('terms-error');
      const result = formValidation.validateTerms(input.checked);

      if (!result.isValid) {
        formValidation.showError(input, errorContainer, result.message);
        return false;
      }
      formValidation.clearError(input, errorContainer);
      return true;
    }

    const validate = validators[input.id];
    if (!validate) return true;

    const errorContainer = document.getElementById(`${input.id}-error`);
    const value = input.value;

    const result = validate(value);
    if (!result.isValid) {
      if (typeof formValidation !== 'undefined') {
        formValidation.showError(input, errorContainer, result.message);
      }
      return false;
    }

    if (typeof formValidation !== 'undefined') {
      formValidation.clearError(input, errorContainer);
    }
    return true;
  };

  const showFormAuthError = (message) => {
    const globalErrorContainer = document.getElementById('global-login-error');
    if (globalErrorContainer) {
      globalErrorContainer.textContent = message;
      globalErrorContainer.style.display = 'block';
    }
  };

  const clearFormAuthError = () => {
    const globalErrorContainer = document.getElementById('global-login-error');
    if (globalErrorContainer) {
      globalErrorContainer.textContent = '';
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    clearFormAuthError();

    const inputs = Array.from(activeForm.querySelectorAll('input'));
    const isFormValid = inputs.reduce(
      (isValid, input) => validateField(input) && isValid,
      true,
    );

    if (!isFormValid) return;

    const formData = new FormData(activeForm);
    const email = formData.get('email')?.trim();
    const password = formData.get('password');

    try {
      if (isSignup) {
        const fullname = document.getElementById('fullname')?.value || '';
        const bio = document.getElementById('bio')?.value || '';

        const result = await registerUser(email, password, fullname, bio);

        if (!result.success) {
          showFormAuthError(result.message);
          return;
        }

        const loginResult = await loginUser(email, password);
        if (loginResult.success) window.location.href = '../pages/perfil.html';
        else alert('Erro ao criar sessão. Tente fazer login novamente.');
      } else {
        const result = await loginUser(email, password);
        if (!result.success) {
          showFormAuthError(result.message);
          return;
        }
        window.location.href = '../pages/perfil.html';
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado. Tente novamente.');
    }
  };

  if (activeForm) {
    activeForm.addEventListener('submit', handleFormSubmit);

    activeForm.querySelectorAll('input').forEach((input) => {
      input.addEventListener('focusout', () => {
        if (input.value.trim() !== '') {
          validateField(input);
        }
      });
      input.addEventListener('input', clearFormAuthError);
    });
  }

  window.auth = {
    isLoggedIn: () => getSession() !== null,
    getCurrentUser: () => {
      const session = getSession();
      return session
        ? { email: session.email, fullname: session.fullname }
        : null;
    },
    logoutUser: () => clearSession(),
    getSession: getSession,
    updateProfile: (email, updates) => updateProfile(email, updates),
    getUsers: getUsers,
  };
})();
