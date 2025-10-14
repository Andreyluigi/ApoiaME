// Arquivo: js/dashboard-status.js (ou dashboardC.firebase.js)
// Versão final com as duas funcionalidades integradas.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, where, doc, onSnapshot, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA1ps6dSM2EtOkyg-xUeFky3S93j77qmII",
    authDomain: "apoia-me.firebaseapp.com",
    projectId: "apoia-me",
    storageBucket: "apoia-me.firebasestorage.app",
    messagingSenderId: "719321227710",
    appId: "1:719321227710:web:74e57959cbc564d09c19ef"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


let unsubscribeUser = null;
let unsubscribePedido = null;

function renderStatusCard(pedido) {
    const statusSection = document.querySelector('.status-tempo-real');
    if (!statusSection) return;

    if (!pedido || pedido.status === 'finalizado' || pedido.status === 'cancelado') {
        statusSection.innerHTML = `
            <div class="status-header"><h2>Status em Tempo Real</h2></div>
            <div class="status-card inactive"><p>Nenhum pedido ativo no momento.</p></div>
        `;
        return;
    }

    let mensagemStatus = `Status: ${pedido.status.replace(/_/g, " ")}`;
    switch (pedido.status) {
        case "pendente": mensagemStatus = "Aguardando o ajudante aceitar..."; break;
        case "aceito": mensagemStatus = "Pedido aceito! Efetue o pagamento."; break;
        case "pago_aguardando_inicio": mensagemStatus = "Pagamento confirmado! Aguardando início."; break;
        case "em_rota": mensagemStatus = "Seu ajudante está a caminho!"; break;
        case "no_local": mensagemStatus = "O ajudante chegou ao local."; break;
        case "em_execucao": mensagemStatus = "Serviço em andamento."; break;
        case "concluido_prestador": mensagemStatus = "Serviço concluído! Confirme a finalização."; break;
    }

    statusSection.innerHTML = `
        <div class="status-header">
            <span class="live-indicator"></span>
            <h2>Status em Tempo Real</h2>
        </div>
        <a href="../html/statusC.html?id=${pedido.id}" class="status-card active">
            <p><strong>Pedido #${pedido.id.substring(0, 7)}...</strong></p>
            <p class="status-grande">${mensagemStatus}</p>
        </a>
    `;
}

function monitorarPedidoAtivo(userId) {
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribePedido) unsubscribePedido();

    const userRef = doc(db, "usuarios", userId);

    unsubscribeUser = onSnapshot(userRef, (userDoc) => {
        if (!userDoc.exists()) {
            console.error("Documento do usuário não encontrado.");
            return renderStatusCard(null);
        }
        
        const pedidoAtivoId = userDoc.data().pedidoAtivo;

        if (unsubscribePedido) unsubscribePedido();

        if (pedidoAtivoId) {
            const pedidoRef = doc(db, "pedidos", pedidoAtivoId);
            unsubscribePedido = onSnapshot(pedidoRef, (pedidoDoc) => {
                if (pedidoDoc.exists()) {
                    const pedidoData = pedidoDoc.data();
                    pedidoData.id = pedidoDoc.id;
                    renderStatusCard(pedidoData);
                } else {
                    renderStatusCard(null);
                }
            });
        } else {
            renderStatusCard(null);
        }
    });
}

// ========================================================
// --- LÓGICA DOS ÚLTIMOS ANÚNCIOS ---
// ========================================================

async function carregarUltimosAnuncios() {
    const container = document.querySelector('.velocidade-lista');
    if (!container) {
        console.error("Container '.velocidade-lista' não foi encontrado.");
        return;
    }

    // Seletor corrigido para pegar QUALQUER elemento com a classe, seja <div> ou <a>
    const placeholderCards = container.querySelectorAll('.velocidade-item:not(.destaque)');
    
    console.log(`Encontrados ${placeholderCards.length} placeholders para preencher.`);

    try {
        const anunciosRef = collection(db, 'anuncios');
        const q = query(anunciosRef, orderBy('criadoEm', 'desc'), limit(6));
        const querySnapshot = await getDocs(q);

        console.log(`Firebase retornou ${querySnapshot.size} anúncios.`);

        if (querySnapshot.empty) {
            placeholderCards.forEach(card => card.style.display = 'none');
            return;
        }

        let index = 0;
        querySnapshot.forEach((docSnap) => {
            if (index < placeholderCards.length) {
                const placeholder = placeholderCards[index]; // O div/a antigo
                const data = docSnap.data();

                // --- LÓGICA CORRIGIDA ---
                // 1. Cria um novo elemento de link <a>
                const linkCard = document.createElement('a');
                linkCard.className = 'velocidade-item'; // Aplica a mesma classe de estilo
                linkCard.href = `../html/anuncioD.html?id=${docSnap.id}`;
                linkCard.style.backgroundImage = `url(${data.fotos?.[0] || '../arquivos/default.jpg'})`;
                linkCard.innerHTML = `<h4>${data.titulo || 'Serviço disponível'}</h4>`;
                
                // 2. Substitui o placeholder antigo pelo novo linkCard funcional
                placeholder.replaceWith(linkCard);
                
                index++;
            }
        });

        // Esconde os placeholders que não foram usados
        for (let i = index; i < placeholderCards.length; i++) {
            placeholderCards[i].style.display = 'none';
        }

    } catch (error) {
        console.error("ERRO CRÍTICO ao carregar últimos anúncios:", error);
        container.innerHTML += `<p style="color: red;">Falha ao carregar. Verifique o console (F12).</p>`;
    }
}

function formatarData(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return "Data indisponível";
    }
    const data = timestamp.toDate();
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

/**
 * Carrega os 3 últimos pedidos do cliente na dashboard.
 * @param {string} userId - O ID do usuário logado.
 */
async function carregarUltimosPedidos(userId) {
    const container = document.querySelector('.ultimos-lista');
    if (!container) return;

    try {
        const pedidosRef = collection(db, 'pedidos');
        // Consulta: busca pedidos ONDE o clienteUid é o do usuário logado,
        // ordena por data de criação (mais recente primeiro) e limita a 3.
        const q = query(pedidosRef, where('clienteUid', '==', userId), orderBy('criadoEm', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p>Você ainda não fez nenhum pedido.</p>';
            return;
        }

        container.innerHTML = ''; // Limpa o "Carregando..."

        querySnapshot.forEach((docSnap) => {
            const pedido = docSnap.data();
            const statusClass = pedido.status.replace(/_/g, "-"); // ex: 'em_rota' vira 'em-rota' para o CSS
            
            // Cria o HTML para cada item de pedido
            const pedidoHTML = `
                <a href="../html/statusC.html?id=${docSnap.id}" class="pedido-item">
                    <h3>${pedido.tituloAnuncio || 'Serviço Solicitado'}</h3>
                    <p>Data: ${formatarData(pedido.criadoEm)}</p>
                    <p>Status: <span class="status ${statusClass}">${pedido.status.replace(/_/g, " ")}</span></p>
                </a>
            `;
            container.insertAdjacentHTML('beforeend', pedidoHTML);
        });

    } catch (error) {
        console.error("Erro ao carregar últimos pedidos:", error);
        container.innerHTML = '<p style="color: red;">Erro ao carregar histórico.</p>';
        // Se o erro for de índice, o console mostrará o link para criá-lo.
    }
}

// ========================================================
// --- PONTO DE ENTRADA PRINCIPAL ---
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    carregarUltimosAnuncios();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            monitorarPedidoAtivo(user.uid);
            // --- A CORREÇÃO ESTÁ AQUI ---
            carregarUltimosPedidos(user.uid);
        } else {
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribePedido) unsubscribePedido();
            renderStatusCard(null);
            const ultimosPedidosContainer = document.querySelector('.ultimos-lista');
            if(ultimosPedidosContainer) ultimosPedidosContainer.innerHTML = '<p>Faça login para ver seus últimos pedidos.</p>';
        }
    });
});