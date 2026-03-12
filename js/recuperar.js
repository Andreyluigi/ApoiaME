// =====================
// Recuperar Senha - Interações
// =====================

(function(){
  const form = document.getElementById('form-recuperar');
  const email = document.getElementById('email-recuperar');
  const btnEnviar = document.getElementById('btn-enviar');
  const spinner = btnEnviar?.querySelector('.spinner-border');
  const labelBtn = btnEnviar?.querySelector('.label');

  const finalScreen = document.getElementById('final-screen');

  function setLoading(isLoading){
    if(!btnEnviar) return;
    btnEnviar.disabled = isLoading;
    if(spinner) spinner.classList.toggle('d-none', !isLoading);
    if(labelBtn) labelBtn.textContent = isLoading ? 'Enviando...' : 'Enviar link';
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if(!form.checkValidity()){
      form.classList.add('was-validated');
      return;
    }

    setLoading(true);

    try{
      const emailValue = email.value.trim();
      // TODO: Integração Firebase:
      // await sendPasswordResetEmail(auth, emailValue);

      // Simulação rápida
      await new Promise(res => setTimeout(res, 800));

      // Sucesso → troca de visão
      form.style.display = 'none';
      finalScreen.style.display = 'block';

      // Redirect automático
      setTimeout(() => {
        // Ajuste aqui se quiser outra rota:
        window.location.href = 'login.html';
      }, 2400);
    }catch(err){
      // Exemplo de tratamento básico
      alert('Não foi possível enviar o e-mail de recuperação. Tente novamente.');
      console.error('[Recuperar] erro:', err);
    }finally{
      setLoading(false);
    }
  });
})();
