// Arquivo: js/login-auth.js (Versão Final Limpa)

import { auth } from "./firebase-init.js";
import { 
    createUserWithEmailAndPassword, 
    updateProfile, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, setDoc, doc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const db = getFirestore();

// --- Elementos do DOM ---
const container = document.getElementById('container-login');
const formCadastro = document.getElementById("form-cadastro");
const formLogin = document.getElementById("form-login");
const extraForm = document.getElementById("extra-form");
const finalForm = document.getElementById("final-form");
const btnSelectRole = document.getElementById("select-role");
const btnGoogleCadastro = document.getElementById("btn-google-cadastro");
const btnGoogleLogin = document.getElementById("btn-google-login");

let currentUid = null;
let tipoSelecionado = null;

// --- FUNÇÕES AUXILIARES ---
function transicaoParaEscolhaDePerfil(uid) {
    currentUid = uid;
    // Oculta os painéis de login/cadastro dentro do container principal
    if (container) {
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.display = 'none';
            extraForm.style.display = 'block';
        }, 400); // Espera a animação de fade-out
    }
}

function redirecionarParaDashboard(tipo) {
    const rotas = {
        cliente: "dashboardC.html",
        ajudante: "dashboardA.html",
    };
    window.location.href = rotas[tipo] || "dashboardC.html";
}

// --- LÓGICAS DE CADASTRO E LOGIN ---

// 1. CADASTRO COM E-MAIL E SENHA
formCadastro?.addEventListener("submit", async (e) => {
    e.preventDefault();
    // ... (seu código de validação e coleta de dados) ...
    try {
        // ... (seu código de createUserWithEmailAndPassword e setDoc) ...
        transicaoParaEscolhaDePerfil(cred.user.uid);
    } catch (err) {
        console.error("Erro no cadastro por e-mail:", err);
        alert("Erro no cadastro: " + err.message);
    }
});

// 2. LOGIN/CADASTRO COM GOOGLE
async function loginComGoogle() {
    // ... (seu código de login com Google que já está correto) ...
    try {
        // ...
        if (!userSnap.exists() || !userSnap.data().tipo) {
            // ... (código de setDoc para novo usuário) ...
            transicaoParaEscolhaDePerfil(user.uid);
        } else {
            redirecionarParaDashboard(userSnap.data().tipo);
        }
    } catch (error) {
        console.error("Erro no login com Google:", error);
    }
}

btnGoogleCadastro?.addEventListener('click', loginComGoogle);
btnGoogleLogin?.addEventListener('click', loginComGoogle);

// 3. LOGIN COM E-MAIL E SENHA
formLogin?.addEventListener("submit", async (e) => {
    // ... (seu código de login com e-mail que já está correto) ...
    try {
        // ...
        if (userDoc.exists() && userDoc.data().tipo) {
            redirecionarParaDashboard(userDoc.data().tipo);
        } else {
            transicaoParaEscolhaDePerfil(cred.user.uid);
        }
    } catch (err) {
        console.error("Erro no login por e-mail:", err);
    }
});

// --- LÓGICA DA TELA DE ESCOLHA DE PERFIL ---

document.getElementById("categoria-pessoa")?.addEventListener("change", () => {
    const categoria = document.getElementById("categoria-pessoa").value;
    const cpfGroup = document.getElementById("cpf-group");
    const cnpjGroup = document.getElementById("cnpj-group");

    cpfGroup.style.display = (categoria === "pf") ? "block" : "none";
    cnpjGroup.style.display = (categoria === "pj") ? "block" : "none";
});

document.querySelectorAll(".card-option").forEach(card => {
    card.addEventListener("click", () => {
        document.querySelectorAll(".card-option").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        tipoSelecionado = card.dataset.role;
        const btnSelectRole = document.getElementById("select-role");
        if (btnSelectRole) btnSelectRole.disabled = false;
    });
});

document.getElementById("select-role")?.addEventListener("click", async () => {
    if (!currentUid || !tipoSelecionado) {
        return alert("Por favor, selecione um tipo de conta.");
    }
    try {
        await setDoc(doc(db, "usuarios", currentUid), { tipo: tipoSelecionado }, { merge: true });
        extraForm.style.display = "none";
        finalForm.style.display = "block";
        setTimeout(() => {
            redirecionarParaDashboard(tipoSelecionado);
        }, 1200);
    } catch (err) {
        console.error("Erro ao salvar o tipo de conta:", err);
        alert("Erro ao finalizar o cadastro: " + err.message);
    }
});