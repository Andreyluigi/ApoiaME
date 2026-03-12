// Arquivo: js/destaques.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA1ps6dSM2EtOkyg-xUeFky3S93j77qmII",
    authDomain: "apoia-me.firebaseapp.com",
    projectId: "apoia-me",
    storageBucket: "apoia-me.firebasestorage.app",
    messagingSenderId: "719321227710",
    appId: "1:719321227710:web:74e57959cbc564d09c19ef"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function carregarTodosOsDestaques() {
    const container = document.getElementById('lista-completa-destaques');
    if (!container) {
        console.error("Container 'lista-completa-destaques' não encontrado.");
        return;
    }

    try {
        const anunciosRef = collection(db, 'anuncios');
        const q = query(anunciosRef, where('destaque', '==', true), orderBy('titulo')); // Ordena por título
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p>Nenhum anúncio em destaque encontrado no momento.</p>';
            return;
        }

        // Limpa a mensagem de "Carregando..."
        container.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // Cria o HTML para cada card dinamicamente
            const cardHTML = `
                <a href="anuncioD.html?id=${docSnap.id}" class="anuncio-card">
                    <div class="anuncio-img" style="background-image: url('${data.fotos?.[0] || '../arquivos/default.jpg'}');"></div>
                    <div class="anuncio-info">
                        <h3>${data.titulo || 'Sem título'}</h3>
                        <p>${data.descricao || 'Sem descrição'}</p>
                    </div>
                </a>
            `;
            // Adiciona o novo card ao container
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (error) {
        console.error('Erro ao carregar todos os anúncios em destaque:', error);
        container.innerHTML = '<p>Ocorreu um erro ao carregar os anúncios. Tente novamente mais tarde.</p>';
    }
}

// Chama a função quando a página terminar de carregar
document.addEventListener('DOMContentLoaded', carregarTodosOsDestaques);