document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DIRECIONAMENTO DO BOTÃO ---
    // (Como você não quer <a href...>, faremos o direcionamento via JS)
    
    // Na sua página, o botão é <button class="btn btn-primary" id="btn-iniciar-pedido">Faça um pedido já!</button>
    // Se você mudou para o <a> da minha sugestão anterior, troque para #btn-iniciar-pedido
    const btnIniciarPedido = document.querySelector('.btn-primary'); // Seleciona o primeiro botão primário

    if (btnIniciarPedido) {
        btnIniciarPedido.addEventListener('click', (e) => {
            e.preventDefault(); // Previne qualquer comportamento padrão
            
            // Mostra um feedback de "carregando"
            btnIniciarPedido.disabled = true;
            btnIniciarPedido.innerHTML = 'Carregando...'; 
            
            // Direciona para a página do formulário
            window.location.href = '../html/form-novo-pedido.html';
        });
    } else {
        console.error("Botão de 'Iniciar Pedido' não encontrado.");
    }
    
    // --- 2. ANIMAÇÕES DE ENTRADA ---
    // (Isto fará a página aparecer suavemente)

    // Seleciona os elementos para animar
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroButtons = document.querySelector('.hero-buttons');
    const heroImage = document.querySelector('.hero-image-panel');

    // Um array com todos os elementos que queremos animar
    const elementsToAnimate = [heroTitle, heroSubtitle, heroButtons, heroImage];

    // 1. Imediatamente adiciona a classe 'animate-in' em todos.
    //    Isso os define como "invisíveis" (opacity: 0) antes da pintura.
    elementsToAnimate.forEach(el => {
        if (el) {
            el.classList.add('animate-in');
        }
    });

    // 2. Adiciona a classe "visible" com um pequeno atraso (stagger)
    //    para criar um efeito de "cascata" suave.
    setTimeout(() => { if (heroTitle) heroTitle.classList.add('visible'); }, 100);
    setTimeout(() => { if (heroSubtitle) heroSubtitle.classList.add('visible'); }, 200);
    setTimeout(() => { if (heroButtons) heroButtons.classList.add('visible'); }, 300);
    
    // A imagem entra um pouco depois do título
    setTimeout(() => { if (heroImage) heroImage.classList.add('visible'); }, 250); 
});