/* =========================================================
   DOCE ENCANTO — server.js (BACK-END)
   ========================================================= */

const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "troque-esta-chave-em-producao";

app.use(cors());
app.use(express.json());

const caminhoFrontend = path.join(__dirname, "..", "frontend");

app.use(express.static(caminhoFrontend));

app.get("/", (req, res) => {
  res.sendFile(path.join(caminhoFrontend, "login.html"));
});

console.log("Pasta que o servidor está usando:", caminhoFrontend);

// ---------- Middleware para proteger rotas ----------
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Correção feita aqui

  if (!token) {
    return res.status(401).json({ mensagem: "Token não informado." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuarioId = payload.id;
    next();
  } catch (erro) {
    return res.status(401).json({ mensagem: "Sessão inválida ou expirada." });
  }
}

// ---------- ROTA: Cadastro ----------
app.post("/api/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: "Preencha nome, e-mail e senha." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ mensagem: "A senha deve ter no mínimo 6 caracteres." });
  }

  try {
    const existente = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email);
    if (existente) {
      return res.status(409).json({ mensagem: "Este e-mail já está cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const resultado = db
      .prepare("INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)")
      .run(nome, email, senhaHash);

    return res.status(201).json({
      mensagem: "Conta criada com sucesso!",
      usuario: { id: resultado.lastInsertRowid, nome, email },
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ mensagem: "Erro interno ao criar a conta." });
  }
});

// ---------- ROTA: Login ----------
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: "Informe e-mail e senha." });
  }

  try {
    const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);

    if (!usuario) {
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos." });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos." });
    }

    const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      mensagem: "Login realizado com sucesso!",
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ mensagem: "Erro interno ao fazer login." });
  }
});

// ---------- ROTA: Login da equipe (painel administrativo) ----------
app.post("/api/admin/login", (req, res) => {
  const { senha } = req.body;

  if (!senha) {
    return res.status(400).json({ mensagem: "Informe a senha." });
  }

  if (senha !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ mensagem: "Senha incorreta." });
  }

  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: "8h" });
  return res.json({ mensagem: "Login realizado com sucesso!", token });
})

// ---------- ROTA PROTEGIDA: Perfil ----------
app.get("/api/perfil", verificarToken, (req, res) => {
  const usuario = db
    .prepare("SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?")
    .get(req.usuarioId);

  if (!usuario) {
    return res.status(404).json({ mensagem: "Usuário não encontrado." });
  }

  return res.json({ usuario });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor Doce Encanto rodando na porta ${PORT}`);
});
