// ===============================
// Minha Carteira - EntreGo (JS)
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  // Render ícones Lucide
  if (window.lucide?.createIcons) lucide.createIcons();
  // Notificação: Redireciona para a página de notificações
  const notifBtn = document.querySelector(".notif-btn");
  if (notifBtn) {
    notifBtn.addEventListener("click", () => {
      window.location.href = 'notificacaoC.html';  
    });
  }
  // -------------------------
  // Estado (mock local)
  // -------------------------
  const state = {
    saldo: 150.75,
    formas: [
      { id: 'pix', tipo: 'PIX', alias: 'Chave principal', meta: 'CPF •••.•••.•••-••' },
      { id: 'crd1', tipo: 'Crédito', alias: 'Visa final 1234', meta: 'Venc. 08/27' },
      { id: 'deb1', tipo: 'Débito', alias: 'Master final 9876', meta: 'Banco XPTO' },
    ],
    transacoes: [
      { data: '2025-09-03', desc: 'Entrega de frutas', cat: 'Serviço', valor: -28.50, tipo: 'saida', status: 'Concluído' },
      { data: '2025-09-01', desc: 'Depósito via PIX', cat: 'Recarga', valor: 100.00, tipo: 'entrada', status: 'Aprovado' },
      { data: '2025-08-30', desc: 'Troca de gás', cat: 'Serviço', valor: -75.00, tipo: 'saida', status: 'Concluído' },
      { data: '2025-08-28', desc: 'Cashback', cat: 'Promoção', valor: 5.00, tipo: 'entrada', status: 'Aprovado' },
    ],
    atualizadoEm: new Date(),
  };

  // -------------------------
  // Elementos
  // -------------------------
  const elSaldo = document.getElementById('saldo-valor');
  const elAtualizado = document.getElementById('saldo-atualizado');
  const elTransacoesMes = document.getElementById('saldo-transacoes');

  const listaFormas = document.getElementById('lista-formas');

  const tbody = document.getElementById('tabela-transacoes');
  const filtroTipo = document.getElementById('filtro-tipo');
  const filtroPeriodo = document.getElementById('filtro-periodo');
  const filtroBusca = document.getElementById('filtro-busca');

  const btnAddSaldo = document.getElementById('btn-adicionar-saldo');
  const btnRetirarSaldo = document.getElementById('btn-retirar-saldo');

  // Modal de logout
  const modalLogout = document.getElementById('logout-modal');
  const btnLogout = document.querySelector('.logout');
  const yes = document.getElementById('confirm-yes');
  const no = document.getElementById('confirm-no');
  

  // -------------------------
  // Utilidades
  // -------------------------
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtData = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');

  const nowLabel = () => {
    const d = state.atualizadoEm;
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  // -------------------------
  // Render
  // -------------------------
  function renderSaldo() {
    elSaldo.textContent = brl(state.saldo);
    elAtualizado.textContent = nowLabel();

    // Transações do mês corrente
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    const count = state.transacoes.filter(t => {
      const dt = new Date(t.data + 'T00:00:00');
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
    elTransacoesMes.textContent = String(count);
  }

  function formaIcon(tipo) {
    switch ((tipo || '').toLowerCase()) {
      case 'pix': return 'scan-line';
      case 'crédito':
      case 'credito': return 'credit-card';
      case 'débito':
      case 'debito': return 'credit-card';
      default: return 'wallet';
    }
  }

  function renderFormas() {
    listaFormas.innerHTML = '';
    state.formas.forEach(f => {
      const item = document.createElement('div');
      item.className = 'forma-item';
      item.innerHTML = `
        <div class="forma-top">
          <div class="forma-label"><i data-lucide="${formaIcon(f.tipo)}"></i> ${f.tipo} — ${f.alias}</div>
        </div>
        <div class="forma-meta">${f.meta || ''}</div>
      `;
      listaFormas.appendChild(item);
    });
    // Recria ícones
    lucide.createIcons();
  }

  function aplicaFiltros(tx) {
    const tipo = (filtroTipo.value || '').trim();
    const dias = parseInt(filtroPeriodo.value || '30', 10);
    const q = (filtroBusca.value || '').toLowerCase();

    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    return tx.filter(t => {
      const okTipo = !tipo || t.tipo === tipo;
      const okData = new Date(t.data + 'T00:00:00') >= limite;
      const okBusca = !q || `${t.desc} ${t.cat}`.toLowerCase().includes(q);
      return okTipo && okData && okBusca;
    });
  }

  function renderHistorico() {
    const tx = aplicaFiltros(state.transacoes);

    tbody.innerHTML = '';
    tx
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${fmtData(t.data)}</td>
          <td>${t.desc}</td>
          <td>${t.cat}</td>
          <td class="valor ${t.tipo}">${t.valor >= 0 ? '+' : ''}${brl(t.valor)}</td>
          <td><span class="badge ${t.tipo}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span> • ${t.status}</td>
        `;
        tbody.appendChild(tr);
      });
  }

  // -------------------------
  // Filtros do histórico
  // -------------------------
  [filtroTipo, filtroPeriodo].forEach(el => el.addEventListener('change', renderHistorico));
  filtroBusca.addEventListener('input', renderHistorico);

  // -------------------------
  // Botões saldo (simulação)
  // -------------------------
  btnAddSaldo.addEventListener('click', () => {
    const v = Number(prompt('Valor para adicionar (R$):', '50'));
    if (!isNaN(v) && v > 0) {
      state.saldo += v;
      state.transacoes.push({ 
        data: new Date().toISOString().slice(0,10), 
        desc: 'Depósito', 
        cat: 'Recarga', 
        valor: v, 
        tipo: 'entrada', 
        status: 'Aprovado' 
      });
      state.atualizadoEm = new Date();
      renderSaldo(); renderHistorico();
    }
  });

  btnRetirarSaldo.addEventListener('click', () => {
    const v = Number(prompt('Valor para retirar (R$):', '25'));
    if (!isNaN(v) && v > 0 && v <= state.saldo) {
      state.saldo -= v;
      state.transacoes.push({ 
        data: new Date().toISOString().slice(0,10), 
        desc: 'Saque', 
        cat: 'Retirada', 
        valor: -v, 
        tipo: 'saida', 
        status: 'Concluído' 
      });
      state.atualizadoEm = new Date();
      renderSaldo(); renderHistorico();
    } else {
      alert('Valor inválido ou saldo insuficiente.');
    }
  });

  // -------------------------
  // Logout modal
  // -------------------------
  const openLogout = () => { modalLogout.classList.add('show'); no.focus(); };
  const closeLogout = () => { modalLogout.classList.remove('show'); };
  btnLogout.addEventListener('click', openLogout);
  no.addEventListener('click', closeLogout);
  yes.addEventListener('click', () => window.location.href = '../html/login.html');
  modalLogout.addEventListener('click', (e) => { if (e.target === modalLogout) closeLogout(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLogout(); });

  // -------------------------
  // Inicialização
  // -------------------------
  renderSaldo();
  renderFormas();
  renderHistorico();
});
