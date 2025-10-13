
// Importa as ferramentas necessárias
const { MercadoPagoConfig, Preference } = require("mercadopago");
const admin = require("firebase-admin");

// --- CONFIGURAÇÃO DAS CHAVES SECRETAS ---
// O código vai ler as chaves que você configurará no painel da Vercel.
// Isso mantém suas senhas seguras e fora do código.
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;

// --- INICIALIZAÇÃO DOS SERVIÇOS ---

// Inicializa a conexão segura com o Firebase (só é feito uma vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
  });
}
const db = admin.firestore();

// Inicializa o cliente do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preference = new Preference(client);

// --- A LÓGICA DA FUNÇÃO ---
// Esta é a função que a Vercel executará quando for chamada.
module.exports = async (req, res) => {
  // Configuração para permitir que seu site acesse esta função (CORS)
  const vercelUrl = process.env.VERCEL_URL || 'http://127.0.0.1:5500';
  res.setHeader('Access-Control-Allow-Origin', `https://${vercelUrl}`);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Garante que só requisições do tipo POST sejam aceitas
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas o método POST é permitido.' });
  }

  // Pega o ID do pedido que o frontend enviou
  const { pedidoId } = req.body;
  if (!pedidoId) {
    return res.status(400).json({ message: "O ID do pedido é obrigatório." });
  }

  try {
    // 1. Busca o pedido no Firestore para pegar o preço e o título
    const pedidoRef = db.collection("pedidos").doc(pedidoId);
    const pedidoSnap = await pedidoRef.get();
    if (!pedidoSnap.exists) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }
    const pedidoData = pedidoSnap.data();

    // 2. Cria o objeto de "preferência de pagamento" para o Mercado Pago
    const preferenceData = {
      items: [{
        title: pedidoData.tituloAnuncio || "Serviço ApoiaMe",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(pedidoData.precoBase) || 1.00,
      }],
      back_urls: { // Para onde o cliente volta após o pagamento
        success: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`,
        failure: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`,
      },
      auto_return: "approved",
      external_reference: pedidoId, // Link crucial entre o pagamento e seu pedido
    };

    // 3. Envia os dados para o Mercado Pago criar o link
    const response = await preference.create({ body: preferenceData });

    // 4. Retorna o link de pagamento para o frontend
    return res.status(200).json({ init_point: response.body.init_point });

  } catch (error) {
    console.error("Erro ao criar preferência de pagamento:", error);
    return res.status(500).json({ message: "Erro interno do servidor ao criar pagamento." });
  }
};