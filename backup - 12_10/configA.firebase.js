
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Lógica para alternar entre as abas (Meus Dados / Senha)
    const tabs = document.querySelectorAll('.tabs .tab');
    const sections = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            tab.classList.add('active');
            const targetSection = document.getElementById(tab.dataset.target);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserData(user.uid); // Renomeado para um nome mais genérico
        } else {
            window.location.href = "login.html";
        }
    });
});

/**
 * Carrega os dados do usuário do Firestore e preenche o formulário.
 */
async function loadUserData(uid) {
    try {
        // ========================================================
        // --- CORREÇÃO PRINCIPAL AQUI ---
        // Buscando na coleção correta: 'usuarios'
        const userDocRef = doc(db, "usuarios", uid);
        // ========================================================
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            document.getElementById('user-nome').value = userData.nome || '';
            document.getElementById('user-nickname').value = userData.nickname || '';
            document.getElementById('user-telefone').value = userData.telefone || '';
        } else {
            console.log("Documento do usuário não encontrado no Firestore.");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

// Listener para o formulário "Meus Dados"
document.getElementById('dados-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dados = {
        nome: document.getElementById('user-nome').value.trim(),
        nickname: document.getElementById('user-nickname').value.trim(),
        telefone: document.getElementById('user-telefone').value.trim(),
    };

    const user = auth.currentUser;
    if (user) {
        try {
            // ========================================================
            // --- CORREÇÃO PRINCIPAL AQUI ---
            // Salvando na coleção correta: 'usuarios'
            const userDocRef = doc(db, "usuarios", user.uid);
            // ========================================================
            await setDoc(userDocRef, dados, { merge: true });
            alert("Dados salvos com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            alert("Erro ao salvar os dados.");
        }
    }
});

// Listener para o formulário "Alterar Senha"
document.getElementById("senha-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    // ... (esta função já estava correta e continua a mesma) ...
    const senhaAtual = document.getElementById("senha-atual").value;
    const novaSenha = document.getElementById("nova-senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (novaSenha !== confirmarSenha) return alert("As senhas não coincidem.");
    if (novaSenha.length < 6) return alert("A nova senha precisa ter no mínimo 6 caracteres.");

    const user = auth.currentUser;
    if (!user) return alert("Usuário não autenticado.");

    try {
        const credential = EmailAuthProvider.credential(user.email, senhaAtual);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, novaSenha);
        alert("Senha alterada com sucesso!");
        document.getElementById("senha-form").reset();
    } catch (error) {
        console.error("Erro ao alterar a senha:", error);
        alert(error.code === 'auth/wrong-password' ? "A senha atual está incorreta." : "Ocorreu um erro ao alterar a senha.");
    }
});