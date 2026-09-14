/* =========================================================
   DOCE ENCANTO — login.js (FRONT-END)
   Roda no navegador. NÃO acessa o banco de dados diretamente
   — conversa com o servidor (server.js) via fetch() para a API.
   ========================================================= */

// Como login.html é servido pelo próprio server.js (mesma origem),
// dá para usar um caminho relativo em vez de "http://localhost:3000".
const API_URL = 'https://cupcake-app-6c03.onrender.com/api';

// ---------- Elementos da tela ----------
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.querySelector(".btn-entrar");
const lembrarCheckbox = document.querySelector('.remember input[type="checkbox"]');

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

// ---------- Envio do formulário de LOGIN ----------
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

      // vai para onde a pessoa estava tentando ir (ex: pagamento) ou para a conta por padrão
      const destino = localStorage.getItem("doceEncantoRedirect") || "catalogo.html";
      localStorage.removeItem("doceEncantoRedirect");

      setTimeout(() => {
        window.location.href = destino;
      }, 1200);
    } catch (erro) {
      console.error("Erro ao conectar com o servidor:", erro);
      mostrarMensagem("Não foi possível conectar ao servidor. Verifique se ele está rodando.");
    } finally {
      definirCarregando(false);
    }
  });
}

// ---------- Login social (placeholders — exigem configuração extra no servidor) ----------
document.querySelectorAll(".btn-social").forEach((botao) => {
  botao.addEventListener("click", () => {
    const provedor = botao.textContent.includes("Google") ? "google" : "facebook";
    mostrarMensagem(`Login com ${provedor === "google" ? "Google" : "Facebook"} ainda não foi configurado no servidor.`);
  });
});