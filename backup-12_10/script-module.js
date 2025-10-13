import { auth } from './firebase-init.js';  // Importando o auth do firebase
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

const logoutBtn = document.querySelector(".logout");
const modal = document.getElementById("logout-modal");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Verifica se o nome está disponível
    const userName = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    
    // Exibe o nome na topbar
    document.getElementById('user-name').textContent = userName;
    console.log('Usuário logado:', userName);  // Para debugging, veja no console
  } else {
    console.log('Nenhum usuário logado');
  }
});
// Checa se o botão de logout existe
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    modal.classList.add("show");  // Exibe o modal
  });
}

if (confirmNo) {
  confirmNo.addEventListener("click", () => {
    modal.classList.remove("show");  // Fecha o modal
  });
}

if (confirmYes) {
confirmYes.addEventListener("click", async () => {
  try {
    // Realiza o logout usando a variável 'auth' importada
    await auth.signOut();
    
    // Fecha o modal
    modal.classList.remove("show");
    
    // Redireciona para a página welcome.html
    window.location.href = "index.html";
    
    alert("Você saiu!");
  } catch (err) {
    console.error("Erro ao fazer logout:", err);  // Exibe o erro completo no console para debugging
    alert("Erro ao realizar o logout. Detalhes: " + err.message);  // Exibe detalhes do erro para o usuário
  }
});
}
