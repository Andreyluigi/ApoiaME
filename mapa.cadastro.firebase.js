// Arquivo: js/mapa.cadastro.firebase.js
// Responsável por controlar o mapa interativo.
// ESTE ARQUIVO É UM MÓDULO.

// Variáveis Globais do Módulo (Mundo Leaflet)
let map = null;
let marker = null;
let circle = null;

// Ferramenta auxiliar de seleção
const $ = (id) => document.getElementById(id);

// VARIÁVEIS DE DOM (Serão inicializadas depois do DOMContentLoaded)
let cepInput, ruaInput, bairroInput, cidadeInput, estadoInput, 
    numeroInput, raioInput, latInput, lngInput, cepError;


// --- FUNÇÃO DE INICIALIZAÇÃO E OBTENÇÃO DE DOM (EXPORTADA) ---
export function inicializarMapaCadastro() {
    
    // 1. INICIALIZAÇÃO DO DOM (GARANTIDA)
    cepInput = $('fornecedor-cep');
    ruaInput = $('fornecedor-rua');
    bairroInput = $('fornecedor-bairro');
    cidadeInput = $('fornecedor-cidade');
    estadoInput = $('fornecedor-estado');
    numeroInput = $('fornecedor-numero'); 
    raioInput = $('fornecedor-raio');
    latInput = $('fornecedor-lat');
    lngInput = $('fornecedor-lng');
    cepError = $('cep-error');

    // 2. ADICIONAR LISTENERS (AGORA É SEGURO)
    cepInput?.addEventListener("blur", handleCepBlur);
    raioInput?.addEventListener("change", handleRaioChange);


    // 3. INICIALIZA MAPA
    if (map) { 
        map.invalidateSize();
        return;
    }

    if ($('mapa-cadastro')) {
        try {
            // Correção do ícone Leaflet (essencial)
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            map = L.map("mapa-cadastro").setView([-23.5505, -46.6333], 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

        } catch (e) {
            console.error("Erro ao inicializar o Leaflet:", e);
            if ($('mapa-cadastro')) {
                $('mapa-cadastro').innerHTML = "Erro ao carregar o mapa.";
            }
        }
    }
}
// --- FIM FUNÇÃO EXPORTADA ---


// ==========================================================
// FUNÇÕES DE UTILIDADE E LÓGICA (Mantidas e acessíveis)
// ==========================================================

async function geocodeCEP(cep) {
    // ... (Sua lógica de geocodeCEP permanece idêntica)
    console.log("Fallback: Tentando ViaCEP + Nominatim...");
    let viaData;
    try {
        const responseV1 = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!responseV1.ok) throw new Error("ViaCEP falhou");
        viaData = await responseV1.json();
        if (viaData.erro) throw new Error("CEP não encontrado no ViaCEP.");
    } catch (e) { console.error(e); throw new Error("CEP não encontrado."); }
    
    try {
        const params = new URLSearchParams({ postalcode: cep, country: "Brazil", format: "json", limit: 1 });
        const responseNom = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!responseNom.ok) throw new Error("Nominatim (OpenStreetMap) falhou.");
        const dataNom = await responseNom.json();
        if (Array.isArray(dataNom) && dataNom.length > 0) {
             console.log("Geocode via ViaCEP + Nominatim (Sucesso)");
            return { lat: parseFloat(dataNom[0].lat), lng: parseFloat(dataNom[0].lon), rua: viaData.logradouro || "", bairro: viaData.bairro || "", cidade: viaData.localidade || "", estado: viaData.uf || "" };
        } else {
            throw new Error("Nominatim não encontrou coordenadas para este endereço.");
        }
    } catch (e) {
        console.warn(e.message, "Usando apenas dados do ViaCEP. O mapa não será centralizado.");
        return { lat: null, lng: null, rua: viaData.logradouro || "", bairro: viaData.bairro || "", cidade: viaData.localidade || "", estado: viaData.uf || "" };
    }
}


function atualizarRaioVisual(lat, lng) {
    // A função é chamada, mas as variáveis do DOM já estão no escopo global deste módulo
    const km = Number(raioInput.value || 0);
    if (circle) circle.remove();
    if (!map || !km) return;
    circle = L.circle([lat, lng], { radius: km * 1000, color: "#017643", fillColor: "#017643", fillOpacity: 0.1 }).addTo(map);
    map.fitBounds(circle.getBounds());
}

function preencherCamposEndereco(data) {
    // As variáveis do DOM estão definidas no escopo global
    ruaInput.value = data.rua || "";
    bairroInput.value = data.bairro || "";
    cidadeInput.value = data.cidade || "";
    estadoInput.value = data.estado || "";
}

function limparCamposEndereco() {
    // As variáveis do DOM estão definidas no escopo global
    ruaInput.value = "";
    bairroInput.value = "";
    cidadeInput.value = "";
    estadoInput.value = "";
    latInput.value = "";
    lngInput.value = "";
    if(marker) { marker.remove(); marker = null; }
    if(circle) { circle.remove(); circle = null; }
}

async function handleCepBlur() {
    // Esta função agora confia que cepInput não é null
    if (!map) return; 

    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length < 8) {
        limparCamposEndereco();
        return;
    }

    try {
        cepError.style.display = 'none';
        cepInput.classList.remove('is-invalid');

        const { lat, lng, rua, bairro, cidade, estado } = await geocodeCEP(cep);

        preencherCamposEndereco({ rua, bairro, cidade, estado });
        
        if (marker) marker.remove();
        if (circle) circle.remove();

        if (lat && lng) {
            latInput.value = lat;
            lngInput.value = lng;
            
            marker = L.marker([lat, lng]).addTo(map);
            map.setView([lat, lng], 15); 

            atualizarRaioVisual(lat, lng);
        } else {
            latInput.value = "";
            lngInput.value = "";
            map.setView([-23.5505, -46.6333], 12); 
            cepError.textContent = "Endereço preenchido, mas não foi possível fixar o pino no mapa.";
            cepError.style.display = 'block';
        }
        
        numeroInput.focus();

    } catch (err) {
        console.error(err);
        limparCamposEndereco(); 
        cepError.style.display = 'block';
        cepError.textContent = err.message; 
        cepInput.classList.add('is-invalid');
    }
}

function handleRaioChange() {
    if (marker) {
        const { lat, lng } = marker.getLatLng();
        atualizarRaioVisual(lat, lng);
    }
}

