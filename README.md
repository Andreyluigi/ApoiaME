# 🤝 ApoiaMe

### *Conectando necessidades diárias à colaboração local e remuneração justa.*

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![FECAP](https://img.shields.io/badge/FECAP-PTI%20Inform%C3%A1tica-003366?style=for-the-badge)](https://www.fecap.br/)

---

🎓 **Projeto Técnico Interdisciplinar (PTI)** **Curso Técnico em Informática — Fundação Escola de Comércio Álvares Penteado (FECAP)**

</div>

<br />

## 📌 Sobre o Projeto

O **ApoiaMe** é uma plataforma C2C (*Customer-to-Customer*) desenvolvida com o objetivo de fortalecer o espírito comunitário e incentivar a economia local. A aplicação conecta pessoas que necessitam de auxílio em tarefas do cotidiano (como compras de supermercado, pequenas entregas ou tarefas domésticas rápidas) a moradores da própria região dispostos a realizar esses serviços em troca de uma remuneração justa e transparente.

A proposta une acessibilidade, tecnologia em tempo real e impacto social, oferecendo uma solução simples para problemas diários e promovendo a geração de renda extra de forma colaborativa.

---

## 🎯 Principais Funcionalidades

A plataforma foi projetada separando a experiência em dois perfis principais de usuários:

### 👤 Área do Cliente (Solicitante)
* **📝 Criação de Pedidos:** Cadastro rápido de tarefas com detalhamento, localização e oferta de remuneração.
* **📍 Matchmaking por Geolocalização:** Algoritmo de cruzamento de dados para conectar o pedido aos ajudantes mais próximos.
* **⏱️ Acompanhamento em Tempo Real:** Status atualizado instantaneamente a cada etapa da execução.
* **⭐ Sistema de Avaliação:** Opção de classificar o prestador e deixar feedbacks após a conclusão do serviço.

### 🛠️ Área do Fornecedor / Ajudante (Prestador)
* **📊 Dashboard de Oportunidades:** Visualização em tempo real de novos pedidos disponíveis na região.
* **📂 Gestão de Serviços:** Painel intuitivo para gerenciar tarefas em andamento e pendentes.
* **📈 Resumo Financeiro:** Gráficos interativos (gerados via Chart.js) para acompanhamento de ganhos e histórico de serviços realizados.
* **💬 Chat Integrado:** Comunicação direta entre cliente e prestador para alinhar detalhes da execução.
* **📋 Histórico de Atividades:** Registro completo de serviços concluídos e avaliações recebidas.

---

## 💻 Tecnologias Utilizadas

| Tecnologia | Descrição / Uso no Projeto |
| :--- | :--- |
| **HTML5 & CSS3** | Estruturação semântica e estilização moderna e responsiva da interface. |
| **JavaScript (Vanilla ES6+)** | Lógica da aplicação no cliente, manipulação do DOM e integração de APIs. |
| **Firebase Firestore** | Banco de Dados NoSQL em tempo real para sincronização instantânea de pedidos e mensagens. |
| **Firebase Authentication** | Gestão segura de cadastro, login e sessões de usuários. |
| **Chart.js** | Biblioteca visual para renderização de gráficos financeiros no Dashboard. |
| **Lucide Icons** | Conjunto de ícones vetoriais modernos e leves para enriquecer a experiência visual. |

---

## 🔄 Fluxo de Negócio

 O ciclo de funcionamento do **ApoiaMe** garante transparência e segurança do início ao fim:

```mermaid
graph TD
    A[📱 Cliente cria o pedido] --> B[🔔 Sistema notifica prestadores próximos]
    B --> C[🙋‍♂️ Prestador aceita a proposta]
    C --> D[💳 Cliente efetua o pagamento / confirmação]
    D --> E[🛵 Serviço é executado]
    E --> F[✅ Prestador marca como concluído]
    F --> G[⭐ Cliente confirma e avalia o serviço]
