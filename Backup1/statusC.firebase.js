import { db } from "../firebase-init.js";  // Banco de dados do Firebase
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Função para obter o pedidoId da URL
const urlParams = new URLSearchParams(window.location.search);
const pedidoId = urlParams.get('id');

if (!pedidoId) {
  alert("Pedido não encontrado!");
  window.location.href = "../html/dashboardC.html"; // Redireciona caso não haja pedidoId
}

const pedidoRef = doc(db, "pedidos", pedidoId);

async function carregarPedido() {
  try {
    const pedidoSnap = await getDoc(pedidoRef);
    
    if (!pedidoSnap.exists()) {
      alert("Pedido não encontrado.");
      window.location.href = "../html/dashboardC.html"; // Redireciona caso o pedido não exista
      return;
    }
    
    const pedidoData = pedidoSnap.data();


    // Preencher os campos da página com os dados do pedido
    document.getElementById("pedido-id").textContent = pedidoId;
    document.getElementById("pedido-titulo").textContent = pedidoData.tituloAnuncio || "Não informado";
    document.getElementById("pedido-prestador").textContent = pedidoData.prestadorApelido || "Não informado"; // Pode buscar o nome do prestador se necessário
    document.getElementById("status-pill").textContent = pedidoData.status || "Pendente";
    
    // Exibe o valor do serviço, taxa de entrega e total
    document.getElementById("valor-servico").textContent = `R$ ${pedidoData.precoBase || 0}`;
    document.getElementById("valor-entrega").textContent = `R$ 0`; // Ajuste se necessário
    document.getElementById("valor-total").textContent = `R$ ${pedidoData.precoBase || 0}`;

    // Preencher os locais de retirada e entrega
    document.getElementById("retirada-txt").textContent = pedidoData.enderecoRetirada || "Não informado";
    document.getElementById("entrega-txt").textContent = pedidoData.enderecoEntrega || "Não informado";

    // Exibir as etapas do pedido
   // const statusEtapas = document.getElementById("status-etapas");
   // statusEtapas.innerHTML = ""; // Limpa a lista de etapas
    
    // Exemplo de como adicionar as etapas, você pode personalizar conforme seu fluxo
    const etapas = ["pendente", "pago", "em_andamento", "entrega_aceita", "entregando", "entregue", "finalizado"];
    etapas.forEach(etapa => {
      const li = document.createElement("li");
      li.setAttribute("data-status", etapa);
      li.innerHTML = `<i data-lucide="timer"></i><span>${etapa.charAt(0).toUpperCase() + etapa.slice(1)}</span>`;
      statusEtapas.appendChild(li);
    });

    // Carregar histórico do pedido (se necessário)
    const listaHistorico = document.getElementById("lista-historico");
    listaHistorico.innerHTML = ""; // Limpa a lista de histórico

    // Exemplo de histórico
    if (pedidoData.historico) {
      pedidoData.historico.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        listaHistorico.appendChild(li);
      });
    }

    // Atualiza o status do pagamento
    document.getElementById("pagamento-status").textContent = pedidoData.statusPagamento || "Aguardando pagamento";

  } catch (error) {
    console.error("Erro ao carregar os detalhes do pedido:", error);
    alert("Erro ao carregar os detalhes do pedido.");
  }
}

// Função para atualizar o status (caso tenha botão para isso)
// document.getElementById("btn-pagar").addEventListener("click", async () => {
//   try {
//     const novoStatus = prompt("Digite o novo status do pedido:");
//     if (novoStatus) {
      // Atualizar o status do pedido no Firestore
//       await updateDoc(pedidoRef, {
//         status: novoStatus,
//         atualizadoEm: serverTimestamp()
//       });
//       document.getElementById("status-pill").textContent = novoStatus;
//       alert("Status do pedido atualizado!");
//     }
//   } catch (error) {
//     console.error("Erro ao atualizar o status:", error);
//     alert("Erro ao atualizar o status do pedido.");
//   }
// });

// Carregar detalhes do pedido ao carregar a página
carregarPedido();
