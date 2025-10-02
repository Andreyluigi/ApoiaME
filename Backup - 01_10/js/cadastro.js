let etapaAtual = 0;
let perfil = null;

const etapas = ["etapa0", "etapa1", "etapa2", "etapa3"];
const btnVoltar = document.getElementById("btnVoltar");
const btnProximo = document.getElementById("btnProximo");
const btnFinalizar = document.getElementById("btnFinalizar");

function mostrarEtapa(etapa) {
  // esconde todas
  document.querySelectorAll(".etapa").forEach(e => e.style.display = "none");

  // mostra só a etapa atual
  document.getElementById("etapa" + etapa).style.display = "block";

  // botões
  const btnProximo = document.getElementById("btnProximo");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnFinalizar = document.getElementById("btnFinalizar");

  // etapa inicial (0)
  if (etapa === 0) {
    btnProximo.style.display = "none";
    btnVoltar.style.display = "none";
    btnFinalizar.style.display = "none";
  }
  // etapa final (3, segurança)
  else if (etapa === 3) {
    btnProximo.style.display = "none";
    btnVoltar.style.display = "inline-block";
    btnFinalizar.style.display = "inline-block";
  }
  // etapas intermediárias (1 e 2)
  else {
    btnProximo.style.display = "inline-block";
    btnVoltar.style.display = etapa > 0 ? "inline-block" : "none";
    btnFinalizar.style.display = "none";
  }
}


function escolherPerfil(tipo) {
  perfil = tipo;
  etapaAtual = 1;
  mostrarEtapa(etapaAtual);
}

btnProximo.addEventListener("click", () => {
  etapaAtual++;
  mostrarEtapa(etapaAtual);
});

btnVoltar.addEventListener("click", () => {
  etapaAtual--;
  mostrarEtapa(etapaAtual);
});

document.getElementById("formCadastro").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Cadastro concluído como " + perfil.toUpperCase() + "!");
});

mostrarEtapa(etapaAtual);