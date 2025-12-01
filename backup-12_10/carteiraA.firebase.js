// Arquivo: carteiraA.firebase.js
// Responsável por calcular saldo e exibir histórico de ganhos do Fornecedor.

import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- Funções Auxiliares ---
const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "Data não disponível";
    return timestamp.toDate().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};


/**
 * Busca todos os ganhos de pedidos FINALIZADOS para calcular e exibir o saldo.
 */
async function carregarDadosCarteira(userId) {
    const saldoDisponivelEl = document.getElementById('saldo-disponivel');
    const tabelaBody = document.getElementById('tabela-ganhos');
    
    if (saldoDisponivelEl) saldoDisponivelEl.textContent = "Calculando...";
    if (tabelaBody) tabelaBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando histórico...</td></tr>';

    try {
        // 1. Soma todos os ganhos de pedidos finalizados onde o usuário é o fornecedor
        const pedidosRef = collection(db, "pedidos");
        
        // QUERY CORRIGIDA: Usa 'fornecedorId' (novo modelo)
        const qGanhos = query(
            pedidosRef, 
            where("fornecedorId", "==", userId), 
            where("status", "==", "finalizado")
            // orderBy("dataConclusao", "desc") // Requer índice composto (fornecedorId + status + dataConclusao)
        );
        
        const ganhosSnap = await getDocs(qGanhos);
        
        let totalGanhos = 0;
        let historicoHTML = '';

        if (ganhosSnap.empty) {
             if (tabelaBody) tabelaBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum serviço finalizado ainda.</td></tr>';
             if (saldoDisponivelEl) saldoDisponivelEl.textContent = formatarMoeda(0);
             return;
        }

        ganhosSnap.forEach(docSnap => {
            const pedido = docSnap.data();
            
            // MAPEAMENTO CORRIGIDO:
            // - Valor: ganhoAjudante (calculado na finalização) ou orcamentoMaximo (fallback)
            // - Título: titulo (novo) ou tituloAnuncio (legado)
            // - Data: dataConclusao (novo) ou criadoEm (fallback)
            
            const ganho = pedido.ganhoAjudante || pedido.orcamentoMaximo || 0;
            const titulo = pedido.titulo || pedido.tituloAnuncio || 'Serviço realizado';
            const dataFinalizacao = pedido.dataConclusao || pedido.criadoEm;

            totalGanhos += ganho;

            historicoHTML += `
                <tr>
                    <td>${formatarData(dataFinalizacao)}</td>
                    <td>${titulo}</td>
                    <td class="valor-positivo">+ ${formatarMoeda(ganho)}</td>
                    <td><span class="status-pill liberado">Liberado</span></td>
                </tr>
            `;
        });

        // (Lógica futura: Subtrair saques já realizados aqui)
        const saldoDisponivel = totalGanhos; 

        // 2. Atualiza a tela
        if (saldoDisponivelEl) saldoDisponivelEl.textContent = formatarMoeda(saldoDisponivel);
        if (tabelaBody) tabelaBody.innerHTML = historicoHTML;

    } catch(error) {
        console.error("Erro ao calcular saldo:", error);
        if (saldoDisponivelEl) saldoDisponivelEl.textContent = "Erro";
        if (tabelaBody) tabelaBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
    }
}


/**
 * Lógica para solicitar o saque.
 */
function configurarBotaoSaque(userId) {
    const btnSaque = document.getElementById('btn-solicitar-saque');
    if (!btnSaque) return;

    btnSaque.addEventListener('click', () => {
        // Aqui você implementaria a criação de um documento na coleção 'saques'
        alert("Solicitação de saque registrada! (Funcionalidade em breve)");
    });
}

// --- PONTO DE ENTRADA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Atualiza nome no menu (opcional, se existir o elemento)
        const greeting = document.getElementById("user-name");
        if (greeting && user.displayName) greeting.textContent = user.displayName.split(' ')[0];

        carregarDadosCarteira(user.uid);
        configurarBotaoSaque(user.uid);
    } else {
        window.location.href = "login.html";
    }
});