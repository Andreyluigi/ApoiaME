document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide?.createIcons) lucide.createIcons();
  // Notificação: Redireciona para a página de notificações
  const notifBtn = document.querySelector(".notif-btn");
  if (notifBtn) {
    notifBtn.addEventListener("click", () => {
      window.location.href = 'notificacaoC.html';  
    });
  }
  // mock de usuários/conversas
  const me = { id: 'u_me', nome: 'Você', foto: '../arquivos/user.png' };
  const contatos = {
    u1: { id:'u1', nome:'João Silva', foto:'../arquivos/user.png', status:'online' },
    u2: { id:'u2', nome:'Maria Souza', foto:'../arquivos/user.png', status:'offline' }
  };
  const conversas = [
    {
      id:'c1', alvo:'u1', titulo:'João Silva', ultimo:'Estou a caminho.', hora:'09:10',
      mensagens: [
        { id:'m1', senderId:'u1', text:'Olá, estou a caminho da sua entrega!', ts: 1 },
        { id:'m2', senderId:'u_me', text:'Obrigado! Te aguardo.', ts: 2 }
      ]
    },
    {
      id:'c2', alvo:'u2', titulo:'Maria Souza', ultimo:'Gás entregue, obrigada!', hora:'Ontem',
      mensagens: [
        { id:'m3', senderId:'u_me', text:'Oi Maria, tudo certo com a troca?', ts: 1 },
        { id:'m4', senderId:'u2', text:'Tudo certo! Gás entregue, obrigada!', ts: 2 }
      ]
    }
  ];

  // elementos
  const lista = document.getElementById('lista-conversas');
  const buscaConversa = document.getElementById('busca-conversa');
  const chatTitulo = document.getElementById('chat-titulo');
  const chatStatus = document.getElementById('chat-status');
  const alvoFoto = document.getElementById('alvo-foto');
  const chatMensagens = document.getElementById('chat-mensagens');
  const form = document.getElementById('form-chat');
  const input = document.getElementById('msg');

  let conversaAtual = null;

  // render conversas
  function renderConversas(filtro = '') {
    const q = filtro.trim().toLowerCase();
    lista.innerHTML = '';
    conversas
      .filter(c => !q || c.titulo.toLowerCase().includes(q))
      .forEach((c, idx) => {
        const li = document.createElement('li');
        li.dataset.id = c.id;
        li.className = (conversaAtual?.id === c.id || (!conversaAtual && idx === 0)) ? 'active' : '';
        li.innerHTML = `
          <img src="${contatos[c.alvo]?.foto || '../arquivos/user.png'}" alt="${c.titulo}">
          <div style="flex:1">
            <div class="meta">
              <strong>${c.titulo}</strong>
              <span class="hora">${c.hora}</span>
            </div>
            <p style="margin:2px 0 0;color:#6b7280;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${c.ultimo}
            </p>
          </div>
        `;
        li.addEventListener('click', () => abrirConversa(c.id));
        lista.appendChild(li);
      });

    if (!conversaAtual && conversas.length) abrirConversa(conversas[0].id);
  }

  // abrir conversa
  function abrirConversa(id) {
    conversaAtual = conversas.find(c => c.id === id);
    document.querySelectorAll('#lista-conversas li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === id);
    });

    const alvo = contatos[conversaAtual.alvo];
    chatTitulo.textContent = conversaAtual.titulo;
    chatStatus.textContent = alvo?.status === 'online' ? 'Online' : 'Offline';
    alvoFoto.src = alvo?.foto || '../arquivos/user.png';

    renderMensagens(conversaAtual.mensagens);
  }

  // render mensagens
  function renderMensagens(msgs) {
    chatMensagens.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg ' + (m.senderId === me.id ? 'enviada' : 'recebida');
      div.textContent = m.text;
      chatMensagens.appendChild(div);
    });
    chatMensagens.scrollTop = chatMensagens.scrollHeight;
  }

  // enviar
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!conversaAtual) return;
    const text = input.value.trim();
    if (!text) return;

    const nova = { id: 'm' + Date.now(), senderId: me.id, text, ts: Date.now() };
    conversaAtual.mensagens.push(nova);
    conversaAtual.ultimo = text;
    renderMensagens(conversaAtual.mensagens);
    input.value = '';

    // simula resposta automática
    setTimeout(() => {
      const alvo = contatos[conversaAtual.alvo];
      const resp = { id: 'm' + (Date.now()+1), senderId: alvo.id, text: 'Ok, recebido!', ts: Date.now()+1 };
      conversaAtual.mensagens.push(resp);
      conversaAtual.ultimo = resp.text;
      renderMensagens(conversaAtual.mensagens);
      renderConversas(buscaConversa.value); // atualiza preview/ordem
    }, 900);
  });

  // filtro conversas
  buscaConversa.addEventListener('input', () => renderConversas(buscaConversa.value));

  // init
  renderConversas();
  if (window.lucide?.createIcons) lucide.createIcons();
});
