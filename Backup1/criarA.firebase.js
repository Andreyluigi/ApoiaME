// ================== criarA.firebase.js ==================
import { auth } from "./firebase-init.js";
import {
  getFirestore, collection, addDoc, serverTimestamp, updateDoc, getDoc, doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const db = getFirestore();
const $ = (id) => document.getElementById(id);

// -------- Cloudinary --------
const CLOUD_NAME = "dfyol5oig";
const UPLOAD_PRESET = "apoiaMe-anuncios-img";

// -------- Auth gate --------
let uid = null;
onAuthStateChanged(auth, (u) => { if (!u) { location.href = "login.html"; return; } uid = u.uid; });
// Obtendo o nome do usuário logado
const user = auth.currentUser;
const prestadorApelido = user ? user.displayName : 'nome indefinido';  
const prestadorAvatar = user ? user.photoURL : 'Avatar padrão';  

// -------- Campos obrigatórios --------
["bairro","enderecoBase"].forEach(id => {
  const el = $(id);
  if (el) { el.readOnly = true; el.removeAttribute("disabled"); }
});
["categoria","titulo","descricao","cep","bairro","raio","precoBase","disponibilidade"].forEach(id => {
  $(id)?.setAttribute("required","required");
});

// -------- Preço BRL --------
const preco = $("precoBase");
const parseBRL = s => Number(String(s || "").replace(/\D/g, "")) / 100;
preco.addEventListener("input", () => {
  const d = preco.value.replace(/\D/g, "").padStart(3, "0");
  const n = Number(d) / 100;
  preco.value = n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
});

// -------- Fotos: preview + validação --------
const inputFotos = $("fotos");
const preview = document.createElement("div");
preview.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px";
inputFotos.parentElement.appendChild(preview);

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 5 * 1024 * 1024; // 5MB
function sanitize(files) {
  const ok = [], bad = [];
  for (const f of files) {
    if (!ALLOWED.has(f.type)) { bad.push(`${f.name}: tipo inválido`); continue; }
    if (f.size > MAX) { bad.push(`${f.name}: > 5MB`); continue; }
    ok.push(f);
  }
  return { ok: ok.slice(0, 5), bad };
}
inputFotos.addEventListener("change", () => {
  preview.innerHTML = "";
  const { ok, bad } = sanitize([...inputFotos.files]);
  const dt = new DataTransfer(); ok.forEach(f => dt.items.add(f)); inputFotos.files = dt.files;
  ok.forEach(file => {
    const img = new Image();
    img.style = "width:100%;height:72px;object-fit:cover;border-radius:8px";
    const r = new FileReader(); r.onload = e => img.src = e.target.result; r.readAsDataURL(file);
    preview.appendChild(img);
  });
  if (bad.length) alert("Arquivos ignorados:\n" + bad.join("\n"));
});

// -------- CEP → ViaCEP --------
async function buscarEndereco(cep) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (data.erro) throw new Error("CEP não encontrado");

    const bairroEl = $("bairro");
    const endEl = $("enderecoBase");
    if (bairroEl) bairroEl.value = data.bairro || "";
    if (endEl) endEl.value = [data.logradouro, data.complemento].filter(Boolean).join(", ");
  } catch (e) {
    console.error("ViaCEP:", e);
    alert("Erro ao buscar CEP. Verifique e tente novamente.");
  }
}
const cepInput = $("cep");
cepInput.addEventListener("blur", () => {
  const cep = cepInput.value.replace(/\D/g, "");
  if (cep.length === 8) buscarEndereco(cep);
  else alert("Informe um CEP válido com 8 dígitos.");
});

// -------- Upload Cloudinary --------
async function uploadCloudinary(files, folder) {
  const urls = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder);
    formData.append("cloud_name", CLOUD_NAME);

    try {
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST", body: formData
      });
      if (!resp.ok) throw new Error("Falha no upload");
      const data = await resp.json();
      if (data.secure_url) urls.push(data.secure_url);
    } catch (err) {
      console.error("Cloudinary:", err);
      alert("Erro ao enviar imagens. Tente novamente.");
    }
  }
  return urls;
}

// -------- Validações --------
function precoMaiorQueZero(v) { return parseBRL(v) > 0; }
function raioValido() { return Number($("raio").value) > 0; }

// -------- Submit: cria anúncio --------
$("form-anuncio").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!uid) return;

  const form = e.target;
  const btn = e.submitter || form.querySelector('[type="submit"]');

  const erros = [];
  if (!form.checkValidity()) erros.push("Preencha todos os campos obrigatórios.");
  if (!precoMaiorQueZero($("precoBase").value)) erros.push("Informe um preço base maior que zero.");
  if (!raioValido()) erros.push("Informe um raio de atendimento maior que zero.");
  if (erros.length) { form.reportValidity(); alert(erros.join("\n")); return; }

  btn.disabled = true;

  try {
     //perfil público inline
      let prestadorApelido = user && user.displayName ? user.displayName : 'nome indefinido';
      let prestadorAvatar = user && user.photoURL ? user.photoURL : '';

      try {
        const pub = await getDoc(doc(db, "perfis_publicos", uid));
        if (pub.exists()) {
          const d = pub.data();
          // Só sobrescreve se não tiver nome no Firebase Auth
          prestadorApelido = prestadorApelido || d.nickname || d.nome || d.displayName || prestadorApelido;
          prestadorAvatar = prestadorAvatar || d.avatar || d.photoURL || d.foto || prestadorAvatar;
        }
      } catch (e) {
        console.warn("perfis_publicos indisponível:", e);
      }

    const docData = {
      categoria: $("categoria").value,
      titulo: $("titulo").value.trim(),
      descricao: $("descricao").value.trim(),
      regiao: $("bairro").value.trim(),
      raioKm: Number($("raio").value),
      precoBase: parseBRL($("precoBase").value),
      disponibilidade: $("disponibilidade").value,
      entregaOpcional: $("entregaOpcional").checked,
      enderecoBase: $("enderecoBase").value.trim(),
      bairro: $("bairro").value.trim(),
      status: $("publicarAgora").checked ? "publicado" : "inativo",
      prestadorUid: uid,
      prestadorApelido,
      prestadorAvatar,
      fotos: [],
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    };

    const refDoc = await addDoc(collection(db, "anuncios"), docData);

    const { ok } = sanitize([...inputFotos.files]);
    if (ok.length) {
      const folder = `app/anuncios/${refDoc.id}`;
      const urls = await uploadCloudinary(ok, folder);
      if (urls.length) await updateDoc(refDoc, { fotos: urls, atualizadoEm: serverTimestamp() });
    }

    location.href = "meuservicosA.html";
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar.");
    btn.disabled = false;
  }
});

// -------- Ícones Lucide --------
document.addEventListener("DOMContentLoaded", () => { if (window.lucide) lucide.createIcons(); });
