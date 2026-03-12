// Arquivo: js/admin.js
// Lógica do Painel de Administração

// 1. IMPORTAÇÕES
import { auth, db } from "./firebase-init.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================================
// !! CONFIGURAÇÃO DE SEGURANÇA CRÍTICA !!
// ==========================================================
// Para o MVP, coloque aqui o UID do seu usuário administrador.
// Você pode pegar seu UID no painel do Firebase Authentication.
// TODOS OS OUTROS USUÁRIOS SERÃO BLOQUEADOS.
const ADMIN_UID = "w3odxYeRV4aF2U2DzqWBZMWKihx2"; 
// ==========================================================


// --- Elementos do DOM ---
const loginForm = document.getElementById('form-login-admin');
const loginArea = document.getElementById('admin-login');
const painelArea = document.getElementById('admin-painel');
const loadingSpinner = document.getElementById('loading-spinner');
const listaPendentes = document.getElementById('lista-pendentes');
const msgNenhumPendente = document.getElementById('msg-nenhum-pendente');
const loginError = document.getElementById('login-error');
const modalElement = document.getElementById('modal-detalhes');
const modal = new bootstrap.Modal(modalElement);

// --- 1. CONTROLE DE AUTENTICAÇÃO (GATEKEEPER) ---

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado. Ele é o admin?
        if (user.uid === ADMIN_UID) {
            // SIM, é o admin.
            loginArea.style.display = 'none';
            painelArea.style.display = 'block';
            carregarFornecedoresPendentes();
        } else {
            // NÃO, é um usuário comum.
            alert("Acesso não autorizado.");
            signOut(auth);
            loginArea.style.display = 'block';
            painelArea.style.display = 'none';
        }
    } else {
        // Usuário não está logado.
        loginArea.style.display = 'block';
        painelArea.style.display = 'none';
    }
});

// --- 2. LÓGICA DE LOGIN DO ADMIN ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    
    const email = document.getElementById('admin-email').value;
    const senha = document.getElementById('admin-senha').value;

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // O onAuthStateChanged vai cuidar do redirecionamento
    } catch (error) {
        console.error("Erro de login admin:", error);
        loginError.textContent = "E-mail ou senha incorretos.";
        loginError.style.display = 'block';
    }
});

// --- 3. LÓGICA DE CARREGAMENTO DOS DADOS ---

async function carregarFornecedoresPendentes() {
    loadingSpinner.style.display = 'block';
    listaPendentes.innerHTML = '';
    msgNenhumPendente.style.display = 'none';

    try {
        // 1. Busca no Firestore por usuários do tipo 'fornecedor' E status 'pendente'
        const q = query(
            collection(db, "usuarios"), 
            where("tipo", "==", "fornecedor"), 
            where("status", "==", "pendente")
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            msgNenhumPendente.style.display = 'block';
        } else {
            querySnapshot.forEach((doc) => {
                const fornecedor = doc.data();
                fornecedor.id = doc.id; // Anexa o UID ao objeto
                
                // Cria o item na lista
                const item = document.createElement('li');
                item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                item.style.cursor = 'pointer';
                item.innerHTML = `
                    <div>
                        <h6 class="mb-0">${fornecedor.nome}</h6>
                        <small class="text-muted">${fornecedor.email}</small>
                    </div>
                    <span class="badge bg-warning text-dark">Pendente</span>
                `;
                
                // Adiciona o evento de clique para abrir o modal
                item.addEventListener('click', () => {
                    abrirModal(fornecedor);
                });
                
                listaPendentes.appendChild(item);
            });
        }

    } catch (error) {
        console.error("Erro ao buscar fornecedores:", error);
        alert("Erro ao carregar dados: " + error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// --- 4. LÓGICA DO MODAL (EXIBIÇÃO E AÇÕES) ---

function abrirModal(fornecedor) {
    // Preenche os dados básicos
    document.getElementById('modal-nome').textContent = fornecedor.nome;
    document.getElementById('modal-email').textContent = fornecedor.email;
    document.getElementById('modal-cpf').textContent = fornecedor.cpf;
    document.getElementById('modal-nasc').textContent = fornecedor.dataNascimento;
    document.getElementById('modal-tel').textContent = fornecedor.telefone;

    // Preenche o endereço
    const end = fornecedor.enderecoAtuacao;
    document.getElementById('modal-endereco').textContent = 
        `${end.rua || ''}, ${end.numero || ''} - ${end.bairro || ''}, ${end.cidade || ''} - ${end.estado || ''}`;
    document.getElementById('modal-raio').textContent = fornecedor.raioAtuacao_km;

    // Preenche as áreas de atuação
    const areasContainer = document.getElementById('modal-areas');
    areasContainer.innerHTML = ''; // Limpa antes de adicionar
    fornecedor.areasAtuacao.forEach(area => {
        const badge = document.createElement('li');
        badge.className = 'badge bg-secondary';
        badge.textContent = area;
        areasContainer.appendChild(badge);
    });

    // Preenche as imagens e links
    const docs = fornecedor.arquivosVerificacao;
    
    // Foto de Perfil
    document.getElementById('img-foto').src = fornecedor.fotoURL || 'img/avatar-placeholder.png';
    document.getElementById('link-foto').href = fornecedor.fotoURL || '#';
    
    // Selfie
    document.getElementById('img-selfie').src = docs.selfie || 'img/avatar-placeholder.png';
    document.getElementById('link-selfie').href = docs.selfie || '#';
    
    // Frente
    document.getElementById('img-doc-frente').src = docs.docFrente || 'img/avatar-placeholder.png';
    document.getElementById('link-doc-frente').href = docs.docFrente || '#';
    
    // Verso
    document.getElementById('img-doc-verso').src = docs.docVerso || 'img/avatar-placeholder.png';
    document.getElementById('link-doc-verso').href = docs.docVerso || '#';
    
    // Antecedentes (só link, pois pode ser PDF)
    document.getElementById('link-antecedentes').href = docs.antecedentes || '#';

    // Configura os botões de ação
    const btnAprovar = document.getElementById('btn-aprovar');
    const btnReprovar = document.getElementById('btn-reprovar');

    // Remove listeners antigos para evitar cliques duplos
    btnAprovar.replaceWith(btnAprovar.cloneNode(true));
    btnReprovar.replaceWith(btnReprovar.cloneNode(true));
    
    // Adiciona novos listeners
    document.getElementById('btn-aprovar').addEventListener('click', async () => {
        if (confirm(`Tem certeza que deseja APROVAR o cadastro de ${fornecedor.nome}?`)) {
            await atualizarStatus(fornecedor.id, "ativo");
        }
    });

    document.getElementById('btn-reprovar').addEventListener('click', async () => {
        if (confirm(`Tem certeza que deseja REPROVAR o cadastro de ${fornecedor.nome}?`)) {
            await atualizarStatus(fornecedor.id, "reprovado");
        }
    });

    // Abre o modal
    modal.show();
}

async function atualizarStatus(uid, novoStatus) {
    const btnAprovar = document.getElementById('btn-aprovar');
    const btnReprovar = document.getElementById('btn-reprovar');
    btnAprovar.disabled = true;
    btnReprovar.disabled = true;

    try {
        const userRef = doc(db, "usuarios", uid);
        await updateDoc(userRef, {
            status: novoStatus
        });
        
        alert(`Fornecedor ${novoStatus} com sucesso!`);
        modal.hide();
        carregarFornecedoresPendentes(); // Recarrega a lista

    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar status: " + error.message);
    } finally {
        btnAprovar.disabled = false;
        btnReprovar.disabled = false;
    }
}