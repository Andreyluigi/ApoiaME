// Arquivo: form-novo-pedido.js
// Implementa a lógica do Wizard (5 etapas), Máscaras, Validação e GeoCoding.

// Importa a função de salvamento do Firebase (AJUSTE O CAMINHO!)
import { salvarNovoPedido } from '../form-novo-pedido.firebase.js'; 

// --- 1. LISTA DE CATEGORIAS (Mestre) ---
const CATEGORIAS = [
    // NÍVEL SIMPLES (R$ 15,00)
    { id: "troca_gas", nome: "Troca de gás", icon: "flame", minValor: 15 },
    { id: "fazer_feira", nome: "Fazer feira", icon: "shopping-basket", minValor: 15 },
    { id: "passear_cachorro", nome: "Passear com cachorro", icon: "dog", minValor: 15 },
    { id: "compras_mercado", nome: "Compras no mercado", icon: "shopping-cart", minValor: 15 },
    { id: "buscar_levar_documentos", nome: "Buscar/Levar docs", icon: "file-text", minValor: 15 },
    { id: "outros", nome: "Outros", icon: "more-horizontal", minValor: 15 },

    // NÍVEL INTERMEDIÁRIO (R$ 45,00)
    { id: "pequenos_reparos", nome: "Pequenos reparos", icon: "wrench", minValor: 45 },
    { id: "montagem_moveis", nome: "Montagem de móveis", icon: "lamp", minValor: 45 },
    { id: "jardinagem_poda", nome: "Jardinagem e poda", icon: "leaf", minValor: 45 },
    { id: "instalacao_tv", nome: "Instalação de TV", icon: "tv", minValor: 45 },

    // NÍVEL COMPLEXO (R$ 90,00)
    { id: "limpeza_residencial", nome: "Limpeza", icon: "sparkles", minValor: 90 }
];

// --- 2. VARIÁVEIS GLOBAIS DE UI ---
let currentStep = 1;
let selectedCategory = null;
let newFiles = [];

// --- 3. SELETORES DO DOM ---
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const btnVoltar = $("#btn-voltar");
const btnAvancar = $("#btn-avancar");
const categoryGrid = $("#category-selection-grid");
const dynamicFieldsContainer = $("#dynamic-fields-container");
const step2Title = $("#step-2-title");
const form = $("#form-novo-pedido");
const fotosInput = $("#pedido-fotos");
const fotosPreviewContainer = $("#fotos-preview-container");


// ======================================================================
// 4. FUNÇÕES DE UTILIDADE E GEOCÓDIGO
// ======================================================================

// Função auxiliar para obter Lat/Lng (usando BrasilAPI/Nominatim)
async function getLatLng(cep) {
    console.log("DEBUG: Tentando Geocoding para CEP:", cep);
    
    // 1. Tenta BrasilAPI (Busca por CEP)
    try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (res.ok) {
            const data = await res.json();
            if (data.location?.coordinates?.latitude && data.location.coordinates.longitude) {
                console.log("DEBUG: BrasilAPI SUCESSO. Coordenadas VÁLIDAS.");
                return { lat: data.location.coordinates.latitude, lng: data.location.coordinates.longitude };
            }
        }
    } catch (e) {
        console.warn("DEBUG: BrasilAPI falhou/retornou erro. Tentando Nominatim por CEP.");
    }
    
    // 2. Tenta Nominatim (Busca por CEP)
    try {
        const params = new URLSearchParams({ postalcode: cep, country: "Brazil", format: "json", limit: 1 });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            console.log("DEBUG: Nominatim (CEP) SUCESSO.");
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error("DEBUG: Nominatim (CEP) falhou.", e);
    }

    // 3. NOVO: Tenta Nominatim por ENDEREÇO COMPLETO (Se o CEP falhou, mas temos o endereço)
    // Coletamos o endereço dos campos de input (assumindo que foram preenchidos pelo ViaCEP)
    const rua = $("#pedido-endereco")?.value || '';
    const cidade = $("#pedido-cidade")?.value || '';
    const numero = $("#pedido-numero")?.value || '';
    
    if (rua && cidade) {
        console.log("DEBUG: Tentando Geocoding por Endereço Completo (Fallback).");
        const addressQuery = `${rua}, ${numero}, ${cidade}, Brazil`;
        
        try {
            const params = new URLSearchParams({ q: addressQuery, format: "json", limit: 1 });
            const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
                console.log("DEBUG: Nominatim (ENDEREÇO) SUCESSO.");
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
        } catch (e) {
            console.error("DEBUG: Nominatim (ENDEREÇO) falhou.", e);
        }
    }

    console.warn("DEBUG: Nenhuma API retornou coordenadas válidas. Salvando Lat/Lng como vazios.");
    return null;
}

// 4.1. FUNÇÃO CEP PRINCIPAL (Etapa 3 - AGORA COM GEOCÓDIGO INTEGRADO)
async function buscarCepPrincipal() {
    const cepInput = $("#pedido-cep");
    const cep = cepInput.value.replace(/\D/g, '');
    const latInput = $("#pedido-lat"); 
    const lngInput = $("#pedido-lng"); 
    
    latInput.value = '';
    lngInput.value = '';
    
    if (cep.length !== 8) {
        cepInput.classList.add('is-invalid');
        return;
    }
    cepInput.classList.remove('is-invalid');

    const btnBuscarCepPrincipal = $("#pedido-buscar-cep");
    btnBuscarCepPrincipal.disabled = true;
    btnBuscarCepPrincipal.innerHTML = '<span class="spinner-border spinner-border-sm spinner-apoia"></span>'; 

    try {
        // 1. Busca Endereço (ViaCEP)
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Falha na busca de endereço');
        const data = await response.json();
        
        if (data.erro) {
            alert("CEP não encontrado.");
             $("#pedido-endereco").readOnly = false; $("#pedido-bairro").readOnly = false; 
             $("#pedido-cidade").readOnly = false; $("#pedido-estado").readOnly = false;
        } else {
            // Preenche campos visíveis
            $("#pedido-endereco").value = data.logradouro || ''; $("#pedido-bairro").value = data.bairro || '';
            $("#pedido-cidade").value = data.localidade || ''; $("#pedido-estado").value = data.uf || '';
            
            // 2. Busca Coordenadas (GeoCoding)
            const coords = await getLatLng(cep);
            
            if (coords) {
                latInput.value = coords.lat; 
                lngInput.value = coords.lng;
                console.log(`DEBUG: Inputs Lat/Lng preenchidos com: ${coords.lat}, ${coords.lng}`);
            } else {
                console.warn("DEBUG: Geocoding falhou, Lat/Lng permanecem vazios.");
                alert("Aviso: Não foi possível obter as coordenadas (Lat/Lng) deste CEP. O Geo-Matchmaking será limitado.");
            }

            // Trava campos e foca
            $("#pedido-endereco").readOnly = true; $("#pedido-bairro").readOnly = true;
            $("#pedido-cidade").readOnly = true; $("#pedido-estado").readOnly = true;
            $("#pedido-numero").focus();
        }
    } catch (error) {
        console.error("DEBUG: Erro no ViaCEP ou GeoCoding.", error);
        alert("Erro geral ao buscar dados do CEP. Tente novamente.");
    } finally {
        btnBuscarCepPrincipal.disabled = false;
        btnBuscarCepPrincipal.innerHTML = '<i data-lucide="search" style="width: 16px;"></i>';
        lucide.createIcons();
    }
}

// 4.2. Função auxiliar para buscar CEP em campos INJETADOS (Etapa 2)
async function fetchAndFillAddress(cepInput, enderecoInput) {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) { 
        enderecoInput.value = '';
        return alert('CEP inválido!'); 
    }

    enderecoInput.value = 'Buscando...';
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) {
            enderecoInput.value = '';
            alert('CEP não encontrado. Preencha manualmente.');
        } else {
            enderecoInput.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        }
    } catch (e) {
        enderecoInput.value = '';
        alert('Erro na comunicação com a API de CEP.');
    }
}

/** Aplica máscara de CEP (xxxxx-xxx) */
function mascaraCEP(e) {
    let v = e.target.value.replace(/\D/g, '');
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    e.target.value = v.substring(0, 9);
}

/** Aplica máscara de Dinheiro (R$ 1.234,56) */
function mascaraDinheiro(e) {
    let v = e.target.value.replace(/\D/g, '');
    v = (v / 100).toFixed(2) + '';
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    e.target.value = "R$ " + v;
}

/** Coleta todos os dados do formulário */
function coletarDadosDoFormulario() {
    const data = {};
    const fields = $$('#form-novo-pedido input, #form-novo-pedido select, #form-novo-pedido textarea');

    fields.forEach(field => {
        if (field.id) {
            data[field.id] = field;
        }
    });
    return data;
}

/** Função específica para busca de CEP DETALHADO (Documentos Retirada) */
async function buscarCepDetalhadoRetirada(cepValue) {
    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) { return alert('CEP inválido!'); }
    
    const endInput = $(`#endereco-retirada`);
    const bairroInput = $(`#bairro-retirada`);
    const cidadeInput = $(`#cidade-retirada`);
    const btnElement = $('#verificar-cep-retirada');

    btnElement.disabled = true;
    btnElement.innerHTML = '<span class="spinner-border spinner-border-sm spinner-apoia"></span>';
    endInput.value = 'Buscando...';

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        
        if (data.erro) {
            alert('CEP não encontrado!');
            endInput.value = ''; bairroInput.value = ''; cidadeInput.value = '';
        } else {
            endInput.value = data.logradouro || ''; bairroInput.value = data.bairro || ''; cidadeInput.value = data.localidade || '';
            endInput.readOnly = true; bairroInput.readOnly = true; cidadeInput.readOnly = true;
        }
    } catch (e) {
        alert('Erro na comunicação com a API de CEP.');
        endInput.value = '';
    } finally {
        btnElement.disabled = false;
        btnElement.innerHTML = '<i data-lucide="search" style="width: 16px;"></i>';
        lucide.createIcons();
    }
}

/** Anexa listeners e máscaras aos campos que foram injetados dinamicamente (Etapa 2) */
function attachDynamicListeners(serviceId) {
    
    const cepInputs = $$(`#dynamic-fields-container input[id*="cep"]`);
    cepInputs.forEach(input => input.addEventListener('input', mascaraCEP));
    
    const inputOrcamento = $(`#dynamic-fields-container #orcamento-max`);
    if(inputOrcamento) inputOrcamento.addEventListener('input', mascaraDinheiro);

    if (['pequenos_reparos', 'jardinagem_poda', 'instalacao_tv', 'limpeza_residencial'].includes(serviceId)) {
        const btnVerificar = $(`#dynamic-fields-container #verificar-cep`);
        const cepInput = $(`#dynamic-fields-container #cep-endereco`);
        const enderecoInput = $(`#dynamic-fields-container #endereco`);

        if (btnVerificar && cepInput && enderecoInput) {
            btnVerificar.addEventListener('click', () => {
                fetchAndFillAddress(cepInput, enderecoInput);
            });
        }
    } 
    
    if (serviceId === 'montagem_moveis') {
         const btnVerificar = $('#verificar-cep-montagem');
         const cepInput = $('#cep-montagem');
         const enderecoInput = $('#endereco-montagem');
         if (btnVerificar && cepInput && enderecoInput) {
             btnVerificar.addEventListener('click', () => {
                 fetchAndFillAddress(cepInput, enderecoInput);
             });
         }
    }
    
    if (serviceId === 'buscar_levar_documentos') {
        const btnRetirada = $('#verificar-cep-retirada');
        const cepRetiradaInput = $('#cep-retirada');

        if (btnRetirada && cepRetiradaInput) {
            btnRetirada.addEventListener('click', () => {
                buscarCepDetalhadoRetirada(cepRetiradaInput.value);
            });
        }
        
        const btnEntrega = $('#verificar-cep-entrega');
        const cepEntregaInput = $('#cep-entrega');
        const enderecoEntregaInput = $('#endereco-entrega');

        if (btnEntrega && cepEntregaInput && enderecoEntregaInput) {
            btnEntrega.addEventListener('click', () => {
                fetchAndFillAddress(cepEntregaInput, enderecoEntregaInput);
            });
        }
    }
}


// --- 5. FUNÇÕES DE ETAPA 4 e 5 (Fotos e Resumo) ---

function handleFotoPreview(e) {
    const files = e.target.files;
    newFiles = [];
    fotosPreviewContainer.innerHTML = ''; 

    if (files.length > 3) {
        alert("Você pode selecionar no máximo 3 fotos.");
        e.target.value = '';
        return;
    }

    if (files.length > 0) {
        Array.from(files).forEach(file => {
            newFiles.push(file);
            const reader = new FileReader();
            reader.onload = function(e) {
                const col = document.createElement('div');
                col.className = 'col-4';
                col.innerHTML = `<img src="${e.target.result}" alt="Pré-visualização da foto">`;
                fotosPreviewContainer.appendChild(col);
            }
            reader.readAsDataURL(file);
        });
    }
}

function renderResumo() {
    // 1. Coleta dados básicos
    const data = {};
    const fields = $$('#form-novo-pedido input, #form-novo-pedido select, #form-novo-pedido textarea');
    fields.forEach(field => { if (field.id) data[field.id] = field.value; });

    // Preenchimento padrão (Título, Categoria, Endereço)
    $("#resumo-titulo").textContent = data['pedido-titulo'] || 'N/A';
    $("#resumo-categoria").textContent = selectedCategory.nome;
    
    // Monta string de endereço
    const loc = `${data['pedido-endereco']}, ${data['pedido-numero']} - ${data['pedido-bairro']}, ${data['pedido-cidade']}/${data['pedido-estado']}`;
    $("#resumo-localizacao").textContent = loc;

    // --- CÁLCULO FINANCEIRO (NOVO) ---
    const valorBase = parseFloat(data['pedido-orcamento-max']) || 0;
    const fin = calcularTaxasApoiaMe(valorBase);

    $("#resumo-valor-base").textContent = `R$ ${fin.base.toFixed(2).replace('.', ',')}`;
    $("#resumo-valor-taxa").textContent = `+ R$ ${fin.taxa.toFixed(2).replace('.', ',')}`;
    $("#resumo-taxa-pct").textContent = fin.pctTexto;
    $("#resumo-valor-total").textContent = `R$ ${fin.total.toFixed(2).replace('.', ',')}`;
    
    // Salva para envio
    form.dataset.financeiro = JSON.stringify(fin);

    // --- DETALHES ESPECÍFICOS ---
    const ulDetalhes = $("#resumo-detalhes");
    ulDetalhes.innerHTML = '';
    const details = [];
    
    const selectedId = selectedCategory.id; 

    if (selectedId === 'troca_gas') {
        details.push(`Tipo de Botijão: ${data['tipo-botijao']}`);
        details.push(`Quantidade: ${data['quantidade']}`);
        details.push(`Andar: ${data['andar']}`);
    } else if (selectedId === 'pequenos_reparos') {
        details.push(`Tipo de Reparo: ${data['categoria-reparo']}`);
        details.push(`Materiais: ${data['materiais-fornecidos'] === 'cliente' ? 'Cliente Fornece' : 'Fornecedor Compra'}`);
    } else if (selectedId === 'limpeza_residencial') {
        details.push(`Tipo: ${data['tipo-limpeza']}`);
        details.push(`Metragem: ${data['metragem']} m²`);
    } else if (selectedId === 'buscar_levar_documentos') {
        details.push(`Retirada: ${data['cep-retirada']}`);
        details.push(`Entrega: ${data['cep-entrega']}`);
    } else if (data['lista-compras'] || data['descricao-servico']) {
        const desc = data['lista-compras'] || data['descricao-servico'];
        details.push(`Descrição/Lista: ${desc ? desc.substring(0, 50) + '...' : ''}`);
    }

    details.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ulDetalhes.appendChild(li);
    });

    $("#resumo-fotos-count").textContent = `${newFiles.length} foto(s)`;
}


// --- 6. LÓGICA DO WIZARD (Passo a passo) ---

/** Valida a etapa atual antes de avançar */
function validateStep(step) {
    let isValid = true;
    const inputs = $$(`#step-${step} [required]`);
    
    inputs.forEach(input => {
        if (input.id.includes('cep') && input.value.replace(/\D/g, '').length !== 8) {
             isValid = false;
        } 
        
        if (!input.value) {
            isValid = false;
            input.classList.add('is-invalid');
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    if (!isValid) {
        form.classList.add('was-validated');
    }
    
    return isValid;
}

/** Navega para um "step" (página) específico do wizard */
function navigateToStep(stepNumber) {
    currentStep = stepNumber;
    window.scrollTo(0, 0);

    $$(".stepper .step").forEach((stepEl, index) => {
        stepEl.classList.toggle('active', index + 1 === currentStep);
        stepEl.classList.toggle('completed', index + 1 < currentStep);
    });
    
    $$(".wizard-pane").forEach(pane => pane.classList.remove('active'));
    $(`#step-${currentStep}`).classList.add('active');

    if (currentStep === 1) {
        btnVoltar.style.display = 'none';
        btnAvancar.innerText = 'Avançar';
        btnAvancar.disabled = (selectedCategory === null);
    } else if (currentStep === 5) {
        btnVoltar.style.display = 'inline-block';
        btnAvancar.innerText = 'ENVIAR PEDIDO';
        btnAvancar.disabled = false;
    } else {
        btnVoltar.style.display = 'inline-block';
        btnAvancar.innerText = 'Avançar';
        btnAvancar.disabled = false;
    }
}

/** Carrega os 10+ cards de categoria na Etapa 1 */
function populateCategoryGrid() {
    categoryGrid.innerHTML = CATEGORIAS.map(cat => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="category-card" data-category-id="${cat.id}" data-category-name="${cat.nome}">
                <i data-lucide="${cat.icon}"></i>
                <span class="category-card-title">${cat.nome}</span>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();

    $$(".category-card").forEach(card => {
        card.addEventListener('click', () => {
            $$(".category-card").forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            // BUSCA A CATEGORIA COMPLETA PARA PEGAR O PREÇO
            const catData = CATEGORIAS.find(c => c.id === card.dataset.categoryId);

            selectedCategory = {
                id: catData.id,
                nome: catData.nome,
                minValor: catData.minValor // <--- AQUI ESTÁ O SEGREDO
            };
            btnAvancar.disabled = false;
        });
    });
}
/** Renderiza os campos de formulário dinâmicos na Etapa 2 */
function renderDynamicFields() {
    if (!selectedCategory) return;
    
    form.classList.remove('was-validated');
    step2Title.innerText = `Detalhes: ${selectedCategory.nome}`;
    let html = '';

    // Mapeamento do seu 'switch case' para o HTML (mantido idêntico ao que foi corrigido)
    switch (selectedCategory.id) {
        
        case "troca_gas":
            html = `<div class="row g-3"><div class="col-md-4 form-group"><label for="tipo-botijao" class="form-label">Tipo do Botijão</label><select id="tipo-botijao" class="form-select" required><option value="" disabled selected>Selecione</option><option value="P13">P13 (13kg)</option><option value="P5">P5 (5kg)</option><option value="P45">P45 (45kg)</option></select><div class="invalid-feedback">Selecione o tipo.</div></div><div class="col-md-4 form-group"><label for="quantidade" class="form-label">Quantidade</label><input type="number" id="quantidade" class="form-control" value="1" min="1" max="5" required></div><div class="col-md-4 form-group"><label for="retirar-vazio" class="form-label">Retirar Vazio?</label><select id="retirar-vazio" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-md-4 form-group"><label for="andar" class="form-label">Andar</label><input type="number" id="andar" class="form-control" min="0" max="22" required /></div><div class="col-md-4 form-group"><label for="elevador" class="form-label">Possui Elevador?</label><select id="elevador" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div></div>`;
            break;
        case "pequenos_reparos":
            html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="categoria-reparo" class="form-label">Tipo de Reparo</label><select id="categoria-reparo" class="form-select" required><option value="" disabled selected>Selecione</option><option value="eletrica">Elétrica</option><option value="hidraulica">Hidráulica</option><option value="pintura">Pintura</option><option value="marcenaria">Marcenaria</option><option value="geral">Geral / Outros</option></select><div class="invalid-feedback">Selecione o tipo.</div></div><div class="col-md-6 form-group"><label for="materiais-fornecidos" class="form-label">Materiais</label><select id="materiais-fornecidos" class="form-select" required><option value="cliente">Eu (cliente) fornecerei</option><option value="ajudante">Preciso que o fornecedor compre</option></select></div><div class="col-12 form-group"><label for="descricao-reparo" class="form-label">Descrição do Problema</label><input type="text" id="descricao-reparo" class="form-control" placeholder="Ex: Conserto de tomada na sala" required /></div></div>`;
            break;
        case "fazer_feira":
        case "compras_mercado":
            html = `<div class="form-group"><label class="form-label">Sua lista de compras</label><p class="small text-muted">Seja o mais específico possível (marca, quantidade, etc.).</p><textarea id="lista-compras" class="form-control" rows="8" placeholder="Ex: \n- 2 Maçãs Gala\n- 1kg Arroz (Marca X)\n- 1 Pão de Forma Integral" required></textarea><div class="invalid-feedback">Por favor, insira sua lista.</div></div>`;
            break;
        case "buscar_levar_documentos":
             html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="urgencia" class="form-label">Urgência</label><select id="urgencia" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-md-6 form-group"><label for="requer-assinatura" class="form-label">Requer Assinatura?</label><select id="requer-assinatura" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-12 form-group"><label for="tamanho" class="form-label">Tamanho dos Documentos</label><select id="tamanho" class="form-select" required><option value="">Selecione um tamanho</option><option value="A4">A4</option><option value="Ofício">Ofício</option><option value="Carta">Carta</option></select></div></div><h5 class="mt-4 mb-3 fw-bold" style="color: var(--cor-texto-secundario);">Local de Retirada</h5><div class="row g-3 p-3" id="retirada-details-container" style="border: 1px solid var(--cor-cinza-claro); border-radius: 8px; background-color: #fcfcfc;"><div class="col-md-6"><label for="cep-retirada" class="form-label">CEP de Retirada</label><div class="input-group"><input type="text" id="cep-retirada" class="form-control" required maxlength="9" /><button class="btn btn-outline-secondary" type="button" id="verificar-cep-retirada"><i data-lucide="search" style="width: 16px;"></i></button></div></div><div class="col-md-6"><label for="numero-retirada" class="form-label">Número</label><input type="text" id="numero-retirada" class="form-control" required /></div><div class="col-12"><label for="endereco-retirada" class="form-label">Endereço (Rua)</label><input type="text" id="endereco-retirada" class="form-control" readonly required /></div><div class="col-md-6"><label for="bairro-retirada" class="form-label">Bairro</label><input type="text" id="bairro-retirada" class="form-control" readonly required /></div><div class="col-md-6"><label for="cidade-retirada" class="form-label">Cidade</label><input type="text" id="cidade-retirada" class="form-control" readonly required /></div></div>`;
            break;
        case "montagem_moveis":
             html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="tipo-movel" class="form-label">Tipo de Móvel</label><select id="tipo-movel" class="form-select" required><option value="" disabled selected>Selecione o tipo</option><option value="guarda_roupa">Guarda-Roupa / Closet</option><option value="estante_rack">Estante / Rack</option><option value="cama_beliche">Cama / Beliche</option><option value="comoda">Cômoda / Gaveteiro</option><option value="outros">Outro Tipo</option></select></div><div class="col-md-6 form-group"><label for="quantidade" class="form-label">Quantidade</label><input type="number" id="quantidade" class="form-control" value="1" min="1" max="10" required></div><div class="col-md-6 form-group"><label for="tem-manual" class="form-label">Tem Manual?</label><select id="tem-manual" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-md-6 form-group"><label for="precisa-furar" class="form-label">Precisa Furar?</label><select id="precisa-furar" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-12 form-group"><label for="marca-modelo" class="form-label">Marca e Modelo (opcional)</label><input type="text" id="marca-modelo" class="form-control" placeholder="Ex: IKEA, Cômoda MALM" /></div></div>`;
            break;
        case "jardinagem_poda":
             html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="area" class="form-label">Área (m²)</label><select id="area" class="form-select" required><option value="" disabled selected>Selecione a área</option><option value="30">Até 30 m²</option><option value="60">Até 60 m²</option><option value="120">Até 120 m²</option></select></div><div class="col-md-6 form-group"><label for="tipo-servico" class="form-label">Tipo de Serviço</label><select id="tipo-servico" class="form-select" required><option value="" disabled selected>Selecione</option><option value="corte_grama">Corte e Manutenção de Grama</option><option value="poda_simples">Poda Simples</option><option value="limpeza_jardim">Limpeza Completa</option></select></div><div class="col-12 form-group"><label for="destino-residuos" class="form-label">Destino dos Resíduos</label><select id="destino-residuos" class="form-select" required><option value="prestador_leva">Prestador(a) leva os resíduos</option><option value="residuos_local">Resíduos ficam no local</option></select></div></div>`;
            break;
        case "instalacao_tv":
             html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="polegadas-tv" class="form-label">Polegadas da TV</label><select id="polegadas-tv" class="form-select" required><option value="" disabled selected>Selecione</option><option value="40">Até 40"</option><option value="55">Até 55"</option><option value="70">Até 70"</option></select></div><div class="col-md-6 form-group"><label for="tipo-parede" class="form-label">Tipo de Parede</label><select id="tipo-parede" class="form-select" required><option value="" disabled selected>Selecione</option><option value="alvenaria">Alvenaria</option><option value="drywall">Drywall</option><option value="madeira">Painel de Madeira</option></select></div><div class="col-md-6 form-group"><label for="precisa-suporte" class="form-label">Precisa de Suporte?</label><select id="precisa-suporte" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-md-6 form-group"><label for="passagem-cabos" class="form-label">Passagem de Cabos</label><select id="passagem-cabos" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div></div>`;
            break;
        case "limpeza_residencial":
            html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="tipo-limpeza" class="form-label">Tipo de Limpeza</label><select id="tipo-limpeza" class="form-select" required><option value="limpeza_residencial_geral">Limpeza Geral</option><option value="limpeza_pesada">Limpeza Pesada</option><option value="limpeza_pos_obra">Limpeza Pós-Obra</option></select></div><div class="col-md-6 form-group"><label for="metragem" class="form-label">Metragem (m²)</label><select id="metragem" class="form-select" required><option value="50">Até 50 m²</option><option value="100">Até 100 m²</option><option value="200">Até 200 m²</option></select></div><div class="col-md-6 form-group"><label for="quartos" class="form-label">Quartos</label><input type="number" id="quartos" class="form-control" value="1" min="1" required></div><div class="col-md-6 form-group"><label for="banheiros" class="form-label">Banheiros</label><input type="number" id="banheiros" class="form-control" value="1" min="1" required></div><div class="col-md-6 form-group"><label for="materiais-disponiveis" class="form-label">Materiais Disponíveis?</label><select id="materiais-disponiveis" class="form-select" required><option value="sim">Sim</option><option value="nao">Não</option></select></div><div class="col-md-6 form-group"><label for="periodicidade" class="form-label">Periodicidade</label><select id="periodicidade" class="form-select" required><option value="unico">Vez Única</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option></select></div></div>`;
            break;
        case "passear_cachorro":
            html = `<div class="row g-3"><div class="col-md-6 form-group"><label for="nome-pet" class="form-label">Nome do Pet</label><input type="text" id="nome-pet" class="form-control" required /></div><div class="col-md-6 form-group"><label for="porte" class="form-label">Porte do Pet</label><select id="porte" class="form-select" required><option value="pequeno">Pequeno</option><option value="medio">Médio</option><option value="grande">Grande</option></select></div><div class="col-md-6 form-group"><label for="duracao-minima" class="form-label">Duração Mínima</label><select id="duracao-minima" class="form-select" required><option value="30">30 min</option><option value="60">1 hora</option><option value="90">1 hora e 30 min</option></select></div></div>`;
            break;
        default:
            html = `<div class="form-group"><label for="descricao-servico" class="form-label">Descrição Detalhada do Serviço</label><textarea id="descricao-servico" class="form-control" rows="5" placeholder="Descreva em detalhes o que você precisa..." required></textarea><div class="invalid-feedback">Descreva o serviço.</div></div>`;
            break;
    }

    dynamicFieldsContainer.innerHTML = html;
    attachDynamicListeners(selectedCategory.id);
}

function configurarControleDePreco() {
    const inputValor = $("#pedido-orcamento-max");
    const btnAumentar = $("#btn-aumentar-valor");
    const btnDiminuir = $("#btn-diminuir-valor"); // Novo botão
    const aviso = $("#aviso-preco");

    if (!inputValor || !selectedCategory) return;

    // 1. Define o valor inicial baseado na categoria escolhida
    const valorMinimo = selectedCategory.minValor;
    
    // Configura o input visualmente
    inputValor.min = valorMinimo;
    // Se o valor atual for menor que o novo mínimo (ou vazio), reseta para o mínimo
    if (!inputValor.value || parseFloat(inputValor.value) < valorMinimo) {
        inputValor.value = valorMinimo;
    }
    
    // Atualiza o texto de aviso
    if (aviso) {
        aviso.innerHTML = `O valor mínimo para <strong>${selectedCategory.nome}</strong> é R$ ${valorMinimo},00.`;
    }

    // 2. RECRIA OS BOTÕES (Para remover listeners antigos e evitar duplicação)
    // Isso é importante porque essa função roda toda vez que você clica em "Avançar"
    
    const novoBtnAumentar = btnAumentar.cloneNode(true);
    const novoBtnDiminuir = btnDiminuir.cloneNode(true);
    
    btnAumentar.parentNode.replaceChild(novoBtnAumentar, btnAumentar);
    btnDiminuir.parentNode.replaceChild(novoBtnDiminuir, btnDiminuir);
    
    // Recarrega os ícones do Lucide nos novos botões
    lucide.createIcons();

    // 3. Lógica do Botão AUMENTAR (+ R$ 5,00)
    novoBtnAumentar.addEventListener('click', () => {
        let atual = parseFloat(inputValor.value) || 0;
        inputValor.value = (atual + 5).toFixed(2);
        
        // Efeito visual rápido
        inputValor.style.backgroundColor = "#d4edda"; // Verde claro
        setTimeout(() => inputValor.style.backgroundColor = "#fff", 200);
    });

    // 4. Lógica do Botão DIMINUIR (- R$ 1,00)
    novoBtnDiminuir.addEventListener('click', () => {
        let atual = parseFloat(inputValor.value) || 0;
        
        // Só diminui se o resultado for MAIOR ou IGUAL ao mínimo
        if ((atual - 1) >= valorMinimo) {
            inputValor.value = (atual - 1).toFixed(2);
            
            // Efeito visual rápido
            inputValor.style.backgroundColor = "#f8d7da"; // Vermelho claro
            setTimeout(() => inputValor.style.backgroundColor = "#fff", 200);
        } else {
            // Se tentar baixar do mínimo, pisca o aviso ou o input
            inputValor.classList.add("is-invalid"); // Borda vermelha do Bootstrap
            setTimeout(() => inputValor.classList.remove("is-invalid"), 500);
            alert(`O valor mínimo para este serviço é R$ ${valorMinimo},00`);
        }
    });
}

function calcularTaxasApoiaMe(valorBase) {
    let porcentagem = 0;
    
    // Regra de Negócio: Taxas regressivas
    if (valorBase <= 30) {
        porcentagem = 0.15; // 15% para até R$ 30
    } else if (valorBase <= 60) {
        porcentagem = 0.10; // 10% para até R$ 60
    } else {
        porcentagem = 0.05; // 5% para acima de R$ 60
    }

    const valorTaxa = valorBase * porcentagem;
    const valorTotal = valorBase + valorTaxa;

    return {
        base: valorBase,
        taxa: valorTaxa,
        total: valorTotal,
        pctTexto: (porcentagem * 100) + '%'
    };
}

// --- 9. INICIALIZAÇÃO E EVENT LISTENERS (MAIN) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Aplica máscaras e listeners de utilidade principal
    $("#pedido-cep").addEventListener('input', mascaraCEP);
    //$("#pedido-orcamento-max").addEventListener('input', mascaraDinheiro);
    $("#pedido-buscar-cep").addEventListener('click', buscarCepPrincipal);
    if(fotosInput) fotosInput.addEventListener('change', handleFotoPreview);
    
    // 2. Gera os 10 cards de categoria
    populateCategoryGrid();
    
    // 3. Define o estado inicial do wizard (Etapa 1)
    navigateToStep(1); 

    // 4. Listeners dos botões de NAVEGAÇÃO
    btnAvancar.addEventListener('click', async () => {
        
        if (currentStep === 1 && selectedCategory) {
            renderDynamicFields();
            configurarControleDePreco();
            navigateToStep(2);
        } else if (currentStep === 2 && validateStep(2)) {
            navigateToStep(3);
        } else if (currentStep === 3) {
            form.classList.add('was-validated');
            if (validateStep(3)) {
                form.classList.remove('was-validated');
                navigateToStep(4);
            }
        } else if (currentStep === 4) {
            renderResumo();
            navigateToStep(5);
        } else if (currentStep === 5) {
            
            const btnOriginalText = btnAvancar.innerText;
            btnAvancar.disabled = true;
            btnAvancar.innerHTML = '<span class="spinner-border spinner-border-sm spinner-apoia"></span> Enviando...';
            
            try {
                const formData = coletarDadosDoFormulario();
                
                // --- NOVO: Recupera os dados financeiros calculados ---
                const financeiroData = JSON.parse(form.dataset.financeiro || '{}');

                // Passamos o financeiroData como 4º argumento
                const success = await salvarNovoPedido(newFiles, formData, selectedCategory.nome, financeiroData);

                if (success) {
                    window.location.href = '../html/pedidosC.html';
                }
            } catch (error) {
                console.error(error);
                alert("Erro ao enviar: " + error.message);
                btnAvancar.disabled = false;
                btnAvancar.innerText = btnOriginalText;
            }
        }
    });

    btnVoltar.addEventListener('click', () => {
        if (currentStep > 1) {
            form.classList.remove('was-validated');
            navigateToStep(currentStep - 1);
        }
    });
});