// Arquivo: dashboardC.firebase.js
// Responsável pela lógica da Dashboard do Cliente (Home)

import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- ELEMENTOS DO DOM ---
const userGreeting = document.getElementById("user-name");
const activeOrderSection = document.getElementById("secao-pedido-ativo");
const activeOrderContainer = document.getElementById("card-pedido-ativo-dashboard");
const lastOrdersContainer = document.getElementById("lista-ultimos-pedidos");

// --- FUNÇÕES AUXILIARES ---
const formatarMoeda = (valor) => {
    const num = parseFloat(valor);
    return isNaN(num) ? "R$ 0,00" : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatarData = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "—";
    return timestamp.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// ============================================================
// 1. VERIFICAR PEDIDO ATIVO (Status em Tempo Real)
// ============================================================
async function checkActiveOrder(uid) {
    try {
        // 1. Busca o perfil do usuário para ver se tem 'pedidoAtivo'
        const userRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userRef);
        
        let temPedidoAtivo = false;

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const pedidoAtivoId = userData.pedidoAtivo;

            if (pedidoAtivoId) {
                // 2. Se tiver ID, busca os dados do pedido
                const pedidoRef = doc(db, "pedidos", pedidoAtivoId);
                const pedidoSnap = await getDoc(pedidoRef);
                
                if (pedidoSnap.exists()) {
                    const pedido = pedidoSnap.data();
                    // Só exibe se o status não for finalizado/cancelado (segurança extra)
                    if (pedido.status !== 'finalizado' && pedido.status !== 'cancelado') {
                        renderActiveOrder(pedido, pedidoAtivoId);
                        temPedidoAtivo = true;
                    }
                }
            }
        }

        // 3. Controla a visibilidade da seção
        if (temPedidoAtivo) {
            activeOrderSection.style.display = 'block';
        } else {
            activeOrderSection.style.display = 'none';
        }

    } catch (e) {
        console.error("Erro ao buscar pedido ativo:", e);
        activeOrderSection.style.display = 'none';
    }
}

function renderActiveOrder(pedido, id) {
    const statusFormatado = (pedido.status || '').replace(/_/g, ' ').toUpperCase();
    const titulo = pedido.titulo || "Serviço em Andamento";
    const categoria = pedido.categoria || "Geral";

    activeOrderContainer.innerHTML = `
        <div class="card-dashboard-ativo">
            <div>
                <h3>${titulo}</h3>
                <p style="margin-bottom: 4px;">${categoria}</p>
                <p class="status-badge">Status: <strong>${statusFormatado}</strong></p>
            </div>
            <a href="statusC.html?id=${id}" class="btn-acompanhar">
                Acompanhar <i data-lucide="arrow-right" style="width:18px; margin-left: 5px;"></i>
            </a>
        </div>
    `;
    lucide.createIcons();
}


// ============================================================
// 2. BUSCAR ÚLTIMOS PEDIDOS (Histórico Rápido)
// ============================================================
async function fetchLastOrders(uid) {
    try {
        // Busca pedidos onde clienteId == uid, ordenados por criação
        // Nota: Se der erro de índice, o console vai fornecer o link para criar.
        const q = query(
            collection(db, "pedidos"),
            where("clienteId", "==", uid),
            orderBy("criadoEm", "desc"),
            limit(3)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            lastOrdersContainer.innerHTML = '<div class="empty-state"><p>Você ainda não fez nenhum pedido.</p></div>';
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const p = doc.data();
            const id = doc.id;
            
            // Mapeamento (Novo Modelo)
            const titulo = p.titulo || "Pedido sem título";
            const data = formatarData(p.criadoEm);
            const valor = formatarMoeda(p.orcamentoMaximo);
            const statusClass = (p.status || 'pendente').toLowerCase();
            const statusTexto = (p.status || 'pendente').replace(/_/g, ' ');

            html += `
                <a href="statusC.html?id=${id}" class="item-simples">
                    <div class="info-principal">
                        <strong>${titulo}</strong>
                        <span class="meta-info">${data} • <span class="status-text ${statusClass}">${statusTexto}</span></span>
                    </div>
                    <div class="info-valor">
                        ${valor}
                    </div>
                </a>
            `;
        });
        lastOrdersContainer.innerHTML = html;
        
    } catch (e) {
        console.error("Erro ao buscar histórico:", e);
        // Fallback simples em caso de erro de índice ou permissão
        lastOrdersContainer.innerHTML = '<p style="color:#666; font-size: 0.9rem;">Não foi possível carregar o histórico recente.</p>';
    }
}


// ============================================================
// 3. INICIALIZAÇÃO
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Atualiza nome no cabeçalho
        const nome = user.displayName ? user.displayName.split(' ')[0] : 'Cliente';
        if (userGreeting) userGreeting.textContent = nome;

        // Carrega os dados
        checkActiveOrder(user.uid);
        fetchLastOrders(user.uid);
    } else {
        // Se não estiver logado, manda pro login
        window.location.href = "login.html";
    }
});