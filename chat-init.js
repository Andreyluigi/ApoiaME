import { inicializarChat } from './chat.module.js';
import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Este código roda em todas as páginas que o importarem
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Lógica para detectar se a página é do ajudante ou do cliente
        const url = window.location.pathname;
        const ehPaginaAjudante = url.includes('dashboardA.html') || url.includes('statusA.html') || url.includes('pedidosA.html') || url.includes('carteiraA.html');
        
        const tipoUsuario = ehPaginaAjudante ? 'ajudante' : 'cliente';
        
        console.log(`Inicializando chat no modo: ${tipoUsuario}`);
        inicializarChat(tipoUsuario);
    }
});
