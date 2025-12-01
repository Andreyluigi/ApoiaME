// Arquivo: js/login-auth.js
// Responsável pela lógica de AUTENTICAÇÃO e verificação de perfil no Login.
// ESTE ARQUIVO É UM MÓDULO.

// 1. IMPORTAÇÕES
// Importa os serviços do seu arquivo de inicialização (ex: firebase-init.js)
import { auth, db } from "./firebase-init.js";

// Importa as funções específicas que vamos usar
import { 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    getDoc, 
    doc,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// 2. FUNÇÕES AUXILIARES

/**
 * Verifica o documento do usuário no Firestore e redireciona.
 * Se o usuário não tiver um 'tipo' definido (ex: login Google incompleto),
 * ele é enviado para o cadastro para escolher o perfil.
 * Se for 'fornecedor' e estiver 'pendente', ele é avisado.
 */
async function redirecionarUsuario(uid) {
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().tipo) {
        const userData = userSnap.data();
        const tipo = userData.tipo;

        // REGRA DE NEGÓCIO CRUCIAL: Checagem do status do Fornecedor
        if (tipo === 'fornecedor' && userData.status === 'pendente') {
            await auth.signOut(); 
            window.location.href = "em-analise.html"; // Redireciona para a página de "em análise"
            return; 
        }

        // ==========================================================
        // NOVA LÓGICA DE REDIRECIONAMENTO POR TIPO
        // ==========================================================
        if (tipo === 'cliente') {
            window.location.href = "dashboardC.html";
        } else if (tipo === 'fornecedor') {
            window.location.href = "dashboardA.html";
        } else if (tipo === 'admin') {
            window.location.href = "admin.html";
        } else {
            // Fallback
            alert("Tipo de usuário desconhecido. Indo para o cadastro.");
            window.location.href = "cadastro.html";
        }
        // ==========================================================
        
    } else {
        // Usuário autenticado mas sem 'tipo' (ex: login Google incompleto)
        alert("Parece que seu cadastro está incompleto. Vamos finalizá-lo.");
        window.location.href = "cadastro.html"; 
    }
}

// 3. LISTENERS DOS FORMULÁRIOS

// --- LOGIN COM E-MAIL E SENHA ---
const formLogin = document.getElementById('form-login');

formLogin?.addEventListener("submit", async (e) => {
    // O e.preventDefault() já está no login.js (UI)
    // A validação de checkValidity() também
    
    if (!formLogin.checkValidity()) {
        return;
    }

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value.trim();
    
    // Adicionar um spinner/loading no botão
    const btnSubmit = formLogin.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';

    try {
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        // Se o login for sucesso, o resto da mágica acontece no redirecionarUsuario
        await redirecionarUsuario(cred.user.uid);
    } catch (err) {
        console.error("Erro no login por e-mail:", err.code);
        
        let msgErro = "Ocorreu um erro. Tente novamente.";
        // Códigos de erro comuns do Firebase Auth
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-email') {
            msgErro = "E-mail ou senha incorretos.";
        }
        
        alert(msgErro);
        
        // Restaura o botão
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Entrar';
    }
});


// --- LOGIN/CADASTRO COM GOOGLE ---
// (Usamos querySelector para o caso de você ter o mesmo botão em cadastro.html)
const btnGoogleLogin = document.querySelector('.btn-google'); 

btnGoogleLogin?.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().tipo) {
            // Se é a primeira vez ou não tem 'tipo', salva os dados básicos
            // (fotoFile é opcional, então salvamos a do Google)
            await setDoc(userRef, {
                nome: user.displayName,
                email: user.email,
                fotoURL: user.photoURL,
                criadoEm: serverTimestamp()
            }, { merge: true });
            
            // Envia para o cadastro para escolher o perfil (Cliente/Fornecedor)
            window.location.href = "cadastro.html";
        } else {
            // Se já existe e tem 'tipo', tenta o redirecionamento padrão
            await redirecionarUsuario(user.uid);
        }
    } catch (error) {
        console.error("Erro no login com Google:", error);
        alert("Ocorreu um erro ao tentar fazer login com o Google.");
    }
});