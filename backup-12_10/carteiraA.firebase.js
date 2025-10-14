import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- Funções Auxiliares ---
const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarData = (timestamp) => (timestamp && timestamp.toDate) ? timestamp.toDate().toLocaleDateString('pt-BR') : "—";


/**
 * Busca todos os ganhos e saques para calcular e exibir o saldo.
 */
async function carregarDadosCarteira(userId) {
    const saldoDisponivelEl = document.getElementById('saldo-disponivel');
    const tabelaBody = document.getElementById('tabela-ganhos');
    
    saldoDisponivelEl.textContent = "Calculando...";
    tabelaBody.innerHTML = '<tr><td colspan="4">Carregando histórico...</td></tr>';

    try {
        // 1. Soma todos os ganhos de pedidos finalizados
        const pedidosRef = collection(db, "pedidos");
        const qGanhos = query(pedidosRef, where("ajudanteUid", "==", userId), where("status", "==", "finalizado"));
        const ganhosSnap = await getDocs(qGanhos);
        
        let totalGanhos = 0;
        let historicoHTML = '';

        ganhosSnap.forEach(docSnap => {
            const pedido = docSnap.data();
            const ganho = pedido.ganhoAjudante || 0;
            totalGanhos += ganho;

            historicoHTML += `
                <tr>
                    <td>${formatarData(pedido.criadoEm)}</td>
                    <td>${pedido.tituloAnuncio || 'Serviço'}</td>
                    <td>${formatarMoeda(ganho)}</td>
                    <td><span class="status-pill liberado">Liberado</span></td>
                </tr>
            `;
        });

        // (Lógica futura) Aqui você subtrairia os saques já feitos
        const saldoDisponivel = totalGanhos; 

        // 2. Atualiza a tela com os valores calculados
        saldoDisponivelEl.textContent = formatarMoeda(saldoDisponivel);
        
        if (historicoHTML === '') {
            tabelaBody.innerHTML = '<tr><td colspan="4">Nenhum ganho registrado ainda.</td></tr>';
        } else {
            tabelaBody.innerHTML = historicoHTML;
        }

    } catch(error) {
        console.error("Erro ao calcular saldo:", error);
        saldoDisponivelEl.textContent = "Erro";
    }
}


/**
 * Lógica para solicitar o saque (cria um registro para o admin).
 */
function configurarBotaoSaque(userId) {
    // Esta função pode ser implementada depois, mas a estrutura fica aqui.
    const btnSaque = document.getElementById('btn-solicitar-saque');
    if (!btnSaque) return;

    btnSaque.addEventListener('click', () => {
        alert("Função de saque em desenvolvimento!");
        // A lógica de transação que discutimos entraria aqui.
    });
}

// --- PONTO DE ENTRADA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        carregarDadosCarteira(user.uid);
        configurarBotaoSaque(user.uid);
    } else {
        window.location.href = "login.html";
    }
});