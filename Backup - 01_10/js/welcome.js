const menuintro = document.getElementById('menuintro');
//menu do cabecalho 1
if (menuintro) {
  const itensMenu = [
    { nome: 'Como Funciona', link: '#apresentacao' },
    { nome: 'Categorias', link: '#busca' },
    { nome: 'Sobre', link: '#sobre' },
    { nome: 'Contato', link: '#contato' },
  ];

  const paginaatual = window.location.pathname.split('/').pop();
//pra ver qual a pagina q ta aberta
  itensMenu.forEach(item => {
    const a = document.createElement('a');
    a.href = item.link;
    a.textContent = item.nome;
    menuintro.appendChild(a);

    if (item.link === paginaatual) {
      a.classList.add('ativo');
    }
    //pra deixar o item do cabecalho verdinho, de acordo se ele tiver na pagina 
  });
}