document.addEventListener("DOMContentLoaded", () => {
    
    // --- LÓGICA 1: MOSTRAR/OCULTAR SENHA ("Olhinho") ---
    // (Esta parte do seu código está perfeita e foi mantida)
    document.querySelectorAll('.toggle-senha').forEach(btn => {
        btn.addEventListener('click', () => {
            const alvoId = btn.getAttribute('data-target');
            const input = document.getElementById(alvoId);
            if (!input) return;

            const novoTipo = input.type === 'password' ? 'text' : 'password';
            input.type = novoTipo;

            // Alterna o ícone
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        });
    });

    // --- LÓGICA 2: VALIDAÇÃO VISUAL DO BOOTSTRAP ---
    // (Esta parte do seu código também está perfeita e foi mantida)
    const forms = document.querySelectorAll('.needs-validation');
    
    // Loop sobre os formulários para aplicar a validação no submit
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    
    // --- LÓGICA 3: STUB DE SUBMISSÃO DO FORMULÁRIO ---
    // (Onde o seu `login-auth.js` será chamado)
    const formLogin = document.getElementById('form-login');
    
    formLogin?.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        // A validação do Bootstrap (Lógica 2) já foi acionada aqui
        
        if (formLogin.checkValidity()) {
            // Se o formulário for válido (HTML5 + Bootstrap)
            console.log("Formulário válido. Chamando lógica de autenticação...");
            
            // ** ONDE SEU CÓDIGO FIREBASE ENTRARÁ **
            // No futuro, o `login-auth.js` pegará este evento
            // e fará a chamada para o Firebase Auth.
            // Ex: handleLogin(email, senha);
        } else {
            console.log("Formulário inválido.");
        }
    });

});