// Importação do Firebase Auth
import { auth } from "./firebase-init.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Manipulador do evento para o formulário de recuperação de senha
document.getElementById("form-recuperar")?.addEventListener("submit", async (e) => {
  e.preventDefault(); // Impede o envio do formulário

  const email = document.getElementById("email-recuperar").value.trim(); // Obtém o e-mail inserido pelo usuário

  if (!email) {
    alert("Por favor, insira um e-mail válido.");
    return;
  }

  try {
    // Envia o link de redefinição de senha para o e-mail fornecido
    await sendPasswordResetEmail(auth, email);

    // Exibe a tela de sucesso
    document.getElementById("form-recuperar").style.display = "none";
    document.getElementById("final-screen").style.display = "block";

  } catch (err) {
    console.error("Erro ao enviar o e-mail de recuperação", err);
    alert("Erro ao enviar e-mail de recuperação. Tente novamente.");
  }
});