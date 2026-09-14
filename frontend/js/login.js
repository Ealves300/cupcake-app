/* =========================================================
   DOCE ENCANTO — login.js (FRONT-END)
   Roda no navegador. NÃO acessa o banco de dados diretamente
   — conversa com o servidor (server.js) via fetch() para a API.
   ========================================================= */

const API_URL = 'https://cupcake-app-6c03.onrender.com/api';

// ⚠️ TROQUE PELOS SEUS IDs REAIS (Google Cloud Console / Facebook for Developers)
const GOOGLE_CLIENT_ID = "SEU_CLIENT_ID_DO_GOOGLE.apps.googleusercontent.com";
const FACEBOOK_APP_ID = "SEU_APP_ID_DO_FACEBOOK";

// ---------- Elementos da tela ----------
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.querySelector(".btn-entrar");
const lembrarCheckbox = document.querySelector('.remember input[type="checkbox"]');
const botoesSociais = document.querySelectorAll(".btn-social");
const btnGoogle = botoesSociais[0];
const btnFacebook = botoesSociais[1];

// cria uma área de mensagens de erro/sucesso, caso ainda não exista no HTML
let mensagemBox = document.getElementById("mensagem-box");
if (!mensagemBox && form) {
  mensagemBox = document.createElement("div");
  mensagemBox.id = "mensagem-box";
  mensagemBox.style.cssText = `
    display:none;
    text-align:center;
    font-size:0.85rem;
    font-weight:500;
    padding:10px 14px;
    border-radius:12px;
    margin-bottom:14px;
  `;
  form.parentNode.insertBefore(mensagemBox, form);
}

// ---------- Mostrar / ocultar senha ----------
function toggleSenha() {
  const isPassword = senhaInput.type === "password";
  senhaInput.type = isPassword ? "text" : "password";
  const olho = document.querySelector(".toggle-eye");
  if (olho) olho.textContent = isPassword ? "🙈" : "👁";
}

// ---------- Utilitários ----------
function mostrarMensagem(texto, tipo = "erro") {
  mensagemBox.textContent = texto;
  mensagemBox.style.display = "block";
  mensagemBox.style.background = tipo === "erro" ? "#fde2e6" : "#e3f7e6";
  mensagemBox.style.color = tipo === "erro" ? "#a13a52" : "#2e7d32";
}

function esconderMensagem() {
  if (mensagemBox) mensagemBox.style.display = "none";
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function definirCarregando(carregando) {
  btnEntrar.disabled = carregando;
  btnEntrar.innerHTML = carregando ? "Entrando..." : "🧁 Entrar →";
}

// ---------- Guarda o token de sessão no navegador ----------
function salvarSessao(token, usuario) {
  const storage = lembrarCheckbox && lembrarCheckbox.checked
    ? localStorage
    : sessionStorage;
  storage.setItem("doceencanto_token", token);
  storage.setItem("doceencanto_usuario", JSON.stringify(usuario));
}

// ---------- Redireciona após login bem-sucedido ----------
function irParaDestino() {
  const destino = localStorage.getItem("doceEncantoRedirect") || "catalogo.html";
  localStorage.removeItem("doceEncantoRedirect");
  setTimeout(() => {
    window.location.href = destino;
  }, 1200);
}

// ---------- Envio do formulário de LOGIN (e-mail e senha) ----------
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    esconderMensagem();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!validarEmail(email)) {
      mostrarMensagem("Digite um e-mail válido.");
      emailInput.focus();
      return;
    }

    if (senha.length < 6) {
      mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.");
      senhaInput.focus();
      return;
    }

    definirCarregando(true);

    try {
      const resposta = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarMensagem(dados.mensagem || "E-mail ou senha incorretos.");
        return;
      }

      salvarSessao(dados.token, dados.usuario);
      mostrarMensagem(`Bem-vinda(o) de volta, ${dados.usuario.nome}!`, "sucesso");
      irParaDestino();
    } catch (erro) {
      console.error("Erro ao conectar com o servidor:", erro);
      mostrarMensagem("Não foi possível conectar ao servidor. Verifique se ele está rodando.");
    } finally {
      definirCarregando(false);
    }
  });
}

/* =========================================================
   LOGIN SOCIAL — GOOGLE
   Requer o script no HTML, antes do </body>:
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ========================================================= */

function inicializarGoogle() {
  if (typeof google === "undefined" || !google.accounts) {
    console.warn("SDK do Google ainda não carregou.");
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response) => {
      // response.credential é o ID token assinado pelo Google
      await enviarLoginSocial("google", response.credential);
    },
  });
}

if (btnGoogle) {
  btnGoogle.addEventListener("click", () => {
    if (typeof google === "undefined" || !google.accounts) {
      mostrarMensagem("Não foi possível carregar o login do Google. Tente novamente.");
      return;
    }
    google.accounts.id.prompt(); // abre o popup/one-tap do Google
  });
}

// o SDK do Google chama window.onload — inicializamos aqui sem sobrescrever outros usos
window.addEventListener("load", inicializarGoogle);

/* =========================================================
   LOGIN SOCIAL — FACEBOOK
   Requer o script no HTML, antes do </body>:
   <script src="https://connect.facebook.net/pt_BR/sdk.js" async defer></script>
   ========================================================= */

window.fbAsyncInit = function () {
  FB.init({
    appId: FACEBOOK_APP_ID,
    cookie: true,
    xfbml: false,
    version: "v19.0",
  });
};

if (btnFacebook) {
  btnFacebook.addEventListener("click", () => {
    if (typeof FB === "undefined") {
      mostrarMensagem("Não foi possível carregar o login do Facebook. Tente novamente.");
      return;
    }
    FB.login(
      (response) => {
        if (response.authResponse) {
          enviarLoginSocial("facebook", response.authResponse.accessToken);
        } else {
          mostrarMensagem("Login com Facebook cancelado.");
        }
      },
      { scope: "email,public_profile" }
    );
  });
}

/* =========================================================
   Envia o token do provedor social pro backend validar
   e devolver o MESMO formato { token, usuario } do login normal
   ========================================================= */
async function enviarLoginSocial(provedor, tokenProvedor) {
  esconderMensagem();
  definirCarregando(true);

  try {
    const resposta = await fetch(`${API_URL}/login/${provedor}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenProvedor }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem(dados.mensagem || `Não foi possível entrar com ${provedor === "google" ? "Google" : "Facebook"}.`);
      return;
    }

    salvarSessao(dados.token, dados.usuario);
    mostrarMensagem(`Bem-vinda(o), ${dados.usuario.nome}!`, "sucesso");
    irParaDestino();
  } catch (erro) {
    console.error(`Erro no login com ${provedor}:`, erro);
    mostrarMensagem("Não foi possível conectar ao servidor. Verifique se ele está rodando.");
  } finally {
    definirCarregando(false);
  }
}