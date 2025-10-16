// =====================
// UI Login EntreGo (somente interface)
// =====================
(function () {
  const container  = document.getElementById('container-login');
  const btnIrCad   = document.getElementById('btn-ir-cadastro');
  const btnIrLogin = document.getElementById('btn-ir-login');
  

  // Overlay: alternar painéis
  function irParaCadastro() { container?.classList.add('direita-ativa'); }
  function irParaLogin()    { container?.classList.remove('direita-ativa'); }

  document.addEventListener('DOMContentLoaded', irParaCadastro);
  btnIrCad?.addEventListener('click', irParaCadastro);
  btnIrLogin?.addEventListener('click', irParaLogin);

  // Mostrar/ocultar senha (olhinho)
  document.querySelectorAll('.toggle-senha').forEach(btn => {
    btn.addEventListener('click', () => {
      const alvoId = btn.getAttribute('data-target');
      const input = document.getElementById(alvoId);
      if (!input) return;
      const novoTipo = input.type === 'password' ? 'text' : 'password';
      input.type = novoTipo;
      const icon = btn.querySelector('i');
      icon?.classList.toggle('bi-eye');
      icon?.classList.toggle('bi-eye-slash');
      btn.setAttribute('aria-label', novoTipo === 'password' ? 'Mostrar senha' : 'Ocultar senha');
    });
  });

  // Validação visual básica dos forms 
  function enableBSValidation(form) {
    form?.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  }
  enableBSValidation(document.getElementById('form-cadastro'));
  enableBSValidation(document.getElementById('form-login'));
})();
window.mostrarPainelSelecao = function() {
    container.classList.add("right-panel-active"); // Move o overlay para a esquerda

    // Esconde os painéis de login/cadastro
    document.querySelector('.bloco-login').style.display = 'none';
    document.querySelector('.bloco-cadastro').style.display = 'none';

    // Mostra e move o painel de seleção para a posição correta
    const painelSelecao = document.getElementById('painel-selecao-perfil');
    painelSelecao.style.display = 'flex';
    painelSelecao.style.transform = 'translateX(0)';

    // Move o conteúdo do extra-form para o novo painel
    const extraFormContent = document.getElementById('extra-form');
    if (extraFormContent) {
        painelSelecao.appendChild(extraFormContent);
        extraFormContent.style.display = 'block';
    }
};