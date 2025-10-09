import { auth } from './firebase-init.js';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
const db = getFirestore();

document.addEventListener('DOMContentLoaded', () => {
  // Verifique se o usuário está logado e aguarde a autenticação
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // O usuário está logado
      loadUserData(user.uid);
    } else {
      console.log("Usuário não autenticado.");
      // Redirecionar para página de login ou mostrar um alerta
      window.location.href = "login.html";  // Exemplo de redirecionamento
    }
  });
});

// Função para carregar os dados do usuário
async function loadUserData(uid) {
  const userDocRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    
    // Preenche os campos com os dados do usuário
    document.querySelector('input[placeholder="Ex: João Silva"]').value = userData.nome || '';
    document.querySelector('input[placeholder="Aparecerá em seu perfil, anúncios e chats."]').value = userData.nickname || '';
    document.querySelector('input[placeholder="(11) 99999-9999"]').value = userData.telefone || '';
    
    // Gênero
    if (userData.genero) {
      document.querySelector(`input[value="${userData.genero}"]`).checked = true;
    }
    
  } else {
    console.log("Documento do usuário não encontrado.");
  }
}

// Função para salvar os dados editados
document.querySelector('button[type="submit"]').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const nome = document.querySelector('input[placeholder="Ex: João Silva"]').value.trim();
  const nickname = document.querySelector('input[placeholder="Aparecerá em seu perfil, anúncios e chats."]').value.trim();
  const telefone = document.querySelector('input[placeholder="(11) 99999-9999"]').value.trim();
  const genero = document.querySelector('input[name="gender"]:checked').value;

  // Verificando se os campos obrigatórios estão preenchidos
  if (!nome ) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  // Salvar os dados no Firestore
  const user = auth.currentUser;
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      await setDoc(userDocRef, {
        nome,
        nickname,
        telefone,
        genero,
      }, { merge: true });
      
      alert("Dados salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      alert("Erro ao salvar os dados. Tente novamente.");
    }
  }
});

// Função para alterar a senha
document.getElementById("senha-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const senhaAtual = document.getElementById("senha-atual").value.trim();
  const novaSenha = document.getElementById("nova-senha").value.trim();
  const confirmarSenha = document.getElementById("confirmar-senha").value.trim();

  // Verificando se as senhas coincidem
  if (novaSenha !== confirmarSenha) {
    alert("A nova senha e a confirmação de senha não coincidem.");
    return;
  }

  if (novaSenha.length < 6) {
    alert("A nova senha deve ter pelo menos 6 caracteres.");
    return;
  }

  // Obtenha o usuário atual
  const user = auth.currentUser;
  if (!user) {
    alert("Usuário não autenticado.");
    return;
  }

  try {
    // Reautenticação necessária para alterar a senha
    const credential = EmailAuthProvider.credential(user.email, senhaAtual);
    await reauthenticateWithCredential(user, credential);

    // Atualizar a senha
    await updatePassword(user, novaSenha);

    alert("Senha alterada com sucesso!");

    // Limpar os campos
    document.getElementById("senha-form").reset();

  } catch (error) {
    console.error("Erro ao alterar a senha:", error);
    if (error.code === 'auth/wrong-password') {
      alert("A senha atual está incorreta.");
    } else {
      alert("Ocorreu um erro ao tentar alterar a senha. Tente novamente.");
    }
  }
});

// ENDERECO
// Função para salvar o endereço
export async function salvarEndereco() {
  const rua = document.getElementById('rua').textContent.replace('Rua: ', '');
  const bairro = document.getElementById('bairro').textContent.replace('Bairro: ', '');
  const cidade = document.getElementById('cidade').textContent.replace('Cidade: ', '');
  const uf = document.getElementById('uf').textContent.replace('Estado: ', '');
  const ddd = document.getElementById('ddd').textContent.replace('DDD: ', '');
  const numero = document.getElementById('numero').value;
  const complemento = document.getElementById('complemento').value;
  const referencia = document.getElementById('referencia').value;

  const endereco = {
    rua,
    bairro,
    cidade,
    uf,
    ddd,
    numero,
    complemento,
    referencia,
  };

  const user = auth.currentUser;
  if (user) {
    try {
      console.log('Tentando salvar o endereço:', endereco);  // Debug: Mostra o endereço antes de salvar
      const userDocRef = doc(db, 'usuarios', user.uid);
      const enderecoRef = collection(userDocRef, 'enderecos');
      await setDoc(doc(enderecoRef), endereco);
      console.log('Endereço salvo com sucesso!');
      alert('Endereço salvo com sucesso!');
      
      // Chama a função para exibir os endereços após salvar
      mostrarEnderecos(); 
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      alert('Erro ao salvar o endereço. Tente novamente.');
    }
  }
}

// Função para mostrar os endereços salvos e gerar checkboxes
export async function mostrarEnderecos() {
  const listaEnderecos = document.getElementById('listaEnderecos');
  const user = auth.currentUser;
  const checkboxList = document.getElementById('checkboxList');

  // Verifica se o usuário está logado
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log('Usuário logado:', user.uid);  // Debug: Verificando o ID do usuário logado
      try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const enderecoRef = collection(userDocRef, 'enderecos');
        getDocs(enderecoRef)
          .then(querySnapshot => {
            console.log('Endereços encontrados:', querySnapshot.size);  // Debug: Mostra o número de endereços encontrados
            listaEnderecos.innerHTML = ''; // Limpa a lista antes de adicionar os novos endereços
            checkboxList.innerHTML = '';  // Limpa a lista de checkboxes antes de criar novas
            querySnapshot.forEach(doc => {
              const endereco = doc.data();
              console.log('Endereço encontrado:', endereco);  // Debug: Mostra os dados do endereço

              // Exibe os endereços normalmente
              const enderecoDiv = document.createElement('div');
              enderecoDiv.classList.add('endereco-item');
              enderecoDiv.innerHTML = `
                <p><strong>Rua:</strong> ${endereco.rua}</p>
                <p><strong>Bairro:</strong> ${endereco.bairro}</p>
                <p><strong>Cidade:</strong> ${endereco.cidade}</p>
                <p><strong>Estado:</strong> ${endereco.uf}</p>
                <p><strong>DDD:</strong> ${endereco.ddd}</p>
                <p><strong>Número:</strong> ${endereco.numero}</p>
                <p><strong>Complemento:</strong> ${endereco.complemento}</p>
                <p><strong>Referência:</strong> ${endereco.referencia}</p>
              `;
              listaEnderecos.appendChild(enderecoDiv);

              // Cria uma checkbox para cada endereço
              const checkboxDiv = document.createElement('div');
              checkboxDiv.classList.add('checkbox-item');
              checkboxDiv.innerHTML = `
                <input type="checkbox" id="${doc.id}" value="${doc.id}">
                <label for="${doc.id}">Endereço: ${endereco.rua}, ${endereco.bairro}</label>
              `;
              checkboxList.appendChild(checkboxDiv);
            });
          })
          .catch(error => {
            console.error('Erro ao recuperar endereços:', error);
            alert('Erro ao carregar os endereços.');
          });
      } catch (error) {
        console.error('Erro ao recuperar os dados do usuário:', error);
      }
    } else {
      console.log('Nenhum usuário logado!');  // Debug: Se não houver usuário logado
    }
  });
}

// Função para apagar endereços selecionados
export async function apagarEnderecos() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  const user = auth.currentUser;

  if (user) {
    checkboxes.forEach(async (checkbox) => {
      const enderecoId = checkbox.value;
      try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const enderecoRef = doc(userDocRef, 'enderecos', enderecoId);
        await deleteDoc(enderecoRef);  // Apaga o endereço do Firestore
        console.log(`Endereço ${enderecoId} apagado com sucesso!`);
      } catch (error) {
        console.error('Erro ao apagar endereço:', error);
      }
    });
    // Após apagar, atualizar a lista de endereços
    mostrarEnderecos();
  } else {
    console.log('Nenhum usuário logado!');  // Debug: Se não houver usuário logado
  }
}

// Função para cancelar a seleção
export function cancelarEdicao() {
  document.getElementById('checkboxContainer').style.display = 'none'; // Esconde os checkboxes
  document.getElementById('editarBtn').style.display = 'inline-block'; // Mostra novamente o botão de editar
}

// Exibe os endereços logo ao carregar a página
window.onload = function () {
  mostrarEnderecos();  // Exibe os endereços ao carregar a página
};
