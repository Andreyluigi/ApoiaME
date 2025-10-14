// StatusC.firebase.js
// integração Firebase para status do pedido (cliente) com cards de orientação específicos por status
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1ps6dSM2EtOkyg-xUeFky3S93j77qmII",
  authDomain: "apoia-me.firebaseapp.com",
  projectId: "apoia-me",
  storageBucket: "apoia-me.firebasestorage.app",
  messagingSenderId: "719321227710",
  appId: "1:719321227710:web:74e57959cbc564d09c19ef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentPedidoRef = null;
let unsubscribeSnapshot = null;

export async function loadPedidoCliente(pedidoID) {
  if (!pedidoID) {
    console.error("ID do pedido não fornecido.");
    return;
  }
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  currentPedidoRef = doc(db, "pedidos", pedidoID);

  unsubscribeSnapshot = onSnapshot(currentPedidoRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.error("Pedido não encontrado.");
      return;
    }
    const pedido = docSnap.data();
    pedido.id = docSnap.id;
    renderPedidoCliente(pedido);
  }, (err) => console.error("Erro onSnapshot:", err));
}

function formatCurrency(n) {
  try { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  catch { return "R$ 0,00"; }
}

function renderTimeline(status) {
  const items = document.querySelectorAll("#status-etapas li");
  const order = ["pendente","aceito","pago_aguardando_inicio","em_rota","no_local","em_execucao","concluido_prestador","finalizado"];
  items.forEach(li => {
    li.classList.remove("active", "completed");
    const key = li.getAttribute("data-status");
    if (key === status) li.classList.add("active");
    else if (order.indexOf(key) < order.indexOf(status)) li.classList.add("completed");
  });
}

function renderHistorico(entradaHistorico = []) {
  const ul = document.getElementById("lista-historico");
  ul.innerHTML = "";
  if (!Array.isArray(entradaHistorico) || entradaHistorico.length === 0) {
    ul.innerHTML = `<li>Nenhum evento registrado ainda.</li>`;
    return;
  }
  entradaHistorico.forEach(evt => {
    const timeStr = evt.time ? new Date(evt.time.toDate ? evt.time.toDate() : evt.time).toLocaleString() : '';
    const li = document.createElement("li");
    li.innerText = `${timeStr} — ${evt.text}`;
    ul.appendChild(li);
  });
}

function addHistorico(pedidoRef, text) {
  return updateDoc(pedidoRef, {
    historico: arrayUnion({ text, time: new Date() }) 
  }).catch(err => console.error("Erro ao adicionar histórico:", err));
}

function clearOrientacaoCard() {
  const existing = document.querySelector(".cartao.orientacao");
  if (existing) existing.remove();
}

// monta e insere o card ANTES da section .cartao.etapas
// recebe pedido para possibilitar conteúdo dinâmico (ex: título, valor)
function renderOrientacao(status, pedido = {}) {
  const base = {
    id: pedido.id || "",
    titulo: pedido.tituloAnuncio || "—",
    preco: pedido.precoBase || 0,
    prestador: pedido.nomePrestador || "—"
  };

  let class_css = `status-${status}`;
  let orientacaoHTML = "";

  // cada bloco abaixo pode conter HTML complexo, botões com ids únicos e instruções
  if (status === "pendente") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="info"></i> Aguardando que alguém Aceite</h2>
        <div class="three-body">
          <div class="three-body__dot"></div>
          <div class="three-body__dot"></div>
          <div class="three-body__dot"></div>
        </div>
        <p>Seu pedido foi criado e está aguardando que o ajudante aceite. Você será notificado quando houver aceitação.</p>
        <div class="orient-actions">
          <p><strong>Anúncio:</strong> ${base.titulo}</p>
          <p><strong>Prestador:</strong> ${base.prestador}</p>
        </div>
      </section>
    `;
  } else if (status === "aceito") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="info"></i> Pedido aceito</h2>
        <p>O ajudante aceitou o pedido! Efetue o pagamento para confirmar e liberar o início do serviço.</p>
        <div class="orient-actions">
          <p><strong>Total:</strong> ${formatCurrency(base.preco)}</p>
          <button id="pagar-orient-btn" class="btn primario">Pagar agora</button>
        </div>
      </section>
    `;
  } else if (status === "pago_aguardando_inicio") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
       
        <h2><i data-lucide="info"></i> Pagamento recebido</h2>
        <div class="success-icon">✓</div>
        <p>Pagamento confirmado. Aguardando o ajudante confirmar o início do deslocamento.</p>
        <div class="orient-actions">
          <p>Você será notificado quando o ajudante iniciar o deslocamento.</p>
        </div>
      </section>
    `;
  } else if (status === "em_rota") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="truck"></i> Ajudante em rota</h2>
        <div class="loader">
  <div class="truckWrapper">
    <div class="truckBody">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 198 93"
        class="trucksvg"
      >
        <path
          stroke-width="3"
          stroke="#282828"
          fill="#F83D3D"
          d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
        ></path>
        <path
          stroke-width="3"
          stroke="#282828"
          fill="#7D7C7C"
          d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
        ></path>
        <path
          stroke-width="2"
          stroke="#282828"
          fill="#282828"
          d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
        ></path>
        <rect
          stroke-width="2"
          stroke="#282828"
          fill="#FFFCAB"
          rx="1"
          height="7"
          width="5"
          y="63"
          x="187"
        ></rect>
        <rect
          stroke-width="2"
          stroke="#282828"
          fill="#282828"
          rx="1"
          height="11"
          width="4"
          y="81"
          x="193"
        ></rect>
        <rect
          stroke-width="3"
          stroke="#282828"
          fill="#DFDFDF"
          rx="2.5"
          height="90"
          width="121"
          y="1.5"
          x="6.5"
        ></rect>
        <rect
          stroke-width="2"
          stroke="#282828"
          fill="#DFDFDF"
          rx="2"
          height="4"
          width="6"
          y="84"
          x="1"
        ></rect>
      </svg>
    </div>
    <div class="truckTires">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 30 30"
        class="tiresvg"
      >
        <circle
          stroke-width="3"
          stroke="#282828"
          fill="#282828"
          r="13.5"
          cy="15"
          cx="15"
        ></circle>
        <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 30 30"
        class="tiresvg"
      >
        <circle
          stroke-width="3"
          stroke="#282828"
          fill="#282828"
          r="13.5"
          cy="15"
          cx="15"
        ></circle>
        <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
      </svg>
    </div>
    <div class="road"></div>

    <svg
      xml:space="preserve"
      viewBox="0 0 453.459 453.459"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xmlns="http://www.w3.org/2000/svg"
      id="Capa_1"
      version="1.1"
      fill="#000000"
      class="lampPost"
    >
      <path
        d="M252.882,0c-37.781,0-68.686,29.953-70.245,67.358h-6.917v8.954c-26.109,2.163-45.463,10.011-45.463,19.366h9.993
c-1.65,5.146-2.507,10.54-2.507,16.017c0,28.956,23.558,52.514,52.514,52.514c28.956,0,52.514-23.558,52.514-52.514
c0-5.478-0.856-10.872-2.506-16.017h9.992c0-9.354-19.352-17.204-45.463-19.366v-8.954h-6.149C200.189,38.779,223.924,16,252.882,16
c29.952,0,54.32,24.368,54.32,54.32c0,28.774-11.078,37.009-25.105,47.437c-17.444,12.968-37.216,27.667-37.216,78.884v113.914
h-0.797c-5.068,0-9.174,4.108-9.174,9.177c0,2.844,1.293,5.383,3.321,7.066c-3.432,27.933-26.851,95.744-8.226,115.459v11.202h45.75
v-11.202c18.625-19.715-4.794-87.527-8.227-115.459c2.029-1.683,3.322-4.223,3.322-7.066c0-5.068-4.107-9.177-9.176-9.177h-0.795
V196.641c0-43.174,14.942-54.283,30.762-66.043c14.793-10.997,31.559-23.461,31.559-60.277C323.202,31.545,291.656,0,252.882,0z
M232.77,111.694c0,23.442-19.071,42.514-42.514,42.514c-23.442,0-42.514-19.072-42.514-42.514c0-5.531,1.078-10.957,3.141-16.017
h78.747C231.693,100.736,232.77,106.162,232.77,111.694z"
      ></path>
    </svg>
  </div>
</div>

        <p>O ajudante está a caminho. Verifique o endereço e, se necessário, deixe instruções de chegada.</p>
        <div class="orient-actions">
          <p><strong>Endereço de entrega:</strong> ${pedido.endereco || pedido.enderecoEntrega || pedido.enderecoRetirada || pedido.enderecoReparo || pedido.enderecoMontagem || pedido.enderecoServico || '—'}</p>
        </div>
      </section>
    `;
  } else if (status === "no_local") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="map-pin"></i> Ajudante no local</h2>
        <p>O ajudante chegou ao local. Aguarde conforme o nescessário para que ele possa iniciar a execução.</p>
      </section>
    `;
  } else if (status === "em_execucao") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="hammer"></i> Serviço em execução</h2>
         <div class="hourglassBackground">
      <div class="hourglassContainer">
        <div class="hourglassCurves"></div>
        <div class="hourglassCapTop"></div>
        <div class="hourglassGlassTop"></div>
        <div class="hourglassSand"></div>
        <div class="hourglassSandStream"></div>
        <div class="hourglassCapBottom"></div>
        <div class="hourglassGlass"></div>
      </div>
    </div>
        <p>O serviço está em andamento. Aguarde a conclusão. Mantenha comunicação se necessário.</p>
        <div class="orient-actions">
          <button id="contatar-prestador-btn" class="btn secundario">Contatar prestador</button>
        </div>
      </section>
    `;
  } else if (status === "concluido_prestador") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="package-check"></i> Aguardando sua confirmação</h2>
        <p>O ajudante marcou o serviço como concluído. Revise e confirme a finalização.</p>
        <div class="orient-actions">
          <button id="confirmar-finalizacao-orient-btn" class="btn primario">Confirmar finalização</button>
          <button id="reabrir-issue-btn" class="btn secundario">Reportar problema</button>
        </div>
      </section>
    `;
  } else if (status === "finalizado") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="check-circle-2"></i> Pedido finalizado</h2>
        <p>Serviço finalizado com sucesso. Avalie o prestador para ajudar a comunidade.</p>
        <div class="orient-actions">
          <button id="avaliar-prestador-orient-btn" class="btn primario">Avaliar prestador</button>
          <a href="dashboardC.html" class="btn fantasma">Voltar ao início</a>
        </div>
      </section>
    `;
  } else if (status === "cancelado") {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="x-circle"></i> Pedido cancelado</h2>
        <p>Este pedido foi cancelado. Caso precise, crie um novo pedido.</p>
        <div class="orient-actions">
          <a href="dashboardC.html" class="btn fantasma">Voltar ao início</a>
        </div>
      </section>
    `;
  } else {
    orientacaoHTML = `
      <section class="cartao orientacao ${class_css}">
        <h2><i data-lucide="info"></i> Acompanhamento</h2>
        <p>Status: ${status}</p>
      </section>
    `;
  }

  
  const sectionEtapas = document.querySelector(".cartao.etapas");
  if (!sectionEtapas) return;
  clearOrientacaoCard();
  sectionEtapas.insertAdjacentHTML("beforebegin", orientacaoHTML);
  lucide.createIcons();

  // reaplica listeners para botões do card recém-inserido
  // usa currentPedidoRef para operações no Firestore
  const pedidoRef = currentPedidoRef;

  // cancelar pedido
   const cancelarBtn = document.getElementById("cancelar-pedido-btn");
  if (cancelarBtn) {
    cancelarBtn.onclick = async () => {
      if (!pedidoRef) return alert("Pedido não disponível para cancelamento.");
      
      // Adiciona uma confirmação para evitar cliques acidentais
      if (!confirm("Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.")) {
          return; // Para a execução se o usuário clicar em "Cancelar"
      }

      try {
        // --- INÍCIO DA LÓGICA ATUALIZADA ---

        // 1. Busca os dados do pedido para pegar os UIDs
        const pedidoSnap = await getDoc(pedidoRef);
        if (!pedidoSnap.exists()) throw new Error("Pedido não encontrado no banco de dados.");
        
        const pedidoData = pedidoSnap.data();
        const clienteUid = pedidoData.clienteUid;
        const ajudanteUid = pedidoData.ajudanteUid;

        // 2. Atualiza o status do pedido para "cancelado"
        await updateDoc(pedidoRef, { status: "cancelado" });

        // 3. Limpa o pedidoAtivo do documento do cliente (se ele existir)
        if (clienteUid) {
            const clienteRef = doc(db, "usuarios", clienteUid);
            await updateDoc(clienteRef, { pedidoAtivo: null });
            console.log(`Campo pedidoAtivo do cliente ${clienteUid} foi limpo.`);
        }
        
        // 4. Limpa o pedidoAtivo do documento do ajudante (se ele existir)
        if (ajudanteUid) {
            // ATENÇÃO: Verifique se sua coleção de ajudantes se chama 'ajudantes' ou 'usuarios'
            const ajudanteRef = doc(db, "ajudantes", ajudanteUid); 
            await updateDoc(ajudanteRef, { pedidoAtivo: null });
            console.log(`Campo pedidoAtivo do ajudante ${ajudanteUid} foi limpo.`);
        }

        // --- FIM DA LÓGICA ATUALIZADA ---

        await addHistorico(pedidoRef, "Cliente cancelou o pedido.");
        alert("Pedido cancelado com sucesso.");

      } catch (e) {
        console.error("Erro ao cancelar pedido:", e);
        alert("Ocorreu um erro ao tentar cancelar o pedido. Verifique o console.");
      }
    };
  }

  // pagar agora (simulação)
const pagarBtn = document.getElementById("pagar-orient-btn");
  if (pagarBtn) {
    pagarBtn.onclick = async () => {
      // Desabilita o botão para evitar cliques duplos
      pagarBtn.disabled = true;
      pagarBtn.textContent = "Aguarde, gerando link...";

      try {
        // 1. Chama a sua nova Serverless Function na Vercel
        const response = await fetch('/api/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidoId: base.id }), // Envia o ID do pedido
        });

        const data = await response.json();

        // 2. Se a resposta for um sucesso, redireciona o cliente
        if (response.ok && data.init_point) {
          window.location.href = data.init_point;
        } else {
          // Lança um erro se a resposta não for bem-sucedida
          throw new Error(data.message || "Erro desconhecido ao criar preferência.");
        }

      } catch (error) {
        console.error("Erro ao iniciar o processo de pagamento:", error);
        alert("Não foi possível gerar o link de pagamento. Tente novamente mais tarde.");
        // Reabilita o botão em caso de erro
        pagarBtn.disabled = false;
        pagarBtn.textContent = "Pagar agora";
      }
    };
  }

  // confirmar chegada
  const confirmarChegadaBtn = document.getElementById("confirmar-chegada-orient-btn");
  if (confirmarChegadaBtn) {
    confirmarChegadaBtn.onclick = async () => {
      if (!pedidoRef) return alert("Pedido não disponível.");
      try {
        await updateDoc(pedidoRef, { clienteConfirmouChegada: true });
        await addHistorico(pedidoRef, "Cliente confirmou a chegada do ajudante via card.");
        alert("Chegada confirmada.");
      } catch (e) {
        console.error(e);
        alert("Erro ao confirmar chegada.");
      }
    };
  }

  // confirmar finalização
const confirmarFinalBtn = document.getElementById("confirmar-finalizacao-orient-btn");
if (confirmarFinalBtn) {
  confirmarFinalBtn.onclick = async () => {
    if (!pedidoRef) return alert("Pedido não disponível.");
    if (!confirm("Confirmar a finalização deste serviço?")) return;

    try {
      // 1. Pega os dados do pedido e do anúncio
      const pedidoSnap = await getDoc(pedidoRef);
      if (!pedidoSnap.exists()) throw new Error("Pedido não encontrado.");
      
      const pedidoData = pedidoSnap.data();
      const { anuncioId, precoBase, clienteUid, ajudanteUid } = pedidoData;

      if (!anuncioId || precoBase == null) throw new Error("Dados incompletos para calcular ganhos.");

      const anuncioRef = doc(db, "anuncios", anuncioId);
      const anuncioSnap = await getDoc(anuncioRef);
      const eraDestaque = anuncioSnap.exists() && anuncioSnap.data().destaque === true;

      // 2. CALCULA o ganho do ajudante
      let valorParaAjudante = eraDestaque ? (precoBase * 0.90) : (precoBase * 0.94);

      // 3. ATUALIZA o pedido com o status E o ganho calculado
      await updateDoc(pedidoRef, { 
          status: "finalizado",
          ganhoAjudante: parseFloat(valorParaAjudante.toFixed(2)),
      });

      // 4. Limpa o pedidoAtivo de ambos os usuários
      if (clienteUid) await updateDoc(doc(db, "usuarios", clienteUid), { pedidoAtivo: null });
      if (ajudanteUid) await updateDoc(doc(db, "ajudantes", ajudanteUid), { pedidoAtivo: null });

      await addHistorico(pedidoRef, "Cliente confirmou a finalização do serviço.");
      alert("Serviço finalizado com sucesso!");

    } catch (e) {
      console.error("Erro ao confirmar finalização:", e);
      alert("Ocorreu um erro ao finalizar o pedido.");
    }
  };
}

  // avaliar prestador
  const avaliarBtn = document.getElementById("avaliar-prestador-orient-btn");
  if (avaliarBtn) {
    avaliarBtn.onclick = () => {
      // redireciona para a página de avaliação
      window.location.href = `avaliacaoPrestador.html?pedido=${base.id}`;
    };
  }

  // contatar prestador (exemplo: abrir chat ou mostrar contato)
  const contatarBtns = document.querySelectorAll("#contatar-prestador-btn");
  if (contatarBtns && contatarBtns.length) {
    contatarBtns.forEach(b => b.onclick = () => {
      // implemente sua lógica de contato/chat
      alert("Abrir chat/contato com o prestador (implemente a rota).");
    });
  }

  // reportar problema / reabrir issue
  const reabrirBtn = document.getElementById("reabrir-issue-btn");
  if (reabrirBtn) {
    reabrirBtn.onclick = async () => {
      if (!pedidoRef) return alert("Pedido não disponível.");
      try {
        await addHistorico(pedidoRef, "Cliente reportou problema/solicitou reabertura via card.");
        alert("Solicitação registrada. O suporte entrará em contato.");
      } catch (e) {
        console.error(e);
        alert("Erro ao registrar solicitação.");
      }
    };
  }
}



function restoreAcoesSecundariasPadrao() {
  const acoesSec = document.querySelector(".acoes-secundarias");
  if (acoesSec) {
    acoesSec.innerHTML = `
      <button id="btn-cancelar" class="btn perigo" type="button"><i data-lucide="x-circle"></i><span>Cancelar pedido</span></button>
      <a id="btn-voltar" href="dashboardC.html" class="btn fantasma"><i data-lucide="arrow-left"></i><span>Voltar</span></a>
    `;
    lucide.createIcons();
    const btnCancel = document.getElementById("btn-cancelar");
    if (btnCancel) {
      btnCancel.addEventListener("click", async () => {
        if (!currentPedidoRef) return;
        try {
          await updateDoc(currentPedidoRef, { status: "cancelado" });
          await addHistorico(currentPedidoRef, "Cliente cancelou o pedido via botão.");
          alert("Pedido cancelado.");
        } catch (e) {
          console.error(e);
          alert("Erro ao cancelar pedido.");
        }
      });
    }
  }
}
function clearActionButtonsArea() {
  const acoesPrincipais = document.querySelector(".acoes-principais");
  if (acoesPrincipais) {
    acoesPrincipais.innerHTML = ""; // Limpa a área de botões
  }
}
function renderPedidoCliente(pedido) {
  document.getElementById("pedido-id").innerText = pedido.id || "—";
  document.getElementById("pedido-titulo").innerText = pedido.tituloAnuncio || "—";
  document.getElementById("pedido-prestador").innerText = pedido.nomePrestador || "—";
  document.getElementById("status-pill").innerText = (pedido.status || "pendente").replace(/_/g, " ");
  document.getElementById("valor-servico").innerText = formatCurrency(pedido.precoBase || 0);
  document.getElementById("valor-entrega").innerText = formatCurrency(pedido.taxaEntrega || 0);
  document.getElementById("valor-total").innerText = formatCurrency((pedido.precoBase || 0) + (pedido.taxaEntrega || 0));
  document.getElementById("retirada-txt").innerText = pedido.enderecoRetirada || "—";
  document.getElementById("entrega-txt").innerText = pedido.enderecoEntrega || "—";

  // orientacao ANTES da timeline
  renderOrientacao(pedido.status || "pendente", pedido);

  renderTimeline(pedido.status || "pendente");
  renderHistorico(pedido.historico);

  // ações padrão
  clearActionButtonsArea();
  restoreAcoesSecundariasPadrao();

  // reaplica botão de pagar do cabeçalho (caso queira redundância)
  const btnPagar = document.getElementById("btn-pagar");
  const status = pedido.status;
  const pedidoRef = currentPedidoRef;

  if (btnPagar) btnPagar.style.display = "none";

  if (status === "aceito") {
    if (btnPagar) {
      btnPagar.style.display = "inline-block";
      btnPagar.onclick = async () => {
        if (!pedidoRef) return alert("Pedido não disponível.");
        try {
          await updateDoc(pedidoRef, { statusPagamento: "confirmado", status: "pago_aguardando_inicio" });
          await addHistorico(pedidoRef, "Cliente realizou o pagamento via cabeçalho.");
          alert("Pagamento registrado. Aguardando início pelo ajudante.");
        } catch (e) {
          console.error(e);
          alert("Erro ao registrar pagamento.");
        }
      };
    }
  }

  // garante remoção dos botões específicos que possam não aplicar mais
  if (status !== "no_local") {
    const btn = document.getElementById("confirmar-chegada-btn");
    if (btn) btn.remove();
  }

  // botões de confirmação via área de ações (quando aplicável já estão no card)
  // finalizado: substitui area secundaria
  if (status === "finalizado") {
    const acoesSec = document.querySelector(".acoes-secundarias");
    if (acoesSec) {
      acoesSec.innerHTML = `
        <button id="avaliarPrestadorBtn" class="btn primario" type="button"><i data-lucide="star"></i><span>Avaliar Prestador</span></button>
        <a id="btn-voltar" href="dashboardC.html" class="btn fantasma"><i data-lucide="arrow-left"></i><span>Voltar</span></a>
      `;
      document.getElementById("avaliarPrestadorBtn").addEventListener("click", () => {
        window.location.href = `avaliacaoPrestador.html?pedido=${pedido.id}`;
      });
      lucide.createIcons();
    }
  }
  lucide.createIcons();
}

// autenticação e carregamento inicial
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("user-name").innerText = user.displayName || user.email || "cliente";
    const pedidoID = new URLSearchParams(window.location.search).get('id');
    loadPedidoCliente(pedidoID);
  } else {
    console.log("Cliente não está logado.");
  }
});
