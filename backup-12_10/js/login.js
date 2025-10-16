// Pega o container principal logo no início para que fique acessível
const container = document.getElementById('container-login');

// Lógica de animação do Overlay
const btnIrCad = document.getElementById('btn-ir-cadastro');
const btnIrLogin = document.getElementById('btn-ir-login');

function irParaCadastro() {
    container?.classList.add('direita-ativa');
}

function irParaLogin() {
    container?.classList.remove('direita-ativa');
}

// Eventos para os botões de troca de painel
btnIrCad?.addEventListener('click', irParaCadastro);
btnIrLogin?.addEventListener('click', irParaLogin);

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

    // Esconde os formulários e o overlay
    const blocoLogin = document.querySelector('.bloco-login');
    const blocoCadastro = document.querySelector('.bloco-cadastro');
    const containerOverlay = document.querySelector('.container-overlay');

    if (blocoLogin) blocoLogin.style.display = 'none';
    if (blocoCadastro) blocoCadastro.style.display = 'none';
    if (containerOverlay) containerOverlay.style.display = 'none';

    // Move o conteúdo do extra-form para o container principal e o exibe
    const extraFormContent = document.getElementById('extra-form');
    if (extraFormContent) {
        container.innerHTML = ''; // Limpa o container
        container.appendChild(extraFormContent);
        extraFormContent.style.display = 'block';
        
        // Ajusta o estilo do container para centralizar o novo conteúdo
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
    }
};