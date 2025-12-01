import { db, auth } from './firebase-init.js';
import { 
    collection, query, where, getDocs, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

// Elementos DOM
const pedidoAtivoContainer = document.getElementById('pedido-ativo-container');
const listaHistorico = document.getElementById('lista-historico');
const userGreeting = document.getElementById("user-name");

// --- MAPA DE STATUS OFICIAL ---
const STATUS_LABELS = {
    pendente: { label: 'Pendente', tag: 'alerta' }, 
    aceito: { label: 'Aceito', tag: 'ativo' },
    pago_aguardando_inicio: { label: 'Aguardando Início', tag: 'ativo' },
    em_rota: { label: 'Em Rota', tag: 'ativo' },
    no_local: { label: 'No Local', tag: 'ativo' },
    em_execucao: { label: 'Em Execução', tag: 'ativo' },
    concluido_prestador: { label: 'Revisão Pendente', tag: 'alerta' }, // Pronto para cliente revisar/pagar
    
    // Status Finais (Histórico)
    finalizado: { label: 'Finalizado', tag: 'sucesso' },
    cancelado: { label: 'Cancelado', tag: 'perigo' },
};

/**
 * Formata um timestamp do Firebase para exibição.
 */
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


// --- 1. Carregar Pedido Ativo ---
const inicializarPedidosAtivos = async (uid) => {
    console.log('Buscando pedido ativo para o cliente:', uid);
    pedidoAtivoContainer.innerHTML = '<p>Carregando pedido ativo...</p>';

    // Status que são considerados ATIVOS (Em andamento ou pendente de ação)
    const statusAtivos = [
        "pendente",
        "aceito",
        "pago_aguardando_inicio",
        "em_rota",
        "no_local",
        "em_execucao",
        "concluido_prestador",
    ];
    
    const qAtivo = query(
        collection(db, "pedidos"), 
        where("clienteId", "==", uid), // <<-- CHAVE CORRETA: clienteId
        where("status", "in", statusAtivos) // Busca pelos status ativos
    );

    const snapshotAtivo = await getDocs(qAtivo);
    
    if (!snapshotAtivo.empty) {
        const docSnap = snapshotAtivo.docs[0];
        const pedido = docSnap.data();
        const pedidoId = docSnap.id;
        const statusInfo = STATUS_LABELS[pedido.status] || { label: pedido.status, tag: 'ativo' };
        
        // Mapeando os novos campos do documento
        const titulo = pedido.titulo || "Serviço Ativo"; 
        const categoria = pedido.categoria || "N/A"; 
        const nomeFornecedor = pedido.fornecedorNome || "Aguardando Aceite"; 
        const dataReferencia = pedido.criadoEm || "N/A";

        // Renderiza o Card de Pedido Ativo (Resumo)
        const ativoHTML = document.createElement('div');
        ativoHTML.classList.add('card-pedido-ativo');
        ativoHTML.innerHTML = `
            <div class="card-header">
                <h3>${titulo}</h3>
                <span class="badge tipo">${categoria}</span>
            </div>
            <div class="card-body">
                <p><strong>Status:</strong> <span style="font-weight: 600;">${statusInfo.label}</span></p>
                <p><strong>Data de Criação:</strong> ${formatarData(dataReferencia)}</p>
                <p><strong>Prestador:</strong> ${nomeFornecedor}</p>
            </div>
            <button class="btn-principal-cliente btn-ver-detalhes" data-id="${pedidoId}">
                Ver Status Completo e Ações
            </button>
        `;
        
        pedidoAtivoContainer.innerHTML = "";
        pedidoAtivoContainer.appendChild(ativoHTML);

        ativoHTML.querySelector('.btn-ver-detalhes').addEventListener('click', () => {
             window.location.href = `statusC.html?id=${pedidoId}`;
        });
        
    } else {
        pedidoAtivoContainer.innerHTML = `<p class="pending-task" style="text-align: center;">Nenhum pedido ativo no momento.</p>`;
    }
};


// --- 2. Carregar Histórico de Pedidos ---
const carregarHistorico = async (uid) => {
    listaHistorico.innerHTML = '<p>Carregando histórico...</p>'; 

    const pedidosRef = collection(db, "pedidos");
    // Busca apenas pedidos com status FINALIZADO ou CANCELADO
    const q = query(
        pedidosRef, 
        where("clienteId", "==", uid), // <<-- CHAVE CORRETA: clienteId
        where("status", "in", ["finalizado", "cancelado"])
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        listaHistorico.innerHTML = ""; // Limpa o "Carregando"
        querySnapshot.forEach((docSnap) => {
            const pedido = docSnap.data();
            const itemHistorico = document.createElement('article');
            itemHistorico.classList.add('item-historico');
            itemHistorico.setAttribute('data-id', docSnap.id);

            const status = pedido.status;
            const statusInfo = STATUS_LABELS[status] || { label: status, tag: 'secundario' };
            // Usa valor acordado, ou orçamento máximo, ou zero.
            const valor = pedido.valorAcordado || pedido.orcamentoMaximo || 0;
            const dataReferencia = pedido.dataConclusao || pedido.dataCancelamento || pedido.criadoEm;
            
            itemHistorico.innerHTML = `
                <div class="bloco">
                    <span class="titulo-item">${pedido.titulo || "Pedido Concluído"}</span>
                    <span class="sub">${statusInfo.label} • ${formatarData(dataReferencia)}</span>
                </div>
                <div class="bloco">
                    <span class="valor">R$ ${valor.toFixed(2).replace('.', ',')}</span>
                    <span class="status tag ${statusInfo.tag}">${statusInfo.label}</span>
                </div>
            `;

            itemHistorico.addEventListener('click', () => {
                 window.location.href = `statusC.html?id=${docSnap.id}`;
            });

            listaHistorico.appendChild(itemHistorico);
        });
    } else {
        listaHistorico.innerHTML = `<p>Nenhum pedido concluído ou cancelado no histórico.</p>`;
    }
};


// --- 3. Inicialização e Autenticação ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Bloco para garantir que o displayName seja carregado
        if (!user.displayName || user.displayName.includes('@')) {
             const userDoc = await getDoc(doc(db, "usuarios", user.uid));
             const userData = userDoc.data();
             user.displayName = userData?.nome || user.email.split('@')[0];
        }

        const uid = user.uid;
        // Atualiza o nome de boas-vindas (somente o primeiro nome)
        userGreeting.textContent = user.displayName.split(' ')[0];
        
        // Inicia o carregamento das duas seções
        inicializarPedidosAtivos(uid);
        carregarHistorico(uid);
    } else {
        console.log("Nenhum usuário logado. Redirecionando...");
        pedidoAtivoContainer.innerHTML = `<p class="pending-task">Faça login para ver seus pedidos.</p>`;
        listaHistorico.innerHTML = `<p class="pending-task">Faça login para ver seu histórico.</p>`;
    }
});