import { db, auth } from "../firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, getDoc, collection, query, where, getDocs,
  Timestamp, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { criarPedido } from "./criar.pedido.js";
const $ = (id) => document.getElementById(id);
const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
const brl = (v) => (Number(v || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

onAuthStateChanged(auth, (user) => {
  setTxt("user-name", user ? (user.displayName || (user.email || "").split("@")[0] || "usuário") : "visitante");
});

const anuncioId = new URLSearchParams(location.search).get("id");
if (!anuncioId) { alert("Anúncio não encontrado"); location.href = "meuservicosA.html"; }

async function carregarAnuncio() {
  try {
    const aRef = doc(db, "anuncios", anuncioId);
    const aSnap = await getDoc(aRef);
    if (!aSnap.exists()) { alert("Anúncio não encontrado"); location.href = "meuservicosA.html"; return; }
    const data = aSnap.data();

    // Exibe o anúncio
    setTxt("titulo-anuncio", data.titulo || "Sem título");
    setTxt("descricao", data.descricao || "Sem descrição");

    const precoEl = document.querySelector(".preco");
    if (precoEl) precoEl.textContent = brl(data.precoBase);
    setTxt("parcelas", data.parcelas && data.precoBase
      ? `${data.parcelas}x de ${brl((data.precoBase || 0) / data.parcelas)} sem juros`
      : ""
    );

    setTxt("local", data.regiao || data.bairro || "Não informado");
    setTxt("categoria", data.categoria || "Não informado");
    const atualizado = data.atualizadoEm instanceof Timestamp
      ? new Date(data.atualizadoEm.seconds * 1000)
      : new Date();
    setTxt("data-publicacao", atualizado.toLocaleDateString("pt-BR"));
    setTxt("codigo-anuncio", data.codigo || anuncioId);
// Evento para abrir o modal quando o botão "Solicitar" for clicado
btnSolicitar.addEventListener("click", function() {
  console.log("Botão 'Solicitar' clicado!");  // Log para diagnosticar
  const tipoServico = data.categoria; 
  abrirModal(tipoServico); // Abre o modal

});

    // Exibir categoria do anúncio para ajustar o modal
    const tipoServico = data.categoria;
   

    // Carregar mais anúncios do mesmo prestador
    const prestadorUid = data.prestadorUid || "";
    if (prestadorUid) await carregarMaisAnuncios(prestadorUid, anuncioId);

    // Carregar imagens do anúncio
    carregarImagens(data.fotos || []);

  } catch (error) {
    console.error("Erro ao carregar os dados do anúncio:", error);
    alert("Erro ao carregar o anúncio.");
  }
}

// Função para carregar imagens do anúncio
function carregarImagens(fotos) {
  const gal = $("galeria");
  if (gal) {
    gal.innerHTML = "";
    if (fotos.length) {
      fotos.forEach((url, i) => {
        gal.innerHTML += `
          <input type="radio" name="g" id="g${i+1}" ${i === 0 ? "checked" : ""}>
          <div class="viewport"><img class="img i${i+1}" src="${url}" alt="foto ${i+1}"></div>`;
      });
    } else {
      gal.innerHTML = `<p>Sem fotos disponíveis</p>`;
    }
  }
}

// Função para carregar mais anúncios do mesmo prestador
async function carregarMaisAnuncios(uid, atualId) {
  const cont = $("mais-anuncios");
  if (!cont) return;
  cont.innerHTML = "";

  async function renderLista(qy) {
    const qs = await getDocs(qy);
    qs.forEach(ds => {
      if (ds.id === atualId) return;
      const d = ds.data();
      const thumb = (d.fotos && d.fotos[0]) || "../arquivos/default.jpg";
      cont.innerHTML += `
        <a class="card" href="anuncioD.html?id=${ds.id}">
          <img src="${thumb}" alt="thumb" class="thumb">
          <div class="info">
            <h4>${d.titulo || "Sem título"}</h4>
            <span class="preco">${brl(d.precoBase)}</span>
            <span class="meta">${d.categoria || ""} • ${d.regiao || d.bairro || ""}</span>
          </div>
        </a>`;
    });
  }

  try {
    const q1 = query(
      collection(db, "anuncios"),
      where("prestadorUid", "==", uid),
      where("status", "==", "publicado"),
      orderBy("atualizadoEm", "desc"),
      limit(6)
    );
    await renderLista(q1);
  } catch (e) {
    if (e.code === "failed-precondition") {
      const q2 = query(
        collection(db, "anuncios"),
        where("prestadorUid", "==", uid),
        where("status", "==", "publicado")
      );
      await renderLista(q2);
    } else {
      console.error("Mais anúncios:", e);
    }
  }
}

const categoriaParaServico = {
  "Troca de gás": "Troca de gás",
  "Fazer feira": "Fazer feira",
  "Compras no mercado": "Compras no mercado",
  "Buscar/Levar documentos": "Buscar/Levar documentos",
  "Passear com cachorro": "Passear com cachorro",
  "Pequenos reparos": "Pequenos reparos",
  "Montagem de móveis": "Montagem de móveis",
  "Jardinagem e poda": "Jardinagem e poda",
  "Instalação de TV/suporte": "Instalação de TV/suporte",
  "Limpeza residencial": "Limpeza residencial",
  "Outros": "Outros"
};


// Função para abrir o modal
function abrirModal(categoria) {
  console.log("Categoria lida do Firestore:", categoria);
  const tipoServico = categoriaParaServico[categoria];
  if (!tipoServico) {
    console.error("Categoria não reconhecida:", categoria);
    return;
  }
  const modal = document.getElementById("modalSolicitar");
  console.log("Abrindo modal... Tipo de serviço:", tipoServico);
  modal.style.display = "flex";
  modal.classList.add("show");

  const campoAdicional = document.getElementById("campo-adicional");
  console.log("Tipo de serviço:", tipoServico);
 // console.log(data)
  switch (tipoServico) {
    case "Troca de gás":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="tipo-botijao">Tipo do Botijão</label>
          <input type="text" id="tipo-botijao" class="input" placeholder="Ex: 13kg, 45kg" required />
        </div>
        <div class="form-group">
          <label for="quantidade">Quantidade</label>
          <input type="number" id="quantidade" class="input" required />
        </div>
        <div class="form-group">
          <label for="local-instalacao">Local de Instalação</label>
          <input type="text" id="local-instalacao" class="input" required />
        </div>
        <div class="form-group">
          <label for="andar">Andar</label>
          <input type="number" id="andar" class="input" required />
        </div>
        <div class="form-group">
          <label for="elevador">Possui Elevador?</label>
          <select id="elevador" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="retirar-vazio">Retirar Vazio?</label>
          <select id="retirar-vazio" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

      `;
      break;

    case "Fazer feira":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="itens-compra">Itens de Compra</label>
          <input type="text" id="itens-compra" class="input" placeholder="Ex: arroz, feijão" required />
        </div>
        <div class="form-group">
          <label for="orcamento-max">Orçamento Máximo</label>
          <input type="text" id="orcamento-max" class="input" required />
        </div>
        <div class="form-group">
          <label for="endereco-entrega">Endereço de Entrega</label>
          <input type="text" id="endereco-entrega" class="input" required />
        </div>
      `;
      break;

    case "Compras no mercado":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="itens-compra">Itens de Compra</label>
          <input type="text" id="itens-compra" class="input" placeholder="Ex: arroz, feijão" required />
        </div>
        <div class="form-group">
          <label for="orcamento-max">Orçamento Máximo</label>
          <input type="text" id="orcamento-max" class="input" required />
        </div>
        <div class="form-group">
          <label for="endereco-entrega">Endereço de Entrega</label>
          <input type="text" id="endereco-entrega" class="input" required />
        </div>
      `;
      break;

    case "Buscar/Levar documentos":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="urgencia">Urgência</label>
          <select id="urgencia" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="requer-assinatura">Requer Assinatura?</label>
          <select id="requer-assinatura" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="tamanho">Tamanho dos Documentos</label>
          <input type="text" id="tamanho" class="input" placeholder="Ex: A4, A3" required />
        </div>
        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
        <div class="form-group">
          <label for="endereco-entrega">Endereço de Entrega</label>
          <input type="text" id="endereco-entrega" class="input" required />
        </div>
      `;
      break;

    case "Passear com cachorro":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="nome-pet">Nome do Pet</label>
          <input type="text" id="nome-pet" class="input" required />
        </div>
        <div class="form-group">
          <label for="porte">Porte do Pet</label>
          <select id="porte" class="input" required>
            <option value="pequeno">Pequeno</option>
            <option value="medio">Médio</option>
            <option value="grande">Grande</option>
          </select>
        </div>
        <div class="form-group">
          <label for="duracao-minima">Duração Mínima</label>
          <input type="number" id="duracao-minima" class="input" required />
        </div>
        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
      `;
      break;

    case "Pequenos reparos":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="descricao-reparo">Descrição</label>
          <input type="text" id="descricao-reparo" class="input" placeholder="Ex: conserto de tomada" required />
        </div>
        <div class="form-group">
          <label for="categoria-reparo">Categoria de Reparo</label>
          <input type="text" id="categoria-reparo" class="input" placeholder="Ex: elétrica, hidráulica" required />
        </div>
        <div class="form-group">
          <label for="materiais-fornecidos">Materiais Fornecidos</label>
          <select id="materiais-fornecidos" class="input" required>
            <option value="cliente">Cliente</option>
            <option value="ajudante">Ajudante</option>
          </select>
        </div>
        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
      `;
      break;

    case "Montagem de móveis":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="tipo-movel">Tipo de Móvel</label>
          <input type="text" id="tipo-movel" class="input" placeholder="Ex: cama, estante" required />
        </div>
        <div class="form-group">
          <label for="quantidade">Quantidade</label>
          <input type="number" id="quantidade" class="input" required />
        </div>
        <div class="form-group">
          <label for="marca-modelo">Marca e Modelo</label>
          <input type="text" id="marca-modelo" class="input" placeholder="Ex: Marca, Modelo" />
        </div>
        <div class="form-group">
          <label for="tem-manual">Tem Manual?</label>
          <select id="tem-manual" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="precisa-furar">Precisa Furado?</label>
          <select id="precisa-furar" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
      `;
      break;

    case "Jardinagem e poda":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="area">Área (m²)</label>
          <input type="number" id="area" class="input" placeholder="Ex: 10m²" required />
        </div>
        <div class="form-group">
          <label for="tipo-servico">Tipo de Serviço</label>
          <input type="text" id="tipo-servico" class="input" placeholder="Ex: poda de árvores" required />
        </div>
        <div class="form-group">
          <label for="destino-residuos">Destino dos Resíduos</label>
          <input type="text" id="destino-residuos" class="input" placeholder="Ex: levar para o ecoponto" required />
        </div>

        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
      `;
      break;

    case "Instalação de TV/suporte":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="polegadas-tv">Polegadas da TV</label>
          <input type="number" id="polegadas-tv" class="input" placeholder="Ex: 32, 50" required />
        </div>
        <div class="form-group">
          <label for="tipo-parede">Tipo de Parede</label>
          <input type="text" id="tipo-parede" class="input" placeholder="Ex: Drywall, Concreto" required />
        </div>
        <div class="form-group">
          <label for="altura-tv">Altura Aproximada</label>
          <input type="number" id="altura-tv" class="input" placeholder="Ex: 1.5m" required />
        </div>
        <div class="form-group">
          <label for="passagem-cabos">Passagem de Cabos</label>
          <select id="passagem-cabos" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="precisa-suporte">Precisa de Suporte?</label>
          <select id="precisa-suporte" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
      `;
      break;

    case "Limpeza residencial":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="tipo-limpeza">Tipo de Limpeza</label>
          <input type="text" id="tipo-limpeza" class="input" placeholder="Ex: limpeza geral, limpeza pós-obra" required />
        </div>
        <div class="form-group">
          <label for="metragem">Metragem (m²)</label>
          <input type="number" id="metragem" class="input" required />
        </div>
        <div class="form-group">
          <label for="quartos">Quartos</label>
          <input type="number" id="quartos" class="input" required />
        </div>
        <div class="form-group">
          <label for="banheiros">Banheiros</label>
          <input type="number" id="banheiros" class="input" required />
        </div>
        <div class="form-group">
          <label for="materiais-disponiveis">Materiais Disponíveis</label>
          <select id="materiais-disponiveis" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div class="form-group">
          <label for="periodicidade">Periodicidade</label>
          <select id="periodicidade" class="input" required>
            <option value="unico">Única vez</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required />
        </div>
      `;
      break;

    case "Outros":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="descricao-servico">Descrição Detalhada do Serviço</label>
          <textarea id="descricao-servico" class="input" placeholder="Descreva o serviço solicitado" required></textarea>
        </div>
      `;
      break;

    default:
      campoAdicional.innerHTML = `<p>Serviço não reconhecido.</p>`;
      break;
  }

}

// Evento para abrir o modal quando o botão "Solicitar" for clicado
//btnSolicitar.addEventListener("click", function() {
 // console.log("Botão 'Solicitar' clicado!");  // Log para diagnosticar
 // const tipoServico = "Buscar/Levar documentos"; // Este valor pode vir dinamicamente do anúncio
 // abrirModal(tipoServico); // Abre o modal

//});

// Fechar o modal
const btnFecharModal = document.getElementById("btnFecharModal");

// Adiciona o evento de clique ao botão de fechar
btnFecharModal.addEventListener("click", fecharModal);

// Função para fechar o modal
function fecharModal() {
  const modal = document.getElementById("modalSolicitar");
  modal.style.display = "none";
  console.log("Fechando o modal...");
}

// Enviar dados do formulário
document.getElementById("formPedido").addEventListener("submit", async function (e) {
  e.preventDefault(); // Impede o envio do formulário padrão

  // Coletar o ID do anúncio
  const anuncioId = new URLSearchParams(location.search).get("id");

  // Chamar a função para criar o pedido
  await criarPedido(anuncioId); // Passa o ID do anúncio para a função
});


// Chamando a função para carregar o anúncio
carregarAnuncio();
