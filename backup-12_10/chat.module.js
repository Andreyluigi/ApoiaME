import { db, auth } from './firebase-init.js';
import { doc, getDoc, getDocs, collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

let pedidoIdAtual = null;
let unsubscribeChat = null;
let modal = null;

function injetarHTMLdoModal() {
    if (document.getElementById('chat-modal')) return;

    const modalHTML = `
        <div id="chat-modal" class="chat-modal">
            <div class="chat-container">
                <header class="chat-header">
                    <h3>Chat do Pedido</h3>
                    <button id="fechar-chat-btn" class="fechar-btn"><i data-lucide="x"></i></button>
                </header>
                <main class="chat-mensagens" id="chat-mensagens-lista"></main>
                <footer class="chat-input-area">
                    <textarea id="chat-input-texto" placeholder="Digite sua mensagem..." rows="1"></textarea>
                    <button id="enviar-chat-btn" class="enviar-btn"><i data-lucide="send"></i></button>
                </footer>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lucide.createIcons();
}

async function enviarMensagem() {
    const inputMsg = document.getElementById('chat-input-texto');
    const texto = inputMsg.value.trim();
    if (texto === '' || !pedidoIdAtual) return;

    const mensagensRef = collection(db, "pedidos", pedidoIdAtual, "mensagens");
    try {
        await addDoc(mensagensRef, {
            texto: texto,
            remetenteId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });
        inputMsg.value = '';
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        alert("Não foi possível enviar a mensagem.");
    }
}

function renderizarMensagens(mensagens) {
    const listaMsg = document.getElementById('chat-mensagens-lista');
    if (!listaMsg) return;
    listaMsg.innerHTML = '';
    mensagens.forEach(msg => {
        const minha = msg.remetenteId === auth.currentUser.uid;
        const bolha = document.createElement('div');
        bolha.className = `msg-bolha ${minha ? 'minha' : 'deles'}`;
        bolha.textContent = msg.texto;
        listaMsg.appendChild(bolha);
    });
    listaMsg.scrollTop = listaMsg.scrollHeight;
}

function carregarMensagens(pedidoId) {
    pedidoIdAtual = pedidoId;
    if (unsubscribeChat) unsubscribeChat();

    const mensagensRef = collection(db, "pedidos", pedidoId, "mensagens");
    const q = query(mensagensRef, orderBy("timestamp"));

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        const mensagens = snapshot.docs.map(doc => doc.data());
        renderizarMensagens(mensagens);
    }, (error) => {
        console.error("Erro ao carregar mensagens do chat:", error);
    });
}

async function encontrarPedidoAtivo(tipoUsuario) {
    const userId = auth.currentUser.uid;
    if (tipoUsuario === 'cliente') {
        const userRef = doc(db, 'usuarios', userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? userSnap.data().pedidoAtivo : null;
    } 
    if (tipoUsuario === 'ajudante') {
        const pedidosRef = collection(db, 'pedidos');
        const statusAtivosParaChat = ['aceito', 'pago_aguardando_inicio', 'em_rota', 'no_local', 'em_execucao', 'concluido_prestador'];
        const q = query(pedidosRef, where('ajudanteUid', '==', userId), where('status', 'in', statusAtivosParaChat), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty ? null : querySnapshot.docs[0].id;
    }
    return null;
}

export function inicializarChat(tipoUsuario) {
    injetarHTMLdoModal();

    modal = document.getElementById('chat-modal');
    const chatLink = document.getElementById('abrir-chat-btn');
    
    if (!chatLink || !modal) return;

    const fecharBtn = document.getElementById('fechar-chat-btn');
    const enviarBtn = document.getElementById('enviar-chat-btn');
    const inputMsg = document.getElementById('chat-input-texto');

    chatLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const pedidoId = await encontrarPedidoAtivo(tipoUsuario);
            if (pedidoId) {
                modal.classList.add('visivel');
                carregarMensagens(pedidoId);
            } else {
                alert("Nenhum pedido ativo encontrado para iniciar um chat.");
            }
        } catch (error) {
            console.error("Erro ao buscar o pedido ativo:", error);
            alert("Ocorreu um erro ao buscar seu pedido ativo.");
        }
    });

    fecharBtn.onclick = () => modal.classList.remove('visivel');
    enviarBtn.onclick = enviarMensagem;
    inputMsg.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensagem();
        }
    };
}