// Arquivo: js/mapa.cadastro-init.js
// Este arquivo é o "inicializador" (listener) do mapa.
// Ele é um MÓDULO e ouve o evento disparado pelo 'cadastro.js'.

// 1. Importa a função de inicialização real do script principal do mapa
// (Assumindo que mapa.cadastro.firebase.js exporta esta função)
import { inicializarMapaCadastro } from './mapa.cadastro.firebase.js';

// 2. Ouve o evento customizado que o 'cadastro.js' dispara
document.addEventListener('ApoiaMe:inicializarMapa', () => {
    
    console.log("Evento 'ApoiaMe:inicializarMapa' recebido. Inicializando o mapa...");

    // 3. Usa o setTimeout(0) para garantir que a 
    //    seção do formulário (display: block) seja renderizada
    //    pelo navegador ANTES de o Leaflet tentar medir o <div>.
    // Isso corrige o bug do mapa "estourado".
    setTimeout(() => {
        inicializarMapaCadastro();
    }, 0);
});