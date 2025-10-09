import { db } from "../firebase-init.js";  // Banco de dados do Firebase
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth } from './firebase-init.js';
// Função para criar o pedido
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio médio da Terra em quilômetros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distância em km
}
    const LOCATIONIQ_KEY = "pk.dcb0addbf59eb8bb3705cc55e553bdb2";

/**
 * Converte CEP para coordenadas (Latitude e Longitude)
 */
async function geocodeCEP(cep) {
    // 1) ViaCEP para obter a estrutura do endereço
    const v = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json());
    if (v.erro) throw new Error("CEP inválido no ViaCEP.");

    // 2) LocationIQ para obter Lat/Lng
    const params = new URLSearchParams({
        key: LOCATIONIQ_KEY,
        format: "json",
        countrycodes: "br",
        postalcode: cep,
        country: "Brazil",
        city: v.localidade || "",
        state: v.uf || "",
        street: v.logradouro || ""
    });
    const data = await fetch(`https://us1.locationiq.com/v1/search?${params}`).then(r => r.json());

    if (Array.isArray(data) && data.length) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    throw new Error("Não foi possível localizar o CEP do cliente no mapa.");
}
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

// --- 1. IDENTIFICAR O CEP DO CLIENTE PARA VERIFICAÇÃO DE RAIO ---
let clienteCepInputId;
switch (tipoServico) {
    case "Troca de gás":
    case "Fazer feira":
    case "Compras no mercado":
        // Ponto de entrega/instalação
        clienteCepInputId = "cep";
        break;
        
    case "Buscar/Levar documentos":
        // Ponto de RETIRADA é o primeiro ponto de deslocamento
        clienteCepInputId = "cep-retirada";
        break;
        
    case "Passear com cachorro":
    case "Pequenos reparos":       // <--- CONFIRMADO: usa "cep-endereco"
    case "Jardinagem e poda":
    case "Instalação de TV/suporte":
    case "Limpeza residencial":
        // Endereço de moradia/serviço
        clienteCepInputId = "cep-endereco";
        break;
        
    case "Montagem de móveis":
        // Local de montagem
        clienteCepInputId = "cep-montagem";
        break;
        
    case "Outros":
        // Ignora a checagem se não houver um campo CEP padrão
        clienteCepInputId = null; 
        break;
        
    default:
        alert("Serviço não reconhecido.");
        return;
}

const clienteCep = clienteCepInputId ? document.getElementById(clienteCepInputId)?.value : null;
// ----------------------------------------------------
// --- 2. VERIFICAÇÃO GEOGRÁFICA DO RAIO (Com o CEP correto) ---
// ----------------------------------------------------
if (data.raioKm && data.latBase && data.lngBase && clienteCep) {
    try {
        const raioAjudanteKm = Number(data.raioKm);
        const latAjudante = Number(data.latBase);
        const lngAjudante = Number(data.lngBase);
        
        const cepLimpo = clienteCep.replace(/\D/g, "");

        if (cepLimpo.length !== 8) {
            throw new Error("CEP do cliente inválido ou incompleto.");
        }

        // --- DEBUG 1: Coordenadas e Raio do Prestador ---
        console.log("DEBUG: Prestador Coords (Base):", latAjudante, lngAjudante, "| Raio:", raioAjudanteKm, "km");
        
        const { lat: latCliente, lng: lngCliente } = await geocodeCEP(cepLimpo);

        // --- DEBUG 2: Coordenadas do Cliente ---
        console.log("DEBUG: Cliente Coords:", latCliente, lngCliente);

        const distanciaKm = calcularDistanciaKm(latCliente, lngCliente, latAjudante, lngAjudante);

        // --- DEBUG 3: Distância Calculada ---
        console.log("DEBUG: Distância Calculada (Km):", distanciaKm);

        if (distanciaKm > raioAjudanteKm) {
            alert(`O endereço do pedido (${distanciaKm.toFixed(1)} km) está fora do raio de atendimento do(a) prestador(a) (${raioAjudanteKm} km). O pedido não pode ser enviado.`);
            return; 
        }

    } catch (error) {
        console.error("Erro na geocodificação ou cálculo do raio:", error);
        alert("Não foi possível verificar a localização do CEP do cliente. Por favor, verifique o CEP e tente novamente.");
        return;
    }
}


    // Cria o objeto do pedido
    const pedido = {
      tipoServico: tipoServico, // Adiciona o tipo de serviço ao pedido
      // Adiciona todos os outros dados coletados do formulário
    };
        const checkboxes = document.querySelectorAll('input[name="itens-compra"]:checked');
        // Cria um array com os valores dos itens selecionados
        const itensSelecionados = Array.from(checkboxes).map(checkbox => checkbox.value);

    // Dependendo do tipo de serviço, coleta os campos correspondentes
    switch (tipoServico) {
        case "Troca de gás":
          pedido.tipoBotijao = document.getElementById("tipo-botijao").value;
          pedido.quantidade = document.getElementById("quantidade").value;
          pedido.localInstalacao = document.getElementById("cep").value;
          pedido.endereco = document.getElementById("endereco").value;
          pedido.bairro = document.getElementById("bairro").value;
          pedido.cidade = document.getElementById("cidade").value;
          pedido.estado = document.getElementById("estado").value;
          pedido.numero = document.getElementById("numero").value;
          pedido.andar = document.getElementById("andar").value;
          pedido.elevador = document.getElementById("elevador").value;
          pedido.retirarVazio = document.getElementById("retirar-vazio").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Fazer feira":

          pedido.itensCompra = itensSelecionados
          pedido.orcamentoMax = document.getElementById("orcamento-max").value;
          pedido.enderecoEntrega = document.getElementById("cep").value;
          pedido.endereco = document.getElementById("endereco").value;
          pedido.bairro = document.getElementById("bairro").value;
          pedido.cidade = document.getElementById("cidade").value;
          pedido.estado = document.getElementById("estado").value;
          pedido.numero = document.getElementById("numero").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Compras no mercado":
        
          pedido.itensCompra = itensSelecionados
          pedido.orcamentoMax = document.getElementById("orcamento-max").value;
          pedido.enderecoEntrega = document.getElementById("cep").value;
          pedido.endereco = document.getElementById("endereco").value;
          pedido.bairro = document.getElementById("bairro").value;
          pedido.cidade = document.getElementById("cidade").value;
          pedido.estado = document.getElementById("estado").value;
          pedido.numero = document.getElementById("numero").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Buscar/Levar documentos":
          pedido.urgencia = document.getElementById("urgencia").value;
          pedido.requerAssinatura = document.getElementById("requer-assinatura").value;
          pedido.tamanho = document.getElementById("tamanho").value;
          pedido.cepRetirada = document.getElementById("cep-retirada").value;
          pedido.enderecoRetirada = document.getElementById("endereco-retirada").value;
          pedido.cepEntrega = document.getElementById("cep-entrega").value;
          pedido.enderecoEntrega = document.getElementById("endereco-entrega").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Passear com cachorro":
          pedido.nomePet = document.getElementById("nome-pet").value;
          pedido.porte = document.getElementById("porte").value;
          pedido.duracaoMinima = document.getElementById("duracao-minima").value;
          pedido.CepRetirada = document.getElementById("cep-endereco").value;
          pedido.enderecoRetirada = document.getElementById("endereco").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Pequenos reparos":
          pedido.descricaoReparo = document.getElementById("descricao-reparo").value;
          pedido.categoriaReparo = document.getElementById("categoria-reparo").value;
          pedido.materiaisFornecidos = document.getElementById("materiais-fornecidos").value;
          pedido.enderecoReparo = document.getElementById("endereco-reparo").value;
          pedido.cepEndereco = document.getElementById("cep-endereco").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
           
          break;
    
        case "Montagem de móveis":
          pedido.tipoMovel = document.getElementById("tipo-movel").value;
          pedido.quantidade = document.getElementById("quantidade").value;
          pedido.marcaModelo = document.getElementById("marca-modelo").value;
          pedido.temManual = document.getElementById("tem-manual").value;
          pedido.precisaFurar = document.getElementById("precisa-furar").value;
          pedido.cepMontagem = document.getElementById("cep-montagem").value;
          pedido.enderecoMontagem = document.getElementById("endereco-montagem").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Jardinagem e poda":
          pedido.area = document.getElementById("area").value;
          pedido.tipoServico = document.getElementById("tipo-servico").value;
          pedido.destinoResiduos = document.getElementById("destino-residuos").value;
          pedido.cepEndereco = document.getElementById("cep-endereco").value
          pedido.enderecoServico = document.getElementById("endereco").value;
          pedido.data = document.getElementById("data").value;
          pedido.Hora = document.getElementById("hora").value;
          break;
    
        case "Instalação de TV/suporte":
          pedido.polegadasTv = document.getElementById("polegadas-tv").value;
          pedido.tipoParede = document.getElementById("tipo-parede").value;
          pedido.alturaTv = document.getElementById("altura-tv").value;
          pedido.passagemCabos = document.getElementById("passagem-cabos").value;
          pedido.precisaSuporte = document.getElementById("precisa-suporte").value;
          pedido.cepEndereco = document.getElementById("cep-endereco").value
          pedido.enderecoServico = document.getElementById("endereco").value;
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
       pedido.cepEndereco = document.getElementById("cep-endereco").value
          pedido.enderecoServico = document.getElementById("endereco").value;
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
      tituloAnuncio: data.titulo
    });

    const clienteUid = auth.currentUser.uid;
    const pedidoId = pedidoRef.id;
    const clienteRef = doc(db, "usuarios", clienteUid);

       
        await updateDoc(clienteRef, {
            pedidoAtivo: pedidoId
        });

    console.log("Pedido salvo com sucesso:", pedidoRef.id); // Exibe o ID do pedido salvo
    console.log(`Documento do cliente ${clienteUid} atualizado com pedidoAtivo: ${pedidoId}`);
    alert("Pedido enviado com sucesso!"); // Exibe o alerta de sucesso

    // Redirecionar para a página de status do pedido
    window.location.href = `../html/statusC.html?id=${pedidoRef.id}`;
  } catch (error) {
    console.error("Erro ao salvar o pedido:", error);
    alert("Erro ao salvar o pedido. Tente novamente mais tarde."); // Exibe o alerta de erro
  }
}
