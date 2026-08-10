(() => {
  'use strict';

  const STORAGE_KEY_USERS = 'writersCommunity_users';
  const STORAGE_KEY_RESET = 'writersCommunity_reset';
  const RESET_EXPIRY_MS = 10 * 60 * 1000;

  class ForgotPasswordManager {
    constructor() {
      this.state = {
        currentStep: 'email',
        emailHash: null,
        resetCode: null,
        resetExpiry: null,
      };

      this.steps = {
        email: document.getElementById('step-email'),
        code: document.getElementById('step-code'),
        password: document.getElementById('step-password'),
        success: document.getElementById('step-success'),
      };

      this.forms = {
        email: document.getElementById('emailForm'),
        code: document.getElementById('codeForm'),
        password: document.getElementById('passwordForm'),
        success: document.getElementById('successForm'),
      };

      this.codeModal = document.getElementById('codeModal');
      this.codeValueDisplay = document.getElementById('codeValueDisplay');
      this.confirmCodeBtn = document.getElementById('confirmCodeBtn');
      this.resendCodeModalBtn = document.getElementById('resendCodeModalBtn');
      this.closeCodeModalBtn = document.getElementById('closeCodeModalBtn');
    }

    generateResetCode() {
      return crypto.getRandomValues(new Uint32Array(1))?.[0] % 999999;
    }

    bufferToHex(buffer) {
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    hexToBuffer(hexString) {
      const pairs = hexString.match(/[\da-f]{2}/gi) || [];
      return new Uint8Array(pairs.map((h) => parseInt(h, 16))).buffer;
    }

    async derivePasswordHash(password, saltBuffer) {
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
          iterations: 600000,
          hash: 'SHA-256',
        },
        baseKey,
        256,
      );

      return this.bufferToHex(hashBuffer);
    }

    async deriveEmailHash(email) {
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
          iterations: 600000,
          hash: 'SHA-256',
        },
        baseKey,
        256,
      );

      return this.bufferToHex(hashBuffer);
    }

    getUsers() {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      return raw ? JSON.parse(raw) : {};
    }

    saveUsers(users) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }

    showStep(stepName) {
      this.state.currentStep = stepName;

      Object.entries(this.steps).forEach(([key, element]) => {
        if (!element) return;
        element.classList.toggle('is-hidden', key !== stepName);
      });
    }

    openCodeModal(code) {
      this.codeValueDisplay.textContent = code;
      this.codeModal?.classList.add('modal-visible');
      this.codeModal?.setAttribute('aria-hidden', 'false');
      this.confirmCodeBtn?.focus();
    }

    closeCodeModal() {
      this.codeModal?.classList.remove('modal-visible');
      this.codeModal?.setAttribute('aria-hidden', 'true');
    }

    showError(globalId, message) {
      const container = document.getElementById(globalId);
      if (container) {
        container.textContent = message;
        container.style.display = 'block';
      }
    }

    clearError(globalId) {
      const container = document.getElementById(globalId);
      if (container) {
        container.textContent = '';
        container.style.display = 'none';
      }
    }

    async handleEmailSubmit(event) {
      event.preventDefault();
      this.clearError('global-forgot-error');

      const emailInput = document.getElementById('email-forgot');
      const errorContainer = document.getElementById('email-forgot-error');
      const emailValue = emailInput.value?.trim();

      if (!emailValue) {
        this.showError('global-forgot-error', 'O e-mail é obrigatório.');
        return;
      }

      const emailPattern =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.+[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})*$/;
      if (!emailPattern.test(emailValue)) {
        this.showError('global-forgot-error', 'Insira um e-mail válido.');
        return;
      }

      const users = this.getUsers();
      let storedUser = null;

      for (const key in users) {
        if (users[key].emailHash === emailValue) {
          storedUser = users[key];
          break;
        }
      }

      if (!storedUser) {
        const emailHash = await this.deriveEmailHash(emailValue);
        for (const key in users) {
          if (users[key].emailHash === emailHash) {
            storedUser = users[key];
            break;
          }
        }
      }

      if (!storedUser) {
        this.showError(
          'global-forgot-error',
          'Este e-mail não está cadastrado na nossa plataforma.',
        );
        return;
      }

      const code = this.generateResetCode().toString().padStart(6, '0');
      this.state.emailHash = storedUser.emailHash;
      this.state.resetCode = code;
      this.state.resetExpiry = Date.now() + RESET_EXPIRY_MS;

      localStorage.setItem(
        STORAGE_KEY_RESET,
        JSON.stringify({
          emailHash: this.state.emailHash,
          code: this.state.resetCode,
          expiresAt: this.state.resetExpiry,
        }),
      );

      console.log(`[Forgot Password] Reset code for ${emailValue}: ${code}`);

      this.openCodeModal(code);
    }

    handleCodeSubmit(event) {
      event.preventDefault();
      this.clearError('global-code-error');

      const codeInput = document.getElementById('reset-code');
      const errorContainer = document.getElementById('reset-code-error');
      const enteredCode = codeInput.value?.trim();

      if (!enteredCode || enteredCode.length !== 6) {
        this.showError('global-code-error', 'O código deve ter exatamente 6 dígitos.');
        return;
      }

      const storedReset = localStorage.getItem(STORAGE_KEY_RESET);
      if (!storedReset) {
        this.showError('global-code-error', 'Código expirado. Solicite um novo.');
        this.showStep('email');
        return;
      }

      const resetData = JSON.parse(storedReset);

      if (Date.now() > resetData.expiresAt) {
        this.showError('global-code-error', 'Código expirado. Solicite um novo.');
        this.showStep('email');
        return;
      }

      if (resetData.code !== enteredCode) {
        this.showError(
          'global-code-error',
          'Código inválido. Verifique e tente novamente.',
        );
        return;
      }

      this.clearError('global-code-error');
      errorContainer.textContent = '';
      this.showStep('password');
      document.getElementById('new-password')?.focus();
    }

    async handlePasswordSubmit(event) {
      event.preventDefault();
      this.clearError('global-password-error');

      const newPasswordInput = document.getElementById('new-password');
      const confirmInput = document.getElementById('confirm-password');
      const newPass = newPasswordInput.value?.trim() || '';
      const confirmPass = confirmInput.value?.trim() || '';

      if (!newPass) {
        this.showError('global-password-error', 'A nova senha é obrigatória.');
        return;
      }

      if (newPass.length < 8) {
        this.showError(
          'global-password-error',
          'A senha deve ter no mínimo 8 caracteres.',
        );
        return;
      }

      if (!/[0-9]/.test(newPass)) {
        this.showError(
          'global-password-error',
          'A senha deve conter pelo menos um número.',
        );
        return;
      }

      if (!/[!@#$%^&*()_+\-=~`{}[\]|'";:,.<>?]/.test(newPass)) {
        this.showError(
          'global-password-error',
          'A senha deve conter pelo menos um caractere especial.',
        );
        return;
      }

      if (newPass !== confirmPass) {
        this.showError('global-password-error', 'As senhas não coincidem.');
        return;
      }

      const users = this.getUsers();
      const storedUser = Object.values(users).find(
        (u) => u.emailHash === this.state.emailHash,
      );

      if (!storedUser) {
        this.showError('global-password-error', 'Usuário não encontrado.');
        return;
      }

      const newSaltBuffer = window.crypto.getRandomValues(new Uint8Array(16));
      const newSaltHex = this.bufferToHex(newSaltBuffer);
      const newHash = await this.derivePasswordHash(newPass, newSaltBuffer);

      users[storedUser.emailHash] = {
        ...storedUser,
        saltHex: newSaltHex,
        passwordHash: newHash,
      };

      this.saveUsers(users);

      localStorage.removeItem(STORAGE_KEY_RESET);

      this.clearError('global-password-error');
      this.showStep('success');
    }

    handleResendCode() {
      this.clearError('global-code-error');

      const code = this.generateResetCode().toString().padStart(6, '0');
      this.state.resetCode = code;
      this.state.resetExpiry = Date.now() + RESET_EXPIRY_MS;

      localStorage.setItem(
        STORAGE_KEY_RESET,
        JSON.stringify({
          emailHash: this.state.emailHash,
          code: this.state.resetCode,
          expiresAt: this.state.resetExpiry,
        }),
      );

      console.log(`[Forgot Password] New reset code: ${code}`);

      this.openCodeModal(code);
    }

    handleSuccessSubmit() {
      window.location.href = '../pages/login.html';
    }

    init() {
      if (!this.forms.email || !this.forms.code || !this.forms.password) return;

      this.forms.email.addEventListener('submit', (e) => this.handleEmailSubmit(e));
      this.forms.code.addEventListener('submit', (e) => this.handleCodeSubmit(e));
      this.forms.password.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
      this.forms.success.addEventListener('submit', () => this.handleSuccessSubmit());

      if (this.confirmCodeBtn) {
        this.confirmCodeBtn.addEventListener('click', () => {
          this.closeCodeModal();
          this.showStep('code');
          document.getElementById('reset-code')?.focus();
        });
      }

      if (this.resendCodeModalBtn) {
        this.resendCodeModalBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleResendCode();
        });
      }

      if (this.closeCodeModalBtn) {
        this.closeCodeModalBtn.addEventListener('click', () => {
          this.closeCodeModal();
        });
      }

      this.codeModal?.addEventListener('click', (e) => {
        if (e.target === this.codeModal) {
          this.closeCodeModal();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (
          e.key === 'Escape' &&
          this.codeModal?.classList.contains('modal-visible')
        ) {
          this.closeCodeModal();
        }
      });

      this.forms.email?.querySelectorAll('input').forEach((input) => {
        input.addEventListener('focus', () => this.clearError('global-forgot-error'));
      });

      this.forms.code?.querySelectorAll('input').forEach((input) => {
        input.addEventListener('focus', () => this.clearError('global-code-error'));
      });

      this.forms.password?.querySelectorAll('input').forEach((input) => {
        input.addEventListener('focus', () => this.clearError('global-password-error'));
      });

      this.showStep('email');
    }
  }

  const manager = new ForgotPasswordManager();
  manager.init();
})();
