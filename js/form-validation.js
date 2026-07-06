const formValidation = (() => {
  'use strict';

  const ok = () => ({ isValid: true, message: '' });
  const fail = (msg) => ({ isValid: false, message: msg });

  function validateEmail(value) {
    const trimmed = value?.trim() || '';
    if (!trimmed) return fail('O e-mail é obrigatório.');
    const pattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.+[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})*$/;
    if (!pattern.test(trimmed)) return fail('Insira um e-mail válido.');
    return ok();
  }

  function validatePasswordStrength(value) {
    const trimmed = value?.trim() || '';
    if (!trimmed) return fail('A senha é obrigatória.');
    if (trimmed.length < 8)
      return fail('A senha deve ter no mínimo 8 caracteres.');
    if (!/[0-9]/.test(trimmed))
      return fail('A senha deve conter pelo menos um número.');
    if (!/[!@#$%^&*()_+\-=~`{}[\]|'";:,.<>?]/.test(trimmed))
      return fail('A senha deve conter pelo menos um caractere especial.');
    return ok();
  }

  function validatePasswordLogin(value) {
    const trimmed = value?.trim() || '';
    if (!trimmed) return fail('A senha é obrigatória.');
    return ok();
  }

  function validatePasswordMatch(password, confirmation) {
    const confTrimmed = (confirmation || '').trim();
    if (!confTrimmed) return fail('A confirmação da senha é obrigatória.');
    if ((password || '').trim() !== confTrimmed)
      return fail('As senhas não coincidem.');
    return ok();
  }

  function validateTerms(isChecked) {
    return isChecked
      ? ok()
      : fail('Você deve aceitar os termos para continuar.');
  }

  const showError = (inputEl, errorContainer, message) => {
    if (!inputEl || !errorContainer) return;
    inputEl.classList.add('invalid');
    inputEl.setAttribute('aria-invalid', 'true');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  };

  const clearError = (inputEl, errorContainer) => {
    if (!inputEl || !errorContainer) return;
    inputEl.classList.remove('invalid');
    inputEl.removeAttribute('aria-invalid');
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
  };

  return {
    validateEmail,
    validatePasswordLogin,
    validatePasswordStrength,
    validatePasswordMatch,
    validateTerms,
    showError,
    clearError,
  };
})();
