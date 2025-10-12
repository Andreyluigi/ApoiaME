import { auth, db } from './firebase-init.js'; // Importa as instâncias do Firebase
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- LÓGICA PRINCIPAL ---

// Roda o código quando a estrutura da página estiver pronta
document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica para alternar entre as abas (Meus Dados / Senha) ---
    const tabs = document.querySelectorAll('.tabs .tab');
    const sections = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove a classe 'active' de todos
            tabs.forEach(item => item.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Adiciona a classe 'active' apenas no clicado e na sua seção correspondente
            tab.classList.add('active');
            const targetSection = document.getElementById(tab.dataset.target);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // --- Autenticação e Carregamento de Dados ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Se o usuário está logado, carrega os dados dele no formulário
            loadUserData(user.uid);
        } else {
            // Se não está logado, redireciona para a página de login
            console.log("Usuário não autenticado. Redirecionando...");
            window.location.href = "login.html"; 
        }
    });
});

/**
 * Carrega os dados do usuário do Firestore e preenche o formulário 'Meus Dados'.
 * @param {string} uid - O ID do usuário logado.
 */
async function loadUserData(uid) {
    try {
        const userDocRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            // Preenche os campos do formulário com os dados do banco
            document.getElementById('user-nome').value = userData.nome || '';
            document.getElementById('user-nickname').value = userData.nickname || '';
            document.getElementById('user-telefone').value = userData.telefone || '';
            
            if (userData.genero) {
                const genderRadio = document.querySelector(`input[name="gender"][value="${userData.genero}"]`);
                if (genderRadio) genderRadio.checked = true;
            }
        } else {
            console.log("Documento do usuário não encontrado no Firestore.");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

// --- LISTENERS DOS FORMULÁRIOS ---

// Listener para o formulário "Meus Dados"
document.getElementById('dados-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página
    
    // Coleta os dados dos campos
    const nome = document.getElementById('user-nome').value.trim();
    const nickname = document.getElementById('user-nickname').value.trim();
    const telefone = document.getElementById('user-telefone').value.trim();
    const generoRadio = document.querySelector('input[name="gender"]:checked');
    const genero = generoRadio ? generoRadio.value : null;

    if (!nome) {
        alert("O campo 'Nome Completo' é obrigatório.");
        return;
    }

    const user = auth.currentUser;
    if (user) {
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            // Salva os dados no Firestore, mesclando com dados existentes
            await setDoc(userDocRef, { nome, nickname, telefone, genero }, { merge: true });
            alert("Dados salvos com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            alert("Erro ao salvar os dados. Tente novamente.");
        }
    }
});

// Listener para o formulário "Alterar Senha"
document.getElementById("senha-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const senhaAtual = document.getElementById("senha-atual").value;
    const novaSenha = document.getElementById("nova-senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (novaSenha !== confirmarSenha) {
        return alert("A nova senha e a confirmação não coincidem.");
    }
    if (novaSenha.length < 6) {
        return alert("A nova senha deve ter pelo menos 6 caracteres.");
    }

    const user = auth.currentUser;
    if (!user) return alert("Usuário não autenticado.");

    try {
        // A alteração de senha exige que o usuário se reautentique por segurança
        const credential = EmailAuthProvider.credential(user.email, senhaAtual);
        await reauthenticateWithCredential(user, credential);
        
        // Se a reautenticação for bem-sucedida, atualiza a senha
        await updatePassword(user, novaSenha);
        
        alert("Senha alterada com sucesso!");
        document.getElementById("senha-form").reset(); // Limpa os campos
    } catch (error) {
        console.error("Erro ao alterar a senha:", error);
        if (error.code === 'auth/wrong-password') {
            alert("A senha atual está incorreta.");
        } else {
            alert("Ocorreu um erro ao tentar alterar a senha.");
        }
    }
});