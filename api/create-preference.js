const { MercadoPagoConfig, Preference } = require("mercadopago");
const admin = require("firebase-admin");

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
  });
}
const db = admin.firestore();

const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preference = new Preference(client);

module.exports = async (req, res) => {
  const vercelUrl = process.env.VERCEL_URL;
  // Ajuste o CORS conforme sua necessidade de segurança
  res.setHeader('Access-Control-Allow-Origin', `https://${vercelUrl}`);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Apenas POST é permitido.' });

  const { pedidoId } = req.body;
  if (!pedidoId) return res.status(400).json({ message: "O ID do pedido é obrigatório." });

  try {
    const pedidoRef = db.collection("pedidos").doc(pedidoId);
    const pedidoSnap = await pedidoRef.get();

    if (!pedidoSnap.exists) { 
      return res.status(404).json({ message: "Pedido não encontrado." });
    }
    
    const pedidoData = pedidoSnap.data();

    // ==========================================================
    // --- LÓGICA FINANCEIRA ATUALIZADA (NOVEMBRO 2025) ---
    // ==========================================================
    
    let valorFinal = 0;
    // O front salva como 'titulo', mas mantemos 'tituloAnuncio' como fallback
    let tituloItem = pedidoData.titulo || pedidoData.tituloAnuncio || "Serviço ApoiaMe";

    // 1. Verifica se é um PEDIDO NOVO (com objeto financeiro e taxa calculada)
    if (pedidoData.financeiro && pedidoData.financeiro.valorTotalGateway) {
        valorFinal = parseFloat(pedidoData.financeiro.valorTotalGateway);
        tituloItem = `${tituloItem} (c/ taxas)`;
    } 
    // 2. Se não, usa o PEDIDO LEGADO (orcamentoMaximo ou precoBase)
    else {
        valorFinal = parseFloat(pedidoData.orcamentoMaximo || pedidoData.precoBase || 0);
    }

    // Validação de segurança para não cobrar zero ou negativo
    if (!valorFinal || valorFinal <= 0) {
        console.error("Erro: Valor do pedido inválido ou zero.", valorFinal);
        return res.status(400).json({ message: "Valor do pedido inválido para pagamento." });
    }

    // Garante que é um número com 2 casas decimais
    const unitPrice = parseFloat(valorFinal.toFixed(2));

    // ==========================================================

    const preferenceData = {
      items: [{
        title: tituloItem,
        quantity: 1,
        currency_id: "BRL",
        unit_price: unitPrice,
      }],
      back_urls: {
        success: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`,
        failure: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`,
        pending: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`, // Adicionado pending por segurança
      },
      auto_return: "approved",
      external_reference: pedidoId, // Importante para o Webhook saber qual pedido atualizar
    };

    const response = await preference.create({ body: preferenceData });

    if (response && response.init_point) {
      return res.status(200).json({ init_point: response.init_point });
    } else {
      console.error("Resposta do MP não continha 'init_point'. Resposta:", response);
      throw new Error("Resposta inesperada do Mercado Pago.");
    }

  } catch (error) {
    console.error("ERRO FINAL no bloco try/catch:", error);
    return res.status(500).json({ message: "Erro interno do servidor ao criar pagamento." });
  }
};