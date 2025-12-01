// Arquivo: js/perfil-fornecedor.firebase.js
// Lógica COMPLETA da página de perfil do fornecedor (Auth + DB + Mapa).
// ESTE ARQUIVO É UM MÓDULO.

// 1. IMPORTAÇÕES
// (Ajuste o caminho para seu firebase-init.js se necessário)
import { auth, db } from "./firebase-init.js"; 
import { 
    onAuthStateChanged, 
    updateProfile,
    signOut,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
    
// Importa a função de inicialização do mapa
import { inicializarMapaPerfil } from './perfil-fornecedor-mapa.js';


import {
    habilitarVerificacaoDeMudancas, 
    inicializarOlhinhos, 
    inicializarMascaras,
    inicializarValidacaoBootstrap,
    inicializarPreviewFoto,
    inicializarValidacaoSenha
} from '../js/perfil-fornecedor.js'; // (Use o nome correto do seu arquivo de UI)
// ==========================================================

// ==========================================================
// LÓGICA DO CLOUDINARY
// ==========================================================
const CLOUD_NAME = "dfyol5oig";
const UPLOAD_PRESET_PERFIL = "apoia-me-perfis"; 

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
const formPerfil = document.getElementById('form-perfil-fornecedor');
const formSenha = document.getElementById('form-mudar-senha');
const btnSalvarPerfil = document.getElementById('btn-salvar-perfil');
const btnSalvarSenha = document.getElementById('btn-salvar-senha');
const btnLogout = document.querySelector('.logout');
const userNameGreeting = document.getElementById('user-name');

// Campos do Formulário
const inputFoto = document.getElementById('fornecedor-foto-input');
const previewFoto = document.getElementById('fornecedor-foto-preview');
const inputDescricao = document.getElementById('fornecedor-descricao');
const inputNome = document.getElementById('fornecedor-nome');
const inputEmail = document.getElementById('fornecedor-email');
const inputCPF = document.getElementById('fornecedor-cpf');
const inputTelefone = document.getElementById('fornecedor-telefone');
const inputCEP = document.getElementById('fornecedor-cep');
const inputNumero = document.getElementById('fornecedor-numero');
const inputRaio = document.getElementById('fornecedor-raio');
const divCheckboxes = document.getElementById('categorias-checkboxes');
const spanStatus = document.getElementById('status-fornecedor');
const pStatusHelp = document.getElementById('status-help-text');

// Campos de Senha
const inputSenhaAntiga = document.getElementById('senha-antiga');
const inputSenhaNova = document.getElementById('senha-nova');

// --- Variáveis de Controle ---
let currentUser = null;
let novoArquivoDeFoto = null;

// Lista de categorias (deve ser a mesma do cadastro)
const LISTA_CATEGORIAS = [
    "Troca de gás", "Fazer feira", "Passear com cachorro", "Pequenos reparos",
    "Compras no mercado", "Buscar/Levar documentos", "Montagem de móveis",
    "Jardinagem e poda", "Instalação de TV/suporte", "Limpeza residencial", "Outros"
];

// --- 1. GATEKEEPER (Verifica se o usuário está logado) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // **CHAMA AS FUNÇÕES DE UI PRIMEIRO**
        inicializarOlhinhos();
        inicializarMascaras();
        inicializarValidacaoBootstrap();
        inicializarPreviewFoto();
        inicializarValidacaoSenha();
        
        // **DEPOIS CARREGA OS DADOS**
        await carregarDadosDoPerfil(user.uid);
        
        // **SÓ ENTÃO HABILITA A VERIFICAÇÃO DE MUDANÇAS**
        habilitarVerificacaoDeMudancas();

    } else {
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
            
            if(data.tipo !== 'fornecedor') {
                alert("Acesso negado.");
                window.location.href = "dashboardC.html";
                return;
            }

            // Preenche o Status
            if (data.status === 'ativo') {
                spanStatus.textContent = 'Ativo';
                spanStatus.className = 'badge bg-success';
                pStatusHelp.style.display = 'none';
            } else {
                spanStatus.textContent = 'Em Análise';
                spanStatus.className = 'badge bg-warning text-dark';
                pStatusHelp.style.display = 'block';
                formPerfil.querySelectorAll('input, textarea, select').forEach(el => {
                    if (el.id !== 'fornecedor-foto-input') { 
                         el.disabled = true;
                    }
                });
            }

            // Preenche campos não editáveis
            inputNome.value = data.nome || '';
            inputEmail.value = data.email || '';
            inputCPF.value = data.cpf || '';
            inputTelefone.value = data.telefone || '';
            
            // Preenche campos editáveis
            inputDescricao.value = data.descricao || '';
            previewFoto.src = data.fotoURL || '../arquivos/foto-perfil.jpg';
            
            if(userNameGreeting) userNameGreeting.textContent = data.nome.split(' ')[0];
            
            // Preenche as Áreas de Atuação (Checkboxes)
            divCheckboxes.innerHTML = '';
            const areasSalvas = new Set(data.areasAtuacao || []);
            LISTA_CATEGORIAS.forEach(cat => {
                const id = `cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const checked = areasSalvas.has(cat) ? 'checked' : '';
                divCheckboxes.innerHTML += `
                    <div class="col-md-6">
                        <label class="container custom-checkbox-label" for="${id}">${cat}
                            <input type="checkbox" class="area-atuacao-cb" value="${cat}" id="${id}" ${checked}>
                            <div class="checkmark"></div>
                        </label>
                    </div>
                `;
            });

            // **CHAMA O MAPA (Passando os dados)**
            inicializarMapaPerfil(data.enderecoAtuacao, data.raioAtuacao_km);
            
            // Salva os valores originais nos data attributes (para o ui.js)
            previewFoto.dataset.originalSrc = previewFoto.src;
            inputDescricao.dataset.originalValue = inputDescricao.value;
            inputCEP.dataset.originalValue = data.enderecoAtuacao?.cep || '';
            inputNumero.dataset.originalValue = data.enderecoAtuacao?.numero || '';
            inputRaio.dataset.originalValue = data.raioAtuacao_km;
            divCheckboxes.dataset.originalValue = JSON.stringify(Array.from(areasSalvas));

        } else {
            console.error("Documento do usuário não encontrado!");
            alert("Erro ao carregar seu perfil.");
            signOut(auth);
        }
    } catch (error) {
        console.error("Erro ao buscar dados do perfil:", error);
        alert("Erro ao carregar a página.");
    }
}

// --- 3. LÓGICA DE UI (Preview) ---
inputFoto?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        novoArquivoDeFoto = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            previewFoto.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
});


// --- 4. LÓGICA DE SUBMISSÃO (SALVAR MUDANÇAS) ---
formPerfil?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Remove a necessidade de verificar btnSalvarPerfil.disabled, pois será feito no finally
    if (!formPerfil.checkValidity() || !currentUser) {
        return;
    }
    
    const btnOriginalText = btnSalvarPerfil.innerHTML;
    btnSalvarPerfil.disabled = true;
    btnSalvarPerfil.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
        let novaFotoURL = null;
        
        // 1. Upload de Foto
        if (novoArquivoDeFoto) {
            novaFotoURL = await uploadParaCloudinary(
                novoArquivoDeFoto, 
                UPLOAD_PRESET_PERFIL, 
                `perfis/${currentUser.uid}`
            );
        }

        // 2. Coleta de Áreas
        const areasSelecionadas = [];
        document.querySelectorAll('#categorias-checkboxes input:checked').forEach(cb => {
            areasSelecionadas.push(cb.value);
        });
        
        // --- CORREÇÃO CRÍTICA DO GEOPÓINT ---
        const inputLat = document.getElementById('fornecedor-lat').value;
        const inputLng = document.getElementById('fornecedor-lng').value;
        
        const lat = parseFloat(inputLat);
        const lng = parseFloat(inputLng);
        
        let geopointData = null;
        
        if (!isNaN(lat) && !isNaN(lng)) {
            // Cria o objeto GeoPoint necessário para o Geo-Matchmaking
            geopointData = { _latitude: lat, _longitude: lng };
        }
        // ------------------------------------
        
        const dadosParaAtualizar = {
            descricao: inputDescricao.value,
            enderecoAtuacao: {
                cep: document.getElementById('fornecedor-cep').value,
                rua: document.getElementById('fornecedor-rua').value,
                numero: document.getElementById('fornecedor-numero').value,
                bairro: document.getElementById('fornecedor-bairro').value,
                cidade: document.getElementById('fornecedor-cidade').value,
                estado: document.getElementById('fornecedor-estado').value,
                
                // Mantém lat/lng como strings para compatibilidade de carregamento do mapa
                lat: inputLat || null, 
                lng: inputLng || null,
                
                // NOVO: Campo obrigatório para GeoQuery
                geopoint: geopointData 
            },
            raioAtuacao_km: parseInt(document.getElementById('fornecedor-raio').value, 10),
            areasAtuacao: areasSelecionadas,
            perfilAtualizadoEm: serverTimestamp() 
        };
        
        if (novaFotoURL) {
            dadosParaAtualizar.fotoURL = novaFotoURL;
            await updateProfile(auth.currentUser, { photoURL: novaFotoURL });
        }

        const userRef = doc(db, "usuarios", currentUser.uid);
        await updateDoc(userRef, dadosParaAtualizar);
        
        alert("Perfil atualizado com sucesso!");
        
        await carregarDadosDoPerfil(currentUser.uid); // Recarrega os dados originais

    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
        alert("Erro ao salvar: " + err.message);
    } finally {
        // Restaura o botão em qualquer cenário
        btnSalvarPerfil.disabled = false;
        btnSalvarPerfil.innerHTML = 'Salvar Alterações'; // Usa btnOriginalText se tiver sido salvo
        novoArquivoDeFoto = null;
    }
});


// --- 5. LÓGICA DE MUDAR SENHA ---
formSenha?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!formSenha.checkValidity() || !currentUser || btnSalvarSenha.disabled) {
        return;
    }

    const senhaAntiga = inputSenhaAntiga.value;
    const senhaNova = inputSenhaNova.value;

    btnSalvarSenha.disabled = true;
    btnSalvarSenha.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, senhaAntiga);
        await reauthenticateWithCredential(currentUser, credential);
        
        btnSalvarSenha.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
        await updatePassword(currentUser, senhaNova);

        alert("Sucesso! Sua senha foi alterada.");
        
        formSenha.reset();
        formSenha.classList.remove('was-validated');
        btnSalvarSenha.disabled = true;

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        if (error.code === 'auth/wrong-password') {
            alert("Erro: A senha antiga está incorreta.");
            inputSenhaAntiga.classList.add('is-invalid');
        } else if (error.code === 'auth/weak-password') {
            alert("Erro: A nova senha é muito fraca.");
            inputSenhaNova.classList.add('is-invalid');
        } else {
            alert("Ops! Ocorreu um erro. Tente novamente.");
        }
    } finally {
         btnSalvarSenha.innerHTML = 'Salvar Nova Senha';
         // O ui.js cuida de re-verificar o formulário
    }
});

