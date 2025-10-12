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
          <select id="tipo-botijao" class="input" required>
            <option value="" disabled selected>Selecione o Tipo de Botijão</option>
            <option value="P2">P2 (2kg)</option>
            <option value="P5">P5 (5kg)</option>
            <option value="P8">P8 (8kg)</option>
            <option value="P13">P13 (13kg)</option>
            <option value="P45">P45 (45kg)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="quantidade">Quantidade</label>
          <select id="quantidade" class="input" required>
            <option value="" disabled selected>Escolha a Quantidade</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
          </select>
        </div
       <div class="form-group">
          <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
        </div>
        <div class="form-group">
          <label for="cep">Local de Instalação</label>
          <input type="text" id="cep" class="input" placeholder="Ex: 12345-678" required maxlength="9"/>
        </div>
        <div class="form-group">
          <label for="endereco">Endereço</label>
          <input type="text" id="endereco" class="input" required />
        </div>
        <div class="form-group">
          <label for="bairro">Bairro</label>
          <input type="text" id="bairro" class="input" required />
        </div>
        <div class="form-group">
          <label for="cidade">Cidade</label>
          <input type="text" id="cidade" class="input" required />
        </div>
        <div class="form-group">
          <label for="estado">Estado</label>
          <input type="text" id="estado" class="input" required />
        </div>
          <div class="form-group">
          <label for="numero">Número</label>
          <input type="text" id="numero" class="input" required />
        </div>
        <div class="form-group">
          <label for="andar">Andar</label>
          <input type="number" id="andar" class="input" required max="22" />
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
      
      document.getElementById("verificar-cep").addEventListener("click", function() {
  const cep = document.getElementById("cep").value.replace("-", ""); // Remove o hífen
  if (cep.length === 8) {
    // Faz a requisição à API ViaCEP
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(response => response.json())
      .then(data => {
        if (data.erro) {
          alert("CEP não encontrado. Verifique o número e tente novamente.");
        } else {
          // Preenche os campos de endereço com os dados retornados
          document.getElementById("endereco").value = data.logradouro;
          document.getElementById("bairro").value = data.bairro;
          document.getElementById("cidade").value = data.localidade;
          document.getElementById("estado").value = data.uf;
        }
      })
      .catch(() => {
        alert("Erro ao consultar o CEP. Tente novamente.");
      });
  } else {
    alert("CEP inválido. Digite um CEP com 8 dígitos.");
  }
});
  // Máscara para o CEP (xxxxx-xxx)
  document.getElementById('cep').addEventListener('input', function(e) {
    let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
    if (cep.length <= 5) {
      cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    } else {
      cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    e.target.value = cep;
  });

      break;
 case "Pequenos reparos":
        campoAdicional.innerHTML = `
            <div class="form-group">
                <label for="categoria-reparo">Categoria do Reparo</label>
                <select id="categoria-reparo" class="input" required>
                    <option value="" disabled selected>Selecione a categoria</option>
                    <option value="eletrica">Elétrica (tomadas, interruptores, chuveiros)</option>
                    <option value="hidraulica">Hidráulica (torneiras, vazamentos, pias)</option>
                    <option value="pintura">Pintura (pequenos retoques)</option>
                    <option value="alvenaria">Alvenaria (pequenos reparos em paredes)</option>
                    <option value="marcenaria">Marcenaria (portas, dobradiças, pequenos móveis)</option>
                    <option value="geral">Reparos Gerais / Outros</option>
                </select>
            </div>
            <div class="form-group">
                <label for="descricao-reparo">Descrição do Problema</label>
                <input type="text" id="descricao-reparo" class="input" placeholder="Ex: Conserto de tomada na sala" required />
            </div>
            <div class="form-group">
                <label for="materiais-fornecidos">Quem fornecerá os materiais?</label>
                <select id="materiais-fornecidos" class="input" required>
                    <option value="cliente">Eu (cliente) fornecerei os materiais</option>
                    <option value="ajudante">Preciso que o ajudante compre/traga</option>
                </select>
            </div>
            <div class="form-group">
                <label for="cep-endereco">CEP do Local do Reparo</label>
                <input type="text" id="cep-endereco" class="input" placeholder="00000-000" required maxlength="9" />
            </div>
            <div class="form-group">
                <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
            </div>
            <div class="form-group">
                <label for="endereco-reparo">Endereço do Reparo</label>
                <input type="text" id="endereco-reparo" class="input" placeholder="Preenchido automaticamente após verificar o CEP" required />
            </div>
        `;

        // Lógica do CEP (continua a mesma)
        document.getElementById('cep-endereco').addEventListener('input', function (e) {
            let valor = e.target.value.replace(/\D/g, '');
            valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = valor;
        });

        document.getElementById('verificar-cep').addEventListener('click', function () {
            const cepInput = document.getElementById('cep-endereco');
            const enderecoInput = document.getElementById('endereco-reparo');

            enderecoInput.value = 'Buscando...';
            const cep = cepInput.value.replace(/\D/g, '');

            if (cep.length !== 8) {
                enderecoInput.value = '';
                alert('CEP inválido! Verifique o formato e tente novamente.');
                return;
            }

            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(response => response.json())
                .then(data => {
                    if (data.erro) {
                        enderecoInput.value = '';
                        alert('CEP não encontrado. Por favor, digite o endereço manualmente.');
                    } else {
                        enderecoInput.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    }
                })
                .catch(error => {
                    console.error('Erro ao buscar CEP:', error);
                    enderecoInput.value = '';
                    alert('Erro na comunicação com a API de CEP.');
                });
        });

        break;
    case "Fazer feira":
      campoAdicional.innerHTML = `
<div class="form-group">
  <label for="itens-compra">Itens de Compra (Feira)</label>
  <div class="checkbox-grid">
    
    <div class="checkbox-item">
        <label for="item1" class="container"> 
            <input type="checkbox" id="item1" name="itens-compra" value="Maçã" />
            <div class="checkmark"></div> Maçã
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item2" class="container"> 
            <input type="checkbox" id="item2" name="itens-compra" value="Banana" />
            <div class="checkmark"></div> Banana
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item3" class="container"> 
            <input type="checkbox" id="item3" name="itens-compra" value="Laranja" />
            <div class="checkmark"></div> Laranja
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item4" class="container"> 
            <input type="checkbox" id="item4" name="itens-compra" value="Uva" />
            <div class="checkmark"></div> Uva
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item5" class="container"> 
            <input type="checkbox" id="item5" name="itens-compra" value="Morango" />
            <div class="checkmark"></div> Morango
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item6" class="container"> 
            <input type="checkbox" id="item6" name="itens-compra" value="Manga" />
            <div class="checkmark"></div> Manga
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item7" class="container"> 
            <input type="checkbox" id="item7" name="itens-compra" value="Pera" />
            <div class="checkmark"></div> Pera
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item8" class="container"> 
            <input type="checkbox" id="item8" name="itens-compra" value="Abacaxi" />
            <div class="checkmark"></div> Abacaxi
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item9" class="container"> 
            <input type="checkbox" id="item9" name="itens-compra" value="Melancia" />
            <div class="checkmark"></div> Melancia
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item10" class="container"> 
            <input type="checkbox" id="item10" name="itens-compra" value="Mamão" />
            <div class="checkmark"></div> Mamão
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item11" class="container"> 
            <input type="checkbox" id="item11" name="itens-compra" value="Kiwi" />
            <div class="checkmark"></div> Kiwi
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item12" class="container"> 
            <input type="checkbox" id="item12" name="itens-compra" value="Maracujá" />
            <div class="checkmark"></div> Maracujá
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item13" class="container"> 
            <input type="checkbox" id="item13" name="itens-compra" value="Goiaba" />
            <div class="checkmark"></div> Goiaba
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item14" class="container"> 
            <input type="checkbox" id="item14" name="itens-compra" value="Tangerina" />
            <div class="checkmark"></div> Tangerina
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item15" class="container"> 
            <input type="checkbox" id="item15" name="itens-compra" value="Limão" />
            <div class="checkmark"></div> Limão
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item16" class="container"> 
            <input type="checkbox" id="item16" name="itens-compra" value="Tomate" />
            <div class="checkmark"></div> Tomate
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item17" class="container"> 
            <input type="checkbox" id="item17" name="itens-compra" value="Cebola" />
            <div class="checkmark"></div> Cebola
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item18" class="container"> 
            <input type="checkbox" id="item18" name="itens-compra" value="Alface" />
            <div class="checkmark"></div> Alface
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item19" class="container"> 
            <input type="checkbox" id="item19" name="itens-compra" value="Cenoura" />
            <div class="checkmark"></div> Cenoura
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item20" class="container"> 
            <input type="checkbox" id="item20" name="itens-compra" value="Batata" />
            <div class="checkmark"></div> Batata
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item21" class="container"> 
            <input type="checkbox" id="item21" name="itens-compra" value="Brócolis" />
            <div class="checkmark"></div> Brócolis
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item22" class="container"> 
            <input type="checkbox" id="item22" name="itens-compra" value="Pepino" />
            <div class="checkmark"></div> Pepino
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item23" class="container"> 
            <input type="checkbox" id="item23" name="itens-compra" value="Pimentão" />
            <div class="checkmark"></div> Pimentão
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item24" class="container"> 
            <input type="checkbox" id="item24" name="itens-compra" value="Abobrinha" />
            <div class="checkmark"></div> Abobrinha
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item25" class="container"> 
            <input type="checkbox" id="item25" name="itens-compra" value="Espinafre" />
            <div class="checkmark"></div> Espinafre
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item26" class="container"> 
            <input type="checkbox" id="item26" name="itens-compra" value="Alho" />
            <div class="checkmark"></div> Alho
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item27" class="container"> 
            <input type="checkbox" id="item27" name="itens-compra" value="Mandioquinha" />
            <div class="checkmark"></div> Mandioquinha
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item28" class="container"> 
            <input type="checkbox" id="item28" name="itens-compra" value="Berinjela" />
            <div class="checkmark"></div> Berinjela
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item29" class="container"> 
            <input type="checkbox" id="item29" name="itens-compra" value="Beterraba" />
            <div class="checkmark"></div> Beterraba
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item30" class="container"> 
            <input type="checkbox" id="item30" name="itens-compra" value="Couve-flor" />
            <div class="checkmark"></div> Couve-flor
        </label>
    </div>

  </div>
</div>
<div class="form-direita"> <div class="form-group">
        <label for="orcamento-max">Orçamento Máximo</label>
        <input type="text" id="orcamento-max" class="input" required />
    </div>
    
    <div class="form-group">
        <label for="cep">Endereço de Entrega</label>
        <input type="text" id="cep" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
    </div>
    
    <div class="form-group">
        <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
    </div>
</div>

        <div class="form-group">
          <label for="endereco">Endereço</label>
          <input type="text" id="endereco" class="input" required />
        </div>
        <div class="form-group">
          <label for="bairro">Bairro</label>
          <input type="text" id="bairro" class="input" required />
        </div>
        <div class="form-group">
          <label for="cidade">Cidade</label>
          <input type="text" id="cidade" class="input" required />
        </div>
        <div class="form-group">
          <label for="estado">Estado</label>
          <input type="text" id="estado" class="input" required />
        </div>
          <div class="form-group">
          <label for="numero">Número</label>
          <input type="text" id="numero" class="input" required />
        </div>
      `;

    document.getElementById("verificar-cep").addEventListener("click", function() {
  const cep = document.getElementById("cep").value.replace("-", ""); // Remove o hífen
  if (cep.length === 8) {
    // Faz a requisição à API ViaCEP
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(response => response.json())
      .then(data => {
        if (data.erro) {
          alert("CEP não encontrado. Verifique o número e tente novamente.");
        } else {
          // Preenche os campos de endereço com os dados retornados
          document.getElementById("endereco").value = data.logradouro;
          document.getElementById("bairro").value = data.bairro;
          document.getElementById("cidade").value = data.localidade;
          document.getElementById("estado").value = data.uf;
        }
      })
      .catch(() => {
        alert("Erro ao consultar o CEP. Tente novamente.");
      });
  } else {
    alert("CEP inválido. Digite um CEP com 8 dígitos.");
  }
});

  // Máscara para o CEP (xxxxx-xxx)
  document.getElementById('cep').addEventListener('input', function(e) {
    let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
    if (cep.length <= 5) {
      cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    } else {
      cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    e.target.value = cep;
  });
  setTimeout(function() {
    const inputOrcamento = document.getElementById('orcamento-max');
    
    if (inputOrcamento) {
        inputOrcamento.addEventListener('input', function(e) {
            // 1. Pega o valor e remove tudo que não for dígito
            let v = e.target.value.replace(/\D/g, '');
            
            // 2. Transforma o valor em centavos e formata com 2 casas decimais
            // Ex: "12345" vira 123.45 (como float), depois "123.45" (como string)
            v = (v / 100).toFixed(2);
            
            // 3. Substitui o ponto por vírgula para centavos (Padrão BR)
            v = v.replace(".", ",");
            
            // 4. Adiciona separadores de milhar (pontos)
            // Esta regex adiciona um ponto a cada 3 dígitos antes da vírgula
            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            
            // 5. Atualiza o valor do input com o símbolo R$
            e.target.value = "R$ " + v;
        });
    }

    // ... Seu listener para o CEP pode vir aqui também, se for o caso ...
}, 0);
      break;

    case "Compras no mercado":
      campoAdicional.innerHTML = `
   <div class="form-group">
  <label for="itens-compra">Itens de Compra</label>
  <div class="checkbox-grid">
    
    <div class="checkbox-item">
        <label for="item1" class="container"> 
            <input type="checkbox" id="item1" name="itens-compra" value="Arroz" />
            <div class="checkmark"></div> Arroz
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item2" class="container"> 
            <input type="checkbox" id="item2" name="itens-compra" value="Feijão" />
            <div class="checkmark"></div> Feijão
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item3" class="container"> 
            <input type="checkbox" id="item3" name="itens-compra" value="Macarrão" />
            <div class="checkmark"></div> Macarrão
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item4" class="container"> 
            <input type="checkbox" id="item4" name="itens-compra" value="Açúcar" />
            <div class="checkmark"></div> Açúcar
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item5" class="container"> 
            <input type="checkbox" id="item5" name="itens-compra" value="Sal" />
            <div class="checkmark"></div> Sal
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item6" class="container"> 
            <input type="checkbox" id="item6" name="itens-compra" value="Café" />
            <div class="checkmark"></div> Café
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item7" class="container"> 
            <input type="checkbox" id="item7" name="itens-compra" value="Óleo" />
            <div class="checkmark"></div> Óleo
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item8" class="container"> 
            <input type="checkbox" id="item8" name="itens-compra" value="Leite" />
            <div class="checkmark"></div> Leite
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item9" class="container"> 
            <input type="checkbox" id="item9" name="itens-compra" value="Farinha" />
            <div class="checkmark"></div> Farinha
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item10" class="container"> 
            <input type="checkbox" id="item10" name="itens-compra" value="Frango" />
            <div class="checkmark"></div> Frango
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item11" class="container"> 
            <input type="checkbox" id="item11" name="itens-compra" value="Carne" />
            <div class="checkmark"></div> Carne
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item12" class="container"> 
            <input type="checkbox" id="item12" name="itens-compra" value="Peixe" />
            <div class="checkmark"></div> Peixe
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item13" class="container"> 
            <input type="checkbox" id="item13" name="itens-compra" value="Batata" />
            <div class="checkmark"></div> Batata
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item14" class="container"> 
            <input type="checkbox" id="item14" name="itens-compra" value="Cebola" />
            <div class="checkmark"></div> Cebola
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item15" class="container"> 
            <input type="checkbox" id="item15" name="itens-compra" value="Alho" />
            <div class="checkmark"></div> Alho
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item16" class="container"> 
            <input type="checkbox" id="item16" name="itens-compra" value="Tomate" />
            <div class="checkmark"></div> Tomate
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item17" class="container"> 
            <input type="checkbox" id="item17" name="itens-compra" value="Alface" />
            <div class="checkmark"></div> Alface
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item18" class="container"> 
            <input type="checkbox" id="item18" name="itens-compra" value="Pepino" />
            <div class="checkmark"></div> Pepino
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item19" class="container"> 
            <input type="checkbox" id="item19" name="itens-compra" value="Abóbora" />
            <div class="checkmark"></div> Abóbora
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item20" class="container"> 
            <input type="checkbox" id="item20" name="itens-compra" value="Laranja" />
            <div class="checkmark"></div> Laranja
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item21" class="container"> 
            <input type="checkbox" id="item21" name="itens-compra" value="Maçã" />
            <div class="checkmark"></div> Maçã
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item22" class="container"> 
            <input type="checkbox" id="item22" name="itens-compra" value="Pera" />
            <div class="checkmark"></div> Pera
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item23" class="container"> 
            <input type="checkbox" id="item23" name="itens-compra" value="Uva" />
            <div class="checkmark"></div> Uva
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item24" class="container"> 
            <input type="checkbox" id="item24" name="itens-compra" value="Abacaxi" />
            <div class="checkmark"></div> Abacaxi
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item25" class="container"> 
            <input type="checkbox" id="item25" name="itens-compra" value="Couve" />
            <div class="checkmark"></div> Couve
        </label>
    </div>

    <div class="checkbox-item">
        <label for="item26" class="container"> 
            <input type="checkbox" id="item26" name="itens-compra" value="Brócolis" />
            <div class="checkmark"></div> Brócolis
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item27" class="container"> 
            <input type="checkbox" id="item27" name="itens-compra" value="Berinjela" />
            <div class="checkmark"></div> Berinjela
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item28" class="container"> 
            <input type="checkbox" id="item28" name="itens-compra" value="Chuchu" />
            <div class="checkmark"></div> Chuchu
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item29" class="container"> 
            <input type="checkbox" id="item29" name="itens-compra" value="Chá" />
            <div class="checkmark"></div> Chá
        </label>
    </div>
    <div class="checkbox-item">
        <label for="item30" class="container"> 
            <input type="checkbox" id="item30" name="itens-compra" value="Sucos" />
            <div class="checkmark"></div> Sucos
        </label>
    </div>

  </div>
</div>

  <div class="form-direita"> <div class="form-group">
        <label for="orcamento-max">Orçamento Máximo</label>
        <input type="text" id="orcamento-max" class="input" required />
    </div>
    
    <div class="form-group">
        <label for="cep">Endereço de Entrega</label>
        <input type="text" id="cep" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
    </div>
    
    <div class="form-group">
        <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
    </div>
</div>

        <div class="form-group">
          <label for="endereco">Endereço</label>
          <input type="text" id="endereco" class="input" required />
        </div>
        <div class="form-group">
          <label for="bairro">Bairro</label>
          <input type="text" id="bairro" class="input" required />
        </div>
        <div class="form-group">
          <label for="cidade">Cidade</label>
          <input type="text" id="cidade" class="input" required />
        </div>
        <div class="form-group">
          <label for="estado">Estado</label>
          <input type="text" id="estado" class="input" required />
        </div>
          <div class="form-group">
          <label for="numero">Número</label>
          <input type="text" id="numero" class="input" required />
        </div>
      `;

    document.getElementById("verificar-cep").addEventListener("click", function() {
  const cep = document.getElementById("cep").value.replace("-", ""); // Remove o hífen
  if (cep.length === 8) {
    // Faz a requisição à API ViaCEP
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(response => response.json())
      .then(data => {
        if (data.erro) {
          alert("CEP não encontrado. Verifique o número e tente novamente.");
        } else {
          // Preenche os campos de endereço com os dados retornados
          document.getElementById("endereco").value = data.logradouro;
          document.getElementById("bairro").value = data.bairro;
          document.getElementById("cidade").value = data.localidade;
          document.getElementById("estado").value = data.uf;
        }
      })
      .catch(() => {
        alert("Erro ao consultar o CEP. Tente novamente.");
      });
  } else {
    alert("CEP inválido. Digite um CEP com 8 dígitos.");
  }
});

  // Máscara para o CEP (xxxxx-xxx)
  document.getElementById('cep').addEventListener('input', function(e) {
    let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
    if (cep.length <= 5) {
      cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    } else {
      cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    e.target.value = cep;
  });
  setTimeout(function() {
    const inputOrcamento = document.getElementById('orcamento-max');
    
    if (inputOrcamento) {
        inputOrcamento.addEventListener('input', function(e) {
            // 1. Pega o valor e remove tudo que não for dígito
            let v = e.target.value.replace(/\D/g, '');
            
            // 2. Transforma o valor em centavos e formata com 2 casas decimais
            // Ex: "12345" vira 123.45 (como float), depois "123.45" (como string)
            v = (v / 100).toFixed(2);
            
            // 3. Substitui o ponto por vírgula para centavos (Padrão BR)
            v = v.replace(".", ",");
            
            // 4. Adiciona separadores de milhar (pontos)
            // Esta regex adiciona um ponto a cada 3 dígitos antes da vírgula
            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            
            // 5. Atualiza o valor do input com o símbolo R$
            e.target.value = "R$ " + v;
        });
    }

    // ... Seu listener para o CEP pode vir aqui também, se for o caso ...
}, 0);
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
          <select id="tamanho" class="input" required>
            <option value="">Selecione um tamanho</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="A5">A5</option>
            <option value="A6">A6</option>
            <option value="Ofício">Ofício</option>
            <option value="Carta">Carta</option>
            <option value="B4">B4</option>
            <option value="B5">B5</option>
            <option value="C4">C4</option>
            <option value="C5">C5</option>
          </select>
        </div>
        <div class="form-group">
          <label for="cep-retirada">CEP de Retirada</label>
          <input type="text" id="cep-retirada" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
          
        </div>
        
      <button type="button" id="verificar-cep-retirada" class="botoes-modal">Verificar CEP</button>
        <div class="form-group">
          <label for="endereco-retirada">Endereço de Retirada</label>
          <input type="text" id="endereco-retirada" class="input" required readonly />
        </div>

        <div class="form-group">
          <label for="cep-entrega">CEP de Entrega</label>
          <input type="text" id="cep-entrega" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
        </div>
      <button type="button" id="verificar-cep-entrega" class="botoes-modal">Verificar CEP</button>
        <div class="form-group">
          <label for="endereco-entrega">Endereço de Entrega</label>
          <input type="text" id="endereco-entrega" class="input" required readonly />
        </div>
      `;
       function buscarEndereco(cep, enderecoElement) {
        const cepFormatado = cep.replace(/\D/g, '');
        if (cepFormatado.length === 8) {
          const url = `https://viacep.com.br/ws/${cepFormatado}/json/`;
          enderecoElement.value = "Buscando endereço..."; // Feedback ao usuário
          fetch(url)
            .then(response => response.json())
            .then(data => {
              if (data.erro) {
                enderecoElement.value = "";
                alert("CEP não encontrado!");
              } else {
                enderecoElement.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
              }
            })
            .catch(error => {
              console.error("Erro ao buscar o CEP:", error);
              enderecoElement.value = "";
              alert("Não foi possível buscar o endereço. Tente novamente.");
            });
        } else {
          alert("CEP inválido!");
        }
      }

      // Função de máscara de CEP reutilizável
      function aplicarMascaraCEP(inputElement) {
        inputElement.addEventListener('input', function(e) {
          let cep = e.target.value.replace(/\D/g, ''); 
          if (cep.length > 5) {
            cep = cep.replace(/^(\d{5})(\d{0,3}).*/, '$1-$2');
          } else if (cep.length > 0) {
            cep = cep.replace(/^(\d{5})/, '$1');
          }
          e.target.value = cep;
        });
      }


      // --- ANEXANDO LISTENERS ---
      
      const cepRetiradaInput = document.getElementById('cep-retirada');
      const enderecoRetiradaInput = document.getElementById('endereco-retirada');
      const cepEntregaInput = document.getElementById('cep-entrega');
      const enderecoEntregaInput = document.getElementById('endereco-entrega');

      // Listener do Botão de Retirada
      document.getElementById('verificar-cep-retirada').addEventListener('click', () => {
        buscarEndereco(cepRetiradaInput.value, enderecoRetiradaInput);
      });

      // Listener do Botão de Entrega
      document.getElementById('verificar-cep-entrega').addEventListener('click', () => {
        buscarEndereco(cepEntregaInput.value, enderecoEntregaInput);
      });

      // Aplica a Máscara em Ambos
      aplicarMascaraCEP(cepRetiradaInput);
      aplicarMascaraCEP(cepEntregaInput);
      
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
          <select id="duracao-minima" class="input" required>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hora</option>
            <option value="75">1 hora e 15 min</option>
            <option value="90">1 hora e 30 min</option>
            <option value="105">1 hora e 45 min</option>
            <option value="120">2 horas</option>
          </select>
        </div>
        <div class="form-group">
          <label for="cep-entrega">CEP</label>
          <input type="text" id="cep-endereco" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
        </div>
      <button type="button" id="verificar-cep-entrega" class="botoes-modal">Verificar CEP</button>
        <div class="form-group">
          <label for="endereco-entrega">Endereço</label>
          <input type="text" id="endereco" class="input" required readonly />
        </div>
      `;
        // Máscara para o CEP (xxxxx-xxx)
  document.getElementById('cep-endereco').addEventListener('input', function(e) {
    let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
    if (cep.length <= 5) {
      cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    } else {
      cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    e.target.value = cep;
  });
document.getElementById('verificar-cep-entrega').addEventListener('click', function() {
    const cepInput = document.getElementById('cep-endereco');
    const enderecoInput = document.getElementById('endereco');
    
    // Limpa o campo de endereço enquanto aguarda a busca
    enderecoInput.value = 'Buscando...'; 

    // Remove qualquer caractere não numérico do CEP
    const cep = cepInput.value.replace(/\D/g, ''); 

    // Verifica se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        enderecoInput.value = '';
        alert('CEP inválido! Verifique o formato e tente novamente.');
        return;
    }

    // URL da API ViaCEP
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                enderecoInput.value = '';
                alert('CEP não encontrado. Digite o endereço manualmente.');
                return;
            }

            // Constrói o endereço completo e preenche o campo
            const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            
            enderecoInput.value = enderecoCompleto;

        })
        .catch(error => {
            console.error('Erro ao buscar CEP:', error);
            enderecoInput.value = '';
            alert('Erro na comunicação com a API de CEP.');
        });
});


      break;

    case "Montagem de móveis":
      campoAdicional.innerHTML = `
        <div class="form-group">
          <label for="tipo-movel">Tipo de Móvel</label>
          <select id="tipo-movel" class="input" required>
            <option value="" disabled selected>Selecione o tipo de móvel</option>
            <option value="armario_cozinha">Armário de Cozinha (Gabinete, Paneleiro)</option>
            <option value="guarda_roupa">Guarda-Roupa / Closet</option>
            <option value="comoda">Cômoda / Gaveteiro</option>
            <option value="estante_rack">Estante / Rack / Painel para TV</option>
            <option value="mesa">Mesa (de Jantar, de Escritório, Lateral)</option>
            <option value="cadeira_banco">Cadeira / Banco / Banqueta</option>
            <option value="cama_beliche">Cama / Beliche / Treliche</option>
            <option value="sofa">Sofá / Poltrona</option>
            <option value="prateleira_nicho">Prateleira / Nicho</option>
            <option value="banheiro">Móvel de Banheiro (Gabinete de Pia)</option>
            <option value="outros">Outro Tipo de Móvel</option>
          </select>
        </div>
        <div class="form-group">
          <label for="quantidade">Quantidade</label>
          <select id="quantidade" class="input" required>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10 (Máximo)</option>
          </select>
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
          <label for="precisa-furar">Precisa Furar?</label>
          <select id="precisa-furar" class="input" required>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
<div class="form-group">
          <label for="cep-montagem">CEP</label>
          <input type="text" id="cep-montagem" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
        </div>
      <button type="button" id="verificar-cep-montagem" class="botoes-modal">Verificar CEP</button>
        
        <div class="form-group">
          <label for="endereco-montagem">Endereço da Montagem</label>
          <input type="text" id="endereco-montagem" class="input" required />
        </div>
      `;
            // Máscara para o CEP (xxxxx-xxx)
// Aplica a máscara de formatação enquanto o usuário digita
document.getElementById('cep-montagem').addEventListener('input', function(e) {
  let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
  if (cep.length <= 5) {
    cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  } else {
    cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  e.target.value = cep;
});

// Função para buscar o CEP na API ViaCEP
document.getElementById('verificar-cep-montagem').addEventListener('click', function() {
    // Pega o valor do input de CEP
    const cepInput = document.getElementById('cep-montagem');
    // Pega o input de Endereço (que será preenchido)
    const enderecoInput = document.getElementById('endereco-montagem');
    
    // Limpa o campo de endereço enquanto aguarda a busca
    enderecoInput.value = 'Buscando...'; 

    // Remove qualquer caractere não numérico do CEP para a busca
    const cep = cepInput.value.replace(/\D/g, ''); 

    // Verifica se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        enderecoInput.value = '';
        alert('CEP inválido! Verifique o formato e tente novamente.');
        return;
    }

    // URL da API ViaCEP
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                enderecoInput.value = '';
                alert('CEP não encontrado. Digite o endereço manualmente.');
                return;
            }

            // Constrói o endereço completo e preenche o campo
            const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            
            enderecoInput.value = enderecoCompleto;

        })
        .catch(error => {
            console.error('Erro ao buscar CEP:', error);
            enderecoInput.value = '';
            alert('Erro na comunicação com a API de CEP.');
        });
});
      break;

    case "Jardinagem e poda":
      campoAdicional.innerHTML = `
       <div class="form-group">
          <label for="area">Área (m²)</label>
          <select id="area" class="input" required>
            <option value="" disabled selected>Selecione a área em m²</option>
            <option value="30">30 m²</option>
            <option value="60">60 m²</option>
            <option value="90">90 m²</option>
            <option value="120">120 m²</option>
            <option value="150">150 m²</option>
            <option value="180">180 m²</option>
            <option value="210">210 m²</option>
            <option value="240">240 m²</option>
            <option value="270">270 m²</option>
            <option value="300">300 m² (Máximo)</option>
          </select>
        </div>
<div class="form-group">
  <label for="tipo-servico">Tipo de Serviço de Jardinagem</label>
  <select id="tipo-servico" class="input" required>
    <option value="" disabled selected>Selecione o serviço</option>
    <option value="corte_grama">Corte e Manutenção de Grama</option>
    <option value="poda_simples">Poda Simples (Arbustos, Cerca Viva)</option>
    <option value="poda_arvores">Poda de Árvores (Com ou Sem Remoção de Galhos)</option>
    <option value="plantio_cuidado">Plantio e Cuidado com Canteiros/Flores</option>
    <option value="limpeza_jardim">Limpeza Completa de Jardim (Remoção de lixo verde)</option>
    <option value="outros_jardinagem">Outros Serviços de Jardinagem</option>
  </select>
</div>
<div class="form-group">
  <label for="destino-residuos">Destino dos Resíduos</label>
  <select id="destino-residuos" class="input" required>
    <option value="" disabled selected>Selecione o destino</option>
    <option value="prestador_leva">Prestador(a) leva os resíduos</option>
    <option value="residuos_local">Resíduos ficam no local para descarte do cliente</option>
  </select>
</div>
  <div class="form-group">
          <label for="cep-endereco">CEP</label>
          <input type="text" id="cep-endereco" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
        </div>
      <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
        
        <div class="form-group">
          <label for="endereco">Endereço do Serviço</label>
          <input type="text" id="endereco" class="input" required />
        </div>
      `;
      // Máscara para o CEP (xxxxx-xxx)
// Aplica a máscara de formatação enquanto o usuário digita
document.getElementById('cep-endereco').addEventListener('input', function(e) {
  let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
  if (cep.length <= 5) {
    cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  } else {
    cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  e.target.value = cep;
});

// Função para buscar o CEP na API ViaCEP
document.getElementById('verificar-cep').addEventListener('click', function() {
    // Pega o valor do input de CEP
    const cepInput = document.getElementById('cep-endereco');
    // Pega o input de Endereço (que será preenchido)
    const enderecoInput = document.getElementById('endereco'); // ID do Endereço alterado
    
    // Limpa o campo de endereço enquanto aguarda a busca
    enderecoInput.value = 'Buscando...'; 

    // Remove qualquer caractere não numérico do CEP para a busca
    const cep = cepInput.value.replace(/\D/g, ''); 

    // Verifica se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        enderecoInput.value = '';
        alert('CEP inválido! Verifique o formato e tente novamente.');
        return;
    }

    // URL da API ViaCEP
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                enderecoInput.value = '';
                alert('CEP não encontrado. Digite o endereço manualmente.');
                return;
            }

            // Constrói o endereço completo e preenche o campo
            const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            
            enderecoInput.value = enderecoCompleto;

        })
        .catch(error => {
            console.error('Erro ao buscar CEP:', error);
            enderecoInput.value = '';
            alert('Erro na comunicação com a API de CEP.');
        });
});
      break;

    case "Instalação de TV/suporte":
      campoAdicional.innerHTML = `
   <div class="form-group">
  <label for="polegadas-tv">Polegadas da TV</label>
  <select id="polegadas-tv" class="input" required>
    <option value="" disabled selected>Selecione as polegadas</option>
    <option value="32">32 Polegadas</option>
    <option value="40">40 Polegadas</option>
    <option value="43">43 Polegadas</option>
    <option value="50">50 Polegadas</option>
    <option value="55">55 Polegadas</option>
    <option value="58">58 Polegadas</option>
    <option value="60">60 Polegadas</option>
    <option value="65">65 Polegadas</option>
    <option value="70">70 Polegadas</option>
    <option value="75">75 Polegadas</option>
    <option value="80">80 Polegadas</option>
    <option value="85">85 Polegadas</option>
    <option value="90">90 Polegadas</option>
    <option value="95">95 Polegadas</option>
    <option value="100">100 Polegadas (Máximo)</option>
  </select>
</div>
     <div class="form-group">
  <label for="tipo-parede">Tipo de Parede</label>
  <select id="tipo-parede" class="input" required>
    <option value="" disabled selected>Selecione o material da parede</option>
    <option value="alvenaria_concreto">Alvenaria (Tijolo ou Bloco)</option>
    <option value="concreto">Concreto Armado</option>
    <option value="drywall">Drywall (Gesso acartonado)</option>
    <option value="madeira_painel">Madeira ou Painel de MDF</option>
    <option value="outros">Outro material / Não tenho certeza</option>
  </select>
</div>
        <div class="form-group">
  <label for="altura-tv">Altura Aproximada (do centro da TV ao chão)</label>
  <select id="altura-tv" class="input" required>
    <option value="" disabled selected>Selecione a altura</option>
    <option value="1.0">1.0 metro (Ideal para quarto/baixa)</option>
    <option value="1.1">1.1 metro</option>
    <option value="1.2">1.2 metros</option>
    <option value="1.3">1.3 metros</option>
    <option value="1.4">1.4 metros</option>
    <option value="1.5">1.5 metros (Altura comum para sala)</option>
    <option value="1.6">1.6 metros</option>
    <option value="1.7">1.7 metros</option>
    <option value="1.8">1.8 metros</option>
    <option value="1.9">1.9 metros</option>
    <option value="2.0">2.0 metros (Ideal para painéis altos)</option>
    <option value="2.2">2.2 metros</option>
    <option value="2.4">2.4 metros</option>
    <option value="2.6">2.6 metros</option>
    <option value="2.8">2.8 metros</option>
    <option value="3.0">3.0 metros (Máximo, ideal para áreas gourmet)</option>
  </select>
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
          <label for="cep-endereco">CEP</label>
          <input type="text" id="cep-endereco" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
        </div>
      <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
        
        <div class="form-group">
          <label for="endereco">Endereço do Serviço</label>
          <input type="text" id="endereco" class="input" required />
        </div>
      `;
        // Máscara para o CEP (xxxxx-xxx)
// Aplica a máscara de formatação enquanto o usuário digita
document.getElementById('cep-endereco').addEventListener('input', function(e) {
  let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
  if (cep.length <= 5) {
    cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  } else {
    cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  e.target.value = cep;
});

// Função para buscar o CEP na API ViaCEP
document.getElementById('verificar-cep').addEventListener('click', function() {
    // Pega o valor do input de CEP
    const cepInput = document.getElementById('cep-endereco');
    // Pega o input de Endereço (que será preenchido)
    const enderecoInput = document.getElementById('endereco'); // ID do Endereço alterado
    
    // Limpa o campo de endereço enquanto aguarda a busca
    enderecoInput.value = 'Buscando...'; 

    // Remove qualquer caractere não numérico do CEP para a busca
    const cep = cepInput.value.replace(/\D/g, ''); 

    // Verifica se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        enderecoInput.value = '';
        alert('CEP inválido! Verifique o formato e tente novamente.');
        return;
    }

    // URL da API ViaCEP
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                enderecoInput.value = '';
                alert('CEP não encontrado. Digite o endereço manualmente.');
                return;
            }

            // Constrói o endereço completo e preenche o campo
            const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            
            enderecoInput.value = enderecoCompleto;

        })
        .catch(error => {
            console.error('Erro ao buscar CEP:', error);
            enderecoInput.value = '';
            alert('Erro na comunicação com a API de CEP.');
        });
});
      break;

    case "Limpeza residencial":
      campoAdicional.innerHTML = `
<div class="form-group">
  <label for="tipo-limpeza">Tipo de Limpeza</label>
  <select id="tipo-limpeza" class="input" required>
    <option value="" disabled selected>Selecione o tipo de limpeza</option>
    <option value="limpeza_residencial_geral">Limpeza Residencial Geral (Padrão)</option>
    <option value="limpeza_pesada">Limpeza Pesada (Acúmulo, Mudança)</option>
    <option value="limpeza_pos_obra">Limpeza Pós-Obra/Reforma</option>
    <option value="limpeza_de_tapetes">Limpeza/Higienização de Estofados e Tapetes</option>
    <option value="limpeza_condominio">Limpeza de Áreas Comuns de Condomínio</option>
    <option value="outros">Outros Tipos de Limpeza</option>
  </select>
</div>
<div class="form-group">
  <label for="metragem">Metragem (m²)</label>
  <select id="metragem" class="input" required>
    <option value="" disabled selected>Selecione a metragem em m²</option>
    <option value="10">Até 10 m²</option>
    <option value="20">20 m²</option>
    <option value="30">30 m²</option>
    <option value="40">40 m²</option>
    <option value="50">50 m²</option>
    <option value="60">60 m²</option>
    <option value="70">70 m²</option>
    <option value="80">80 m²</option>
    <option value="90">90 m²</option>
    <option value="100">100 m²</option>
    <option value="120">120 m²</option>
    <option value="140">140 m²</option>
    <option value="160">160 m²</option>
    <option value="180">180 m²</option>
    <option value="200">200 m²</option>
    <option value="250">250 m²</option>
    <option value="300">300 m² (Máximo)</option>
  </select>
</div>
        <div class="form-group">
  <label for="quartos">Quartos</label>
  <select id="quartos" class="input" required>
    <option value="1">1 Quarto</option>
    <option value="2">2 Quartos</option>
    <option value="3">3 Quartos</option>
    <option value="4">4 Quartos</option>
    <option value="5">5 Quartos</option>
    <option value="6">6 Quartos</option>
    <option value="7">7 Quartos</option>
    <option value="8">8 Quartos</option>
    <option value="9">9 Quartos</option>
    <option value="10">10 Quartos (Máximo)</option>
  </select>
</div>
<div class="form-group">
  <label for="banheiros">Banheiros</label>
  <select id="banheiros" class="input" required>
    <option value="1">1 Banheiro</option>
    <option value="2">2 Banheiros</option>
    <option value="3">3 Banheiros</option>
    <option value="4">4 Banheiros</option>
    <option value="5">5 Banheiros</option>
    <option value="6">6 Banheiros</option>
    <option value="7">7 Banheiros</option>
    <option value="8">8 Banheiros</option>
    <option value="9">9 Banheiros</option>
    <option value="10">10 Banheiros (Máximo)</option>
  </select>
</div>
        <div class="form-group">
          <label for="materiais-disponiveis">Materiais Disponíveis</label>
          <select id="materiais-disponiveis" class="input" required>
            <option value="sim">Sim</option>
          </select>
        </div>
        <div class="form-group">
          <label for="periodicidade">Periodicidade</label>
          <select id="periodicidade" class="input" required>
            <option value="unico">Vez Única</option>
          </select>
        </div>
        
          <div class="form-group">
          <label for="cep-endereco">CEP</label>
          <input type="text" id="cep-endereco" class="input" placeholder="Ex: 12345-678" required maxlength="9" />
        </div>
      <button type="button" id="verificar-cep" class="botoes-modal">Verificar CEP</button>
        
        <div class="form-group">
          <label for="endereco">Endereço do Serviço</label>
          <input type="text" id="endereco" class="input" required />
        </div>
      `;
        // Máscara para o CEP (xxxxx-xxx)
// Aplica a máscara de formatação enquanto o usuário digita
document.getElementById('cep-endereco').addEventListener('input', function(e) {
  let cep = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
  if (cep.length <= 5) {
    cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  } else {
    cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  e.target.value = cep;
});

// Função para buscar o CEP na API ViaCEP
document.getElementById('verificar-cep').addEventListener('click', function() {
    // Pega o valor do input de CEP
    const cepInput = document.getElementById('cep-endereco');
    // Pega o input de Endereço (que será preenchido)
    const enderecoInput = document.getElementById('endereco'); // ID do Endereço alterado
    
    // Limpa o campo de endereço enquanto aguarda a busca
    enderecoInput.value = 'Buscando...'; 

    // Remove qualquer caractere não numérico do CEP para a busca
    const cep = cepInput.value.replace(/\D/g, ''); 

    // Verifica se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        enderecoInput.value = '';
        alert('CEP inválido! Verifique o formato e tente novamente.');
        return;
    }

    // URL da API ViaCEP
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                enderecoInput.value = '';
                alert('CEP não encontrado. Digite o endereço manualmente.');
                return;
            }

            // Constrói o endereço completo e preenche o campo
            const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            
            enderecoInput.value = enderecoCompleto;

        })
        .catch(error => {
            console.error('Erro ao buscar CEP:', error);
            enderecoInput.value = '';
            alert('Erro na comunicação com a API de CEP.');
        });
});
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
