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

    // ==========================================================
    // --- CORREÇÃO FINAL APLICADA AQUI ---
    // No backend (Admin SDK), a verificação é .exists (sem parênteses)
    if (!pedidoSnap.exists) { 
      return res.status(404).json({ message: "Pedido não encontrado." });
    }
    // ==========================================================
    
    const pedidoData = pedidoSnap.data();
    const preferenceData = {
      items: [{
        title: pedidoData.tituloAnuncio || "Serviço ApoiaMe",
        quantity: 1,
        currency_id: "BRL",
        unit_price: parseFloat(Number(pedidoData.precoBase).toFixed(2)) || 1.00,
      }],
      back_urls: {
        success: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`,
        failure: `https://${vercelUrl}/html/statusC.html?id=${pedidoId}`,
      },
      auto_return: "approved",
      external_reference: pedidoId,
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