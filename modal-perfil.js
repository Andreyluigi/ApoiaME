// Arquivo: modal-perfil.js
// Importe o 'db' e funções do seu firebase-init.js
// Certifique-se que o caminho para 'firebase-init.js' está correto
import { db } from './firebase-init.js'; 
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- Variáveis Globais do Modal ---
const modalElement = document.getElementById('modalVerPerfil');
const modalLoadingDiv = document.getElementById('modal-perfil-loading');
const modalContentDiv = document.getElementById('modal-perfil-content');

// Verifica se os elementos essenciais existem antes de continuar
if (modalElement && modalLoadingDiv && modalContentDiv) {
    
    const bsModal = new bootstrap.Modal(modalElement);
    let modalMap = null; // Guarda a instância do mapa

    // --- 1. FUNÇÃO PRINCIPAL (Para chamar de qualquer botão) ---
    /**
     * Busca dados do fornecedor e abre o modal de perfil.
     * @param {string} userId - O ID do usuário (fornecedor) a ser exibido.
     */
    async function abrirModalPerfil(userId) {
        if (!userId) {
            console.error("ID do usuário não fornecido.");
            return;
        }

        // 1. Reseta o modal para o estado de "loading"
        modalContentDiv.style.display = 'none';
        modalLoadingDiv.style.display = 'block';
        
        // Limpa o mapa anterior (se houver)
        if (modalMap) {
            modalMap.remove();
            modalMap = null;
        }
        
        // 2. Abre o modal
        bsModal.show();

        // 3. Busca os dados no Firebase
        try {
                const userRef = doc(db, "perfis_publicos", userId);
                const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                // 4. Preenche o modal com os dados
                popularModalPerfil(userSnap.data());
                
                // 5. Exibe o conteúdo
                modalLoadingDiv.style.display = 'none';
                modalContentDiv.style.display = 'block';

            } else {
                console.error("Fornecedor não encontrado.");
                modalLoadingDiv.innerHTML = '<p class="text-danger">Fornecedor não encontrado.</p>';
            }
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            modalLoadingDiv.innerHTML = `<p class="text-danger">Erro ao carregar o perfil: ${error.message}</p>`;
        }
    }

    // --- 2. FUNÇÃO AUXILIAR (Preenche o HTML) ---
    function popularModalPerfil(data) {
        // Foto, Nome, Status e Descrição
        document.getElementById('modal-perfil-foto').src = data.fotoURL || '../arquivos/foto-perfil.jpg';
        document.getElementById('modal-perfil-nome').textContent = data.nome || 'Nome não informado';
        document.getElementById('modal-perfil-descricao').textContent = data.descricao || 'Nenhuma descrição disponível.';
        
        // Status (se você tiver)
        const statusSpan = document.getElementById('modal-perfil-status');
        if (data.status === 'ativo') {
            statusSpan.className = 'badge bg-success';
            statusSpan.innerHTML = '<i class="bi bi-patch-check-fill"></i> Fornecedor Verificado';
        } else {
            statusSpan.className = 'badge bg-warning text-dark';
            statusSpan.innerHTML = 'Cadastro em Análise';
        }

        // Áreas de Atuação (como "tags")
        const areasDiv = document.getElementById('modal-perfil-areas');
        areasDiv.innerHTML = ''; // Limpa as áreas antigas
        if (data.areasAtuacao && data.areasAtuacao.length > 0) {
            data.areasAtuacao.forEach(area => {
                const tag = document.createElement('span');
                tag.className = 'area-atuacao-tag';
                tag.textContent = area;
                areasDiv.appendChild(tag);
            });
        } else {
            areasDiv.innerHTML = '<p class="text-muted small">Nenhuma área de atuação informada.</p>';
        }

        // Guarda os dados do mapa para o Leaflet usar
        const mapaDiv = document.getElementById('modal-perfil-mapa');
        if (data.enderecoAtuacao && data.enderecoAtuacao.lat) {
            mapaDiv.dataset.lat = data.enderecoAtuacao.lat;
            mapaDiv.dataset.lng = data.enderecoAtuacao.lng;
            mapaDiv.dataset.raioKm = data.raioAtuacao_km || 1;
            mapaDiv.innerHTML = ''; // Limpa texto de "sem localização"
        } else {
            // Se não tiver dados, limpa
            delete mapaDiv.dataset.lat;
            delete mapaDiv.dataset.lng;
            delete mapaDiv.dataset.raioKm;
            mapaDiv.innerHTML = '<p class="text-muted p-3 text-center">Localização não informada.</p>';
        }
    }

    // --- 3. INICIALIZADOR DO MAPA (O Pulo do Gato) ---
    // O Leaflet não pode ser inicializado em um <div> escondido (display: none).
    // Precisamos esperar o evento "shown.bs.modal" (quando o modal está VISÍVEL).
    modalElement.addEventListener('shown.bs.modal', () => {
        const mapaDiv = document.getElementById('modal-perfil-mapa');
        const lat = mapaDiv.dataset.lat;
        const lng = mapaDiv.dataset.lng;
        
        if (lat && lng) {
            const raioKm = parseFloat(mapaDiv.dataset.raioKm);
            const centro = [parseFloat(lat), parseFloat(lng)];

            try {
                // Adiciona o patch de correção do ícone (se ainda não tiver feito)
                if (!L.Icon.Default.prototype._getIconUrl) {
                    delete L.Icon.Default.prototype._getIconUrl;
                    L.Icon.Default.mergeOptions({
                        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    });
                }
            
                // Inicializa o mapa
                modalMap = L.map('modal-perfil-mapa').setView(centro, 15);
                
                // Adiciona o mapa base (OpenStreetMap)
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(modalMap);
                
                // Adiciona o Marcador (pino)
                L.marker(centro).addTo(modalMap);

                // Adiciona o Círculo (raio)
                const circulo = L.circle(centro, {
                    radius: raioKm * 1000,
                    color: "var(--cor-primaria)",
                    fillColor: "var(--cor-primaria)",
                    fillOpacity: 0.1,
                    weight: 2
                }).addTo(modalMap);

                // Ajusta o zoom para caber o círculo
                if(modalMap) {
                     modalMap.fitBounds(circulo.getBounds());
                }

                // [MUITO IMPORTANTE] Força o mapa a recalcular seu tamanho
                setTimeout(() => {
                    if (modalMap) {
                        modalMap.invalidateSize();
                    }
                }, 100); // Um pequeno delay garante a renderização

            } catch (e) {
                console.error("Erro ao iniciar o mapa do modal:", e);
                mapaDiv.innerHTML = "Erro ao carregar o mapa.";
            }
        }
    });

    // --- 4. LIMPEZA DO MAPA ---
    // Quando o modal for fechado, destrua a instância do mapa.
    // Isso é CRUCIAL para que ele possa ser reaberto corretamente.
    modalElement.addEventListener('hidden.bs.modal', () => {
        if (modalMap) {
            modalMap.remove();
            modalMap = null;
        }
    });


    // --- 5. LÓGICA DE ATIVAÇÃO ---
    // Delegação de evento: Escuta cliques no 'document'
    document.addEventListener('click', function(event) {
        // Verifica se o clique foi em um botão com a classe 'btn-abrir-perfil'
        const target = event.target.closest('.btn-abrir-perfil');
        
        if (target) {
            event.preventDefault();
            const userId = target.dataset.userId;
            if (userId) {
                abrirModalPerfil(userId);
            } else {
                console.warn("Botão 'btn-abrir-perfil' clicado, mas 'data-user-id' não foi encontrado.");
            }
        }
    });

} else {
    console.error("Elementos essenciais do modal (modalVerPerfil, modal-perfil-loading, modal-perfil-content) não foram encontrados. O script do modal não será executado.");
}