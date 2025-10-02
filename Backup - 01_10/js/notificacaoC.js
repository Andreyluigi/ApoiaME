lucide.createIcons();
// Exemplo de código para simular a atualização de notificações

document.addEventListener("DOMContentLoaded", function() {
    const notifications = [
        { title: "Seu pedido está a caminho!", message: "O seu pedido foi despachado e deve chegar em breve. Fique atento!", time: "10 minutos atrás" },
        { title: "Nova promoção!", message: "Desconto de 20% em compras acima de R$100. Aproveite!", time: "1 hora atrás" }
    ];

    const notificationsList = document.querySelector('.notifications-list');
    
    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('notification');
        
        notificationElement.innerHTML = `
            <div class="notification-content">
                <h3>${notification.title}</h3>
                <p>${notification.message}</p>
            </div>
            <div class="notification-time">${notification.time}</div>
        `;
        
        notificationsList.appendChild(notificationElement);
    });
});
