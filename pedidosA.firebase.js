import { auth } from './firebase-init.js';
import { 
  getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc 
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

const db = getFirestore();
const listaPedidos = document.getElementById('lista-pedidos');
const userGreeting = document.getElementById("user-name");
const listaHistorico = document.getElementById('lista-historico');

const inicializarPedidos = async (uid) => {
  console.log('Carregando pedidos para o usuário:', uid);
  const pedidoAtivoContainer = document.getElementById('pedido-ativo-container');

  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);
  let pedidoAtivoId = null;
  if (userSnap.exists()) {
    const userData = userSnap.data();
    pedidoAtivoId = userData.pedidoAtivo && userData.pedidoAtivo !== 'null' ? userData.pedidoAtivo : null;
  
  }

  listaPedidos.innerHTML = ""; 

if (pedidoAtivoId) {

  const pedidoAtivoRef = doc(db, "pedidos", pedidoAtivoId);
  const pedidoAtivoSnap = await getDoc(pedidoAtivoRef);

  if (pedidoAtivoSnap.exists()) {
    const pedido = pedidoAtivoSnap.data();
    console.log("Pedido ativo encontrado:", pedido);

    const ativoHTML = document.createElement('div');
    ativoHTML.classList.add('card-pedido1');
    ativoHTML.innerHTML = `
      <header class="cabeca">
        <h2 class="titulo">${pedido.tituloAnuncio}</h2>
        <span class="badge tipo">${pedido.tipoServico}</span>
      </header>
      <div class="grid-info">
        <div class="info"><span class="rotulo">Status</span><span class="valor">${pedido.status}</span></div>
        <div class="info"><span class="rotulo">Data</span><span class="valor">${pedido.data}</span></div>
        <div class="info"><span class="rotulo">Cliente</span><span class="valor">${pedido.clienteUid}</span></div>
      </div>
           <div class="botoes">
        <button class="btn-ver-detalhes">Ver detalhes</button>
      </div>
    `;
    pedidoAtivoContainer.innerHTML = ""; 
    pedidoAtivoContainer.appendChild(ativoHTML);
  const btnVerDetalhes = ativoHTML.querySelector('.btn-ver-detalhes');
  btnVerDetalhes.addEventListener('click', async () => {
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const pedidoAtivoId = userData.pedidoAtivo;

      if (pedidoAtivoId) {
        window.location.href = `statusA.html?id=${pedidoAtivoId}`;
      } else {
        alert("Você não tem nenhum pedido ativo no momento.");
      }
    }
      });
  } else {

    pedidoAtivoContainer.innerHTML = "<p>Nenhum pedido ativo no momento.</p>";
  }
} else {

  pedidoAtivoContainer.innerHTML = "<p>Nenhum pedido ativo no momento.</p>";
}


  const pedidosRef = collection(db, "pedidos");
  const q = query(pedidosRef, 
                  where("status", "==", "pendente"), 
                  where("ajudanteUid", "==", uid));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    querySnapshot.forEach((docSnap) => {
      const pedido = docSnap.data();
      const pedidoElement = document.createElement('article');
      pedidoElement.classList.add('card-pedido');
      pedidoElement.setAttribute('data-id', docSnap.id);
      


pedidoElement.innerHTML = `
  <header class="cabeca">
    <h2 class="titulo">${pedido.tituloAnuncio}</h2>
    <span class="badge tipo">${pedido.tipoServico}</span>
  </header>
  <div class="grid-info">
    <div class="info"><span class="rotulo">Status</span><span class="valor">${pedido.status}</span></div>
    <div class="info"><span class="rotulo">Data</span><span class="valor">${pedido.data}</span></div>
  </div>

  <div id="campoAdicional" class="campo-adicional">
    <!-- Aqui vai preencher os campos específicos do pedido via switch case -->
  </div>

  <footer class="rodape-card">
    <div class="acoes">
      <button class="btn aceitar" ${pedidoAtivoId ? 'disabled' : ''}>Aceitar</button>
      <button class="btn recusar">Recusar</button>
    </div>
  </footer>
`;
  
  const campoAdicional = document.createElement('div');
  campoAdicional.classList.add('campo-adicional');
  pedidoElement.appendChild(campoAdicional);
  
   switch (pedido.tipoServico) {
    case "Troca de gás":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Tipo do Botijão:</label> <span>${pedido.tipoBotijao || ""}</span></div>
      <div class="form-group"><label>Quantidade:</label> <span>${pedido.quantidade || ""}</span></div>
      <div class="form-group"><label>Local de Instalação(CEP):</label> <span>${pedido.localInstalacao || ""}</span></div>
      <div class="form-group"><label>Local de Instalação:</label> <span>${pedido.endereco || ""}</span></div>     
      <div class="form-group"><label>Andar:</label> <span>${pedido.andar || ""}</span></div>
      <div class="form-group"><label>Possui Elevador:</label> <span>${pedido.elevador || ""}</span></div>
      <div class="form-group"><label>Retirar Vazio:</label> <span>${pedido.retirarVazio || ""}</span></div>
    
      `;
      break;

  case "Fazer feira":
  case "Compras no mercado":
    campoAdicional.innerHTML = `
      <div class="form-group"><label>Itens de Compra:</label> <span>${pedido.itensCompra || ""}</span></div>
      <div class="form-group"><label>Orçamento Máximo:</label> <span>${pedido.orcamentoMax || ""}</span></div>
      <div class="form-group"><label>Endereço de Entrega(CEP):</label> <span>${pedido.enderecoEntrega || ""}</span></div>
      <div class="form-group"><label>Endereço de Entrega:</label> <span>${pedido.endereco || ""}</span></div> 
      `;
    break;

    case "Buscar/Levar documentos":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Urgência:</label> <span>${pedido.urgencia || ""}</span></div>
      <div class="form-group"><label>Requer Assinatura:</label> <span>${pedido.requerAssinatura || ""}</span></div>
      <div class="form-group"><label>Tamanho dos Documentos:</label> <span>${pedido.tamanho || ""}</span></div>
      <div class="form-group"><label>CEP Retirada:</label> <span>${pedido.cepRetirada || ""}</span></div>
      <div class="form-group"><label>Endereço de Retirada:</label> <span>${pedido.enderecoRetirada || ""}</span></div>
      <div class="form-group"><label>CEP Entrega:</label> <span>${pedido.cepEntrega || ""}</span></div>
      <div class="form-group"><label>Endereço de Entrega:</label> <span>${pedido.enderecoEntrega || ""}</span></div>
    `;
      break;

    case "Passear com cachorro":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Nome do Pet:</label> <span>${pedido.nomePet || ""}</span></div>
      <div class="form-group"><label>Porte:</label> <span>${pedido.porte || ""}</span></div>
      <div class="form-group"><label>Duração Mínima:</label> <span>${pedido.duracaoMinima || ""}</span></div>
      <div class="form-group"><label>CEP de Retirada:</label> <span>${pedido.CepRetirada || ""}</span></div>
      <div class="form-group"><label>Endereço de Retirada:</label> <span>${pedido.enderecoRetirada || ""}</span></div>
      `;
      break;

    case "Pequenos reparos":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Descrição:</label> <span>${pedido.descricaoReparo || ""}</span></div>
      <div class="form-group"><label>Categoria de Reparo:</label> <span>${pedido.categoriaReparo || ""}</span></div>
      <div class="form-group"><label>Materiais Fornecidos:</label> <span>${pedido.materiaisFornecidos || ""}</span></div>
      <div class="form-group"><label>CEP do Endereço:</label> <span>${pedido.cepEndereco || ""}</span></div>
      <div class="form-group"><label>Endereço do Serviço:</label> <span>${pedido.enderecoReparo || ""}</span></div>
    `;
      break;

    case "Montagem de móveis":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Tipo de Móvel:</label> <span>${pedido.tipoMovel || ""}</span></div>
      <div class="form-group"><label>Quantidade:</label> <span>${pedido.quantidade || ""}</span></div>
      <div class="form-group"><label>Marca e Modelo:</label> <span>${pedido.marcaModelo || ""}</span></div>
      <div class="form-group"><label>Tem Manual:</label> <span>${pedido.temManual || ""}</span></div>
      <div class="form-group"><label>Precisa Furado:</label> <span>${pedido.precisaFurar || ""}</span></div>
      <div class="form-group"><label>Endereço de Retirada:</label> <span>${pedido.enderecoMontagem || ""}</span></div>
      <div class="form-group"><label>Endereço do Serviço:</label> <span>${pedido.enderecoMontagem || ""}</span></div>
   `;
      break;

    case "Jardinagem e poda":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Área (m²):</label> <span>${pedido.area || ""}</span></div>
      <div class="form-group"><label>Tipo de Serviço:</label> <span>${pedido.tipoServico || ""}</span></div>
      <div class="form-group"><label>Destino dos Resíduos:</label> <span>${pedido.destinoResiduos || ""}</span></div>
      <div class="form-group"><label>Endereço do Serviço:</label> <span>${pedido.enderecoServico || ""}</span></div>
    `;
      break;

    case "Instalação de TV/suporte":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Polegadas da TV:</label> <span>${pedido.polegadasTv || ""}</span></div>
      <div class="form-group"><label>Tipo de Parede:</label> <span>${pedido.tipoParede || ""}</span></div>
      <div class="form-group"><label>Altura Aproximada:</label> <span>${pedido.alturaTv || ""}</span></div>
      <div class="form-group"><label>Passagem de Cabos:</label> <span>${pedido.passagemCabos || ""}</span></div>
      <div class="form-group"><label>Precisa de Suporte:</label> <span>${pedido.precisaSuporte || ""}</span></div>
      <div class="form-group"><label>Endereço de Retirada:</label> <span>${pedido.enderecoRetirada || ""}</span></div>
    `;
      break;

    case "Limpeza residencial":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Tipo de Limpeza:</label> <span>${pedido.tipoLimpeza || ""}</span></div>
      <div class="form-group"><label>Metragem (m²):</label> <span>${pedido.metragem || ""}</span></div>
      <div class="form-group"><label>Quartos:</label> <span>${pedido.quartos || ""}</span></div>
      <div class="form-group"><label>Banheiros:</label> <span>${pedido.banheiros || ""}</span></div>
      <div class="form-group"><label>Materiais Disponíveis:</label> <span>${pedido.materiaisDisponiveis || ""}</span></div>
      <div class="form-group"><label>Periodicidade:</label> <span>${pedido.periodicidade || ""}</span></div>
      <div class="form-group"><label>Endereço de Retirada:</label> <span>${pedido.enderecoServico || ""}</span></div>
    `;
      break;

    case "Outros":
      campoAdicional.innerHTML = `
      <div class="form-group"><label>Descrição Detalhada do Serviço:</label> <span>${pedido.descricaoServico || ""}</span></div>
     `;
      break;

      default:
        campoAdicional.innerHTML = `<p>Serviço não reconhecido.</p>`;
        break;
    }


      listaPedidos.appendChild(pedidoElement);

         const btnAceitar = pedidoElement.querySelector('.btn.aceitar');
      btnAceitar.addEventListener('click', async () => {
        await aceitarPedido(uid, docSnap.id);
      });
      if (pedidoAtivoId) {
      btnAceitar.disabled = true;
        btnAceitar.textContent = "Serviço em Andamento";
         btnAceitar.style.backgroundColor = '#6c757d'; 
         btnAceitar.style.cursor = 'not-allowed';
    } else {
       
        btnAceitar.addEventListener('click', async () => {
        await aceitarPedido(uid, docSnap.id);
      });
     }
     
      const btnRecusar = pedidoElement.querySelector('.btn.recusar');
      btnRecusar.addEventListener('click', async () => {
        await recusarPedido(docSnap.id);
      });
    });
  } else {
    console.log('Nenhum pedido pendente encontrado');
    const nenhumHTML = document.createElement('p');
   nenhumHTML.textContent = "Nenhum pedido disponível no momento.";
    listaPedidos.appendChild(nenhumHTML);
  }
};


const carregarHistorico = async (uid) => {
  listaHistorico.innerHTML = ""; 

  const pedidosRef = collection(db, "pedidos");
  const q = query(pedidosRef, 
                  where("ajudanteUid", "==", uid),
                  where("status", "==", "finalizado"));

  const querySnapshot = await getDocs(q);

    const formatarData = (timestamp) => {
  if (!timestamp) return "Data não definida";
  const date = timestamp.toDate(); 
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

  if (!querySnapshot.empty) {
    querySnapshot.forEach((docSnap) => {
      const pedido = docSnap.data();
      const itemHistorico = document.createElement('article');
      itemHistorico.classList.add('item-historico');

      itemHistorico.innerHTML = `
        <div class="bloco">
          <span class="titulo-item">${pedido.tituloAnuncio || "Pedido"}</span>
          <span class="sub">Concluído • ${formatarData(pedido.dataConclusao)}</span>
        </div>
        <div class="bloco">
          <span class="valor">R$ ${pedido.precoBase || "00,00"}</span>
          <span class="status tag sucesso">Finalizado</span>
        </div>
      `;

      listaHistorico.appendChild(itemHistorico);
    });
  } else {
    listaHistorico.innerHTML = `<p>Nenhum pedido concluído no momento.</p>`;
  }
};

const aceitarPedido = async (uid, pedidoId) => {
  const pedidoRef = doc(db, "pedidos", pedidoId);
  const userRef = doc(db, "usuarios", uid);


  await setDoc(pedidoRef, { status: "aceito", ajudanteUid: uid }, { merge: true });

  await setDoc(userRef, { pedidoAtivo: pedidoId }, { merge: true });

  alert("Pedido aceito com sucesso!");
  inicializarPedidos(uid); 
};

const recusarPedido = async (pedidoId) => {
  const pedidoRef = doc(db, "pedidos", pedidoId);
  await setDoc(pedidoRef, { status: "recusado" }, { merge: true });
  alert("Pedido recusado!");
  window.location.reload();
};


onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    userGreeting.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    inicializarPedidos(uid);
    carregarHistorico(uid);
  } else {
    console.log("Nenhum usuário logado");
  }
});
