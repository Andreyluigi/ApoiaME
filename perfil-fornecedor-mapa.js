// Arquivo: js/perfil-fornecedor-mapa.js
// Responsável por controlar o mapa interativo.
// ESTE ARQUIVO É UM MÓDULO.

// Variáveis Globais do Módulo
let map = null;
let marker = null;
let circle = null;

// ==========================================================
// CORREÇÃO CRÍTICA: Variáveis do DOM movidas para dentro do init
// ==========================================================
let cepInput, ruaInput, bairroInput, cidadeInput, estadoInput, 
    numeroInput, raioInput, latInput, lngInput, cepError, cepSpinner;

const $ = (id) => document.getElementById(id);
// ==========================================================

// ==========================================================
// FUNÇÃO EXPORTADA (Chamada pelo perfil-fornecedor.firebase.js)
// ==========================================================
export function inicializarMapaPerfil(enderecoSalvo, raioSalvo) {
    
    // 1. PREENCHE AS VARIÁVEIS DO DOM (AGORA É SEGURO)
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
    cepSpinner = $('cep-spinner');

    // 2. Preenche os valores salvos no formulário
    if(enderecoSalvo) {
        cepInput.value = enderecoSalvo.cep || '';
        ruaInput.value = enderecoSalvo.rua || '';
        bairroInput.value = enderecoSalvo.bairro || '';
        cidadeInput.value = enderecoSalvo.cidade || '';
        estadoInput.value = enderecoSalvo.estado || '';
        numeroInput.value = enderecoSalvo.numero || '';
        latInput.value = enderecoSalvo.lat || '';
        lngInput.value = enderecoSalvo.lng || '';
    }
    if(raioSalvo) {
        raioInput.value = raioSalvo;
    }

    // 3. Inicializa o mapa (se não existir)
    if (!map && $('mapa-perfil')) {
        try {
            // Adiciona o patch de correção do ícone
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const centroLat = parseFloat(enderecoSalvo?.lat) || -23.5505;
            const centroLng = parseFloat(enderecoSalvo?.lng) || -46.6333;
            const zoom = (enderecoSalvo?.lat) ? 15 : 12;

            map = L.map("mapa-perfil").setView([centroLat, centroLng], zoom); 
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

            if(centroLat !== -23.5505) {
                 marker = L.marker([centroLat, centroLng]).addTo(map);
                 atualizarRaioVisual(centroLat, centroLng);
            }
            
            // 5. Adiciona os listeners
            cepInput?.addEventListener("blur", handleCepBlur);
            raioInput?.addEventListener("change", handleRaioChange);

        } catch (e) {
            console.error("Erro ao inicializar o Leaflet:", e);
            if ($('mapa-perfil')) $('mapa-perfil').innerHTML = "Erro ao carregar o mapa.";
        }
    } else if (map) {
        map.invalidateSize();
    }
}
// ==========================================================
// FIM DA FUNÇÃO EXPORTADA
// ==========================================================

// ... (O resto do código: geocodeCEP, atualizarRaioVisual, preencherCamposEndereco, limparCamposEndereco, handleCepBlur, handleRaioChange) ...
// (Vou colar o resto do código para garantir)

async function geocodeCEP(cep) {
    // Tenta BrasilAPI
    try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (!res.ok) throw new Error("BrasilAPI falhou.");
        const data = await res.json();
        if (data.location && data.location.coordinates) {
            return { lat: data.location.coordinates.latitude, lng: data.location.coordinates.longitude, 
                     rua: data.street, bairro: data.neighborhood, cidade: data.city, estado: data.state };
        }
        throw new Error("BrasilAPI não retornou coords, tentando fallback.");
    } catch (e) { console.warn(e.message); }

    // Fallback: ViaCEP + Nominatim
    let viaData;
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.ok) throw new Error("ViaCEP falhou");
        viaData = await res.json();
        if (viaData.erro) throw new Error("CEP não encontrado.");
    } catch (e) { throw new Error("CEP não encontrado."); }
    
    try {
        const params = new URLSearchParams({ postalcode: cep, country: "Brazil", format: "json", limit: 1 });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error("Nominatim falhou.");
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), 
                     rua: viaData.logradouro, bairro: viaData.bairro, cidade: viaData.localidade, estado: viaData.uf };
        }
        throw new Error("Nominatim não encontrou coordenadas.");
    } catch (e) {
        return { lat: null, lng: null, rua: viaData.logradouro, bairro: viaData.bairro, cidade: viaData.localidade, estado: viaData.uf };
    }
}

function atualizarRaioVisual(lat, lng) {
    const km = Number(raioInput.value || 0);
    if (circle) circle.remove();
    if (!map || !km) return;
    circle = L.circle([lat, lng], { radius: km * 1000, color: "#017643", fillColor: "#017643", fillOpacity: 0.1 }).addTo(map);
    map.fitBounds(circle.getBounds());
}

function preencherCamposEndereco(data) {
    ruaInput.value = data.rua || "";
    bairroInput.value = data.bairro || "";
    cidadeInput.value = data.cidade || "";
    estadoInput.value = data.estado || "";
}

function limparCamposEndereco(limparMapa = true) {
    ruaInput.value = ""; 
    bairroInput.value = ""; 
    cidadeInput.value = ""; 
    estadoInput.value = "";
    latInput.value = ""; 
    lngInput.value = "";
    
    if (limparMapa) {
        if(marker) { marker.remove(); marker = null; }
        if(circle) { circle.remove(); circle = null; }
    }
}

async function handleCepBlur() {
    if (!map) return; 
    const cep = cepInput.value.replace(/\D/g, "");
    
    if (cep.length < 8) { 
        limparCamposEndereco(true); // Limpa tudo se o CEP for inválido
        return; 
    }

    // --- INICIA O LOAD ---
    cepInput.disabled = true;
    cepSpinner.style.display = 'block';
    cepError.style.display = 'none';
    cepInput.classList.remove('is-invalid');
    // Limpa os campos de texto, mas mantém o pino antigo no mapa por enquanto
    limparCamposEndereco(false); 

    try {
        // --- CHAMA A API ---
        const { lat, lng, rua, bairro, cidade, estado } = await geocodeCEP(cep);
        
        // --- SUCESSO ---
        // Preenche e remove o pino antigo (se houver)
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
            latInput.value = ""; lngInput.value = "";
            map.setView([-23.5505, -46.6333], 12); 
            cepError.textContent = "Pino não fixado. Endereço preenchido.";
            cepError.style.display = 'block';
        }
        numeroInput.focus();
    
    } catch (err) {
        // --- FALHA ---
        // Limpa tudo, incluindo o mapa
        limparCamposEndereco(true); 
        cepError.textContent = err.message; 
        cepError.style.display = 'block';
        cepInput.classList.add('is-invalid');
    
    } finally {
        // --- TERMINA O LOAD (em qualquer cenário) ---
        cepInput.disabled = false;
        cepSpinner.style.display = 'none';
    }
}

function handleRaioChange() {
    if (marker) {
        const { lat, lng } = marker.getLatLng();
        atualizarRaioVisual(lat, lng);
    }
}