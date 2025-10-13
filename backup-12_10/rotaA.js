// Arquivo: rotaA.js (Versão Final, Completa e Simplificada)

// ========================================================
// --- CONSTANTES E CONFIGURAÇÃO ---
// ========================================================
const MAPTILER_KEY = "yMyvEb405kuZLiKAY1fz";
const LOCATIONIQ_KEY = "pk.dcb0addbf59eb8bb3705cc55e553bdb2";

// --- VARIÁVEIS INTERNAS DO MÓDULO ---
let map = null;
let motoristaMarker = null, origemMarker = null, routeLayer = null;
let dadosDoPedido = null; // Armazena os dados do pedido atual

// ========================================================
// --- FUNÇÕES AUXILIARES ---
// ========================================================

/**
 * Valida se um par de latitude e longitude é um número válido dentro dos limites geográficos.
 */
function validarCoordenadas(lat, lng) {
    if (lat === null || lng === null || lat === undefined || lng === undefined) return false;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return false;
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return false;
    return true;
}

/**
 * Converte uma string de endereço em coordenadas usando a API do LocationIQ.
 */
async function geocodificarEndereco(endereco) {
    console.log("Tentando geocodificar com LocationIQ:", endereco);
    if (!endereco || typeof endereco !== 'string' || endereco.trim().length < 5) {
        console.error("Endereço inválido ou muito curto para geocodificar.");
        return null;
    }
    const params = new URLSearchParams({
        key: LOCATIONIQ_KEY,
        format: "json",
        q: endereco,
        countrycodes: "br",
        limit: 1
    });
    try {
        const response = await fetch(`https://us1.locationiq.com/v1/search?${params}`);
        if (!response.ok) {
            console.error("Erro na resposta da API LocationIQ:", response.status, response.statusText);
            return null;
        }
        const data = await response.json();
        if (data && data.length > 0) {
            const result = data[0];
            const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
            if (validarCoordenadas(coords.lat, coords.lng)) {
                console.log("LocationIQ encontrou as coordenadas:", coords);
                return coords;
            }
        }
    } catch (error) {
        console.error("Erro ao tentar contatar a API do LocationIQ:", error);
    }
    console.warn("LocationIQ não conseguiu encontrar coordenadas para o endereço.");
    return null;
}

const km = (m) => (m / 1000).toFixed(1) + " km";
const min = (s) => Math.max(1, Math.round(s / 60)) + " min";

// ========================================================
// --- FUNÇÕES DE LÓGICA DO MAPA ---
// ========================================================

/**
 * Desenha ou atualiza os marcadores do ajudante (motorista) e do cliente (origem) no mapa.
 */
function desenharMarcadores(posicaoAjudante) {
    // Marcador do Ajudante (verde, pulsante)
    if (posicaoAjudante && validarCoordenadas(posicaoAjudante.latitude, posicaoAjudante.longitude)) {
        const latLng = [posicaoAjudante.latitude, posicaoAjudante.longitude];
        if (!motoristaMarker) {
            motoristaMarker = L.marker(latLng, {
                icon: L.divIcon({
                    className: "marker-motorista",
                    html: `<div style="width:20px;height:20px;background:#3DBE34;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5);animation:pulse 1.2s infinite;"></div>`,
                }),
            }).addTo(map);
        } else {
            motoristaMarker.setLatLng(latLng);
        }
    }

    // Marcador do Cliente/Origem (azul)
    if (dadosDoPedido?.origem?.lat && validarCoordenadas(dadosDoPedido.origem.lat, dadosDoPedido.origem.lng)) {
        if (!origemMarker) {
            origemMarker = L.marker([dadosDoPedido.origem.lat, dadosDoPedido.origem.lng], {
                icon: L.divIcon({
                    className: "marker-origem",
                    html: `<div style="width:22px;height:22px;background:#1E3A8A;border:3px solid #fff;border-radius:50%;"></div>`
                })
            }).addTo(map);
        }
    }
}

/**
 * Desenha a rota no mapa usando a API do OSRM.
 */
async function desenharRota(pontoInicial, pontoFinal) {
    if (!pontoInicial || !pontoFinal || !validarCoordenadas(pontoInicial.lat, pontoInicial.lng) || !validarCoordenadas(pontoFinal.lat, pontoFinal.lng)) {
        return; // Sai silenciosamente se as coordenadas forem inválidas
    }
    const url = `https://router.project-osrm.org/route/v1/driving/${pontoInicial.lng},${pontoInicial.lat};${pontoFinal.lng},${pontoFinal.lat}?overview=full&geometries=geojson&steps=true`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        const route = data?.routes?.[0];
        if (!route) return;
        
        const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        if (routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.polyline(latlngs, { weight: 6, opacity: 0.95, color: "#ff6c0c" }).addTo(map);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });

        document.getElementById("distanciaInfo").textContent = km(route.distance);
        document.getElementById("tempoInfo").textContent = min(route.duration);
    } catch (error) {
        console.error("Erro ao buscar rota do OSRM:", error);
    }
}

/**
 * Função chamada a cada atualização de geolocalização.
 */
function aoAtualizarPosicao(posicao) {
    const posicaoAtual = {
        lat: posicao.coords.latitude,
        lng: posicao.coords.longitude
    };
    
    // Passamos a posição atual diretamente, sem usar variáveis globais desnecessárias.
    desenharMarcadores(posicao.coords);
    
    if (dadosDoPedido?.origem?.lat) {
        desenharRota(posicaoAtual, dadosDoPedido.origem);
    }
}

/**
 * Inicia o monitoramento da localização do usuário.
 */
function iniciarMonitoramentoDeLocalizacao() {
    if (!navigator.geolocation) {
        return alert("Geolocalização não é suportada por este navegador.");
    }
    console.log("Iniciando o monitoramento de geolocalização...");
    navigator.geolocation.watchPosition(
        aoAtualizarPosicao, // Função a ser chamada em caso de sucesso
        (error) => { // Função a ser chamada em caso de erro
            let msg;
            switch (error.code) {
                case error.PERMISSION_DENIED: msg = "Permissão para geolocalização negada."; break;
                case error.POSITION_UNAVAILABLE: msg = "Informações de localização indisponíveis."; break;
                case error.TIMEOUT: msg = "Requisição de localização expirou."; break;
                default: msg = "Ocorreu um erro desconhecido na geolocalização."; break;
            }
            console.error("ERRO na geolocalização:", msg, error);
            alert(`Falha ao obter localização: ${msg}`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ========================================================
// --- FUNÇÃO PRINCIPAL (EXPORTADA) ---
// ========================================================

/**
 * Ponto de entrada. Inicializa todo o sistema de rota.
 */
export async function iniciarRota(pedidoData) {
    const obterEnderecoDoCliente = (pData) => {
        const enderecoCompleto = pData.enderecoRetirada || pData.enderecoReparo || pData.enderecoMontagem || pData.enderecoServico || pData.enderecoEntrega;
        if (enderecoCompleto) return enderecoCompleto;

        if (pData.endereco && pData.cidade) {
            return `${pData.endereco}, ${pData.numero || ''}, ${pData.bairro || ''}, ${pData.cidade}, ${pData.estado || ''}`;
        }
        return pData.endereco; // Último fallback
    };

    dadosDoPedido = {
        origem: {
            endereco: obterEnderecoDoCliente(pedidoData),
            lat: null, lng: null
        }
    };

    if (!dadosDoPedido.origem.endereco) {
        return alert("Nenhum endereço de cliente encontrado no pedido.");
    }

    const coords = await geocodificarEndereco(dadosDoPedido.origem.endereco);
    if (!coords) {
        return alert("Não foi possível encontrar as coordenadas para o endereço do cliente.");
    }
    dadosDoPedido.origem.lat = coords.lat;
    dadosDoPedido.origem.lng = coords.lng;

    // Inicializa o mapa
    if (map) map.remove();
    map = L.map("map").setView([dadosDoPedido.origem.lat, dadosDoPedido.origem.lng], 15);
    L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, { attribution: '&copy; OpenStreetMap & MapTiler' }).addTo(map);

    // Adiciona o estilo de animação
    if (!document.getElementById('marker-animation-style')) {
        const style = document.createElement("style");
        style.id = 'marker-animation-style';
        style.innerHTML = `@keyframes pulse { 0%{transform:scale(.9);opacity:.7} 50%{transform:scale(1.2);opacity:1} 100%{transform:scale(.9);opacity:.7} }`;
        document.head.appendChild(style);
    }
    
    // Desenha o marcador do cliente imediatamente
    desenharMarcadores(null); 
    
    // Inicia o rastreamento do ajudante
    iniciarMonitoramentoDeLocalizacao();
}