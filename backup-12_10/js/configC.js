// Controlando as abas
const tabs = document.querySelectorAll('.tab');
const sections = document.querySelectorAll('.section');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remover a classe 'active' de todas as abas e seções
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    // Adicionar a classe 'active' à aba e seção selecionadas
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

// Função para formatar o CEP
function formatarCep(input) {
  input.value = input.value.replace(/\D/g, '')  // Remove caracteres não numéricos
                           .replace(/(\d{5})(\d)/, '$1-$2')  // Formata o CEP como 00000-000
                           .slice(0, 9);  // Limita o comprimento
}


// Função para buscar o CEP
function buscarCep() {
  const cep = document.getElementById('cep').value.trim().replace('-', '');
  const rua = document.getElementById('rua');
  const bairro = document.getElementById('bairro');
  const cidade = document.getElementById('cidade');
  const uf = document.getElementById('uf');
  const ddd = document.getElementById('ddd');
  const cepInfo = document.getElementById('cepInfo');

  if (cep === '' || cep.length < 8) {
    alert('Digite um CEP válido!');
    return;
  }

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(response => {
      if (!response.ok) throw new Error('Erro ao buscar o CEP.');
      return response.json();
    })
    .then(data => {
      if (data.erro) throw new Error('CEP não encontrado.');

      rua.textContent = `Rua: ${data.logradouro}`;
      bairro.textContent = `Bairro: ${data.bairro}`;
      cidade.textContent = `Cidade: ${data.localidade}`;
      uf.textContent = `Estado: ${data.uf}`;
      ddd.textContent = `DDD: ${data.ddd}`;

      cepInfo.style.display = 'block';
    })
    .catch(error => {
      alert(error.message);
      cepInfo.style.display = 'none';
    });
}