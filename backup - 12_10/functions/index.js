const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mercadopago = require("mercadopago");

admin.initializeApp();
const db = admin.firestore();

// Configure o Mercado Pago com sua chave secreta lida do ambiente seguro
mercadopago.configure({
    access_token: functions.config().mercadopago.token,
});

/**
 * Esta função é chamada pelo seu site para criar um link de pagamento.
 */
exports.createPaymentPreference = functions.https.onCall(async (data, context) => {
    // 1. Verifica se o usuário está logado
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Você precisa estar logado para pagar.");
    }

    const pedidoId = data.pedidoId;
    if (!pedidoId) {
        throw new functions.https.HttpsError("invalid-argument", "O ID do pedido não foi fornecido.");
    }

    // 2. Busca o pedido no Firestore
    const pedidoRef = db.collection("pedidos").doc(pedidoId);
    const pedidoSnap = await pedidoRef.get();
    if (!pedidoSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Pedido não encontrado.");
    }
    
    const pedidoData = pedidoSnap.data();

    // 3. Cria a "preferência de pagamento" para o Mercado Pago
    const preference = {
        items: [{
            title: pedidoData.tituloAnuncio || "Serviço ApoiaMe",
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(pedidoData.precoBase) || 1.0,
        }],
        back_urls: {
            success: `https://apoia-5f5fk532f-andrey-luigis-projects.vercel.app/html/statusC.html?id=${pedidoId}`,
            failure: `https://apoia-5f5fk532f-andrey-luigis-projects.vercel.app/html/statusC.html?id=${pedidoId}`,
        },
        auto_return: "approved",
        external_reference: pedidoId, // Link crucial entre o pagamento e seu pedido
    };

    // 4. Envia para o Mercado Pago e retorna o link de pagamento para o cliente
    try {
        const response = await mercadopago.preferences.create(preference);
        return { init_point: response.body.init_point };
    } catch (error) {
        console.error("Erro ao criar preferência no Mercado Pago:", error);
        throw new functions.https.HttpsError("internal", "Falha ao comunicar com o gateway de pagamento.");
    }
});