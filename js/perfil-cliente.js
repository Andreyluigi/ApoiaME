//perfil-cliente.js
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById('form-perfil-cliente');
    const inputFoto = document.getElementById('cliente-foto-input');
    const previewFoto = document.getElementById('cliente-foto-preview');
    const inputDescricao = document.getElementById('cliente-descricao');
    const inputTelefone = document.getElementById('cliente-telefone');
    const btnSalvar = document.getElementById('btn-salvar-perfil');
    
    // Armazena os valores originais
    let fotoOriginal = previewFoto.src;
    let descricaoOriginal = inputDescricao.value;
    let telefoneOriginal = inputTelefone.value;
    // --- LÓGICA DE PREVIEW DA FOTO ---
    inputFoto?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewFoto.src = e.target.result;
                verificarMudancas(); // Verifica se algo mudou
            }
            reader.readAsDataURL(file);
        }
    });

    // --- LÓGICA DE HABILITAR O BOTÃO SALVAR ---
    inputDescricao?.addEventListener('input', verificarMudancas);
    inputTelefone?.addEventListener('input', verificarMudancas);

    function verificarMudancas() {

        const descricaoMudou = inputDescricao.value !== descricaoOriginal;
        const fotoMudou = previewFoto.src !== fotoOriginal;
        const telefoneMudou = inputTelefone.value !== telefoneOriginal;

        if (descricaoMudou || fotoMudou || telefoneMudou) {
            btnSalvar.disabled = false;
        } else {
            btnSalvar.disabled = true;
        }
    }
    


    form?.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o envio padrão
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }
        
        // Desabilita o botão e mostra o spinner
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
        
        console.log("UI: Formulário válido, pronto para o auth.js salvar.");

    });
    
    // Validação Bootstrap
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
});