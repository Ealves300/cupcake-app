/* =========================================================
   DOCE ENCANTO — database.js
   Configura o banco de dados SQLite e cria a tabela de
   usuários automaticamente na primeira execução.
   ========================================================= */

const Database = require("better-sqlite3");
const path = require("path");

// O banco é salvo como um arquivo local: doceencanto.db
const db = new Database(path.join(__dirname, "doceencanto.db"));

// Cria a tabela de usuários, caso ainda não exista
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;