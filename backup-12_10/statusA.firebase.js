    //dependências do Firebase
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
    import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
    import { iniciarRota } from './rotaA.js';


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

    //carregar o pedido e status
    export async function loadPedido(pedidoID) {
        const docRef = doc(db, "pedidos", pedidoID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const pedidoData = docSnap.data();
            const status = pedidoData.status;
            const statusPagamento = pedidoData.statusPagamento;
            pedidoData.id = docSnap.id


            // Exibe o conteúdo baseado no status do pedido
            loadStatusContent(status, statusPagamento, pedidoData);
        } else {
            console.log("Pedido não encontrado!");
        }
    }



    function loadStatusContent(status, statusPagamento, pedidoData) {
        const taskContainer = document.getElementById("tasks-container");
        const barraProgresso = document.getElementById("progress-bar")

        


        // Verifica se o container está disponível
        if (!taskContainer) {
            console.error("Elemento 'tasks-container' não encontrado.");
            return;
        }

        taskContainer.innerHTML = "";

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
            <div class="progress-bar"> 
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
    const detalhesEspecificos = gerarDetalhesPedidoHTML(pedidoData);

    
    taskContainer.innerHTML = `
        <div class="task">
            <h1>Pagamento Concluído!</h1>
            <br>
            <h2>${pedidoData.tituloAnuncio}</h2>
            <br>
            <p><strong>Tipo de Serviço:</strong> ${pedidoData.tipoServico}</p>

            ${detalhesEspecificos} 

            <hr>
            <p><strong>Data:</strong> ${pedidoData.data || 'Não informada'}</p>
            <p><strong>Hora:</strong> ${pedidoData.Hora || 'Não informada'}</p>
            <p><strong>Preço Base:</strong> R$ ${pedidoData.precoBase || '0,00'}</p>

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
             // Esta verificação agora deve passar
             if (!pedidoData || !pedidoData.id) { 
            console.error("Pedido não encontrado ou ID inválido");
             alert("Erro: ID do pedido não encontrado.");
            return;
         }

             const pedidoRef = doc(db, "pedidos", pedidoData.id); // Agora pedidoData.id existe!
            try {
                await updateDoc(pedidoRef, { status: "em_rota" });
                alert("Tarefa iniciada! Status atualizado para 'Em Rota'.");
                loadPedido(pedidoData.id); // recarrega o conteúdo corretamente
             } catch (error) {
        console.error("Erro ao iniciar a tarefa:", error);
        alert("Não foi possível iniciar a tarefa.");
            }
        });

        }

        if (status === "em_rota") {
        taskContainer.innerHTML = `
            <div class="task">
                <h2>Em rota para o local do serviço!</h2>
                <div style="display:flex; justify-content:space-around; margin:15px 0; background:#f9f9f9; padding:10px; border-radius:8px;">
                    <p><strong>Distância:</strong> <span id="distanciaInfo">-</span></p>
                    <p><strong>Tempo Estimado:</strong> <span id="tempoInfo">-</span></p>
                </div>
                <div id="map" style="height:400px; width:100%; border-radius:8px;"></div>
                <button id="chegueiBtn" class="action-button" style="margin-top:15px; width:100%;">Cheguei ao Local</button>
            </div>
        `;
        
        iniciarRota(pedidoData);

        document.getElementById("chegueiBtn").addEventListener("click", async () => {
            const pedidoRef = doc(db, "pedidos", pedidoData.id);
            await updateDoc(pedidoRef, { status: "no_local" }); 
            loadPedido(pedidoData.id);
        });
            barraProgresso.innerHTML = `
                <div class="progress-bar"> 
                        <div class="progress-step completed" id="step-1"> 
                            <span class="step-icon">1</span>
                            <span class="step-label">Aguardando Pagamento</span>
                        </div>
                        <div class="progress-step completed" id="step-2">
                            <span class="step-icon">2</span>
                            <span class="step-label">Pagamento Confirmado</span>
                        </div>
                        <div class="progress-step completed" id="step-3">
                            <span class="step-icon">3</span>
                            <span class="step-label">Em Rota</span>
                        </div>
                        <div class="progress-step active" id="step-4">
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
        if (status === "no_local") {
            taskContainer.innerHTML = `
                <div class="task">
                    <h1>Chegada ao Local Confirmada!</h1>
                    <br>
                    <h2>${pedidoData.tituloAnuncio}</h2>
                    <br>
                    <p><strong>Tipo de Serviço:</strong> ${pedidoData.tipoServico}</p>
                    
                    <div class="task-description">
                        <h3>Próximos Passos:</h3>
                        <p>Você está no local da tarefa. Prepare-se para iniciar a execução do serviço, seja ele a retirada de um item, o reparo de um equipamento, ou a busca de documentos. Verifique todos os detalhes do pedido com o cliente antes de prosseguir.</p>
                    </div>

                    <button id="execBtn" class="action-button">Iniciar Execução da Tarefa</button>
                </div>
            `;
            barraProgresso.innerHTML = `
                <div class="progress-bar"> 
                        <div class="progress-step completed" id="step-1"> 
                            <span class="step-icon">1</span>
                            <span class="step-label">Aguardando Pagamento</span>
                        </div>
                        <div class="progress-step completed" id="step-2">
                            <span class="step-icon">2</span>
                            <span class="step-label">Pagamento Confirmado</span>
                        </div>
                        <div class="progress-step completed" id="step-3">
                            <span class="step-icon">3</span>
                            <span class="step-label">Em Rota</span>
                        </div>
                        <div class="progress-step completed" id="step-4">
                            <span class="step-icon">4</span>
                            <span class="step-label">No Local</span>
                        </div>
                        <div class="progress-step active" id="step-5">
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
            
            document.getElementById("execBtn").addEventListener("click", async () => {
                
                if (!pedidoData || !pedidoData.id) { 
                    console.error("Pedido não encontrado ou ID inválido");
                    alert("Erro: ID do pedido não encontrado.");
                    return;
                }
                
                const pedidoRef = doc(db, "pedidos", pedidoData.id);
                
                try {
                    await updateDoc(pedidoRef, { status: "em_execucao" });
                    
                    alert("Execução da tarefa iniciada! Status atualizado para 'Em Execução'.");
                    
                    loadPedido(pedidoData.id);
                    
                } catch (error) {
                    console.error("Erro ao iniciar a execução da tarefa:", error);
                    alert("Não foi possível iniciar a execução da tarefa. Tente novamente.");
                }
            });
        }

         if (status === "em_execucao") {
            
            let instrucaoPersonalizada = `O serviço está em andamento. Mantenha a comunicação com o cliente e verifique se todos os detalhes do pedido foram cumpridos.`;
            const tipoServico = pedidoData.tipoServico; 

            switch (tipoServico) {
                case "Troca de gás":
                    instrucaoPersonalizada = `Finalize a instalação do(s) botijão(ões). Certifique-se de que não há vazamentos e que o botijão vazio foi retirado (se solicitado).`;
                    break;
                
                case "Fazer feira":
                case "Compras no mercado":
                    instrucaoPersonalizada = `Você está realizando a compra. Use o orçamento máximo como referência e priorize itens frescos e de qualidade. Mantenha os comprovantes de compra.`;
                    break;

                case "Buscar/Levar documentos":
                    instrucaoPersonalizada = `Você está entregando/buscando os documentos. Certifique-se da integridade do pacote e colete a assinatura necessária (se aplicável).`;
                    break;

                case "Passear com cachorro":
                    instrucaoPersonalizada = `O passeio está em andamento. Mantenha o animal seguro e garanta que o tempo de duração mínima será cumprido.`;
                    break;

                case "Pequenos reparos":
                    instrucaoPersonalizada = `O reparo está em execução. Priorize a segurança e a qualidade. Se houver imprevistos ou precisar de materiais, comunique o cliente antes de avançar.`;
                    break;

                case "Montagem de móveis":
                    instrucaoPersonalizada = `A montagem está sendo finalizada. Verifique se todas as peças foram usadas e se o móvel está firme e seguro no local.`;
                    break;

                case "Jardinagem e poda":
                    instrucaoPersonalizada = `O serviço de jardinagem está quase completo. Garanta que o tipo de serviço (poda/limpeza) foi realizado conforme o combinado e que o descarte de resíduos será feito corretamente.`;
                    break;

                case "Instalação de TV/suporte":
                    instrucaoPersonalizada = `A instalação da TV/suporte está em andamento. Confirme a altura e o tipo de parede com o cliente antes de furar. Certifique-se de que a TV está nivelada e segura.`;
                    break;

                case "Limpeza residencial":
                    instrucaoPersonalizada = `A limpeza está em execução. Foque nas áreas prioritárias (quartos/banheiros) e use os materiais disponíveis. Garanta que o nível de limpeza atenda ao tipo de serviço contratado.`;
                    break;

                case "Outros":
                    instrucaoPersonalizada = `Você está executando o serviço personalizado. Siga a descrição detalhada do cliente e confirme a finalização com ele antes de pressionar o botão abaixo.`;
                    break;
            }

            taskContainer.innerHTML = `
                <div class="task">
                    <h1>Tarefa em Execução</h1>
                    <br>
                    <div class="task-description">
                        <p><strong>Instrução Específica para ${tipoServico}:</strong> ${instrucaoPersonalizada}</p>
                        <br>
                        <p>Quando o serviço estiver totalmente concluído, pressione o botão abaixo.</p>
                    </div>

                    <button id="concludeBtn" class="action-button">Finalizar Tarefa</button>
                </div>
            `;

            barraProgresso.innerHTML = `
                <div class="progress-bar"> 
                        <div class="progress-step completed" id="step-1"> 
                            <span class="step-icon">1</span>
                            <span class="step-label">Aguardando Pagamento</span>
                        </div>
                        <div class="progress-step completed" id="step-2">
                            <span class="step-icon">2</span>
                            <span class="step-label">Pagamento Confirmado</span>
                        </div>
                        <div class="progress-step completed" id="step-3">
                            <span class="step-icon">3</span>
                            <span class="step-label">Em Rota</span>
                        </div>
                        <div class="progress-step completed" id="step-4">
                            <span class="step-icon">4</span>
                            <span class="step-label">No Local</span>
                        </div>
                        <div class="progress-step completed" id="step-5">
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

            
document.getElementById("concludeBtn").addEventListener("click", async () => {
    if (!pedidoData || !pedidoData.id) { 
        console.error("Pedido não encontrado ou ID inválido");
        alert("Erro: ID do pedido não encontrado.");
        return;
    }
    
    const pedidoRef = doc(db, "pedidos", pedidoData.id);
    
    try {

        const ajudanteUid = auth.currentUser.uid;
        if (!ajudanteUid) throw new Error("Ajudante não autenticado.");
        const ajudanteRef = doc(db, "usuarios", ajudanteUid);
        await updateDoc(pedidoRef, { status: "concluido_prestador" });
        await updateDoc(ajudanteRef, { pedidoAtivo: null });
        console.log("Campo pedidoAtivo do ajudante foi limpo.");
        alert("Tarefa finalizada! Aguardando confirmação do cliente.");
        loadPedido(pedidoData.id);

    } catch (error) {
        console.error("Erro ao finalizar a tarefa:", error);
        alert("Não foi possível finalizar a tarefa. Verifique o console.");
    }
});
        }

        if (status === "concluido_prestador") {
            taskContainer.innerHTML = `
                <div class="task pending-task">
                    <!-- Círculo de animação -->
        <div class="loading-container">
            <svg class="loading-circle" viewBox="25 25 50 50">
                <circle r="20" cy="50" cx="50"></circle>
            </svg>
        </div> 
                    <h1>Aguardando Confirmação do Cliente</h1>
                    <br>
                    <p><strong>Seu trabalho foi concluído.</strong> O status do pedido agora está nas mãos do Cliente para revisão e aprovação.</p>
                    <div class="task-description">
                        <h3>O que acontece agora?</h3>
                        <p>Assim que o Cliente confirmar a entrega ou a satisfação com o serviço, o status será Concluído</p>
                        <p>Você não precisa fazer mais nada neste momento. Mantenha o contato em caso de dúvidas do Cliente.</p>
                    </div>
                </div>
            `;
barraProgresso.innerHTML = `
                <div class="progress-bar"> 
                        <div class="progress-step completed" id="step-1"> 
                            <span class="step-icon">1</span>
                            <span class="step-label">Aguardando Pagamento</span>
                        </div>
                        <div class="progress-step completed" id="step-2">
                            <span class="step-icon">2</span>
                            <span class="step-label">Pagamento Confirmado</span>
                        </div>
                        <div class="progress-step completed" id="step-3">
                            <span class="step-icon">3</span>
                            <span class="step-label">Em Rota</span>
                        </div>
                        <div class="progress-step completed" id="step-4">
                            <span class="step-icon">4</span>
                            <span class="step-label">No Local</span>
                        </div>
                        <div class="progress-step completed" id="step-5">
                            <span class="step-icon">5</span>
                            <span class="step-label">Em Execução</span>
                        </div>
                    </div>
                

                <!-- Segunda Linha de Etapas -->
                <div class="progress-bar">
                    <div class="progress-step completed" id="step-6">
                        <span class="step-icon">6</span>
                        <span class="step-label">Concluído Prestador</span>
                    </div>
                    <div class="progress-step active" id="step-7">
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

if (status === "finalizado") {
   taskContainer.innerHTML = `
                <div class="task finalizado-task">             
                    <div class="confirmation-header">
                        <div class="success-icon">✓</div>                         <h1>Serviço Concluído com Sucesso!</h1>
                        <p>O cliente confirmou a finalização da tarefa. Pagamento processado.</p>
                    </div>
                    <hr>
                    <div class="order-summary">
                        <h2>Resumo da Tarefa</h2>
                        <p><strong>Título:</strong> ${pedidoData.tituloAnuncio}</p>
                        <p><strong>Tipo de Serviço:</strong> ${pedidoData.tipoServico}</p>
                        <p><strong>Valor Total:</strong> R$ ${pedidoData.precoBase}</p>
                    </div>
                    <hr>
                    <div class="actions-section">
                        <h2>Próximas Ações</h2>
                        <p>Contribua para a qualidade da nossa plataforma avaliando o cliente e o processo.</p>               
                        <button id="DashboardBtn" class="action-button secondary-action">Voltar para Dashboard</button>
                    </div>

                </div>
            `;

            
            barraProgresso.innerHTML = `
                <div class="progress-bar"> 
                        <div class="progress-step completed" id="step-1"> 
                            <span class="step-icon">1</span>
                            <span class="step-label">Aguardando Pagamento</span>
                        </div>
                        <div class="progress-step completed" id="step-2">
                            <span class="step-icon">2</span>
                            <span class="step-label">Pagamento Confirmado</span>
                        </div>
                        <div class="progress-step completed" id="step-3">
                            <span class="step-icon">3</span>
                            <span class="step-label">Em Rota</span>
                        </div>
                        <div class="progress-step completed" id="step-4">
                            <span class="step-icon">4</span>
                            <span class="step-label">No Local</span>
                        </div>
                        <div class="progress-step completed" id="step-5">
                            <span class="step-icon">5</span>
                            <span class="step-label">Em Execução</span>
                        </div>
                    </div>
                

                <!-- Segunda Linha de Etapas -->
                <div class="progress-bar">
                    <div class="progress-step completed" id="step-6">
                        <span class="step-icon">6</span>
                        <span class="step-label">Concluído Prestador</span>
                    </div>
                    <div class="progress-step completed" id="step-7">
                        <span class="step-icon">7</span>
                        <span class="step-label">Aguardando Confirmação Cliente</span>
                    </div>
                    <div class="progress-step completed" id="step-8">
                        <span class="step-icon">8</span>
                        <span class="step-label">Finalizado</span>
                    </div>
                </div>

`; 
            

            document.getElementById("DashboardBtn").addEventListener("click", () => {
                alert("Redirecionando para a Dashboard");
                window.location.href = `../html/dashboardA.html`; 
            });
        }
    }

    function gerarDetalhesPedidoHTML(pedidoData) {
    let detalhesHtml = '';

    // O switch constrói o HTML específico para cada tipo de serviço
    switch (pedidoData.tipoServico) {
        case "Troca de gás":
            detalhesHtml = `
                <p><strong>Tipo de Botijão:</strong> ${pedidoData.tipoBotijao || 'Não informado'}</p>
                <p><strong>Quantidade:</strong> ${pedidoData.quantidade || 'Não informada'}</p>
                <p><strong>Endereço de Instalação:</strong> ${pedidoData.endereco || ''}, ${pedidoData.numero || ''} - ${pedidoData.bairro || ''}, ${pedidoData.cidade || ''} - ${pedidoData.estado || ''}</p>
                <p><strong>Complemento:</strong> ${pedidoData.andar ? `Andar: ${pedidoData.andar}` : ''} ${pedidoData.elevador ? `(Elevador: ${pedidoData.elevador})` : ''}</p>
                <p><strong>Retirar botijão vazio:</strong> ${pedidoData.retirarVazio || 'Não informado'}</p>
            `;
            break;

        case "Fazer feira":
        case "Compras no mercado":
            detalhesHtml = `
                <p><strong>Itens da Compra:</strong></p>
                <ul>${(pedidoData.itensCompra || []).map(item => `<li>${item}</li>`).join('')}</ul>
                <p><strong>Orçamento Máximo:</strong> R$ ${pedidoData.orcamentoMax || 'Não informado'}</p>
                <p><strong>Endereço de Entrega:</strong> ${pedidoData.endereco || ''}, ${pedidoData.numero || ''} - ${pedidoData.bairro || ''}, ${pedidoData.cidade || ''} - ${pedidoData.estado || ''}</p>
            `;
            break;

        case "Buscar/Levar documentos":
            detalhesHtml = `
                <p><strong>Urgência:</strong> ${pedidoData.urgencia || 'Não informada'}</p>
                <p><strong>Requer Assinatura:</strong> ${pedidoData.requerAssinatura || 'Não informado'}</p>
                <p><strong>Tamanho do Pacote:</strong> ${pedidoData.tamanho || 'Não informado'}</p>
                <p><strong>Endereço de Retirada:</strong> ${pedidoData.enderecoRetirada || 'Não informado'}</p>
                <p><strong>Endereço de Entrega:</strong> ${pedidoData.enderecoEntrega || 'Não informado'}</p>
            `;
            break;

        case "Passear com cachorro":
            detalhesHtml = `
                <p><strong>Nome do Pet:</strong> ${pedidoData.nomePet || 'Não informado'}</p>
                <p><strong>Porte do Pet:</strong> ${pedidoData.porte || 'Não informado'}</p>
                <p><strong>Duração Mínima do Passeio:</strong> ${pedidoData.duracaoMinima || 'Não informada'} minutos</p>
                <p><strong>Endereço de Retirada:</strong> ${pedidoData.enderecoRetirada || 'Não informado'}</p>
            `;
            break;

        case "Pequenos reparos":
            detalhesHtml = `
                <p><strong>Categoria do Reparo:</strong> ${pedidoData.categoriaReparo || 'Não especificada'}</p>
                <p><strong>Descrição do Problema:</strong> ${pedidoData.descricaoReparo || 'Sem descrição'}</p>
                <p><strong>Fornecimento de Materiais:</strong> ${pedidoData.materiaisFornecidos || 'Não informado'}</p>
                <p><strong>Endereço do Serviço:</strong> ${pedidoData.enderecoReparo || 'Não informado'}</p>
            `;
            break;

        case "Montagem de móveis":
            detalhesHtml = `
                <p><strong>Tipo de Móvel:</strong> ${pedidoData.tipoMovel || 'Não informado'}</p>
                <p><strong>Quantidade:</strong> ${pedidoData.quantidade || 'Não informada'}</p>
                <p><strong>Marca/Modelo:</strong> ${pedidoData.marcaModelo || 'Não informado'}</p>
                <p><strong>Possui Manual:</strong> ${pedidoData.temManual || 'Não informado'}</p>
                <p><strong>Precisa furar parede:</strong> ${pedidoData.precisaFurar || 'Não informado'}</p>
                <p><strong>Endereço de Montagem:</strong> ${pedidoData.enderecoMontagem || 'Não informado'}</p>
            `;
            break;

        case "Jardinagem e poda":
            detalhesHtml = `
                <p><strong>Área Aproximada:</strong> ${pedidoData.area || 'Não informada'} m²</p>
                <p><strong>Serviço Específico:</strong> ${pedidoData.tipoServicoJardinagem || 'Não especificado'}</p>
                <p><strong>Destino dos Resíduos:</strong> ${pedidoData.destinoResiduos || 'Não informado'}</p>
                <p><strong>Endereço do Serviço:</strong> ${pedidoData.enderecoServico || 'Não informado'}</p>
            `;
            break;

        case "Instalação de TV/suporte":
            detalhesHtml = `
                <p><strong>Tamanho da TV:</strong> ${pedidoData.polegadasTv || 'Não informado'}"</p>
                <p><strong>Tipo de Parede:</strong> ${pedidoData.tipoParede || 'Não informado'}</p>
                <p><strong>Altura de Instalação:</strong> ${pedidoData.alturaTv || 'A definir'}</p>
                <p><strong>Necessita Passagem de Cabos:</strong> ${pedidoData.passagemCabos || 'Não informado'}</p>
                <p><strong>Cliente fornecerá o suporte:</strong> ${pedidoData.precisaSuporte === 'sim' ? 'Não' : 'Sim'}</p>
                <p><strong>Endereço do Serviço:</strong> ${pedidoData.enderecoServico || 'Não informado'}</p>
            `;
            break;

        case "Limpeza residencial":
            detalhesHtml = `
                <p><strong>Tipo de Limpeza:</strong> ${pedidoData.tipoLimpeza || 'Não especificado'}</p>
                <p><strong>Metragem do Imóvel:</strong> ${pedidoData.metragem || 'Não informada'} m²</p>
                <p><strong>Quantidade de Quartos:</strong> ${pedidoData.quartos || 'Não informado'}</p>
                <p><strong>Quantidade de Banheiros:</strong> ${pedidoData.banheiros || 'Não informado'}</p>
                <p><strong>Materiais de Limpeza:</strong> ${pedidoData.materiaisDisponiveis || 'Não informado'}</p>
                <p><strong>Periodicidade:</strong> ${pedidoData.periodicidade || 'Única'}</p>
                <p><strong>Endereço do Serviço:</strong> ${pedidoData.enderecoServico || 'Não informado'}</p>
            `;
            break;
            
        case "Outros":
             detalhesHtml = `
                <p><strong>Descrição Detalhada do Serviço:</strong> ${pedidoData.descricaoServico || 'Sem descrição'}</p>
            `;
            break;

        default:
            detalhesHtml = `<p>Não foi possível carregar os detalhes específicos do pedido.</p>`;
    }

    return detalhesHtml;
}

    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById("user-name").innerText = user.displayName;
            const pedidoID = new URLSearchParams(window.location.search).get('id');
            loadPedido(pedidoID); 
        } else {
            console.log("Ajudante não está logado.");
        }
    });
