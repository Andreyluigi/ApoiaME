import { auth } from "./firebase-init.js";
import { confirmPasswordReset } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Manipulador do evento de envio do formulário de redefinição de senha
document.getElementById("form-redefinir")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const senha1 = document.getElementById("senha1").value;
  const senha2 = document.getElementById("senha2").value;

  // Validação: Senhas devem coincidir
  if (senha1 !== senha2) {
    alert("As senhas precisam coincidir!");
    return;
  }

  if (senha1.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const oobCode = urlParams.get('oobCode'); // Código da URL de redefinição

  if (!oobCode) {
    alert("Código inválido de redefinição de senha.");
    return;
  }

  try {
    // Chama o método de redefinição de senha do Firebase
    await confirmPasswordReset(auth, oobCode, senha1);

    // Exibe a tela de sucesso
    document.getElementById("form-redefinir").style.display = "none";
    document.getElementById("final-screen").style.display = "block";

    // Redireciona para o login após 2.4 segundos
    setTimeout(() => {
      window.location.href = "login.html"; // Redireciona para o login
    }, 2400);
  } catch (err) {
    console.error("Erro ao redefinir a senha", err);
    alert("Erro ao redefinir a senha. Tente novamente.");
  }
});