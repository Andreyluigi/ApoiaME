// Arquivo: dashboardA.firebase.js
// Responsável pela lógica da Dashboard do Fornecedor (Home)

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
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- ELEMENTOS DO DOM ---
const userGreeting = document.getElementById("user-name");

// Seção Pedido Ativo
const activeOrderSection = document.getElementById("secao-pedido-ativo");
const activeOrderContainer = document.getElementById("card-pedido-ativo-dashboard");

// Seção Estatísticas
const totalGanhosEl = document.getElementById("total-ganhos-valor");
const totalServicosEl = document.getElementById("total-servicos-valor");
// CORREÇÃO: Definindo a variável com o nome correto que será usado na função
const ratingEl = document.getElementById("avaliacao-media-valor"); 

// Seção Histórico
const listaUltimosServicos = document.getElementById("lista-ultimos-servicos");


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
// 1. MONITORAR PEDIDO ATIVO (Tempo Real)
// ============================================================
function monitorActiveOrder(uid) {
    const userRef = doc(db, "usuarios", uid);

    // Escuta mudanças no perfil do fornecedor para saber se entrou/saiu pedido
    onSnapshot(userRef, async (userSnap) => {
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const pedidoAtivoId = userData.pedidoAtivo;

            if (pedidoAtivoId) {
                // Busca detalhes do pedido
                try {
                    const pedidoRef = doc(db, "pedidos", pedidoAtivoId);
                    const pedidoSnap = await getDoc(pedidoRef);
                    
                    if (pedidoSnap.exists()) {
                        const pedido = pedidoSnap.data();
                        // Só exibe se não estiver finalizado/cancelado (segurança)
                        if (pedido.status !== 'finalizado' && pedido.status !== 'cancelado') {
                            renderActiveOrder(pedido, pedidoAtivoId);
                            if (activeOrderSection) activeOrderSection.style.display = 'block';
                        } else {
                            if (activeOrderSection) activeOrderSection.style.display = 'none';
                        }
                    } else {
                         if (activeOrderSection) activeOrderSection.style.display = 'none';
                    }
                } catch (error) {
                    console.error("Erro ao buscar detalhes do pedido ativo:", error);
                }
            } else {
                if (activeOrderSection) activeOrderSection.style.display = 'none';
            }
        }
    });
}

function renderActiveOrder(pedido, id) {
    const statusFormatado = (pedido.status || '').replace(/_/g, ' ').toUpperCase();
    const titulo = pedido.titulo || "Serviço em Andamento";
    const cliente = pedido.clienteNome || "Cliente";

    activeOrderContainer.innerHTML = `
        <div class="card-ativo-dashboard">
            <div>
                <h3>${titulo}</h3>
                <p style="margin-bottom: 4px;">Cliente: ${cliente}</p>
                <p class="status-badge" style="font-size: 0.9rem; opacity: 0.9;">Status: <strong>${statusFormatado}</strong></p>
            </div>
            <a href="statusA.html?id=${id}" class="btn-acompanhar-dash">
                Acompanhar <i data-lucide="arrow-right" style="width:18px; margin-left: 5px; vertical-align: middle;"></i>
            </a>
        </div>
    `;
    lucide.createIcons();
}


// ============================================================
// 2. CALCULAR ESTATÍSTICAS (Ganhos e Avaliação)
// ============================================================
async function loadDashboardStats(uid) {
    try {
        // Busca todos os pedidos finalizados deste fornecedor
        const q = query(
            collection(db, "pedidos"),
            where("fornecedorId", "==", uid),
            where("status", "==", "finalizado")
        );
        
        const querySnapshot = await getDocs(q);
        
        let count = 0;
        let earnings = 0;
        let totalStars = 0;
        let ratedCount = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            count++;
            
            // Soma ganhos (prioriza ganhoAjudante, fallback para cálculo manual)
            const ganho = parseFloat(data.ganhoAjudante) || (parseFloat(data.orcamentoMaximo || 0) * 0.90);
            earnings += ganho;
            
            // Soma avaliações
            if (data.avaliacaoCliente && data.avaliacaoCliente.nota) {
                totalStars += parseInt(data.avaliacaoCliente.nota);
                ratedCount++;
            }
        });

        // Atualiza a tela
        if (totalServicosEl) totalServicosEl.textContent = count;
        if (totalGanhosEl) totalGanhosEl.textContent = formatarMoeda(earnings);
        
        if (ratingEl) {
            if (ratedCount > 0) {
                const media = (totalStars / ratedCount).toFixed(1);
                ratingEl.textContent = `${media}`;
            } else {
                ratingEl.textContent = "--"; // Sem avaliações ainda
            }
        }

    } catch (e) {
        console.error("Erro ao carregar estatísticas:", e);
        if (ratingEl) ratingEl.textContent = "N/A";
    }
}


// ============================================================
// 3. BUSCAR HISTÓRICO RECENTE (Últimos 3)
// ============================================================
async function fetchRecentHistory(uid) {
    try {
        const q = query(
            collection(db, "pedidos"),
            where("fornecedorId", "==", uid),
            where("status", "in", ["finalizado", "cancelado"]),
            orderBy("criadoEm", "desc"), 
            limit(3)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            listaUltimosServicos.innerHTML = '<div class="item-simples" style="justify-content:center; color:#888;"><p>Nenhum serviço finalizado recentemente.</p></div>';
            return;
        }

        let html = '';
        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            
            const titulo = p.titulo || "Serviço Realizado";
            const data = formatarData(p.dataConclusao || p.criadoEm);
            
            // Ganho ou status
            let valorDisplay = "";
            if (p.status === 'cancelado') {
                valorDisplay = `<span style="color:#e53935; font-weight:600;">Cancelado</span>`;
            } else {
                const ganho = parseFloat(p.ganhoAjudante) || (parseFloat(p.orcamentoMaximo || 0) * 0.90);
                valorDisplay = `<span class="valor-ganho">+ ${formatarMoeda(ganho)}</span>`;
            }

            html += `
                <div class="item-historico-dash">
                    <div>
                        <strong>${titulo}</strong>
                        <span>${data}</span>
                    </div>
                    <div>
                        ${valorDisplay}
                    </div>
                </div>
            `;
        });
        listaUltimosServicos.innerHTML = html;
        
    } catch (e) {
        console.error("Erro ao buscar histórico:", e);
        listaUltimosServicos.innerHTML = '<p style="color:#666; font-size: 0.9rem; text-align:center;">Histórico indisponível (verifique índices).</p>';
    }
}


// ============================================================
// 4. INICIALIZAÇÃO
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Atualiza nome no cabeçalho
        const nome = user.displayName ? user.displayName.split(' ')[0] : 'Parceiro';
        if (userGreeting) userGreeting.innerText = nome;

        // Inicia as funções com o UID do usuário logado
        monitorActiveOrder(user.uid);
        loadDashboardStats(user.uid);
        fetchRecentHistory(user.uid);
    } else {
        // Se não estiver logado, manda pro login
        console.log("Fornecedor não logado. Redirecionando...");
        window.location.href = "../html/login.html";
    }
});