// Arquivo: js/perfil-fornecedor.js
// Responsável pela UI: máscaras, "olhinho", validação de formulário.
// ESTE ARQUIVO É UM MÓDULO.

// --- Seletores do DOM (são buscados quando as funções são chamadas) ---
const $ = (id) => document.getElementById(id);

// --- 1. LÓGICA DO "OLHINHO" ---
export function inicializarOlhinhos() {
    document.querySelectorAll('.toggle-senha').forEach(btn => {
        btn.addEventListener('click', () => {
            const alvoId = btn.getAttribute('data-target');
            const input = $(alvoId);
            if (!input) return;
            const novoTipo = input.type === 'password' ? 'text' : 'password';
            input.type = novoTipo;
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        });
    });
}

// --- 2. LÓGICA DE MÁSCARAS ---
export function inicializarMascaras() {
    const cpfInput = $('fornecedor-cpf');
    const telInput = $('fornecedor-telefone');
    const cepInput = $('fornecedor-cep');

    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, "").substring(0, 8);
            valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
            e.target.value = valor;
        });
    }
    
    // (Campos CPF e Telefone são readonly, então as máscaras não são necessárias
    // mas deixamos a do CEP pois ele é editável)
}

// --- 3. LÓGICA DE HABILITAR BOTÕES ---
function verificarMudancasPerfil() {
    const formPerfil = $('form-perfil-fornecedor');
    if (!formPerfil) return;
    
    let mudou = false;
    
    const previewFoto = $('fornecedor-foto-preview');
    const inputDescricao = $('fornecedor-descricao');
    const inputCEP = $('fornecedor-cep');
    const inputNumero = $('fornecedor-numero');
    const inputRaio = $('fornecedor-raio');
    const divCheckboxes = $('categorias-checkboxes');
    
    if (previewFoto.src !== previewFoto.dataset.originalSrc) mudou = true;
    if (inputDescricao.value !== inputDescricao.dataset.originalValue) mudou = true;
    if (inputCEP.value !== inputCEP.dataset.originalValue) mudou = true;
    if (inputNumero.value !== inputNumero.dataset.originalValue) mudou = true;
    if (inputRaio.value !== inputRaio.dataset.originalValue) mudou = true;
    
    const areasOriginais = JSON.parse(divCheckboxes.dataset.originalValue || '[]');
    const areasNovas = [];
    document.querySelectorAll('#categorias-checkboxes input:checked').forEach(cb => areasNovas.push(cb.value));
    if (areasOriginais.length !== areasNovas.length || !areasOriginais.every(area => areasNovas.includes(area))) {
        mudou = true;
    }

    $('btn-salvar-perfil').disabled = !mudou;
}

export function habilitarVerificacaoDeMudancas() {
    console.log("UI: Habilitando verificação de mudanças.");
    $('fornecedor-descricao')?.addEventListener('input', verificarMudancasPerfil);
    $('fornecedor-cep')?.addEventListener('input', verificarMudancasPerfil);
    $('fornecedor-numero')?.addEventListener('input', verificarMudancasPerfil);
    $('fornecedor-raio')?.addEventListener('input', verificarMudancasPerfil);
    $('categorias-checkboxes')?.addEventListener('change', verificarMudancasPerfil);
    $('fornecedor-foto-input')?.addEventListener('change', verificarMudancasPerfil);
}

function verificarFormularioSenha() {
    const formSenha = $('form-mudar-senha');
    if (!formSenha) return;
    
    const senhaAntigaValida = $('senha-antiga').value.length > 0;
    const senhaNovaValida = $('senha-nova').value.length >= 6;
    const senhasConferem = $('senha-nova').value === $('senha-nova-confirmar').value;
    
    $('btn-salvar-senha').disabled = !(senhaAntigaValida && senhaNovaValida && senhasConferem);
    
    const confirmaInput = $('senha-nova-confirmar');
    const feedback = $('feedback-confirmacao');
    if (confirmaInput.value.length > 0 && $('senha-nova').value.length > 0) {
         if (!senhasConferem) {
            confirmaInput.classList.add('is-invalid');
            if (feedback) feedback.textContent = "As senhas não conferem.";
         } else {
            confirmaInput.classList.remove('is-invalid');
         }
    } else {
        confirmaInput.classList.remove('is-invalid');
    }
}

export function inicializarValidacaoSenha() {
    $('form-mudar-senha')?.addEventListener('input', verificarFormularioSenha);
    verificarFormularioSenha(); // Roda uma vez para desabilitar o botão
}

// --- 4. VALIDAÇÃO BOOTSTRAP (Geral) ---
export function inicializarValidacaoBootstrap() {
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
}

// --- 5. PREVIEW DA FOTO ---
function setupProfilePicPreview(inputId, previewId) {
    const input = $(inputId);
    const preview = $(previewId);
    
    input?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
            }
            reader.readAsDataURL(file);
            verificarMudancasPerfil();
        }
    });
}

export function inicializarPreviewFoto() {
    setupProfilePicPreview('fornecedor-foto-input', 'fornecedor-foto-preview');
}