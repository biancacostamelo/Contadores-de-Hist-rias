(() => {
  'use strict';

  const GOOGLE_CLIENT_ID =
    '767512924393-2401pkq0a4t6rjd7aam060ko62jledqu.apps.googleusercontent.com';
  const STORAGE_KEY_USERS = 'writersCommunity_users';
  const STORAGE_KEY_SESSION = 'writersCommunity_session';
  const SESSION_DURATION_MS = 60 * 60 * 1000;
  const PBKDF2_ITERATIONS = 600000;

  class User {
    constructor(
      emailHash,
      emailSaltHex,
      passwordHash,
      saltHex,
      fullname = '',
      bio = '',
    ) {
      this.emailHash = emailHash;
      this.emailSaltHex = emailSaltHex;
      this.passwordHash = passwordHash;
      this.saltHex = saltHex;
      this.fullname = fullname.trim();
      this.bio = bio.trim();
      this.createdAt = Date.now();
    }
  }

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

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  };

  const bufferToHex = (buffer) => {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const hexToBuffer = (hexString) => {
    const pairs = hexString.match(/[\da-f]{2}/gi) || [];
    return new Uint8Array(pairs.map((h) => parseInt(h, 16))).buffer;
  };

  const derivePasswordHash = async (password, saltBuffer) => {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const hashBuffer = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      256,
    );

    return bufferToHex(hashBuffer);
  };

  const deriveEmailHash = async (email) => {
    const encoder = new TextEncoder();
    const emailLower = email.toLowerCase().trim();
    const emailBuffer = encoder.encode(emailLower);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      emailBuffer,
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const hashBuffer = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: emailBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      256,
    );

    return bufferToHex(hashBuffer);
  };

  const resolveUserByEmail = async (emailOrHash) => {
    const users = getUsers();

    let storedUser = Object.values(users).find(
      (u) => u.emailHash === emailOrHash,
    );

    if (!storedUser) {
      const emailHash = await deriveEmailHash(emailOrHash);
      storedUser = Object.values(users).find((u) => u.emailHash === emailHash);
    }

    return storedUser || null;
  };

  const registerUser = async (email, password, fullname, bio) => {
    const users = getUsers();

    const emailHash = await deriveEmailHash(email);

    const existingUser = Object.values(users).find(
      (u) => u.emailHash === emailHash,
    );
    if (existingUser)
      return {
        success: false,
        message: 'Erro ao tentar se registar com este Email',
      };

    const saltBuffer = window.crypto.getRandomValues(new Uint8Array(16));
    const saltHex = bufferToHex(saltBuffer);
    const hashedPassword = await derivePasswordHash(password, saltBuffer);

    const displayName = fullname.trim() || 'Leitor Voraz';
    const displayBio = bio.trim() || 'Leitor Voraz';

    users[emailHash] = new User(
      emailHash,
      null,
      hashedPassword,
      saltHex,
      displayName,
      displayBio,
    );

    saveUsers(users);
    return { success: true, username: displayName };
  };

  const loginUser = async (email, password) => {
    const users = getUsers();

    const invalidAuthResponse = {
      success: false,
      message: 'E-mail ou senha incorretos.',
    };

    const storedUser = await resolveUserByEmail(email);

    if (!storedUser) return invalidAuthResponse;

    if (!storedUser.saltHex && !storedUser.passwordHash)
      return invalidAuthResponse;

    const saltBuffer = hexToBuffer(storedUser.saltHex);
    const calculatedHash = await derivePasswordHash(password, saltBuffer);

    if (calculatedHash !== storedUser.passwordHash) return invalidAuthResponse;

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    saveSession(
      token,
      storedUser.emailHash,
      storedUser.fullname || '',
      expiresAt,
    );
    return { success: true };
  };

  const updateProfile = async (emailOrHash, updates) => {
    const users = getUsers();

    const storedUser = await resolveUserByEmail(emailOrHash);

    if (!storedUser)
      return { success: false, message: 'Usuário não encontrado.' };

    if (updates.fullname && updates.fullname !== storedUser.fullname) {
      const existingUser = Object.values(users).find(
        (user) => user.fullname === updates.fullname.trim(),
      );
      if (existingUser && existingUser.emailHash !== storedUser.emailHash) {
        return {
          success: false,
          message: 'Este nome já está em uso por outro usuário.',
        };
      }
    }

    users[storedUser.emailHash] = { ...storedUser, ...updates };
    saveUsers(users);

    const session = getSession();
    if (session && session.email === storedUser.emailHash) {
      saveSession(
        session.token,
        storedUser.emailHash,
        updates.fullname || storedUser.fullname,
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

  const getGlobalErrorId = () =>
    isSignup ? 'global-signup-error' : 'global-login-error';

  const showFormAuthError = (message) => {
    const globalErrorContainer = document.getElementById(getGlobalErrorId());
    if (globalErrorContainer) {
      globalErrorContainer.textContent = message;
      globalErrorContainer.style.display = 'block';
    }
  };

  const clearFormAuthError = () => {
    const globalErrorContainer = document.getElementById(getGlobalErrorId());
    if (globalErrorContainer) {
      globalErrorContainer.textContent = '';
      globalErrorContainer.style.display = 'none';
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
    activeForm.addEventListener('focusout', (event) => {
      if (
        event.target.tagName === 'INPUT' &&
        event.target.value.trim() !== ''
      ) {
        validateField(event.target);
      }
    });

    activeForm.addEventListener('input', (event) => {
      if (event.target.tagName === 'INPUT') {
        clearFormAuthError();
      }
    });
  }

  const initGoogleClient = () => {
    if (typeof google === 'undefined') {
      const waitForGoogle = setInterval(() => {
        if (typeof google !== 'undefined') {
          clearInterval(waitForGoogle);
          runGoogleInit();
        }
      }, 100);
      return;
    }

    runGoogleInit();
  };

  const runGoogleInit = () => {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    document
      .querySelectorAll('google-button, [data-provider="Google"]')
      .forEach((buttonDiv) => {
        google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          locale: 'pt_BR',
          text: isSignup ? 'signup_with' : 'signin_with',
        });
      });
  };

  const handleCredentialResponse = async (response) => {
    if (!response.credential) return;

    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const email = payload.email;

      if (!email) {
        showFormAuthError('E-mail não disponível. Tente novamente.');
        return;
      }

      const storedUser = await resolveUserByEmail(email);

      if (!storedUser) {
        const displayName = payload.name || 'Leitor Voraz';
        const emailHash = await deriveEmailHash(email);
        users[emailHash] = new User(emailHash, null, '', '', displayName, '');
        saveUsers(users);
      }

      const token = crypto.randomUUID();
      const expiresAt = Date.now() + SESSION_DURATION_MS;
      saveSession(token, storedUser.emailHash, storedUser.fullname, expiresAt);
      window.location.href = '../pages/perfil.html';
    } catch (err) {
      console.error(err);
      showFormAuthError('Erro ao processar autenticação. Tente novamente.');
    }
  };

  const googleSignIn = () => {
    if (typeof google === 'undefined') return;

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        return;
      }
    });
  };

  const setupGoogleButtonListeners = () => {
    document
      .querySelectorAll('[data-provider="Google"], google-button')
      .forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          googleSignIn();
        });
      });
  };

  initGoogleClient();
  setupGoogleButtonListeners();

  window.auth = {
    isLoggedIn: () => getSession() !== null,
    getCurrentUser: () => {
      const session = getSession();
      if (!session) return null;
      const users = getUsers();
      const storedUser = Object.values(users).find(
        (u) => u.emailHash === session.email,
      );
      return storedUser
        ? { email: storedUser.emailHash, fullname: storedUser.fullname }
        : null;
    },
    logoutUser: () => {
      clearSession();
      window.dispatchEvent(new CustomEvent('authStateChange'));
    },
    getSession: getSession,
    updateProfile: (email, updates) => updateProfile(email, updates),
    getUsers: getUsers,
  };

  window.dispatchEvent(new CustomEvent('authReady'));
})();
