import { db } from "../firebase-init.js";  // Banco de dados do Firebase
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth } from './firebase-init.js';
// Função para criar o pedido
export async function criarPedido(anuncioId) {
  try {
    // Coletar os dados do anúncio com base no anúncioId
    const aRef = doc(db, "anuncios", anuncioId);
    const aSnap = await getDoc(aRef);
    if (!aSnap.exists()) {
      alert("Anúncio não encontrado");
      location.href = "meuservicosA.html";
      return;
    }
    
    const data = aSnap.data(); // Coleta os dados do anúncio
    console.log("Dados do anúncio carregados:", data);
    if (!data.prestadorUid) {
      console.error("prestadorUid não encontrado no anúncio", data);
    }
    const tipoServico = data.categoria; // Coleta a categoria do anúncio

    // Cria o objeto do pedido
    const pedido = {
      tipoServico: tipoServico, // Adiciona o tipo de serviço ao pedido
      // Adiciona todos os outros dados coletados do formulário
    };

    // Dependendo do tipo de serviço, coleta os campos correspondentes
    switch (tipoServico) {
        case "Troca de gás":
          pedido.tipoBotijao = document.getElementById("tipo-botijao").value;
          pedido.quantidade = document.getElementById("quantidade").value;
          pedido.localInstalacao = document.getElementById("local-instalacao").value;
          pedido.andar = document.getElementById("andar").value;
          pedido.elevador = document.getElementById("elevador").value;
          pedido.retirarVazio = document.getElementById("retirar-vazio").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Fazer feira":
          pedido.itensCompra = document.getElementById("itens-compra").value;
          pedido.orcamentoMax = document.getElementById("orcamento-max").value;
          pedido.enderecoEntrega = document.getElementById("endereco-entrega").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Compras no mercado":
          pedido.itensCompra = document.getElementById("itens-compra").value;
          pedido.orcamentoMax = document.getElementById("orcamento-max").value;
          pedido.enderecoEntrega = document.getElementById("endereco-entrega").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Buscar/Levar documentos":
          pedido.urgencia = document.getElementById("urgencia").value;
          pedido.requerAssinatura = document.getElementById("requer-assinatura").value;
          pedido.tamanho = document.getElementById("tamanho").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.enderecoEntrega = document.getElementById("endereco-entrega").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Passear com cachorro":
          pedido.nomePet = document.getElementById("nome-pet").value;
          pedido.porte = document.getElementById("porte").value;
          pedido.duracaoMinima = document.getElementById("duracao-minima").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Pequenos reparos":
          pedido.descricaoReparo = document.getElementById("descricao-reparo").value;
          pedido.categoriaReparo = document.getElementById("categoria-reparo").value;
          pedido.materiaisFornecidos = document.getElementById("materiais-fornecidos").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Montagem de móveis":
          pedido.tipoMovel = document.getElementById("tipo-movel").value;
          pedido.quantidade = document.getElementById("quantidade").value;
          pedido.marcaModelo = document.getElementById("marca-modelo").value;
          pedido.temManual = document.getElementById("tem-manual").value;
          pedido.precisaFurar = document.getElementById("precisa-furar").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Jardinagem e poda":
          pedido.area = document.getElementById("area").value;
          pedido.tipoServico = document.getElementById("tipo-servico").value;
          pedido.destinoResiduos = document.getElementById("destino-residuos").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Instalação de TV/suporte":
          pedido.polegadasTv = document.getElementById("polegadas-tv").value;
          pedido.tipoParede = document.getElementById("tipo-parede").value;
          pedido.alturaTv = document.getElementById("altura-tv").value;
          pedido.passagemCabos = document.getElementById("passagem-cabos").value;
          pedido.precisaSuporte = document.getElementById("precisa-suporte").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Limpeza residencial":
          pedido.tipoLimpeza = document.getElementById("tipo-limpeza").value;
          pedido.metragem = document.getElementById("metragem").value;
          pedido.quartos = document.getElementById("quartos").value;
          pedido.banheiros = document.getElementById("banheiros").value;
          pedido.materiaisDisponiveis = document.getElementById("materiais-disponiveis").value;
          pedido.periodicidade = document.getElementById("periodicidade").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Outros":
          pedido.descricaoServico = document.getElementById("descricao-servico").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        default:
          alert("Serviço não reconhecido.");
          return;
      }

    // Salvar o pedido no Firestore (na coleção "pedidos")
    const pedidoRef = await addDoc(collection(db, "pedidos"), {
      ...pedido, // Adiciona todos os dados do pedido
      status: "pendente", // Define o status como pendente
      criadoEm: serverTimestamp(), // Registra o timestamp de criação
      atualizadoEm: serverTimestamp(), // Registra o timestamp de atualização
      anuncioId: anuncioId,          // ID do anúncio
      statusPagamento: "pendente",
      clienteUid: auth.currentUser.uid, // ID do cliente que está solicitando
      ajudanteUid: data.prestadorUid, // ID do anunciante/ajudante
      precoBase: data.precoBase,
      prestadorApelido: prestadorApelido,
      tituloAnuncio: data.titulo
    });

    console.log("Pedido salvo com sucesso:", pedidoRef.id); // Exibe o ID do pedido salvo
    alert("Pedido enviado com sucesso!"); // Exibe o alerta de sucesso

    // Redirecionar para a página de status do pedido
    window.location.href = `../html/statusC.html?id=${pedidoRef.id}`;
  } catch (error) {
    console.error("Erro ao salvar o pedido:", error);
    alert("Erro ao salvar o pedido. Tente novamente mais tarde."); // Exibe o alerta de erro
  }
}
