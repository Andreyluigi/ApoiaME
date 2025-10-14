// Arquivo: js/dashboardA.firebase.js

import { db, auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

let unsubscribePedidoAtivo = null;

function formatarData(timestamp) {
    if (!timestamp || !timestamp.toDate) return "Data indisponível";
    const data = timestamp.toDate();
    return data.toLocaleDateString('pt-BR');
}

/**
 * Renderiza os cards de pedido no container.
 * @param {object | null} pedidoAtivo - O pedido que está em andamento.
 * @param {Array} ultimosFinalizados - UMA LISTA com os últimos pedidos concluídos/cancelados.
 */
function renderResumoPedidos(pedidoAtivo, ultimosFinalizados) {
    const container = document.getElementById('resumo-pedidos-container');
    if (!container) return;

    container.innerHTML = `<div class="h2"><h2>Resumo de Pedidos</h2></div>`;

    if (!pedidoAtivo && (!ultimosFinalizados || ultimosFinalizados.length === 0)) {
        container.innerHTML += '<p>Nenhum pedido recente encontrado.</p>';
        return;
    }

    // Renderiza o card do pedido ativo (se existir)
    if (pedidoAtivo) {
        const statusClass = pedidoAtivo.status.replace(/_/g, "-");
        const pedidoAtivoHTML = `
            <div class="pedido-card ${statusClass}">
                <div class="pedido-info">
                    <h3>${pedidoAtivo.tituloAnuncio || 'Serviço Ativo'}</h3>
                    <p>Status: <span>${pedidoAtivo.status.replace(/_/g, " ")}</span></p>
                    <p>Data: ${formatarData(pedidoAtivo.criadoEm)}</p>
                </div>
                <div class="pedido-acao">
                    <a href="statusA.html?id=${pedidoAtivo.id}"><button>Ver detalhes</button></a>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', pedidoAtivoHTML);
    }

    // Renderiza um card para CADA pedido na lista de finalizados
    if (ultimosFinalizados && ultimosFinalizados.length > 0) {
        ultimosFinalizados.forEach(pedidoFinalizado => {
            const statusClass = pedidoFinalizado.status.replace(/_/g, "-");
            const finalizadoHTML = `
                <div class="pedido-card ${statusClass}">
                    <div class="pedido-info">
                        <h3>${pedidoFinalizado.tituloAnuncio || 'Serviço Anterior'}</h3>
                        <p>Status: <span>${pedidoFinalizado.status.replace(/_/g, " ")}</span></p>
                        <p>Data: ${formatarData(pedidoFinalizado.criadoEm)}</p>
                    </div>
                    <div class="pedido-acao">
                        <a href="statusA.html?id=${pedidoFinalizado.id}"><button>Ver detalhes</button></a>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', finalizadoHTML);
        });
    }
}


async function limparPedidoAtivoDoAjudante(userId) {
    console.log("--- DEBUG: Função 'limparPedidoAtivoDoAjudante' foi chamada.");
    try {
        const ajudanteRef = doc(db, "usuarios", userId);
        const ajudanteSnap = await getDoc(ajudanteRef);

        if (ajudanteSnap.exists() && ajudanteSnap.data().pedidoAtivo) {
            console.log("--- DEBUG: 'pedidoAtivo' encontrado no perfil. Limpando agora...");
            await updateDoc(ajudanteRef, { pedidoAtivo: null });
            console.log("--- DEBUG: SUCESSO! 'pedidoAtivo' foi limpo.");
        } else {
            console.warn("--- DEBUG: Limpeza não foi necessária (perfil não encontrado ou 'pedidoAtivo' já está nulo).");
        }
    } catch (error) {
        console.error("--- DEBUG: ERRO dentro de 'limparPedidoAtivoDoAjudante':", error);
    }
}

/**
 * Busca o pedido ativo (em tempo real) e os últimos pedidos finalizados.
 */
async function monitorarPedidosAjudante(userId) {
    const pedidosRef = collection(db, "pedidos");
    
    const qAtivo = query(
        pedidosRef,
        where('ajudanteUid', '==', userId),
        where('status', 'in', ['aceito', 'pago_aguardando_inicio', 'em_rota', 'no_local', 'em_execucao', 'concluido_prestador']),
        limit(1)
    );

    const qFinalizados = query(
        pedidosRef,
        where('ajudanteUid', '==', userId),
        where('status', 'in', ['finalizado', 'cancelado']),
        orderBy('criadoEm', 'desc'),
        limit(2)
    );

    try {
        const finalizadosSnapshot = await getDocs(qFinalizados);
        const ultimosFinalizados = finalizadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (unsubscribePedidoAtivo) unsubscribePedidoAtivo();
        
        console.log("--- DEBUG: Iniciando listener onSnapshot para pedidos ATIVOS...");
        unsubscribePedidoAtivo = onSnapshot(qAtivo, (querySnapshot) => {
            console.log("--- DEBUG: Listener onSnapshot (busca por pedido ativo) disparou!");
            
            let pedidoAtivo = null;

            if (querySnapshot.empty) {
                console.log("--- DEBUG: A busca por pedidos ATIVOS retornou VAZIA. Acionando limpeza...");
                limparPedidoAtivoDoAjudante(userId);
            } else {
                pedidoAtivo = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                console.log("--- DEBUG: Pedido ATIVO encontrado:", pedidoAtivo.id, "Status:", pedidoAtivo.status);
            }
            
            renderResumoPedidos(pedidoAtivo, ultimosFinalizados);
        }, (error) => {
            console.error("--- DEBUG: ERRO no listener onSnapshot:", error);
        });
    } catch (error) {
        console.error("--- DEBUG: ERRO GERAL em 'monitorarPedidosAjudante':", error);
    }
}

// Variável global para guardar a instância do nosso gráfico
let meuGrafico = null;

/**
 * Processa uma lista de pedidos para contar finalizados, pendentes e agrupar por dia.
 */
function processarContagemDePedidos(pedidos) {
    let servicosFinalizados = 0;
    let pedidosPendentes = 0;
    const finalizadosPorDia = {}; // Objeto para agrupar contagem por dia

    pedidos.forEach(pedido => {
        // Ignora pedidos sem data de criação para não quebrar o gráfico
        if (!pedido.criadoEm || !pedido.criadoEm.toDate) return;

        const dataPedido = pedido.criadoEm.toDate();
        const dia = dataPedido.toISOString().split('T')[0]; // Formato AAAA-MM-DD

        // Inicializa o contador para o dia se for a primeira vez
        if (!finalizadosPorDia[dia]) {
            finalizadosPorDia[dia] = 0;
        }

        // Conta os status
        if (pedido.status === 'finalizado') {
            servicosFinalizados++;
            finalizadosPorDia[dia]++; // Incrementa a contagem do dia
        } else if (['aceito', 'pago_aguardando_inicio', 'em_rota', 'no_local', 'em_execucao', 'concluido_prestador'].includes(pedido.status)) {
            pedidosPendentes++;
        }
    });
    
    return { servicosFinalizados, pedidosPendentes, finalizadosPorDia };
}

/**
 * Atualiza os cards de KPI com as contagens de pedidos.
 */
function atualizarCardsKPI({ servicosFinalizados, pedidosPendentes }) {
    const totalServicosEl = document.getElementById('total-servicos-valor');
    const pedidosPendentesEl = document.getElementById('pedidos-pendentes-valor');

    if (totalServicosEl) {
        totalServicosEl.textContent = servicosFinalizados;
    }
    if (pedidosPendentesEl) {
        pedidosPendentesEl.textContent = pedidosPendentes;
    }
}

/**
 * Desenha ou atualiza o gráfico com a CONTAGEM de serviços finalizados por dia.
 */
function atualizarGrafico(finalizadosPorDia) {
    const canvas = document.getElementById('graficoVendas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const labels = Object.keys(finalizadosPorDia).sort(); // Eixo X (os dias)
    const data = labels.map(dia => finalizadosPorDia[dia]); // Eixo Y (a contagem)

    if (meuGrafico) {
        meuGrafico.destroy();
    }

    meuGrafico = new Chart(ctx, {
        type: 'bar', // Gráfico de barras
        data: {
            labels: labels,
            datasets: [{
                label: 'Serviços Finalizados por Dia',
                data: data,
                backgroundColor: '#4CAF50', // Verde da sua marca
                borderColor: '#388E3C',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1 // Garante que o eixo Y conte de 1 em 1 (sem números quebrados)
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Oculta a legenda para um visual mais limpo
                }
            }
        }
    });
}

/**
 * Função principal que busca os dados do Firebase e coordena as atualizações na tela.
 */
async function carregarResultados(userId, periodo = 'week') {
    const agora = new Date();
    let dataInicio = new Date();

    if (periodo === 'week') dataInicio.setDate(agora.getDate() - 7);
    else if (periodo === 'month') dataInicio.setMonth(agora.getMonth() - 1);
    else if (periodo === 'year') dataInicio.setFullYear(agora.getFullYear() - 1);

    try {
        const pedidosRef = collection(db, "pedidos");
        // Consulta: busca todos os pedidos do ajudante dentro do período de tempo
        const q = query(
            pedidosRef,
            where('ajudanteUid', '==', userId),
            where('criadoEm', '>=', dataInicio)
        );

        const querySnapshot = await getDocs(q);
        const pedidos = querySnapshot.docs.map(doc => doc.data());

        // Processa os dados encontrados e atualiza a interface
        const dadosProcessados = processarContagemDePedidos(pedidos);
        atualizarCardsKPI(dadosProcessados);
        atualizarGrafico(dadosProcessados.finalizadosPorDia);

    } catch (error) {
        console.error("Erro ao carregar resultados:", error);
        // ATENÇÃO: Se o erro for sobre índice, o console mostrará um link para criá-lo.
    }
}

// Expõe a função 'changePeriod' para a janela global (window),
// permitindo que os botões no HTML a chamem via onclick.
window.changePeriod = (periodo) => {
    const userId = auth.currentUser?.uid;
    if (userId) {
        carregarResultados(userId, periodo);
    }
};


onAuthStateChanged(auth, (user) => {
    if (user) {
        monitorarPedidosAjudante(user.uid);
        carregarResultados(user.uid, 'week'); 
    } else {
        console.log("Nenhum ajudante logado, redirecionando...");
        window.location.href = '../html/login.html';
    }
});