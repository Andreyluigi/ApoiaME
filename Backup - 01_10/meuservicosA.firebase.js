// ================== meuservicosA.firebase.js ==================
// Firebase
import { db } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {
  collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// DOM refs
const listaServicosEl = document.getElementById('lista-servicos');
const btnExcluirSelecionados = document.getElementById('btn-excluir-selec');
const servicosSelecionados = new Set();

let usuarioLogadoUid = null;
let anuncioSelecionadoId = null;
let acaoDestaque = "adicionar"; // "adicionar" | "remover"

// Modal de destaque (cria se não existir)
let modal = document.getElementById('destaque-modal');
if (!modal) {
  modal = document.createElement('div');
  modal.id = 'destaque-modal';
  modal.className = 'modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal-content">
      <p></p>
      <button id="confirmar-destaque">Sim</button>
      <button id="cancelar-destaque">Cancelar</button>
    </div>`;
  document.body.appendChild(modal);
}
const btnConfirm = modal.querySelector('#confirmar-destaque');
const btnCancel  = modal.querySelector('#cancelar-destaque');

function abrirModal(id) {
  anuncioSelecionadoId = id;
  const p = modal.querySelector('p');
  p.textContent = acaoDestaque === "adicionar"
    ? "Deseja destacar este anúncio? Será aplicada taxa adicional de 3,99%."
    : "Deseja remover o destaque deste anúncio?";
  modal.hidden = false;
  modal.classList.add('show');
}
function fecharModal() {
  anuncioSelecionadoId = null;
  modal.classList.remove('show');
  modal.hidden = true;
}

// Auth
onAuthStateChanged(getAuth(), async (user) => {
  if (user) {
    usuarioLogadoUid = user.uid;
    carregarServicos(user.uid);
  }
});

// Carregar serviços do usuário
async function carregarServicos(uid) {
  try {
    const servicosRef = collection(db, 'anuncios');
    const q = query(servicosRef, where('prestadorUid', '==', uid));
    const querySnapshot = await getDocs(q);

    listaServicosEl.innerHTML = '';

    const estadoVazioEl = document.getElementById('estado-vazio');
    const btnAnunciarEl = document.getElementById('btn-anunciar');
    const contPublicadoEl = document.getElementById('cont-publicado');

    let countPublicado = 0;

    if (querySnapshot.empty) {
      if (estadoVazioEl) estadoVazioEl.style.display = 'block';
      if (btnAnunciarEl) btnAnunciarEl.style.display = 'inline-block';
    } else {
      if (estadoVazioEl) estadoVazioEl.style.display = 'none';
      if (btnAnunciarEl) btnAnunciarEl.style.display = 'none';

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const frag = document.importNode(document.getElementById('tpl-card').content, true);
        const card = frag.querySelector('.card');
        card.dataset.id = docSnap.id;

        // Atualizado em
        const atualizado = data.atualizadoEm instanceof Timestamp
          ? new Date(data.atualizadoEm.seconds * 1000)
          : new Date();
        card.querySelector('.atualizado').textContent = `Atualizado: ${atualizado.toLocaleDateString()}`;

        // Info
        card.querySelector('.thumb').src = data.fotos?.[0] || '../arquivos/default.jpg';
        card.querySelector('.titulo').textContent = data.titulo || '';
        card.querySelector('.preco').textContent =
          (Number(data.precoBase) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        card.querySelector('.categoria').textContent = data.categoria || '';
        card.querySelector('.local').textContent = data.regiao || '';

        // Badge destaque e estado do botão
        const btnDestaque = card.querySelector('.btn-destaque');
        const badges = card.querySelector('.badges');
        if (data.destaque) {
          const b = document.createElement('span');
          b.className = 'badge destaque';
          b.textContent = 'Destaque';
          badges.appendChild(b);
          if (btnDestaque) {
            btnDestaque.textContent = 'Remover destaque';
            btnDestaque.classList.add('btn-remover-destaque');
          }
        } else {
          if (btnDestaque) {
            btnDestaque.textContent = 'Destacar';
            btnDestaque.classList.remove('btn-remover-destaque');
          }
        }

        // Contador
        if (data.status === 'publicado') countPublicado++;

        // Excluir
        const btnExcluir = card.querySelector('.btn-excluir');
        btnExcluir.addEventListener('click', () => excluirServico(docSnap.id));

        // Ver mais
        const btnVerMais = card.querySelector('.ver-mais');
        btnVerMais.addEventListener('click', () => {
          window.location.href = `anuncioD.html?id=${docSnap.id}`;
        });

        // Seleção em massa
        const chk = card.querySelector('.chk');
        chk.addEventListener('change', (e) => {
          if (e.target.checked) servicosSelecionados.add(docSnap.id);
          else servicosSelecionados.delete(docSnap.id);
          if (btnExcluirSelecionados) btnExcluirSelecionados.disabled = servicosSelecionados.size === 0;
        });

        // Botão Destacar / Remover destaque → abre modal com ação
        if (btnDestaque) {
          btnDestaque.addEventListener('click', () => {
            acaoDestaque = btnDestaque.classList.contains('btn-remover-destaque') ? "remover" : "adicionar";
            abrirModal(docSnap.id);
          });
        }

        listaServicosEl.appendChild(frag);
      });
    }

    if (contPublicadoEl) contPublicadoEl.textContent = countPublicado;
  } catch (error) {
    console.error('Erro ao carregar os serviços:', error);
  }
}

// Excluir serviço individual
async function excluirServico(id) {
  try {
    const servicoRef = doc(db, 'anuncios', id);
    await deleteDoc(servicoRef);
    alert('Serviço excluído com sucesso!');
    carregarServicos(usuarioLogadoUid);
  } catch (error) {
    console.error('Erro ao excluir o serviço:', error);
  }
}

// Confirmar ação de destaque (toggle)
btnConfirm.addEventListener('click', async () => {
  if (!anuncioSelecionadoId) return;
  const valor = acaoDestaque === "adicionar";
  try {
    await updateDoc(doc(db, 'anuncios', anuncioSelecionadoId), {
      destaque: valor,
      atualizadoEm: serverTimestamp()
    });

    // Atualiza UI do card
    const card = listaServicosEl.querySelector(`.card[data-id="${anuncioSelecionadoId}"]`);
    if (card) {
      const badges = card.querySelector('.badges');
      const btn = card.querySelector('.btn-destaque');

      if (valor) {
        if (badges && !badges.querySelector('.badge.destaque')) {
          const b = document.createElement('span');
          b.className = 'badge destaque';
          b.textContent = 'Destaque';
          badges.appendChild(b);
        }
        if (btn) { btn.textContent = 'Remover destaque'; btn.classList.add('btn-remover-destaque'); }
      } else {
        if (badges) {
          const b = badges.querySelector('.badge.destaque');
          if (b) b.remove();
        }
        if (btn) { btn.textContent = 'Destacar'; btn.classList.remove('btn-remover-destaque'); }
      }
    }
  } catch (err) {
    console.error(err);
    alert('Falha ao atualizar destaque.');
  } finally {
    fecharModal();
  }
});

btnCancel.addEventListener('click', fecharModal);
modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });
