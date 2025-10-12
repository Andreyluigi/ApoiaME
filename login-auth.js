// Importações do Firebase
import { auth } from "./firebase-init.js";
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, setDoc, doc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Inicializa o Firestore
const db = getFirestore();

// DOM
const formCadastro  = document.getElementById("form-cadastro");
const formLogin     = document.getElementById("form-login");
const extraForm     = document.getElementById("extra-form");
const finalForm     = document.getElementById("final-form");
const btnSelectRole = document.getElementById("select-role");

let currentUid = null;
let tipoSelecionado = null;

// Lógica para exibir CPF ou CNPJ dependendo da categoria de pessoa
document.getElementById("categoria-pessoa")?.addEventListener("change", () => {
  const categoria = document.getElementById("categoria-pessoa").value;
  const cpfGroup = document.getElementById("cpf-group");
  const cnpjGroup = document.getElementById("cnpj-group");

  if (categoria === "pf") {
    cpfGroup.style.display = "block";  // Exibe o campo de CPF
    cnpjGroup.style.display = "none"; // Esconde o campo de CNPJ
  } else if (categoria === "pj") {
    cnpjGroup.style.display = "block"; // Exibe o campo de CNPJ
    cpfGroup.style.display = "none";   // Esconde o campo de CPF
  } else {
    cpfGroup.style.display = "none";
    cnpjGroup.style.display = "none";
  }
});

// Função para realizar o cadastro
formCadastro?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome  = document.getElementById("nome-cadastro").value.trim();
  const email = document.getElementById("email-cadastro").value.trim();
  const senha = document.getElementById("senha-cadastro").value;
  const senhaRepetir = document.getElementById("senha-repetir").value;

  const categoria = document.getElementById("categoria-pessoa").value; // PF ou PJ
  const cpf = document.getElementById("cpf-cadastro").value.trim(); // CPF
  const cnpj = document.getElementById("cnpj-cadastro").value.trim(); // CNPJ

  // Validação
  if (!formCadastro.checkValidity()) { formCadastro.classList.add("was-validated"); return; }
  if (senha !== senhaRepetir) { alert("As senhas não conferem."); return; }

  try {
    // Criação do usuário no Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    currentUid = cred.user.uid;

    // Atualiza o nome do usuário no Firebase Auth
    if (nome) {
      await updateProfile(cred.user, { displayName: nome });
    }

    // Salva os dados no Firestore (nome, email, tipo, CPF/CNPJ)
    await setDoc(doc(db, "usuarios", currentUid), {
      nome,
      email,
      tipo: categoria,  // pf ou pj
      cpf: categoria === 'pf' ? cpf : null,  // Salva CPF se PF
      cnpj: categoria === 'pj' ? cnpj : null,  // Salva CNPJ se PJ
      status: "ativo",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    // Troca para a tela do tipo de conta
    formCadastro.style.display = "none";
    extraForm.style.display = "block";
    extraForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("[Cadastro]", err);
    alert("Erro no cadastro: " + (err.message || err.code));
  }
});

// Função de Login
formLogin?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email-login").value.trim();
  const senha = document.getElementById("senha-login").value.trim();

  if (!formLogin.checkValidity()) { formLogin.classList.add("was-validated"); return; }

  try {
    // Login com o Firebase
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    currentUid = cred.user.uid;

    // Após login, obtém o tipo de conta e redireciona
    const tipo = await obterTipo(currentUid);
    const rotas = {
      cliente: "dashboardC.html",
      ajudante: "dashboardA.html",
      //entregador: "dashboardE.html"
    };

    window.location.href = rotas[tipo] || "dashboardC.html"; // Redireciona para a dashboard do tipo
  } catch (err) {
    console.error("[Login]", err);
    alert("Erro no login: " + (err.message || err.code));
  }
});

// Função para obter o tipo de conta do usuário
async function obterTipo(uid) {
  const docRef = doc(db, "usuarios", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().tipo : null;
}

// Segundo formulário: Seleção do tipo de conta
document.querySelectorAll(".card-option").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".card-option").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    tipoSelecionado = card.dataset.role; // cliente | ajudante | entregador
    if (btnSelectRole) btnSelectRole.disabled = !tipoSelecionado;
  });
});

// Salvar tipo escolhido e redirecionar
btnSelectRole?.addEventListener("click", async () => {
  if (!currentUid || !tipoSelecionado) { alert("Selecione um tipo."); return; }

  try {
    // Atualiza o tipo de conta no Firestore
    await setDoc(doc(db, "usuarios", currentUid), { tipo: tipoSelecionado }, { merge: true });

    // Troca para a tela de sucesso
    extraForm.style.display = "none";
    finalForm.style.display = "block";  // Exibe a tela de sucesso

    const rotas = {
      cliente: "dashboardC.html",
      ajudante: "dashboardA.html",
    //  entregador: "dashboardE.html"
    };

    // Redireciona para a dashboard do tipo de conta selecionado
    setTimeout(() => {
      window.location.href = rotas[tipoSelecionado] || "dashboardC.html";
    }, 900);
  } catch (err) {
    console.error("[Salvar tipo]", err);
    alert("Erro ao salvar tipo: " + (err.message || err.code));
  }
});
