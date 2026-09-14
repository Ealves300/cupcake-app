(function () {

  // ---------- Trava: exige login antes de acessar o acompanhamento ----------
  const logado = localStorage.getItem('doceencanto_token') || sessionStorage.getItem('doceencanto_token');
  if (!logado) {
    localStorage.setItem('doceEncantoRedirect', 'acompanhamento.html');
    window.location.href = 'login.html';
    return;
  }

  const ORDERS_STORAGE_KEY = 'doceEncantoOrders';

  // Etapas da linha do tempo, na ordem exibida na tela
  const STEPS = ['pendente', 'preparo', 'entrega', 'entregue'];

  // Textos de cada etapa (título do card de status + mensagem)
  const STEP_TEXT = {
    pendente: {
      subtitulo: 'Recebemos seu pedido e já estamos separando os docinhos.',
      titulo: 'Pedido confirmado',
      descricao: 'Assim que a equipe começar o preparo, avisamos por aqui.'
    },
    preparo: {
      subtitulo: 'Sua caixinha está sendo preparada com bastante carinho.',
      titulo: 'Em preparo',
      descricao: 'Nossa equipe está montando seus docinhos agora mesmo.'
    },
    entrega: {
      subtitulo: 'Sua caixinha já está a caminho!',
      titulo: 'Saiu para entrega',
      descricao: 'O entregador já pegou seu pedido e está a caminho do endereço.'
    },
    entregue: {
      subtitulo: 'Pedido entregue — esperamos que aproveite cada docinho!',
      titulo: 'Entregue',
      descricao: 'Obrigado por escolher a Doce Encanto. Até a próxima caixinha!'
    }
  };

  // Cores usadas para as bolinhas dos itens (mesma família visual das outras telas)
  const THUMB_COLORS = ['#E9A6B7', '#EBD98A', '#8C6248', '#D9A9C4', '#C4A6E9', '#A6C9E9'];

  function formatBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const data = d.toLocaleDateString('pt-BR');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `Feito em ${data} às ${hora}`;
  }

  // Normaliza o campo "status" salvo no pedido para um dos passos conhecidos
  function normalizeStatus(status) {
    const s = (status || 'pendente').toString().trim().toLowerCase();
    if (STEPS.includes(s)) return s;
    if (s.includes('preparo')) return 'preparo';
    if (s.includes('entrega') && !s.includes('entregue')) return 'entrega';
    if (s.includes('entregue') || s.includes('conclu')) return 'entregue';
    return 'pendente';
  }

  function loadOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function findOrder(orders) {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('pedido');
    if (idParam) {
      const found = orders.find(o => String(o.id) === String(idParam));
      if (found) return found;
    }
    // Sem parâmetro (ou não encontrado): mostra o pedido mais recente
    return orders.length ? orders[orders.length - 1] : null;
  }

  function renderEmptyState() {
    document.getElementById('emptyState').classList.add('show');
    document.querySelector('.summary').style.display = 'none';
    document.querySelector('.tracking').style.display = 'none';
  }

  function renderOrder(order) {
    // ----- Resumo -----
    document.getElementById('orderNumberLabel').textContent = 'Pedido #' + order.id;
    document.getElementById('orderDateLabel').textContent = formatDateTime(order.createdAt);
    document.getElementById('paymentMethodValue').textContent = order.paymentMethod || '—';
    document.getElementById('grandTotal').textContent = formatBRL(order.total);

    const itemList = document.getElementById('itemList');
    const items = Array.isArray(order.items) ? order.items : [];
    itemList.innerHTML = items.map((item, i) => `
      <div class="item">
        <span class="item-thumb" style="background:${THUMB_COLORS[i % THUMB_COLORS.length]};">🧁</span>
        <span class="item-info">
          <span class="name">${item.name}</span><br>
          <span class="qty">${item.qty} × ${formatBRL(item.price)}</span>
        </span>
        <span class="item-price">${formatBRL(item.price * item.qty)}</span>
      </div>
    `).join('');

    // ----- Linha do tempo -----
    const currentStatus = normalizeStatus(order.status);
    const currentIndex = STEPS.indexOf(currentStatus);

    document.querySelectorAll('.tracker-step').forEach(stepEl => {
      const idx = Number(stepEl.dataset.step);
      stepEl.classList.remove('done', 'current');
      if (idx < currentIndex) stepEl.classList.add('done');
      if (idx === currentIndex) stepEl.classList.add('current', 'done');

      const timeEl = stepEl.querySelector('.tracker-time');
      if (idx === currentIndex) {
        timeEl.textContent = formatDateTime(order.createdAt);
      } else if (idx < currentIndex) {
        timeEl.textContent = 'Concluído';
      } else {
        timeEl.textContent = '';
      }
    });

    // ----- Card de status atual -----
    const texts = STEP_TEXT[currentStatus];
    document.getElementById('statusSub').textContent = texts.subtitulo;
    document.getElementById('statusTitle').textContent = texts.titulo;
    document.getElementById('statusDesc').textContent = texts.descricao;
  }

  // ---------- Inicialização ----------
  const orders = loadOrders();
  const order = findOrder(orders);

  if (!order) {
    renderEmptyState();
  } else {
    renderOrder(order);
  }

})();