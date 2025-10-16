// Pega o container principal no escopo do script, tornando-o acessível
const container = document.getElementById('container-login');

// Lógica de animação do Overlay
const btnIrCad = document.getElementById('btn-ir-cadastro');
const btnIrLogin = document.getElementById('btn-ir-login');

if (btnIrCad && btnIrLogin && container) {
    btnIrCad.addEventListener('click', () => container.classList.add('direita-ativa'));
    btnIrLogin.addEventListener('click', () => container.classList.remove('direita-ativa'));
}

// Função para mostrar/ocultar senha (olhinho)
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
    });
});

// Validação visual dos formulários do Bootstrap
(function () {
    'use strict'
    var forms = document.querySelectorAll('.needs-validation')
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                form.classList.add('was-validated')
            }, false)
        })
})();

// NOVA FUNÇÃO GLOBAL PARA TRANSIÇÃO DE CADASTRO -> ESCOLHA DE PERFIL
window.mostrarPainelSelecao = function() {
    if (!container) {
        console.error("Container principal 'container-login' não encontrado.");
        return;
    }

    const extraFormContent = document.getElementById('extra-form');
    if (extraFormContent) {
        // Limpa o conteúdo atual do container e o substitui pela tela de seleção
        container.innerHTML = '';
        container.appendChild(extraFormContent);
        extraFormContent.style.display = 'block';
        
        // Ajusta o estilo do container para centralizar o novo conteúdo, removendo a animação
        container.style.transition = 'none';
        container.style.transform = 'none';
        container.style.opacity = '1';
        container.style.zIndex = '1';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        // Oculta o overlay que não é mais necessário
        const overlayContainer = document.querySelector('.container-overlay');
        if (overlayContainer) {
            overlayContainer.style.display = 'none';
        }
    }
};