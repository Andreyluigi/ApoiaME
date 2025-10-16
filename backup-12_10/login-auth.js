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

// --- Funções Auxiliares ---

function transicaoParaEscolhaDePerfil(uid) {
    currentUid = uid;
    if (container) {
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.display = 'none';
            extraForm.style.display = 'block';
            extraForm.scrollIntoView({ behavior: 'smooth' });
        }, 400);
    }
}

function redirecionarParaDashboard(tipo) {
    const rotas = {
        cliente: "dashboardC.html",
        ajudante: "dashboardA.html",
    };
    window.location.href = rotas[tipo] || "dashboardC.html";
}

// --- Lógicas de Cadastro e Login ---

// 1. CADASTRO COM E-MAIL E SENHA
formCadastro?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome-cadastro").value.trim();
    const email = document.getElementById("email-cadastro").value.trim();
    const senha = document.getElementById("senha-cadastro").value;
    const senhaRepetir = document.getElementById("senha-repetir").value;
    const categoria = document.getElementById("categoria-pessoa").value;
    const cpf = document.getElementById("cpf-cadastro").value.trim();
    const cnpj = document.getElementById("cnpj-cadastro").value.trim();

    if (senha !== senhaRepetir) return alert("As senhas não conferem.");
    if (!formCadastro.checkValidity()) {
        formCadastro.classList.add("was-validated");
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(cred.user, { displayName: nome });
        
        await setDoc(doc(db, "usuarios", cred.user.uid), {
            nome, email, status: "ativo", criadoEm: serverTimestamp(),
            tipoPessoa: categoria,
            cpf: categoria === 'pf' ? cpf : null,
            cnpj: categoria === 'pj' ? cnpj : null,
        });

        transicaoParaEscolhaDePerfil(cred.user.uid);
    } catch (err) {
        console.error("Erro no cadastro por e-mail:", err);
        alert("Erro no cadastro: " + err.message);
    }
});

// 2. LOGIN/CADASTRO COM GOOGLE
async function loginComGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().tipo) {
            await setDoc(userRef, {
                nome: user.displayName,
                email: user.email,
                fotoUrl: user.photoURL,
                criadoEm: serverTimestamp()
            }, { merge: true });
            
            transicaoParaEscolhaDePerfil(user.uid);
        } else {
            redirecionarParaDashboard(userSnap.data().tipo);
        }
    } catch (error) {
        console.error("Erro no login com Google:", error);
        alert("Ocorreu um erro ao tentar fazer login com o Google.");
    }
}

btnGoogleCadastro?.addEventListener('click', loginComGoogle);
btnGoogleLogin?.addEventListener('click', loginComGoogle);

// 3. LOGIN COM E-MAIL E SENHA
formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email-login").value.trim();
    const senha = document.getElementById("senha-login").value.trim();

    if (!formLogin.checkValidity()) { 
        formLogin.classList.add("was-validated");
        return;
    }
    try {
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
        
        if (userDoc.exists() && userDoc.data().tipo) {
            redirecionarParaDashboard(userDoc.data().tipo);
        } else {
            transicaoParaEscolhaDePerfil(cred.user.uid);
        }
    } catch (err) {
        console.error("Erro no login por e-mail:", err);
        alert("E-mail ou senha incorretos.");
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