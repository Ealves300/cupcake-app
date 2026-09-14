/* =========================================================
   DOCE ENCANTO — cadastro.js (FRONT-END)
   Valida o formulário no navegador e envia os dados para a
   API (POST /api/cadastro), que salva no banco SQLite via
   server.js + database.js.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  // Mesma origem do server.js, então caminho relativo funciona.
  const API_URL = 'https://cupcake-app-6c03.onrender.com/api';

  const form = document.getElementById('signupForm');
  const btn = document.getElementById('btnSubmit');
  const overlay = document.getElementById('successOverlay');

  const fields = {
    nome: document.getElementById('nome'),
    email: document.getElementById('email'),
    senha: document.getElementById('senha'),
    confirmarSenha: document.getElementById('confirmarSenha'),
    termos: document.getElementById('termos')
  };

  // ---------- Mostrar/ocultar senha ----------
  document.querySelectorAll('.icon-right[data-target]').forEach(btnEl => {
    btnEl.addEventListener('click', () => {
      const input = document.getElementById(btnEl.dataset.target);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btnEl.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    });
  });

  function setMsg(id, text, ok) {
    const el = document.getElementById('msg-' + id);
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
  }

  function markInvalid(input, invalid) {
    input.classList.toggle('invalid', !!invalid);
  }

  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // Apenas letras (com acentos) e espaços — sem números ou símbolos
  const REGEX_NOME = /^[a-zà-öø-ÿ\s]+$/i;

  function nomeValido(v) {
    if (!REGEX_NOME.test(v)) return false;
    // Exige nome + sobrenome (pelo menos duas palavras de verdade)
    const palavras = v.trim().split(/\s+/).filter(p => p.length > 1);
    return palavras.length >= 2;
  }

  // ---------- Nome: força minúsculas e bloqueia caracteres inválidos em tempo real ----------
  fields.nome.addEventListener('input', () => {
    const cursor = fields.nome.selectionStart;
    const antes = fields.nome.value.length;
    fields.nome.value = fields.nome.value
      .toLowerCase()
      .replace(/[^a-zà-öø-ÿ\s]/g, ''); // remove números, símbolos, emojis etc.
    const depois = fields.nome.value.length;
    // Reposiciona o cursor considerando os caracteres removidos
    if (cursor !== null) {
      fields.nome.selectionStart = fields.nome.selectionEnd = cursor - (antes - depois);
    }
  });

  // ---------- Validação no navegador (feedback rápido) ----------
  function validar() {
    let valido = true;

    // Colapsa espaços duplos e remove espaços nas pontas antes de validar
    const nome = fields.nome.value.trim().replace(/\s+/g, ' ');
    fields.nome.value = nome;

    if (nome.length < 3) {
      setMsg('nome', 'Digite seu nome completo.');
      markInvalid(fields.nome, true);
      valido = false;
    } else if (!nomeValido(nome)) {
      setMsg('nome', 'Use apenas letras e informe nome e sobrenome.');
      markInvalid(fields.nome, true);
      valido = false;
    } else {
      setMsg('nome', '');
      markInvalid(fields.nome, false);
    }

    const email = fields.email.value.trim();
    if (!emailValido(email)) {
      setMsg('email', 'Digite um e-mail válido.');
      markInvalid(fields.email, true);
      valido = false;
    } else {
      setMsg('email', '');
      markInvalid(fields.email, false);
    }

    const senha = fields.senha.value;
    if (senha.length < 6) {
      setMsg('senha', 'A senha precisa ter ao menos 6 caracteres.');
      markInvalid(fields.senha, true);
      valido = false;
    } else if (senha.toLowerCase().includes(nome.split(' ')[0]) || senha.toLowerCase() === email.toLowerCase()) {
      setMsg('senha', 'A senha não pode conter seu nome ou e-mail.');
      markInvalid(fields.senha, true);
      valido = false;
    } else {
      setMsg('senha', '');
      markInvalid(fields.senha, false);
    }

    const confirmar = fields.confirmarSenha.value;
    if (confirmar !== senha || confirmar.length === 0) {
      setMsg('confirmarSenha', 'As senhas não coincidem.');
      markInvalid(fields.confirmarSenha, true);
      valido = false;
    } else {
      setMsg('confirmarSenha', '');
      markInvalid(fields.confirmarSenha, false);
    }

    if (!fields.termos.checked) {
      setMsg('termos', 'É preciso aceitar os termos para continuar.');
      valido = false;
    } else {
      setMsg('termos', '');
    }

    return valido;
  }

  ['nome', 'email', 'senha', 'confirmarSenha'].forEach(id => {
    fields[id].addEventListener('blur', validar);
  });
  fields.termos.addEventListener('change', validar);

  // ---------- Envio para a API de verdade ----------
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    setMsg('servidor', '');

    if (!validar()) return;

    btn.disabled = true;
    btn.innerHTML = '<span>🧁</span> Criando conta...';

    try {
      const resposta = await fetch(`${API_URL}/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: fields.nome.value.trim(),
          email: fields.email.value.trim(),
          senha: fields.senha.value
        })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        // ex: "Este e-mail já está cadastrado."
        setMsg('servidor', dados.mensagem || 'Não foi possível criar a conta.');
        return;
      }

      document.getElementById('successText').textContent =
        `Seja bem-vinda(o), ${dados.usuario.nome.split(' ')[0]}! Sua conta na Doce Encanto foi criada com sucesso.`;
      overlay.classList.add('show');
      form.reset();

    } catch (erro) {
      console.error('Erro ao conectar com o servidor:', erro);
      setMsg('servidor', 'Não foi possível conectar ao servidor. Verifique se ele está rodando.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>🧁</span> Criar conta →';
    }
  });

  document.getElementById('closeSuccess').addEventListener('click', () => {
    window.location.href = 'login.html';
  });
});