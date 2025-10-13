const { MercadoPagoConfig, Preference } = require("mercadopago");
const admin = require("firebase-admin");

console.log("--- DEBUG: Módulo da função iniciado ---");

// --- CONFIGURAÇÃO E INICIALIZAÇÃO ---
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;

// DEBUG: Verifica se as variáveis de ambiente foram lidas
console.log(`--- DEBUG: Chave do Mercado Pago lida? ${!!MERCADOPAGO_ACCESS_TOKEN}`);
console.log(`--- DEBUG: Chave do Firebase lida? ${!!FIREBASE_SERVICE_ACCOUNT_JSON}`);

// Inicializa o Firebase Admin
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
        });
        console.log("--- DEBUG: Firebase Admin inicializado com sucesso! ---");
    }
} catch (e) {
    console.error("--- DEBUG: FALHA CRÍTICA AO INICIALIZAR FIREBASE ADMIN ---", e.message);
    // Se o erro acontecer aqui, o JSON da chave do Firebase está formatado incorretamente.
}
const db = admin.firestore();

// Inicializa o Mercado Pago
const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preference = new Preference(client);

// --- A LÓGICA DA FUNÇÃO ---
module.exports = async (req, res) => {
    console.log("--- DEBUG: Função foi chamada! Método:", req.method);

    // ... (código de CORS e verificação do método POST) ...

    const { pedidoId } = req.body;
    console.log("--- DEBUG: Pedido ID recebido do frontend:", pedidoId);

    if (!pedidoId) {
        return res.status(400).json({ message: "O ID do pedido é obrigatório." });
    }

    try {
        console.log("--- DEBUG: Passo 1 - Buscando pedido no Firestore...");
        const pedidoRef = db.collection("pedidos").doc(pedidoId);
        const pedidoSnap = await pedidoRef.get();

        if (!pedidoSnap.exists) {
            console.error("--- DEBUG: ERRO - Pedido não encontrado no Firestore com o ID:", pedidoId);
            return res.status(404).json({ message: "Pedido não encontrado." });
        }
        const pedidoData = pedidoSnap.data();
        console.log("--- DEBUG: Passo 2 - Pedido encontrado:", pedidoData);

        const preferenceData = {
            items: [{
                title: pedidoData.tituloAnuncio || "Serviço ApoiaMe",
                quantity: 1,
                currency_id: "BRL",
                unit_price: Number(pedidoData.precoBase) || 1.00,
            }],
            back_urls: {
                success: `https://apoia-5f5fk532f-andrey-luigis-projects.vercel.app/html/statusC.html?id=${pedidoId}`,
                failure: `https://apoia-5f5fk532f-andrey-luigis-projects.vercel.app/html/statusC.html?id=${pedidoId}`,
            },
            auto_return: "approved",
            external_reference: pedidoId,
        };
        console.log("--- DEBUG: Passo 3 - Preparando para chamar a API do Mercado Pago com estes dados:", JSON.stringify(preferenceData, null, 2));

        const response = await preference.create({ body: preferenceData });
        console.log("--- DEBUG: Passo 4 - Resposta recebida do Mercado Pago.");

        // O erro original acontecia aqui.
        if (!response || !response.body || !response.body.init_point) {
             console.error("--- DEBUG: FALHA - A resposta do Mercado Pago veio sem 'body' ou sem 'init_point'. Resposta completa:", response);
             throw new Error("Resposta inesperada do Mercado Pago.");
        }
        
        console.log("--- DEBUG: Passo 5 - Sucesso! Retornando o link de pagamento.");
        return res.status(200).json({ init_point: response.init_point });

    } catch (error) {
        console.error("--- DEBUG: FALHA CRÍTICA DENTRO DO BLOCO TRY/CATCH ---", error);
        return res.status(500).json({ message: "Erro interno do servidor." });
    }
};