const menu = document.getElementById('menu');
//menu do cabecalho 2
if (menu) {
  const itensMenu2 = [
    { nome: 'Início', link: 'index.html' },
    { nome: 'Busca', link: 'busca.html' },
    { nome: 'Meus Pedidos', link: 'pedidos.html' },
    { nome: 'Notificações', link: '#notificacoes' },
    { nome: 'Perfil', link: 'perfil.html' }
  ];

  const paginaatual = window.location.pathname.split('/').pop();
//pra ver qual a pagina q ta aberta
  itensMenu2.forEach(item => {
    const a = document.createElement('a');
    a.href = item.link;
    a.textContent = item.nome;
    menu.appendChild(a);

    if (item.link === paginaatual) {
      a.classList.add('ativo');
    }
    //pra deixar o item do cabecalho verdinho, de acordo se ele tiver na pagina 
  });
}
function formatarCep(input) {
  input.value = input.value.replace(/\D/g, '')
                           .replace(/(\d{5})(\d)/, '$1-$2')
                           .slice(0, 9);
}

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