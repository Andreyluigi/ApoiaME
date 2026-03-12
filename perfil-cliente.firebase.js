// Arquivo: js/perfil-cliente.firebase.js
// Lógica COMPLETA da página de perfil do cliente (UI + Auth + DB).
// ESTE ARQUIVO É UM MÓDULO.

// 1. IMPORTAÇÕES
import { auth, db } from "./firebase-init.js";
import { 
    onAuthStateChanged, 
    updateProfile,
    signOut ,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================================
// LÓGICA DO CLOUDINARY (Necessária para upload de fotos)
// ==========================================================
const CLOUD_NAME = "dfyol5oig"; // O seu cloud name
const UPLOAD_PRESET_PERFIL = "apoia-me-perfis"; // O seu preset de perfil

async function uploadParaCloudinary(file, uploadPreset, folder) {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);
    formData.append("cloud_name", CLOUD_NAME);
    try {
        const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });
        if (!resp.ok) throw new Error(`Falha no upload (HTTP ${resp.status})`);
        const data = await resp.json();
        return data.secure_url || null;
    } catch (err) {
        console.error("Erro no upload para Cloudinary:", err);
        throw new Error(`Falha no upload do arquivo: ${file.name}`);
    }
}
// ==========================================================
// FIM DO CLOUDINARY
// ==========================================================

// --- SELETORES DO DOM ---
const form = document.getElementById('form-perfil-cliente');
const inputFoto = document.getElementById('cliente-foto-input');
const previewFoto = document.getElementById('cliente-foto-preview');
const inputDescricao = document.getElementById('cliente-descricao');
const inputNome = document.getElementById('cliente-nome');
const inputEmail = document.getElementById('cliente-email');
const inputTelefone = document.getElementById('cliente-telefone');
const btnSalvar = document.getElementById('btn-salvar-perfil');
const btnLogout = document.getElementById('btn-logout');
const userNameGreeting = document.getElementById('user-name');
const formMudarSenha = document.getElementById('form-mudar-senha');
const inputSenhaAntiga = document.getElementById('senha-antiga');
const inputSenhaNova = document.getElementById('senha-nova');
const inputSenhaNovaConfirmar = document.getElementById('senha-nova-confirmar');
const btnSalvarSenha = document.getElementById('btn-salvar-senha');
const feedbackConfirmacao = document.getElementById('feedback-confirmacao');

// --- Variáveis de Controle ---
let currentUser = null;
let fotoOriginal = null;
let descricaoOriginal = null;
let telefoneOriginal = null;
let novoArquivoDeFoto = null; // Armazena o ARQUIVO da nova foto

// --- 1. GATEKEEPER (Verifica se o usuário está logado) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado
        currentUser = user;
        carregarDadosDoPerfil(user.uid);
    } else {
        // Usuário não está logado, chuta para o login
        window.location.href = "login.html";
    }
});

// --- 2. CARREGAR DADOS DO PERFIL ---
async function carregarDadosDoPerfil(uid) {
    try {
        const userRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Preenche os campos (editáveis e não-editáveis)
            inputNome.value = data.nome || 'Nome não definido';
            inputEmail.value = data.email || 'E-mail não definido';
            inputDescricao.value = data.descricao || '';
            inputTelefone.value = data.telefone || '';
            previewFoto.src = data.fotoURL || '../arquivos/foto-perfil.jpg'; // Caminho do placeholder
            
            // Preenche o "Olá, Nome" do header
            if(userNameGreeting) userNameGreeting.textContent = data.nome.split(' ')[0]; // Pega só o primeiro nome
            
            // Salva os valores originais para checar mudanças
            fotoOriginal = previewFoto.src;
            descricaoOriginal = inputDescricao.value;
            telefoneOriginal = inputTelefone.value;
            
        } else {
            console.error("Documento do usuário não encontrado no Firestore!");
            alert("Erro ao carregar seu perfil.");
        }
    } catch (error) {
        console.error("Erro ao buscar dados do perfil:", error);
        alert("Erro ao carregar a página.");
    }
}

// --- 3. LÓGICA DE UI (Preview e Habilitar Botão) ---

// Habilita o botão "Salvar" se algo mudou
function verificarMudancas() {
    const descricaoMudou = inputDescricao.value !== descricaoOriginal;
    const fotoMudou = !!novoArquivoDeFoto; // Verifica se um novo arquivo foi selecionado
    const telefoneMudou = inputTelefone.value !== telefoneOriginal;
    btnSalvar.disabled = !(descricaoMudou || fotoMudou || telefoneMudou);
}

// Listener para o input de descrição
inputDescricao?.addEventListener('input', verificarMudancas);
inputTelefone?.addEventListener('input', (e) => {
    // 1. Lógica da Máscara
    let value = e.target.value;
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    value = value.substring(0, 11); // Limita a 11 dígitos (DD) XXXXX-XXXX

    if (value.length > 10) {
        // (XX) XXXXX-XXXX
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (value.length > 7) {
        // (XX) XXXXX-XXX
        value = value.replace(/^(\d{2})(\d{5})(\d{1,3})$/, '($1) $2-$3');
    } else if (value.length > 2) {
        // (XX) XXXXX
        value = value.replace(/^(\d{2})(\d{1,5})$/, '($1) $2');
    } else if (value.length > 0) {
        // (XX
        value = value.replace(/^(\d{1,2})$/, '($1');
    }
    
    e.target.value = value; // Aplica o valor mascarado de volta ao input

    // 2. Chamar a verificação de mudanças (como antes)
    verificarMudancas();
});

// Listener para o preview da foto
inputFoto?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        novoArquivoDeFoto = file; // Salva o ARQUIVO
        
        // Gera o preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewFoto.src = e.target.result;
            verificarMudancas(); // Verifica se algo mudou
        }
        reader.readAsDataURL(file);
    }
});


// --- 4. LÓGICA DE SUBMISSÃO (SALVAR MUDANÇAS) ---
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity() || !currentUser) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
        let novaFotoURL = null;
        
        // 1. Fazer upload da nova foto (se houver)
        if (novoArquivoDeFoto) {
            novaFotoURL = await uploadParaCloudinary(
                novoArquivoDeFoto, 
                UPLOAD_PRESET_PERFIL, 
                `perfis/${currentUser.uid}`
            );
        }

        // 2. Preparar os dados para atualizar no Firestore
        const dadosParaAtualizar = {
            descricao: inputDescricao.value,
            telefone: inputTelefone.value
        };
        if (novaFotoURL) {
            dadosParaAtualizar.fotoURL = novaFotoURL;
        }

        // 3. Atualizar o documento no Firestore
        const userRef = doc(db, "usuarios", currentUser.uid);
        await updateDoc(userRef, dadosParaAtualizar);

        // 4. Atualizar o perfil de Autenticação (se a foto mudou)
        if (novaFotoURL) {
            await updateProfile(auth.currentUser, { 
                photoURL: novaFotoURL 
            });
        }
        
        // 5. Sucesso!
        alert("Perfil atualizado com sucesso!");
        
        // Atualiza os valores originais para o botão desabilitar novamente
        descricaoOriginal = inputDescricao.value;
        fotoOriginal = previewFoto.src;
        novoArquivoDeFoto = null;
        telefoneOriginal = inputTelefone.value;

    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
        alert("Erro ao salvar: " + err.message);
    } finally {
        // Restaura o botão
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = 'Salvar Alterações';
    }
});


// --- 5. LÓGICA DE LOGOUT ---
btnLogout?.addEventListener('click', async () => {
    if (confirm("Tem certeza que deseja sair?")) {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    }
});

// (Lógica de validação do Bootstrap, se necessário)
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

// --- 6. LÓGICA DE MUDAR SENHA ---

// Função de verificação em tempo real para habilitar/desabilitar o botão
function verificarFormularioSenha() {
    const senhaAntigaValida = inputSenhaAntiga.value.length > 0;
    const senhaNovaValida = inputSenhaNova.value.length >= 6;
    const senhasConferem = inputSenhaNova.value === inputSenhaNovaConfirmar.value;

    // Habilita o botão APENAS se todas as condições forem verdadeiras
    btnSalvarSenha.disabled = !(senhaAntigaValida && senhaNovaValida && senhasConferem);

    // --- Feedback visual em tempo real para o usuário ---
    if (inputSenhaNovaConfirmar.value.length > 0 && inputSenhaNova.value.length > 0) {
        if (!senhasConferem) {
            inputSenhaNovaConfirmar.classList.add('is-invalid');
            feedbackConfirmacao.textContent = "As senhas não conferem.";
        } else {
            inputSenhaNovaConfirmar.classList.remove('is-invalid');
        }
    } else {
         inputSenhaNovaConfirmar.classList.remove('is-invalid');
    }

    if (inputSenhaNova.value.length > 0 && !senhaNovaValida) {
        inputSenhaNova.classList.add('is-invalid');
    } else {
        inputSenhaNova.classList.remove('is-invalid');
    }
}

// Adiciona os "Ouvintes" (Event Listeners) para os campos de senha
inputSenhaAntiga?.addEventListener('input', verificarFormularioSenha);
inputSenhaNova?.addEventListener('input', verificarFormularioSenha);
inputSenhaNovaConfirmar?.addEventListener('input', verificarFormularioSenha);


// Lógica de SUBMIT (quando o botão é clicado)
formMudarSenha?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const senhaAntiga = inputSenhaAntiga.value;
    const senhaNova = inputSenhaNova.value;

    if (!currentUser) {
        alert("Erro: Você não está logado.");
        return;
    }

    btnSalvarSenha.disabled = true;
    btnSalvarSenha.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';

    try {
        // 1. Reautenticação
        const credential = EmailAuthProvider.credential(currentUser.email, senhaAntiga);
        await reauthenticateWithCredential(currentUser, credential);
        
        // 2. Atualizar a Senha
        btnSalvarSenha.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
        await updatePassword(currentUser, senhaNova);

        // 3. Sucesso!
        alert("Sucesso! Sua senha foi alterada.");
        
        formMudarSenha.reset();
        formMudarSenha.classList.remove('was-validated');
        btnSalvarSenha.disabled = true;

    } catch (error) {
        // 4. Lidar com Erros
        console.error("Erro ao alterar senha:", error);
        
        if (error.code === 'auth/wrong-password') {
            alert("Erro: A senha antiga está incorreta.");
            inputSenhaAntiga.classList.add('is-invalid');
        } else if (error.code === 'auth/weak-password') {
            alert("Erro: A nova senha é muito fraca. Use pelo menos 6 caracteres.");
            inputSenhaNova.classList.add('is-invalid');
        } else if (error.code === 'auth/requires-recent-login') {
            alert("Sessão Expirada. Por segurança, faça login novamente para alterar sua senha.");
            window.location.href = "login.html"; // Redireciona após o alerta
        } else {
            alert("Ops! Ocorreu um erro inesperado. Tente novamente.");
        }
    } finally {
        // Garante que o botão volte ao normal se houver um erro
        if (!formMudarSenha.disabled) { 
            btnSalvarSenha.innerHTML = 'Salvar Nova Senha';
            verificarFormularioSenha(); 
        }
    }
});