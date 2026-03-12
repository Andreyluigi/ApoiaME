// Arquivo: pedidosA.firebase.js
import { auth } from './firebase-init.js';
import { 
    getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

const db = getFirestore();
const listaPedidos = document.getElementById('lista-pedidos');
const userGreeting = document.getElementById("user-name");
const listaHistorico = document.getElementById('lista-historico');
let fornecedorData = null; 
let currentUid = null;

// --- FUNÇÕES DE GEOMETRIA PARA MATCHMAKING ---
const R = 6371; // Raio da Terra em km

/** 1. Calcula a distância real entre dois Geopoints (Haversine) */
function getDistanciaEmKm(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** 2. Calcula a caixa delimitadora (Bounding Box) para o GeoQuery do Firestore */
function getGeoBox(lat, lon, radiusKm) {
    const latDelta = radiusKm / 111.04;
    const lonDelta = radiusKm / (111.32 * Math.cos(lat * (Math.PI / 180)));
    
    return {
        latMin: lat - latDelta,
        latMax: lat + latDelta,
        lonMin: lon - lonDelta, 
        lonMax: lon + lonDelta
    };
}
// --- FIM FUNÇÕES DE GEOMETRIA ---


// --- FUNÇÕES DE UTILIDADE E STATUS ---

const STATUS_LABELS = {
    pendente: { label: 'Novo Pedido', tag: 'alerta' }, 
    aceito: { label: 'Aceito', tag: 'ativo' },
    pago_aguardando_inicio: { label: 'Aguardando Início', tag: 'ativo' },
    em_rota: { label: 'Em Rota', tag: 'ativo' },
    no_local: { label: 'No Local', tag: 'ativo' },
    em_execucao: { label: 'Em Execução', tag: 'ativo' },
    concluido_prestador: { label: 'Revisão Pendente', tag: 'alerta' },
    
    finalizado: { label: 'Finalizado', tag: 'sucesso' },
    cancelado: { label: 'Cancelado', tag: 'perigo' },
    recusado_por_fornecedor: { label: 'Recusado', tag: 'perigo' },
};

const formatarData = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "Data não definida";
    const date = timestamp.toDate(); 
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};


// --- FUNÇÕES DE AÇÕES DE PEDIDO ---
const aceitarPedido = async (uid, pedidoId, nomeFornecedor) => { // 1. Adicionado nomeFornecedor
    if (!uid || !pedidoId || !nomeFornecedor) {
        console.error("UID, PedidoID ou Nome do Fornecedor faltando.");
        return;
    }
    if (!fornecedorData) {
        alert("Erro: Dados do fornecedor não carregados. Tente recarregar a página.");
        return;
    }
    

    const fotoURL = fornecedorData.fotoURL || null;
    try {
        await updateDoc(doc(db, "pedidos", pedidoId), {
            fornecedorId: uid,
            fornecedorNome: nomeFornecedor,
            fornecedorFotoURL: fotoURL,
            status: 'aceito',
            aceitoEm: new Date(),
        });
        await updateDoc(doc(db, "usuarios", uid), {
            pedidoAtivo: pedidoId
        });
        alert("Pedido aceito com sucesso! A página será atualizada.");
        window.location.reload();
    } catch (e) {
        console.error("Erro ao aceitar pedido:", e);
        alert("Falha ao aceitar pedido. Tente novamente.");
    }
};

const recusarPedido = async (pedidoId) => {
    if (!pedidoId) return;
    try {
        await updateDoc(doc(db, "pedidos", pedidoId), {
            status: 'recusado_por_fornecedor',
        });
        alert("Pedido recusado e removido da lista de pendentes. A página será atualizada.");
        window.location.reload();
    } catch (e) {
        console.error("Erro ao recusar pedido:", e);
        alert("Falha ao recusar pedido. Tente novamente.");
    }
};


// --- FUNÇÃO DE RENDERIZAÇÃO DE CARD (COM SWITCH/CASE COMPLETO) ---
const renderizarCardPedido = (pedidoId, pedido, pedidoAtivoId, uid) => {
    
    const titulo = pedido.titulo || "Pedido Sem Título";
    const categoria = pedido.categoria || "Outros";
    const orcamentoMax = pedido.orcamentoMaximo || 0;
    const dataCriacao = pedido.criadoEm;
    const detalhes = pedido.detalhes || {};
    const distancia = pedido.distancia || "N/A";
    const fornecedorNome = userGreeting.textContent;

    const valorBRL = typeof orcamentoMax === 'number' ? `R$ ${orcamentoMax.toFixed(2).replace('.', ',')}` : orcamentoMax;

    // Estrutura base do Card
    const pedidoElement = document.createElement('article');
    pedidoElement.classList.add('card-pedido');
    pedidoElement.setAttribute('data-id', pedidoId);
    
    pedidoElement.innerHTML = `
        <header class="cabeca">
            <h2 class="titulo">${titulo}</h2>
            <span class="badge tipo">${categoria}</span>
        </header>
        <div class="grid-info">
            <div class="info"><span class="rotulo">Distância</span><span class="valor">${distancia} Km</span></div>
            <div class="info"><span class="rotulo">Criado em</span><span class="valor">${formatarData(dataCriacao)}</span></div>
            <div class="info"><span class="rotulo">Orçamento Max</span><span class="valor">${valorBRL}</span></div>
        </div>

        <div id="campoAdicional-${pedidoId}" class="campo-adicional">
            </div>

        <footer class="rodape-card">
            <div class="acoes">
                <button class="btn aceitar" data-id="${pedidoId}" ${pedidoAtivoId ? 'disabled' : ''}>Aceitar</button>
                <button class="btn recusar" data-id="${pedidoId}">Recusar</button>
            </div>
        </footer>
    `;
    
    const campoAdicional = pedidoElement.querySelector(`#campoAdicional-${pedidoId}`);
    
    // --- LÓGICA DE DETALHES DINÂMICOS (Switch Case COMPLETO) ---
    let detalhesHTML = '';
    
    switch (categoria) {
        case "Troca de gás":
            detalhesHTML = `
                <div class="form-group"><label>Tipo Botijão:</label> <span>${detalhes.tipoBotijao || "N/A"}</span></div>
                <div class="form-group"><label>Quantidade:</label> <span>${detalhes.quantidade || "N/A"}</span></div>
                <div class="form-group"><label>Andar:</label> <span>${detalhes.andar || "Térreo"}</span></div>
                <div class="form-group"><label>Elevador:</label> <span>${detalhes.temElevador ? "Sim" : "Não"}</span></div>
                <div class="form-group"><label>Retirar Vazio:</label> <span>${detalhes.retirarVazio ? "Sim" : "Não"}</span></div>
            `;
            break;
            
        case "Pequenos reparos":
            detalhesHTML = `
                <div class="form-group"><label>Tipo Reparo:</label> <span>${detalhes.tipoReparo || "Geral"}</span></div>
                <div class="form-group"><label>Materiais:</label> <span>${detalhes.materiaisFornecidosPor === 'ajudante' ? "Fornecedor Compra" : "Cliente Fornece"}</span></div>
                <div class="form-group"><label>Problema:</label> <span>${detalhes.descricaoProblema || "N/A"}</span></div>
            `;
            break;

        case "Fazer feira":
        case "Compras no mercado":
            detalhesHTML = `
                <div class="form-group"><label>Lista:</label> <span class="long-text">${detalhes.descricaoGeral ? detalhes.descricaoGeral.substring(0, 100) + '...' : "N/A"}</span></div>
            `;
            break;

        case "Buscar/Levar docs":
            detalhesHTML = `
                <div class="form-group"><label>Urgência:</label> <span>${detalhes.urgencia ? "Sim" : "Não"}</span></div>
                <div class="form-group"><label>Tamanho:</label> <span>${detalhes.tamanho || "N/A"}</span></div>
                <div class="form-group"><label>Retirada (CEP):</label> <span>${detalhes.localRetirada?.cep || "N/A"}</span></div>
                <div class="form-group"><label>Requer Assinatura:</label> <span>${detalhes.requerAssinatura ? "Sim" : "Não"}</span></div>
            `;
            break;
            
        case "Passear com cachorro":
            detalhesHTML = `
                <div class="form-group"><label>Nome Pet:</label> <span>${detalhes.nomePet || "N/A"}</span></div>
                <div class="form-group"><label>Porte:</label> <span>${detalhes.porte || "N/A"}</span></div>
                <div class="form-group"><label>Duração Min:</label> <span>${detalhes.duracaoMinima} min</span></div>
            `;
            break;
            
        case "Montagem de móveis":
            detalhesHTML = `
                <div class="form-group"><label>Tipo Móvel:</label> <span>${detalhes.tipoMovel || "N/A"}</span></div>
                <div class="form-group"><label>Quantidade:</label> <span>${detalhes.quantidade || "N/A"}</span></div>
                <div class="form-group"><label>Tem Manual:</label> <span>${detalhes.temManual ? "Sim" : "Não"}</span></div>
                <div class="form-group"><label>Precisa Furar:</label> <span>${detalhes.precisaFurar ? "Sim" : "Não"}</span></div>
            `;
            break;
            
        case "Jardinagem e poda":
            detalhesHTML = `
                <div class="form-group"><label>Área (m²):</label> <span>${detalhes.areaM2 || "N/A"}</span></div>
                <div class="form-group"><label>Tipo Serviço:</label> <span>${detalhes.tipoServico || "N/A"}</span></div>
                <div class="form-group"><label>Resíduos:</label> <span>${detalhes.destinoResiduos || "N/A"}</span></div>
            `;
            break;

        case "Instalação de TV":
            detalhesHTML = `
                <div class="form-group"><label>Polegadas:</label> <span>${detalhes.polegadasTv || "N/A"}</span></div>
                <div class="form-group"><label>Tipo Parede:</label> <span>${detalhes.tipoParede || "N/A"}</span></div>
                <div class="form-group"><label>Passagem Cabos:</label> <span>${detalhes.passagemCabos ? "Sim" : "Não"}</span></div>
                <div class="form-group"><label>Precisa Suporte:</label> <span>${detalhes.precisaSuporte ? "Sim" : "Não"}</span></div>
            `;
            break;

        case "Limpeza":
            detalhesHTML = `
                <div class="form-group"><label>Tipo Limpeza:</label> <span>${detalhes.tipoLimpeza || "Geral"}</span></div>
                <div class="form-group"><label>Metragem:</label> <span>${detalhes.metragem} m²</span></div>
                <div class="form-group"><label>Quartos/Banh.:</label> <span>${detalhes.quartos}/${detalhes.banheiros}</span></div>
                <div class="form-group"><label>Materiais Disp.:</label> <span>${detalhes.materiaisDisponiveis ? "Sim" : "Não"}</span></div>
                <div class="form-group"><label>Periodicidade:</label> <span>${detalhes.periodicidade}</span></div>
            `;
            break;
            
        case "Outros":
            detalhesHTML = `<p>Descrição: ${detalhes.descricaoGeral || "N/A"}</p>`;
            break;
            
        default:
            detalhesHTML = `<p>Detalhes específicos não mapeados para ${categoria}.</p>`;
            break;
    }
    
    campoAdicional.innerHTML = detalhesHTML;
    
    // --- Listener de Aceitar/Recusar (Anexado ao elemento) ---
    const btnAceitar = pedidoElement.querySelector('.btn.aceitar');
    const btnRecusar = pedidoElement.querySelector('.btn.recusar');

    btnAceitar.addEventListener('click', async () => {
        await aceitarPedido(uid, pedidoId, fornecedorData.nome); 
    });
    
    btnRecusar.addEventListener('click', async () => {
        await recusarPedido(pedidoId);
    });

    listaPedidos.appendChild(pedidoElement);
};


// --- FUNÇÃO DE CARREGAMENTO PRINCIPAL (MATCHMAKING NOVO) ---
const inicializarPedidos = async (uid) => {
    listaPedidos.innerHTML = '<p>Buscando dados do seu perfil...</p>';
    const pedidoAtivoContainer = document.getElementById('pedido-ativo-container');
    const userRef = doc(db, "usuarios", uid);
    
    // 1. CARREGAR DADOS DO FORNECEDOR (Localização e Áreas)
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        listaPedidos.innerHTML = `<p>Erro: Perfil de fornecedor não encontrado.</p>`;
        return;
    }
    fornecedorData = userSnap.data();
    
    // 1b. Identificar Pedido Ativo (já aceito)
    const pedidoAtivoId = fornecedorData.pedidoAtivo && fornecedorData.pedidoAtivo !== 'null' ? fornecedorData.pedidoAtivo : null;
    
    
    // 2. LÓGICA DO PEDIDO ATIVO (CORRIGIDO PARA O NOVO MODELO)
    if (pedidoAtivoId) {
        const pedidoAtivoRef = doc(db, "pedidos", pedidoAtivoId);
        const pedidoAtivoSnap = await getDoc(pedidoAtivoRef);

        if (pedidoAtivoSnap.exists()) {
            const pedido = pedidoAtivoSnap.data();
            const statusInfo = STATUS_LABELS[pedido.status] || { label: pedido.status, tag: 'ativo' };

            // Mapeamento dos NOVOS campos para o HTML do Pedido Ativo
            const titulo = pedido.titulo || "Serviço Ativo";
            const categoria = pedido.categoria || "N/A";
            const nomeCliente = pedido.clienteNome || "N/A";
            const dataReferencia = pedido.criadoEm || "N/A";
            
            // Renderização do Card Ativo
            const ativoHTML = document.createElement('div');
            ativoHTML.classList.add('card-pedido1');
            ativoHTML.innerHTML = `
                <header class="cabeca">
                    <h2 class="titulo">${titulo}</h2>
                    <span class="badge tipo">${categoria}</span>
                </header>
                <div class="grid-info">
                    <div class="info"><span class="rotulo">Status</span><span class="valor">${statusInfo.label}</span></div>
                    <div class="info"><span class="rotulo">Data</span><span class="valor">${formatarData(pedido.aceitoEm || dataReferencia)}</span></div>
                    <div class="info"><span class="rotulo">Cliente</span><span class="valor">${nomeCliente}</span></div>
                </div>
                <div class="botoes">
                    <button class="btn-ver-detalhes">Ver detalhes</button>
                </div>
            `;
            
            // Limpa o placeholder estático e insere o card
            pedidoAtivoContainer.innerHTML = ""; 
            pedidoAtivoContainer.appendChild(ativoHTML);
            
            // Listener para o botão de detalhes
            ativoHTML.querySelector('.btn-ver-detalhes').addEventListener('click', () => {
                window.location.href = `statusA.html?id=${pedidoAtivoId}`;
            });

            // Se há pedido ativo, paramos a função principal aqui.
            listaPedidos.innerHTML = `<p>Você já tem um pedido ativo. Conclua-o para aceitar novos.</p>`;
            return;
            
        } else {
            // Lógica de limpeza se o pedido sumiu do Firestore (Corrige o documento do fornecedor)
            await updateDoc(doc(db, "usuarios", uid), { pedidoAtivo: null });
            pedidoAtivoContainer.innerHTML = "<p>Nenhum pedido ativo no momento.</p>";
        }
    } else {
        // Se não há pedido ativo, limpa o placeholder
        pedidoAtivoContainer.innerHTML = "<p>Nenhum pedido ativo no momento.</p>";
    }
    
    
    // 3. VERIFICAÇÃO DE PRÉ-REQUISITO PARA MATCHMAKING
    const enderecoAtuacao = fornecedorData.enderecoAtuacao;

    if (!enderecoAtuacao || !enderecoAtuacao.geopoint || !fornecedorData.areasAtuacao || fornecedorData.areasAtuacao.length === 0) {
        listaPedidos.innerHTML = `<p>ERRO: Complete seu <a href="perfil-fornecedor.html">Perfil</a> (Localização, Raio e Áreas de Atuação) para receber pedidos.</p>`;
        return;
    }
        
    // 3. INICIAR MATCHMAKING
    const localForn = enderecoAtuacao.geopoint;
    const raioMax = fornecedorData.raioAtuacao_km || 5;
    const areasForn = fornecedorData.areasAtuacao;
    
    // CONVERSÃO E VERIFICAÇÃO CRÍTICA DO FORNECEDOR (DEVE SER NÚMERO)
    const latForn = parseFloat(localForn._latitude); // CORREÇÃO APLICADA AQUI
    const lonForn = parseFloat(localForn._longitude); // CORREÇÃO APLICADA AQUI
    
    console.log(`DEBUG: Local Fornecedor (Lido/Convertido): LAT=${latForn}, LON=${lonForn}. Raio=${raioMax}km`); 

    if (isNaN(latForn) || isNaN(lonForn)) {
        listaPedidos.innerHTML = `<p>ERRO INTERNO: Suas coordenadas de atuação (${localForn._latitude}, ${localForn._longitude}) são inválidas. Edite e salve seu perfil novamente.</p>`;
        return;
    }
    
    const geoBox = getGeoBox(latForn, lonForn, raioMax);
    const pedidosDisponiveis = [];
    
    listaPedidos.innerHTML = '<p>Filtrando pedidos por raio e categoria...</p>';

    for (const area of areasForn) {
        
        const qDisponivel = query(
            collection(db, "pedidos"),
            where("status", "==", "pendente"),
            where("categoria", "==", area), 
            where("localizacao.geopoint._latitude", ">=", geoBox.latMin),
            where("localizacao.geopoint._latitude", "<=", geoBox.latMax)
        );

        const snapshotDisponivel = await getDocs(qDisponivel);
        
        snapshotDisponivel.forEach(docSnap => {
            const pedido = docSnap.data();
            const pedidoId = docSnap.id;
            
            if (pedido.localizacao && pedido.localizacao.geopoint) {
               
                const latPed = parseFloat(pedido.localizacao.geopoint._latitude);
                const lonPed = parseFloat(pedido.localizacao.geopoint._longitude);
                
                if (isNaN(latPed) || isNaN(lonPed)) return; 

                const distancia = getDistanciaEmKm(latForn, lonForn, latPed, lonPed);
                
               if (distancia <= raioMax && !pedidosDisponiveis.some(p => p.id === pedidoId)) {
                    pedidosDisponiveis.push({ id: pedidoId, data: { ...pedido, distancia: distancia.toFixed(1) } });
                }
            }
        });
    }
    
    // 4. RENDERIZAÇÃO FINAL DOS DISPONÍVEIS
    pedidosDisponiveis.sort((a, b) => a.data.distancia - b.data.distancia);

    if (pedidosDisponiveis.length > 0) {
        listaPedidos.innerHTML = "";
        pedidosDisponiveis.forEach(item => {
            renderizarCardPedido(item.id, item.data, pedidoAtivoId, uid);
        });

    } else {
        listaPedidos.innerHTML = `<p>Nenhum pedido disponível no momento no seu raio de atuação e especialidade.</p>`;
    }
};


// --- FUNÇÃO DE HISTÓRICO (MANTIDA) ---
const carregarHistorico = async (uid) => {
    listaHistorico.innerHTML = '<p>Carregando histórico...</p>'; 

    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, 
                    where("fornecedorId", "==", uid), 
                    where("status", "in", ["finalizado", "cancelado"]));
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        listaHistorico.innerHTML = "";
        querySnapshot.forEach((docSnap) => {
            const pedido = docSnap.data();
            const itemHistorico = document.createElement('article');
            itemHistorico.classList.add('item-historico');

            const status = pedido.status;
            const statusInfo = STATUS_LABELS[status] || { label: status, tag: 'secundario' };
            const valor = pedido.valorAcordado || pedido.orcamentoMaximo || 0;
            const dataReferencia = pedido.dataConclusao || pedido.criadoEm;
            
            itemHistorico.innerHTML = `
              <div class="bloco">
                <span class="titulo-item">${pedido.titulo || "Pedido"}</span>
                <span class="sub">${statusInfo.label} • ${formatarData(dataReferencia)}</span>
              </div>
              <div class="bloco">
                <span class="valor">R$ ${valor.toFixed(2).replace('.', ',')}</span>
                <span class="status tag ${statusInfo.tag}">${statusInfo.label}</span>
              </div>
            `;
            listaHistorico.appendChild(itemHistorico);
        });
    } else {
        listaHistorico.innerHTML = `<p>Nenhum pedido concluído ou cancelado no momento.</p>`;
    }
};


// --- INICIALIZAÇÃO E GATEKEEPER ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUid = user.uid;
        // Bloco para garantir que o displayName seja carregado
        if (!user.displayName) {
             const userDoc = await getDoc(doc(db, "usuarios", currentUid));
             const userData = userDoc.data();
             user.displayName = userData?.nome || user.email.split('@')[0];
        }

        userGreeting.textContent = user.displayName.split(' ')[0];
        
        inicializarPedidos(currentUid);
        carregarHistorico(currentUid);
    } else {
        console.log("Nenhum usuário logado. Redirecionando...");
        // window.location.href = "login.html"; // Comentei para rodar local
    }
});