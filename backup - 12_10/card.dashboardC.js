// Importações do Firebase
import { db } from './firebase-init.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// Função para carregar os anúncios em destaque
async function carregarAnunciosEmDestaque() {
  try {
    const anunciosRef = collection(db, 'anuncios');
    const q = query(anunciosRef, where('destaque', '==', true));  // Filtra os anúncios com destaque = true
    const querySnapshot = await getDocs(q);

    const listaAnunciosEl = document.getElementById('lista-anuncios');
    const cards = listaAnunciosEl.querySelectorAll('.anuncio-card');  // Seleciona os cards já existentes

    let anuncioCount = 0;

    // Se não houver anúncios em destaque, mantém os "Carregando..."
    if (querySnapshot.empty) {
      // Os cards já são exibidos com a mensagem "Carregando..."
    } else {
      querySnapshot.forEach((docSnap) => {
        if (anuncioCount < cards.length - 1) {  // Não substitui o card "Ver mais"
          const data = docSnap.data();
          const card = cards[anuncioCount];

          // Substitui os dados do card
          const img = card.querySelector('.anuncio-img');
          img.style.backgroundImage = `url(${data.fotos?.[0] || '../arquivos/default.jpg'})`;  // Imagem do Cloudinary ou default

          const titulo = card.querySelector('.anuncio-info h3');
          titulo.textContent = data.titulo || 'Sem título';

          const descricao = card.querySelector('.anuncio-info p');
          descricao.textContent = data.descricao || 'Sem descrição';

          // Adiciona o redirecionamento ao clicar no card
          card.addEventListener('click', () => {
            window.location.href = `anuncioD.html?id=${docSnap.id}`;  // Redireciona para a página do anúncio
          });

          anuncioCount++;
        }
      });

      // Se houver menos de 9 anúncios em destaque, preenche os cards restantes com "Carregando..."
      for (let i = anuncioCount; i < cards.length - 1; i++) {
        const card = cards[i];
        const img = card.querySelector('.anuncio-img');
        img.style.backgroundImage = '';  // Deixa a imagem em branco

        const titulo = card.querySelector('.anuncio-info h3');
        titulo.textContent = 'Carregando...';

        const descricao = card.querySelector('.anuncio-info p');
        descricao.textContent = 'Carregando descrição...';
      }
    }
  } catch (error) {
    console.error('Erro ao carregar os anúncios em destaque:', error);
  }
}

// Chama a função ao carregar a página
document.addEventListener('DOMContentLoaded', carregarAnunciosEmDestaque);
