// Arquivo: form-novo-pedido.firebase.js
// FINALIZADO: Correção de Escopo, Auth e Geopoint.

import { auth, db } from "./firebase-init.js"; 
import { 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// --- 2. CONSTANTES DO CLOUDINARY ---
const CLOUD_NAME = "dfyol5oig"; 
const UPLOAD_PRESET_PEDIDOS = "apoia-me-pedidos"; 

// --- 3. VARIÁVEIS DE ESTADO (Inicializadas com valores temporários, atualizadas via onAuthStateChanged) ---
let currentUserId = null;
let currentUserName = null;


// --- 4. LÓGICA DE AUTH/GATEKEEPER (Garante que as variáveis globais sejam preenchidas) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserName = user.displayName || user.email.split('@')[0];
    } else {
        // Se o usuário deslogar durante o preenchimento, redireciona
        // window.location.href = "login.html"; 
    }
});


// --- 5. LÓGICA DE UPLOAD PARA O CLOUDINARY ---
async function uploadParaCloudinary(file, folder) {
    // ... (Sua lógica de upload permanece a mesma)
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET_PEDIDOS);
    formData.append("folder", folder);
    
    try {
        const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });
        if (!resp.ok) {
            throw new Error(`Falha no upload (HTTP ${resp.status})`);
        }
        const data = await resp.json();
        return data.secure_url || null;
    } catch (err) {
        console.error("Erro no upload para Cloudinary:", err);
        throw new Error(`Falha ao carregar a foto: ${file.name}.`);
    }
}


// --- 6. FUNÇÃO AUXILIAR PARA COLETAR DETALHES DINÂMICOS ---

function extrairDetalhesDoFormulario(formData, categoria) {
    // ... (Sua lógica de extração de detalhes para o objeto 'detalhes' permanece a mesma)
    const detalhes = {};

    detalhes.titulo = formData['pedido-titulo'].value;
    detalhes.descricaoGeral = formData['lista-compra']?.value || 
                              formData['descricao-servico']?.value || 
                              null;

    switch (categoria) {
        case "Troca de gás":
            detalhes.tipoBotijao = formData['tipo-botijao']?.value || null;
            detalhes.quantidade = parseInt(formData['quantidade']?.value) || null;
            detalhes.retirarVazio = formData['retirar-vazio']?.value === 'sim';
            detalhes.temElevador = formData['elevador']?.value === 'sim';
            detalhes.andar = parseInt(formData['andar']?.value) || null;
            break;
            
        case "Pequenos reparos":
            detalhes.tipoReparo = formData['categoria-reparo']?.value || null;
            detalhes.materiaisFornecidosPor = formData['materiais-fornecidos']?.value || null;
            detalhes.descricaoProblema = formData['descricao-reparo']?.value || null;
            break;

        case "Buscar/Levar docs":
            detalhes.urgencia = formData['urgencia']?.value === 'sim';
            detalhes.requerAssinatura = formData['requer-assinatura']?.value === 'sim';
            detalhes.tamanho = formData['tamanho']?.value || null;
            detalhes.localRetirada = {
                cep: formData['cep-retirada']?.value || null,
                endereco: formData['endereco-retirada']?.value || null,
                bairro: formData['bairro-retirada']?.value || null,
                cidade: formData['cidade-retirada']?.value || null,
            };
            break; 
            
        case "Montagem de móveis":
            detalhes.tipoMovel = formData['tipo-movel']?.value || null;
            detalhes.quantidade = parseInt(formData['quantidade']?.value) || null;
            detalhes.temManual = formData['tem-manual']?.value === 'sim';
            detalhes.precisaFurar = formData['precisa-furar']?.value === 'sim';
            detalhes.marcaModelo = formData['marca-modelo']?.value || null;
            break;
            
        case "Jardinagem e poda":
            detalhes.areaM2 = formData['area']?.value || null;
            detalhes.tipoServico = formData['tipo-servico']?.value || null;
            detalhes.destinoResiduos = formData['destino-residuos']?.value || null;
            break;
            
        case "Instalação de TV":
            detalhes.polegadasTv = formData['polegadas-tv']?.value || null;
            detalhes.tipoParede = formData['tipo-parede']?.value || null;
            detalhes.precisaSuporte = formData['precisa-suporte']?.value === 'sim';
            detalhes.passagemCabos = formData['passagem-cabos']?.value === 'sim';
            break;

        case "Limpeza":
            detalhes.tipoLimpeza = formData['tipo-limpeza']?.value || null;
            detalhes.metragem = formData['metragem']?.value || null;
            detalhes.quartos = parseInt(formData['quartos']?.value) || null;
            detalhes.banheiros = parseInt(formData['banheiros']?.value) || null;
            detalhes.materiaisDisponiveis = formData['materiais-disponiveis']?.value === 'sim';
            detalhes.periodicidade = formData['periodicidade']?.value || null;
            break;
            
        case "Passear com cachorro":
            detalhes.nomePet = formData['nome-pet']?.value || null;
            detalhes.porte = formData['porte']?.value || null;
            detalhes.duracaoMinima = parseInt(formData['duracao-minima']?.value) || null;
            break;

        default:
            break;
    }
    return detalhes;
}


// --- 7. FUNÇÃO PRINCIPAL DE SUBMISSÃO (EXPORTADA) ---

export async function salvarNovoPedido(files, formData, selectedCategoryName) {
    
    // CORREÇÃO CRÍTICA 1: Checagem de autenticação na hora H
    if (!currentUserId) {
        throw new Error("Usuário não autenticado. O pedido não pode ser salvo.");
    }
    
    try {
        // 7.1. Upload das Fotos
        const folderPath = `pedidos/${currentUserId}/${Date.now()}`;
        const fotoUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(file => uploadParaCloudinary(file, folderPath));
            const results = await Promise.all(uploadPromises);
            results.forEach(url => { if (url) fotoUrls.push(url); });
        }
        
        // 7.2. Coleta e Estrutura dos Dados do Pedido
        const dataValues = {};
        for (const key in formData) {
            dataValues[key] = formData[key].value;
        }

        // CORREÇÃO CRÍTICA 2: Leitura segura do Lat/Lng
        const lat = parseFloat(dataValues['pedido-lat']);
        const lng = parseFloat(dataValues['pedido-lng']);

        const orcamentoStr = dataValues['pedido-orcamento-max'] || '';
        const orcamentoNum = orcamentoStr ? 
                             parseFloat(orcamentoStr.replace('R$', '').replace('.', '').replace(',', '.')) : 
                             null;

        const enderecoServico = {
            cep: dataValues['pedido-cep'],
            rua: dataValues['pedido-endereco'],
            numero: dataValues['pedido-numero'],
            bairro: dataValues['pedido-bairro'],
            cidade: dataValues['pedido-cidade'],
            estado: dataValues['pedido-estado'],
            complemento: dataValues['pedido-complemento'] || null,
            
            // CORRIGIDO: Se a leitura do input for inválida (NaN), salva null em vez de um objeto inválido
            geopoint: (!isNaN(lat) && !isNaN(lng)) ? { _latitude: lat, _longitude: lng } : null
        };
        
        const novoPedido = {
            // CORRIGIDO: Garantido que currentUserId e categoria estão sendo usados
            clienteId: currentUserId, 
            clienteNome: currentUserName,
            categoria: selectedCategoryName, // O nome da categoria vem do parâmetro
            
            localizacao: enderecoServico,
            
            titulo: dataValues['pedido-titulo'],
            orcamentoMaximo: orcamentoNum,
            
            detalhes: extrairDetalhesDoFormulario(formData, selectedCategoryName),
            
            fotoUrls: fotoUrls, 
            
            status: "pendente", 
            criadoEm: serverTimestamp(),
            fornecedorId: null,
        };

        // 7.3. SALVA NO FIRESTORE
        await addDoc(collection(db, "pedidos"), novoPedido);
        
        return true; 

    } catch (error) {
        console.error("Erro fatal ao salvar o pedido:", error);
        throw error; 
    }
}