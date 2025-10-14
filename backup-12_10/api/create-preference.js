
const { MercadoPagoConfig, Preference } = require("mercadopago");
const admin = require("firebase-admin");

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
    });
  } catch (e) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase Admin. Verifique a variável de ambiente FIREBASE_SERVICE_ACCOUNT.", e.message);
  }
}
const db = admin.firestore();

const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preference = new Preference(client);

module.exports = async (req, res) => {
  // Configurações de CORS
  const allowedOrigin = `https://${process.env.VERCEL_URL}`;
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Apenas o método POST é permitido.' });

  const { pedidoId } = req.body;
  if (!pedidoId) return res.status(400).json({ message: "O ID do pedido é obrigatório." });

  try {
    const pedidoRef = db.collection("pedidos").doc(pedidoId);
    const pedidoSnap = await pedidoRef.get();
    if (!pedidoSnap.exists()) return res.status(404).json({ message: "Pedido não encontrado." });
    
    const pedidoData = pedidoSnap.data();
    const preferenceData = {
      items: [{
        title: pedidoData.tituloAnuncio || "Serviço ApoiaMe",
        quantity: 1,
        currency_id: "BRL",
        unit_price: parseFloat(Number(pedidoData.precoBase).toFixed(2)) || 1.00,
      }],
      back_urls: {
        success: `${allowedOrigin}/html/statusC.html?id=${pedidoId}`,
        failure: `${allowedOrigin}/html/statusC.html?id=${pedidoId}`,
      },
      auto_return: "approved",
      external_reference: pedidoId,
    };

    const response = await preference.create({ body: preferenceData });

    if (response && response.init_point) {
      return res.status(200).json({ init_point: response.init_point });
    } else {
      // Se por algum motivo o init_point não vier, registramos o erro.
      console.error("Resposta do Mercado Pago não continha 'init_point'. Resposta:", response);
      throw new Error("Resposta inesperada do Mercado Pago.");
    }

  } catch (error) {
    console.error("ERRO FINAL no bloco try/catch:", error);
    return res.status(500).json({ message: "Erro interno do servidor ao criar pagamento." });
  }
};