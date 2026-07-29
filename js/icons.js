class GoogleButton extends HTMLElement {
  connectedCallback() {
    const ariaText =
      this.getAttribute('aria-label') || 'Autenticar com o Google';

    this.innerHTML = `
      <button type="button" data-provider="Google" aria-label="${ariaText}">
      </button>
    `;
  }
}

customElements.define('google-button', GoogleButton);
