document.addEventListener("DOMContentLoaded", () => {
  // Inicializa ícones Lucide quando a página carregar
  if (window.lucide && typeof window.lucide.replace === "function") {
    window.lucide.replace();
  }

  // Notificação: Redireciona para a página de notificações
  const notifBtn = document.querySelector(".notif-btn");
  if (notifBtn) {
    notifBtn.addEventListener("click", () => {
      window.location.href = 'notificacaoC.html';  
    });
  }

  // Confirmação de Logout
  const logoutBtn = document.querySelector(".logout");
  const modal = document.getElementById("logout-modal");
  const confirmYes = document.getElementById("confirm-yes");
  const confirmNo = document.getElementById("confirm-no");

  if (logoutBtn && modal && confirmYes && confirmNo) {
    logoutBtn.addEventListener("click", () => {
      modal.classList.add("show");
    });

    confirmNo.addEventListener("click", () => {
      modal.classList.remove("show");
    });

    confirmYes.addEventListener("click", () => {
      modal.classList.remove("show");
      alert("Você saiu!"); // Substituir pelo logout real
      // Exemplo: window.location.href = "login.html";
    });

    // Fecha modal ao clicar fora do conteúdo
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });
  }

  // ===== Busca simples nos cards =====
  const input = document.getElementById("search");
  const btn = document.getElementById("search-btn");
  const grid = document.getElementById("results-grid");

  if (input && grid && btn) {
    function filtrar() {
      const q = (input.value || "").toLowerCase().trim();
      const cards = grid.querySelectorAll(".card");
      let count = 0;
      cards.forEach(card => {
        const title = (card.dataset.name || card.querySelector("h3")?.textContent || "").toLowerCase();
        const text = (card.querySelector("p")?.textContent || "").toLowerCase();
        const show = title.includes(q) || text.includes(q);
        card.style.display = show ? "" : "none";
        if (show) count++;
      });
      // Feedback quando nada encontrado
      const emptyMessage = grid.querySelector("#empty");
      if (count === 0) {
        if (!emptyMessage) {
          const empty = document.createElement("p");
          empty.id = "empty";
          empty.textContent = "Nenhum resultado encontrado.";
          empty.style.color = "#555";
          grid.appendChild(empty);
        }
      } else {
        if (emptyMessage) emptyMessage.remove();
      }
    }

    input.addEventListener("input", filtrar);
    btn.addEventListener("click", filtrar);
  }
});
