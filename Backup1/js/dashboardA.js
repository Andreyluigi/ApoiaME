//grafico

  const ctx = document.getElementById('graficoVendas').getContext('2d');
  const graficoVendas = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['01/08', '02/08', '03/08', '04/08', '05/08', '06/08'],  // Eixo horizontal (tempo)
      datasets: [{
        label: 'Total de Vendas Realizadas nos Últimos 7 Dias',
        data: [12, 19, 15, 25, 18, 30],  // Dados de vendas
        fill: false,
        borderColor: '#D32F2F',  // Linha vermelha
        tension: 0.1
      }, {
        label: 'Comparação com os 7 Dias Anteriores',
        data: [8, 15, 13, 18, 20, 25],  // Dados de comparação
        fill: false,
        borderColor: '#F48FB1',  // Linha rosa clara
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
// Script para alterar o gráfico conforme a seleção do período (Semana, Mês, Ano)
function changePeriod(period) {
  let labels = [];
  let data = [];

  if (period === 'week') {
    labels = ['01/08', '02/08', '03/08', '04/08', '05/08', '06/08'];
    data = [12, 19, 15, 25, 18, 30];
  } else if (period === 'month') {
    labels = ['01/08', '02/08', '03/08', '04/08', '05/08'];
    data = [20, 25, 22, 28, 30];
  } else if (period === 'year') {
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    data = [100, 150, 120, 180, 210, 250];
  }
  graficoVendas.data.labels = labels;
  graficoVendas.data.datasets[0].data = data;
  graficoVendas.update();
}
//ranking

const rankingData = [
  { pos: 1, user: 'João Silva', pedidos: 45, avatar: 'user1.jpg' },
  { pos: 2, user: 'Maria Souza', pedidos: 35, avatar: 'user2.jpg' },
  { pos: 3, user: 'Carlos Mendes', pedidos: 30, avatar: 'user3.jpg' },
  { pos: 4, user: 'Pedro Garro', pedidos: 25, avatar: 'user4.jpg' },
  { pos: 5, user: 'Matheus Franca', pedidos: 15, avatar: 'user5.jpg' },
  { pos: 6, user: 'Carlos Henrique', pedidos: 10, avatar: 'user6.jpg' },
  // Adicionar mais dados conforme necessário
];

// Preencher a tabela com os dados
const table = document.querySelector('.ranking-table');
rankingData.forEach(item => {
  const row = document.createElement('div');
  row.classList.add('ranking-row');
  row.innerHTML = `
    <div class="ranking-col pos">${item.pos}º</div>
    <div class="ranking-col user">
      <img src="${item.avatar}" alt="Usuário" class="avatar">
      <span>${item.user}</span>
    </div>
    <div class="ranking-col pedidos">${item.pedidos}</div>
  `;
  table.appendChild(row);
});
