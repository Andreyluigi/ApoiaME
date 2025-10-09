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