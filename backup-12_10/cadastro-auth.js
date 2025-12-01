// Arquivo: js/cadastro-auth.js
// Responsável pela lógica de AUTENTICAÇÃO e BANCO DE DADOS do cadastro.
// Este arquivo é um MÓDULO.

// 1. IMPORTAÇÕES
// Importa os serviços do seu arquivo de inicialização (assumindo firebase-init.js)
import { auth, db } from "./firebase-init.js";
import { 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    setDoc, 
    doc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

async function getLatLng(cep) {
    // 1. Tenta BrasilAPI
    try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (res.ok) {
            const data = await res.json();
            if (data.location?.coordinates?.latitude && data.location.coordinates.longitude) {
                return { lat: data.location.coordinates.latitude, lng: data.location.coordinates.longitude };
            }
        }
    } catch (e) { /* Ignora */ }
    
    // 2. Fallback Nominatim (Busca por CEP)
    try {
        const params = new URLSearchParams({ postalcode: cep, country: "Brazil", format: "json", limit: 1 });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) { /* Ignora */ }
    return null;
}

// ==========================================================
// LÓGICA DO CLOUDINARY
// ==========================================================
const CLOUD_NAME = "dfyol5oig"; // O seu cloud name
// !!! IMPORTANTE: Use presets diferentes para perfil e verificação !!!
const UPLOAD_PRESET_PERFIL = "apoia-me-perfis"; // (Substitua pelo seu novo preset)
const UPLOAD_PRESET_VERIFICACAO = "apoia-me-verificacao"; // (Substitua pelo seu novo preset)

/**
 * Faz upload de um ARQUIVO ÚNICO para o Cloudinary.
 * @param {File} file - O arquivo do input.
 * @param {string} uploadPreset - O preset a ser usado (Perfil ou Verificação).
 * @param {string} folder - A pasta no Cloudinary (ex: 'perfis/uid' ou 'verificacao/uid').
 * @returns {Promise<string|null>} - A URL de download segura.
 */
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


// ==========================================================
// LÓGICA DE VALIDAÇÃO DE ARQUIVO
// ==========================================================
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE_MB = 5; // 5MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Valida um único arquivo de input.
 * @param {HTMLInputElement} inputElement - O elemento <input type="file">.
 * @param {boolean} isRequired - Se o arquivo é obrigatório.
 * @returns {File|null} - O arquivo, se for válido.
 */
function validarArquivo(inputElement, isRequired) {
    const file = inputElement.files[0];
    const feedbackEl = inputElement.parentElement.querySelector('.invalid-feedback');

    // 1. Checa se é obrigatório e se foi enviado
    if (isRequired && !file) {
        if (feedbackEl) feedbackEl.textContent = "Este arquivo é obrigatório.";
        inputElement.classList.add('is-invalid');
        inputElement.setCustomValidity("Este arquivo é obrigatório."); // Para o checkValidity()
        return null;
    }
    
    // 2. Se não for obrigatório e não foi enviado, está OK
    if (!file) {
        inputElement.classList.remove('is-invalid');
        inputElement.setCustomValidity("");
        return null;
    }

    // 3. Checa o tipo de Mime
    if (!ALLOWED_MIMES.has(file.type)) {
        if (feedbackEl) feedbackEl.textContent = `Tipo de arquivo inválido. Use JPG, PNG ou PDF.`;
        inputElement.classList.add('is-invalid');
        inputElement.setCustomValidity("Tipo de arquivo inválido.");
        return null;
    }

    // 4. Checa o tamanho
    if (file.size > MAX_FILE_SIZE_BYTES) {
        if (feedbackEl) feedbackEl.textContent = `Arquivo muito grande (> ${MAX_FILE_SIZE_MB}MB).`;
        inputElement.classList.add('is-invalid');
        inputElement.setCustomValidity("Arquivo muito grande.");
        return null;
    }

    // 5. Se passou, está válido
    inputElement.classList.remove('is-invalid');
    inputElement.setCustomValidity("");
    return file;
}
// ==========================================================
// FIM DA VALIDAÇÃO DE ARQUIVO
// ==========================================================


// --- SELETORES E FUNÇÕES DE UI ---
const formCliente = document.getElementById('form-cadastro-cliente');
const formFornecedor = document.getElementById('form-cadastro-fornecedor');

// Função para mostrar etapas (deve ser exposta pelo cadastro.js ou definida aqui)
// Vamos usar a que está no cadastro.js (assumindo que ele já executou)
function mostrarEtapa(etapaId) {
    const etapas = ['etapa-selecao-perfil', 'etapa-form-cliente', 'etapa-form-fornecedor', 'etapa-sucesso'];
    etapas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const etapaAtiva = document.getElementById(etapaId);
    if (etapaAtiva) etapaAtiva.style.display = 'block';
}

// --- FORMULÁRIO DE CLIENTE ---
formCliente?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // A validação de UI (senhas, etc.) já rodou no cadastro.js
    if (!formCliente.checkValidity()) {
        console.log("Formulário de cliente inválido (checkValidity)");
        return;
    }

    const btnSubmit = formCliente.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cadastrando...';

    // 1. Coletar dados
    const nome = document.getElementById('cliente-nome').value;
    const email = document.getElementById('cliente-email').value;
    const senha = document.getElementById('cliente-senha').value;
    
    // 2. Validar arquivo (foto é opcional)
    const fotoInput = document.getElementById('cliente-foto-input');
    const fotoFile = validarArquivo(fotoInput, false);
    if (fotoInput.classList.contains('is-invalid')) { // Checa se a validação falhou
         btnSubmit.disabled = false;
         btnSubmit.innerHTML = 'Cadastrar e Entrar';
         return;
    }

    try {
        // 3. Criar usuário no Auth
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = cred.user.uid;

        // 4. Fazer upload da foto (Cloudinary)
        let fotoURL = null;
        if (fotoFile) {
            fotoURL = await uploadParaCloudinary(fotoFile, UPLOAD_PRESET_PERFIL, `perfis/${uid}`);
        }

        // 5. Atualizar perfil no Auth
        await updateProfile(cred.user, { 
            displayName: nome,
            photoURL: fotoURL
        });

        // 6. Salvar dados no Firestore
        await setDoc(doc(db, "usuarios", uid), {
            nome: nome,
            email: email,
            fotoURL: fotoURL,
            tipo: "cliente",
            status: "ativo",
            criadoEm: serverTimestamp()
        });

        // 7. Mostrar sucesso e redirecionar
        mostrarEtapa('etapa-sucesso');
        document.getElementById('msg-sucesso-cliente').style.display = 'block';
        document.getElementById('msg-sucesso-fornecedor').style.display = 'none';
        
        setTimeout(() => {
            window.location.href = "../html/dashboardC.html";
        }, 2000);

    } catch (err) {
        console.error("Erro no cadastro de cliente:", err);
        alert("Erro no cadastro: " + err.message);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Cadastrar e Entrar';
    }
});


// --- FORMULÁRIO DE FORNECEDOR ---
formFornecedor?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!formFornecedor.checkValidity()) {
        console.log("Formulário de fornecedor inválido (checkValidity)");
        return;
    }
    
    // Validar arquivos obrigatórios (Recuperação das variáveis de arquivo)
    const fotoFile = validarArquivo(document.getElementById('fornecedor-foto-input'), true);
    const docFrente = validarArquivo(document.getElementById('doc-frente'), true);
    const docVerso = validarArquivo(document.getElementById('doc-verso'), true);
    const docSelfie = validarArquivo(document.getElementById('doc-selfie'), true);
    const docAntecedentes = validarArquivo(document.getElementById('doc-antecedentes'), true);

    // Se qualquer arquivo obrigatório for inválido (nulo ou tipo/tamanho errado), paramos.
    if (!fotoFile || !docFrente || !docVerso || !docSelfie || !docAntecedentes) {
        alert("Por favor, verifique os arquivos obrigatórios e tente novamente.");
        return;
    }

    const btnSubmit = formFornecedor.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

    // 1. Coletar dados essenciais para Auth e Geocoding
    const nome = document.getElementById('fornecedor-nome').value;
    const email = document.getElementById('fornecedor-email').value;
    const senha = document.getElementById('fornecedor-senha').value;
    const cep = document.getElementById('fornecedor-cep').value; // CEP é a chave de Geocoding

    // 2. BUSCAR COORDENADAS (ASSÍNCRONO - CRÍTICO)
    // [ASSUMINDO QUE getLatLng EXISTE NO TOPO DESTE ARQUIVO]
    const coords = await getLatLng(cep);
    let geopointData = null;

    if (coords && coords.lat && coords.lng) {
        // CRIA O OBJETO GEOPÓINT NO FORMATO ESPERADO PELO FIRESTORE
        geopointData = { _latitude: coords.lat, _longitude: coords.lng };
    } else {
        // Se o Geocoding falhar, registramos um aviso e salvamos null.
        console.warn("Falha ao obter as coordenadas (Lat/Lng) do CEP. Salvo como null.");
    }
    
    // 3. Coletar o restante dos dados
    const cpf = document.getElementById('fornecedor-cpf').value;
    const dataNasc = document.getElementById('fornecedor-data-nasc').value;
    const telefone = document.getElementById('fornecedor-telefone').value;

    // 4. ESTRUTURA FINAL DO ENDEREÇO (COM GEOPÓINT CORRIGIDO)
    const enderecoData = {
        cep: cep,
        rua: document.getElementById('fornecedor-rua').value,
        numero: document.getElementById('fornecedor-numero').value,
        bairro: document.getElementById('fornecedor-bairro').value,
        cidade: document.getElementById('fornecedor-cidade').value,
        estado: document.getElementById('fornecedor-estado').value,
        
        // SALVANDO O GEOPÓINT PARA O MATCHMAKING
        geopoint: geopointData 
    };
    const raioKm = parseInt(document.getElementById('fornecedor-raio').value, 10);
    const areasSelecionadas = [];
    document.querySelectorAll('#categorias-checkboxes .container input:checked').forEach(cb => {
        areasSelecionadas.push(cb.value);
    });
    
    try {
        // 5. Criar usuário no Auth
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = cred.user.uid;

        // 6. Fazer upload de TODOS os arquivos (Cloudinary)
        const [
            fotoURL,
            urlDocFrente,
            urlDocVerso,
            urlSelfie,
            urlAntecedentes
        ] = await Promise.all([
            uploadParaCloudinary(fotoFile, UPLOAD_PRESET_PERFIL, `perfis/${uid}`),
            uploadParaCloudinary(docFrente, UPLOAD_PRESET_VERIFICACAO, `verificacao/${uid}`),
            uploadParaCloudinary(docVerso, UPLOAD_PRESET_VERIFICACAO, `verificacao/${uid}`),
            uploadParaCloudinary(docSelfie, UPLOAD_PRESET_VERIFICACAO, `verificacao/${uid}`),
            uploadParaCloudinary(docAntecedentes, UPLOAD_PRESET_VERIFICACAO, `verificacao/${uid}`)
        ]);

        // 7. Atualizar perfil no Auth
        await updateProfile(cred.user, { 
            displayName: nome,
            photoURL: fotoURL
        });

        // 8. Salvar dados no Firestore
        await setDoc(doc(db, "usuarios", uid), {
            nome: nome,
            email: email,
            fotoURL: fotoURL,
            cpf: cpf,
            dataNascimento: dataNasc,
            telefone: telefone,
            tipo: "fornecedor",
            status: "pendente",
            criadoEm: serverTimestamp(),
            
            // DADOS CRÍTICOS AGORA SALVOS CORRETAMENTE
            enderecoAtuacao: enderecoData, 
            raioAtuacao_km: raioKm,
            areasAtuacao: areasSelecionadas,
            
            arquivosVerificacao: {
                docFrente: urlDocFrente,
                docVerso: urlDocVerso,
                selfie: urlSelfie,
                antecedentes: urlAntecedentes
            }
        });

        // 9. Redirecionamento
        window.location.href = "em-analise.html";

    } catch (err) {
        console.error("Erro no cadastro de fornecedor:", err);
        alert("Erro no cadastro: " + err.message);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Enviar para Análise';
    }
});