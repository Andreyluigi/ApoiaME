import { db, auth } from './firebase-init.js'; // <-- Importa a instância 'db' corrigida
import { 
    collection, query, where, getDocs, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

// Elementos DOM
const pedidoAtivoContainer = document.getElementById('pedido-ativo-container');
const listaHistorico = document.getElementById('lista-historico');
const userGreeting = document.getElementById("user-name");

// Status Colors/Labels para o Histórico
const STATUS_LABELS = {
    concluido_prestador: { label: 'Revisão Pendente', tag: 'alerta' },
    finalizado: { label: 'Finalizado', tag: 'sucesso' },
    cancelado: { label: 'Cancelado', tag: 'perigo' },
    aguardando_pagamento: { label: 'Aguardando Pgto', tag: 'secundario' },
    aceito_prestador: { label: 'Em Andamento', tag: 'ativo' }
    // Adicione outros status relevantes
};

/**
 * Formata um timestamp do Firebase para exibição.
 * @param {import('firebase/firestore').Timestamp} timestamp - O timestamp do Firestore.
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

    // 1. Buscar pedidos onde clienteUid é o usuário atual E o status não é finalizado/cancelado
    const qAtivo = query(
        collection(db, "pedidos"), 
        where("clienteUid", "==", uid), // <--- CORRIGIDO: Usando clienteUid
        where("status", "not-in", ["finalizado", "cancelado"])
    );

    const snapshotAtivo = await getDocs(qAtivo);
    
    if (!snapshotAtivo.empty) {
        const docSnap = snapshotAtivo.docs[0]; // Pega o primeiro (assumindo apenas um ativo por vez)
        const pedido = docSnap.data();
        const pedidoId = docSnap.id;
        const statusInfo = STATUS_LABELS[pedido.status] || { label: pedido.status, tag: 'ativo' };

        // Renderiza o Card de Pedido Ativo (Resumo)
        const ativoHTML = document.createElement('div');
        ativoHTML.classList.add('card-pedido-ativo');
        ativoHTML.innerHTML = `
            <div class="card-header">
                <h3>${pedido.tituloAnuncio || "Serviço Ativo"}</h3>
                <span class="badge tipo">${pedido.tipoServico || ""}</span>
            </div>
            <div class="card-body">
                <p><strong>Status:</strong> <span style="font-weight: 600;">${statusInfo.label}</span></p>
                <p><strong>Data:</strong> ${pedido.data || "N/A"}</p>
                <p><strong>Prestador:</strong> ${pedido.ajudanteNome || "Aguardando Aceite"}</p>
            </div>
            <button class="btn-principal-cliente btn-ver-detalhes" data-id="${pedidoId}">
                Ver Status Completo e Ações
            </button>
        `;
        
        // Limpa e Adiciona o card
        pedidoAtivoContainer.innerHTML = "";
        pedidoAtivoContainer.appendChild(ativoHTML);

        // Listener para o botão de detalhes
        ativoHTML.querySelector('.btn-ver-detalhes').addEventListener('click', () => {
             window.location.href = `statusC.html?id=${pedidoId}`; // Redireciona para a página de detalhes do cliente
        });
        
    } else {
        // Nenhum pedido ativo
        pedidoAtivoContainer.innerHTML = `<p class="pending-task" style="text-align: center;">Nenhum pedido ativo no momento.</p>`;
    }
};


// --- 2. Carregar Histórico de Pedidos ---
const carregarHistorico = async (uid) => {
    listaHistorico.innerHTML = '<p>Carregando histórico...</p>'; 

    const pedidosRef = collection(db, "pedidos");
    // Busca pedidos onde clienteUid é o usuário atual E o status é finalizado ou cancelado
    const q = query(
        pedidosRef, 
        where("clienteUid", "==", uid), // <--- CORRIGIDO: Usando clienteUid
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
            const dataFinal = pedido.dataConclusao || pedido.dataCancelamento; // Usa data de conclusão ou cancelamento
            
            itemHistorico.innerHTML = `
                <div class="bloco">
                    <span class="titulo-item">${pedido.tituloAnuncio || "Pedido"}</span>
                    <span class="sub">${statusInfo.label} • ${formatarData(dataFinal)}</span>
                </div>
                <div class="bloco">
                    <span class="valor">R$ ${pedido.precoBase || "00,00"}</span>
                    <span class="status tag ${statusInfo.tag}">${statusInfo.label}</span>
                </div>
            `;

            // Adiciona listener para ver detalhes
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
onAuthStateChanged(auth, (user) => {
    if (user) {
        const uid = user.uid;
        // Atualiza o nome de boas-vindas
        userGreeting.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
        
        // Inicia o carregamento das duas seções
        inicializarPedidosAtivos(uid);
        carregarHistorico(uid);
    } else {
        console.log("Nenhum usuário logado. Redirecionando...");
        // Em um app real, você faria window.location.href = '/login.html';
        pedidoAtivoContainer.innerHTML = `<p class="pending-task">Faça login para ver seus pedidos.</p>`;
        listaHistorico.innerHTML = `<p class="pending-task">Faça login para ver seu histórico.</p>`;
    }
});