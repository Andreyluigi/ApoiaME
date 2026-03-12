// Arquivo: js/cadastro.js
// Responsável pela UI: etapas, máscaras, "olhinho" e ViaCEP.
// Este é um SCRIPT NORMAL (NÃO MÓDULO).


document.addEventListener("DOMContentLoaded", () => {

    // Mapeamento de todas as seções (etapas)
    const etapas = {
        selecao: document.getElementById('etapa-selecao-perfil'),
        formCliente: document.getElementById('etapa-form-cliente'),
        formFornecedor: document.getElementById('etapa-form-fornecedor'),
        sucesso: document.getElementById('etapa-sucesso')
    };

    // Mapeamento dos botões de navegação
    const botoes = {
        escolheCliente: document.getElementById('btn-escolhe-cliente'),
        escolheFornecedor: document.getElementById('btn-escolhe-fornecedor'),
        voltarParaSelecao: document.querySelectorAll('.btn-voltar')
    };

    // --- Funções de Controle de Navegação ---
    function mostrarEtapa(etapaId) {
        for (let key in etapas) {
            if (etapas[key]) {
                etapas[key].style.display = 'none';
            }
        }
        if (etapas[etapaId]) {
            etapas[etapaId].style.display = 'block';
        } else {
            console.error("Etapa não encontrada:", etapaId);
        }
    }

    // --- Adicionando os Event Listeners ---

    botoes.escolheCliente?.addEventListener('click', () => {
        mostrarEtapa('formCliente');
    });

    botoes.escolheFornecedor?.addEventListener('click', () => {
        // 1. Mostra a seção
        mostrarEtapa('formFornecedor');
        
        // 2. !! MUDANÇA CRÍTICA !!
        // Dispara um evento customizado para avisar os módulos (o mapa)
        // que é hora de inicializar.
        document.dispatchEvent(new CustomEvent('ApoiaMe:inicializarMapa'));
    });

    botoes.voltarParaSelecao.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetEtapa = e.target.getAttribute('data-target') || 'selecao';
            mostrarEtapa(targetEtapa);
        });
    });

    
    // ==========================================================
    // LÓGICA DO "OLHINHO" (MOSTRAR/OCULTAR SENHA)
    // ==========================================================
    document.querySelectorAll('.toggle-senha').forEach(btn => {
        btn.addEventListener('click', () => {
            const alvoId = btn.getAttribute('data-target');
            const input = document.getElementById(alvoId);
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
    // ==========================================================
    // FIM DA LÓGICA DO "OLHINHO"
    // ==========================================================


    // ==========================================================
    // LÓGICA DE MÁSCARAS (CPF, CEP, TELEFONE)
    // ==========================================================
    
    // Máscara de CPF (###.###.###-##)
    document.getElementById('fornecedor-cpf')?.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, "");
        valor = valor.substring(0, 11);
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = valor;
    });

    // Máscara de CEP (#####-###)
    document.getElementById('fornecedor-cep')?.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, "");
        valor = valor.substring(0, 8);
        valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
        e.target.value = valor;
    });

    // Máscara de Telefone Celular ((##) #####-####)
    document.getElementById('fornecedor-telefone')?.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, "");
        valor = valor.substring(0, 11); 
        if (valor.length === 11) {
            valor = valor.replace(/(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else if (valor.length === 10) {
             valor = valor.replace(/(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
        } else if (valor.length > 2) {
            valor = valor.replace(/(\d{2})(\d)/, "($1) $2");
        } else if (valor.length > 0) {
            valor = valor.replace(/(\d{2})/, "($1)");
        }
        e.target.value = valor;
    });
    // ==========================================================
    // FIM DA LÓGICA DE MÁSCARAS
    // ==========================================================


    // ==========================================================
    // LÓGICA DE PREVIEW DA FOTO DE PERFIL
    // ==========================================================
    
    function setupProfilePicPreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        input?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                }
                reader.readAsDataURL(file);
                
                if(inputId === 'fornecedor-foto-input') {
                     const feedback = document.getElementById('foto-fornecedor-feedback');
                     if(feedback) feedback.textContent = ''; 
                     input.setCustomValidity(""); 
                }
            }
        });
    }

    setupProfilePicPreview('cliente-foto-input', 'cliente-foto-preview');
    setupProfilePicPreview('fornecedor-foto-input', 'fornecedor-foto-preview');
    
    // ==========================================================
    // FIM DA LÓGica DE PREVIEW
    // ==========================================================


    // --- Lógica de Validação e Submissão ---
    // (Esta parte é controlada pelo cadastro-auth.js)
    
    const formCliente = document.getElementById('form-cadastro-cliente');
    const formFornecedor = document.getElementById('form-cadastro-fornecedor');

    // Validação de senhas do Cliente
    formCliente?.addEventListener('submit', (e) => {
        const senha = document.getElementById('cliente-senha').value;
        const confirmaSenha = document.getElementById('cliente-senha-confirma').value;
        const confirmaSenhaInput = document.getElementById('cliente-senha-confirma');
        const feedbackSenha = confirmaSenhaInput.parentElement.querySelector('.invalid-feedback');

        if (senha !== confirmaSenha) {
            confirmaSenhaInput.setCustomValidity("As senhas não conferem"); 
            if (feedbackSenha) feedbackSenha.textContent = "As senhas não conferem.";
        } else {
            confirmaSenhaInput.setCustomValidity(""); 
            if (feedbackSenha) feedbackSenha.textContent = "As senhas precisam ser iguais.";
        }
    });

    // Validação de senhas do Fornecedor
    formFornecedor?.addEventListener('submit', (e) => {
        const senhaF = document.getElementById('fornecedor-senha').value;
        const confirmaSenhaF = document.getElementById('fornecedor-senha-confirma').value;
        const confirmaSenhaInputF = document.getElementById('fornecedor-senha-confirma');
        const feedbackSenhaF = confirmaSenhaInputF.parentElement.querySelector('.invalid-feedback');
        
        if (senhaF !== confirmaSenhaF) {
            confirmaSenhaInputF.setCustomValidity("As senhas não conferem");
            if (feedbackSenhaF) feedbackSenhaF.textContent = "As senhas não conferem.";
        } else {
            confirmaSenhaInputF.setCustomValidity("");
            if (feedbackSenhaF) feedbackSenhaF.textContent = "As senhas precisam ser iguais.";
        }
        
        // Validação dos checkboxes de categoria
        const areasSelecionadas = document.querySelectorAll('#categorias-checkboxes .container input:checked'); // <-- MUDANÇA AQUI
        const minSelecao = parseInt(document.getElementById('categorias-checkboxes').dataset.minSelecionado, 10);
        const errorMsg = document.getElementById('categorias-error');
        if (areasSelecionadas.length < minSelecao) {
             e.preventDefault(); 
            errorMsg.style.display = 'block';
        } else {
            errorMsg.style.display = 'none';
        }
        
        // Validação da foto de perfil do Fornecedor
        const fotoInput = document.getElementById('fornecedor-foto-input');
        const feedbackFoto = document.getElementById('foto-fornecedor-feedback');
        if (fotoInput.files.length === 0) {
             e.preventDefault(); 
            fotoInput.setCustomValidity("Uma foto de perfil é obrigatória.");
            if(feedbackFoto) feedbackFoto.textContent = 'Uma foto de perfil é obrigatória.';
        } else {
             fotoInput.setCustomValidity("");
             if(feedbackFoto) feedbackFoto.textContent = '';
        }

    });


    // Validação visual geral do Bootstrap (para ambos os formulários)
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