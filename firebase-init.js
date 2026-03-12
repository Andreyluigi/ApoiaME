import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1ps6dSM2EtOkyg-xUeFky3S93j77qmII",
  authDomain: "apoia-me.firebaseapp.com",
  projectId: "apoia-me",
  storageBucket: "apoia-me.firebasestorage.app",
  messagingSenderId: "719321227710",
  appId: "1:719321227710:web:74e57959cbc564d09c19ef"
};

// inicializa
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// helpers para usuário
export async function criarPerfilUsuario(uid, dados) {
  await setDoc(doc(db, "usuarios", uid), {
    ...dados,
    atualizadoEm: serverTimestamp(),
    criadoEm: serverTimestamp()
  }, { merge: true });
}

export async function obterTipo(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data().tipo : null;
}
