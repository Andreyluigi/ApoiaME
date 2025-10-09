// Importando as dependências do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA1ps6dSM2EtOkyg-xUeFky3S93j77qmII",
  authDomain: "apoia-me.firebaseapp.com",
  projectId: "apoia-me",
  storageBucket: "apoia-me.firebasestorage.app",
  messagingSenderId: "719321227710",
  appId: "1:719321227710:web:74e57959cbc564d09c19ef"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);

// Inicializando o Auth e Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Função para carregar o pedido e status
export async function loadPedido(pedidoID) {
    const docRef = doc(db, "pedidos", pedidoID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const pedidoData = docSnap.data();
        const status = pedidoData.status;
        const statusPagamento = pedidoData.statusPagamento;



        // Exibe o conteúdo baseado no status do pedido
        loadStatusContent(status, statusPagamento, pedidoData);
    } else {
        console.log("Pedido não encontrado!");
    }
}


// Função para exibir o conteúdo da página baseado no status
function loadStatusContent(status, statusPagamento, pedidoData) {
    const taskContainer = document.getElementById("tasks-container");
    const barraProgresso = document.getElementById("progress-bar")

    // Verifica se o container está disponível
    if (!taskContainer) {
        console.error("Elemento 'tasks-container' não encontrado.");
        return;
    }

    taskContainer.innerHTML = ""; // Limpa o conteúdo anterior

    if (status === "aceito" && statusPagamento === "pendente") {
        console.log("Status do pedido:",status)
        taskContainer.innerHTML = `
            <div class="task">
    <!-- Círculo de animação -->
    <div class="loading-container">
        <svg class="loading-circle" viewBox="25 25 50 50">
            <circle r="20" cy="50" cx="50"></circle>
        </svg>
    </div>

    <!-- Mensagem de status -->
    <p>Aguarde a confirmação do pagamento. Status: <strong>Pendente</strong></p>
    <div class="task-description">
        <p>O pagamento do seu pedido ainda está pendente. Fique atento para quando o cliente realizar a confirmação.</p>
    </div>

</div>
        `;
        barraProgresso.innerHTML = `
          <div class="progress-bar prog-4 comp-2 multi-fill"> 
                <div class="progress-step completed" id="step-1"> 
                    <span class="step-icon">1</span>
                    <span class="step-label">Aguardando Pagamento</span>
                </div>
                <div class="progress-step active" id="step-2">
                    <span class="step-icon">2</span>
                    <span class="step-label">Pagamento Confirmado</span>
                </div>
                <div class="progress-step waiting" id="step-3">
                    <span class="step-icon">3</span>
                    <span class="step-label">Em Rota</span>
                </div>
                <div class="progress-step waiting" id="step-4">
                    <span class="step-icon">4</span>
                    <span class="step-label">No Local</span>
                </div>
                <div class="progress-step waiting" id="step-5">
                    <span class="step-icon">5</span>
                    <span class="step-label">Em Execução</span>
                </div>
            </div>
            

            <!-- Segunda Linha de Etapas -->
            <div class="progress-bar">
                <div class="progress-step waiting" id="step-6">
                    <span class="step-icon">6</span>
                    <span class="step-label">Concluído Prestador</span>
                </div>
                <div class="progress-step waiting" id="step-7">
                    <span class="step-icon">7</span>
                    <span class="step-label">Aguardando Confirmação Cliente</span>
                </div>
                <div class="progress-step waiting" id="step-8">
                    <span class="step-icon">8</span>
                    <span class="step-label">Finalizado</span>
                </div>
            </div>
        `;
    }
    
    if (status === "pago_aguardando_inicio" && statusPagamento === "confirmado") {
        
        taskContainer.innerHTML = `
            <div class="task">
            <h1>Pagamento Concluído!</h1>
            <br>
                <h2>${pedidoData.tituloAnuncio}</h2>
                <br>
                <p><strong>Tipo de Serviço:</strong> ${pedidoData.tipoServico}</p>
                <p><strong>Categoria:</strong> ${pedidoData.categoriaReparo || 'Não especificada'}</p>
                <p><strong>Descrição:</strong> ${pedidoData.descricaoReparo || 'Sem descrição'}</p>
                <p><strong>Materiais fornecidos:</strong> ${pedidoData.materiaisFornecidos || 'Não informado'}</p>
                <p><strong>Endereço de Retirada:</strong> ${pedidoData.enderecoRetirada}</p>
                <p><strong>Data:</strong> ${pedidoData.data}</p>
                <p><strong>Hora:</strong> ${pedidoData.hora}</p>
                <p><strong>Preço Base:</strong> R$ ${pedidoData.precoBase}</p>

                <button id="startBtn" class="action-button">Iniciar Tarefa</button>
            </div>
        `;
        barraProgresso.innerHTML = `
            <div class="progress-bar prog-4 comp-2 multi-fill"> 
                    <div class="progress-step completed" id="step-1"> 
                        <span class="step-icon">1</span>
                        <span class="step-label">Aguardando Pagamento</span>
                    </div>
                    <div class="progress-step completed" id="step-2">
                        <span class="step-icon">2</span>
                        <span class="step-label">Pagamento Confirmado</span>
                    </div>
                    <div class="progress-step active" id="step-3">
                        <span class="step-icon">3</span>
                        <span class="step-label">Em Rota</span>
                    </div>
                    <div class="progress-step waiting" id="step-4">
                        <span class="step-icon">4</span>
                        <span class="step-label">No Local</span>
                    </div>
                    <div class="progress-step waiting" id="step-5">
                        <span class="step-icon">5</span>
                        <span class="step-label">Em Execução</span>
                    </div>
                </div>
            

            <!-- Segunda Linha de Etapas -->
            <div class="progress-bar">
                <div class="progress-step waiting" id="step-6">
                    <span class="step-icon">6</span>
                    <span class="step-label">Concluído Prestador</span>
                </div>
                <div class="progress-step waiting" id="step-7">
                    <span class="step-icon">7</span>
                    <span class="step-label">Aguardando Confirmação Cliente</span>
                </div>
                <div class="progress-step waiting" id="step-8">
                    <span class="step-icon">8</span>
                    <span class="step-label">Finalizado</span>
                </div>
            </div>
        `;

            document.getElementById("startBtn").addEventListener("click", async () => {
                const pedidoRef = doc(db, "pedidos", pedidoID);
                try {
                    await updateDoc(pedidoRef, { status: "em_rota" });
                    alert("Tarefa iniciada! Status atualizado para 'Em Rota'.");
                    loadPedido(pedidoID); // Atualiza o conteúdo da página
                } catch (error) {
                    console.error("Erro ao iniciar a tarefa:", error);
                    alert("Não foi possível iniciar a tarefa.");
                }
            });
    }

    if (status === 3) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Prepare-se para ir ao mercado. O pagamento foi confirmado e você está aguardando para iniciar.</p>
            </div>
        `;
    }

    if (status === 4) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Você está a caminho do mercado. Acompanhe a rota abaixo.</p>
                <!-- Aqui, você pode adicionar um mapa interativo -->
            </div>
        `;
    }

    if (status === 5) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Chegou no mercado, está verificando os itens e compras. Marque "Estou no Local" para confirmar.</p>
                <button id="arrivedBtn">Estou no Local</button>
            </div>
        `;
        document.getElementById("arrivedBtn").addEventListener("click", arrivedAtLocation);
    }

    if (status === 6) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Você está comprando os itens solicitados. Finalize a compra quando estiver pronto.</p>
            </div>
        `;
    }

    if (status === 7) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Você finalizou a compra! Aguardando a confirmação do cliente.</p>
            </div>
        `;
    }

    if (status === 8) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Aguardando confirmação do cliente. Quando o cliente confirmar, a entrega será finalizada.</p>
            </div>
        `;
    }

    if (status === 9) {
        taskContainer.innerHTML = `
            <div class="task">
                <p>Pedido finalizado! Obrigado por concluir a tarefa!</p>
            </div>
        `;
    }
}

// Função para iniciar a tarefa e atualizar o status
async function startTask() {
    const docRef = doc(db, "pedidos", pedidoID);
    await updateDoc(docRef, {
        status: 3 // Atualiza para "Pago Aguardando Início"
    });

    // Recarregar a página ou atualizar o conteúdo
    loadPedido(pedidoID);
}

// Função para confirmar chegada no local
async function arrivedAtLocation() {
    const docRef = doc(db, "pedidos", pedidoID);
    await updateDoc(docRef, {
        status: 5 // Atualiza para "No Local"
    });

    // Recarregar a página ou atualizar o conteúdo
    loadPedido(pedidoID);
}

// Função para concluir o pedido
async function concludeTask() {
    const docRef = doc(db, "pedidos", pedidoID);
    await updateDoc(docRef, {
        status: 7 // Atualiza para "Concluído Prestador"
    });

    // Recarregar a página ou atualizar o conteúdo
    loadPedido(pedidoID);
}

// Função para enviar confirmação do cliente
async function confirmCompletion() {
    const docRef = doc(db, "pedidos", pedidoID);
    await updateDoc(docRef, {
        status: 9 // Atualiza para "Finalizado"
    });

    // Recarregar a página ou atualizar o conteúdo
    loadPedido(pedidoID);
}

// Verifica o estado de login do ajudante
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("user-name").innerText = user.displayName;
        const pedidoID = new URLSearchParams(window.location.search).get('id');  // Pega o ID do pedido da URL
        loadPedido(pedidoID); // Carregar o pedido e o status
    } else {
        console.log("Ajudante não está logado.");
    }
});
