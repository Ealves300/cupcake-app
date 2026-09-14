(function(){

  // ---------- Chaves compartilhadas com o resto do site ----------
  const MENU_STORAGE_KEY = 'doceEncantoMenu';
  const ORDERS_STORAGE_KEY = 'doceEncantoOrders';
  const AUTH_SESSION_KEY = 'doceEncantoAdminSession';

  // Senha simples só para afastar visitantes casuais.
  // Isso roda no navegador da pessoa, então NÃO é uma proteção real —
  // para um site em produção, o login precisa ser validado por um servidor.
  const API_URL = 'http://localhost:3000/api';

  const CATEGORIES = [
    { id: 'classicos',   label: 'Clássicos' },
    { id: 'frutas',      label: 'Frutas' },
    { id: 'especiais',   label: 'Especiais' },
    { id: 'nostalgicos', label: 'Nostálgicos' },
    { id: 'florais',     label: 'Florais' },
    { id: 'intensos',    label: 'Intensos' },
  ];
  const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));

  const STATUS_FLOW = ['pendente', 'preparando', 'pronto', 'entregue'];
  const STATUS_LABEL = { pendente: 'Pendente', preparando: 'Preparando', pronto: 'Pronto', entregue: 'Entregue' };

  function formatBRL(value){
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function parsePriceInput(text){
    const normalized = String(text).replace(/[^\d,.-]/g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return isNaN(value) ? 0 : value;
  }

  function slugify(text){
    return text.toString().trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // ---------- Cardápio: leitura/gravação ----------
  function loadMenu(){
    try {
      const raw = localStorage.getItem(MENU_STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return Array.isArray(data) ? data : [];
    } catch(e){
      return [];
    }
  }
  function saveMenu(menu){
    try { localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menu)); } catch(e){ /* ignora */ }
  }

  // ---------- Pedidos: leitura/gravação ----------
  function loadOrders(){
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return Array.isArray(data) ? data : [];
    } catch(e){
      return [];
    }
  }
  function saveOrders(orders){
    try { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); } catch(e){ /* ignora */ }
  }

  // =========================================================
  // LOGIN
  // =========================================================
  const loginScreen = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');

  // Alguns navegadores bloqueiam sessionStorage quando o arquivo é aberto
  // direto (duplo clique, sem servidor). Essas funções evitam que isso
  // trave o login — nesse caso, só não vai "lembrar" o acesso ao recarregar.
  function safeSessionGet(key){
    try { return sessionStorage.getItem(key); } catch(e){ return null; }
  }
  function safeSessionSet(key, value){
    try { sessionStorage.setItem(key, value); } catch(e){ /* ignora */ }
  }
  function safeSessionRemove(key){
    try { sessionStorage.removeItem(key); } catch(e){ /* ignora */ }
  }

  function showApp(){
    loginScreen.style.display = 'none';
    app.classList.add('show');
    initDashboard();
    initOrders();
    initMenu();
  }

  if(safeSessionGet(AUTH_SESSION_KEY) === 'true'){
    showApp();
  }

  loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');

  try {
    const resposta = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: loginPassword.value }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      loginError.textContent = dados.mensagem || 'Senha incorreta. Tente novamente.';
      loginError.classList.add('show');
      return;
    }

    safeSessionSet(AUTH_SESSION_KEY, 'true');
    showApp();
  } catch (erro) {
    console.error('Erro ao conectar com o servidor:', erro);
    loginError.textContent = 'Não foi possível conectar ao servidor. Verifique se ele está rodando.';
    loginError.classList.add('show');
  }
});

  document.getElementById('logoutBtn').addEventListener('click', () => {
    safeSessionRemove(AUTH_SESSION_KEY);
    app.classList.remove('show');
    loginScreen.style.display = 'flex';
    loginPassword.value = '';
  });


  // =========================================================
  // NAVEGAÇÃO ENTRE VIEWS
  // =========================================================
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
      if(btn.dataset.view === 'dashboard') renderDashboard();
      if(btn.dataset.view === 'pedidos') renderOrders();
      if(btn.dataset.view === 'cardapio') renderMenu();
    });
  });

  // ---------- Toast ----------
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // =========================================================
  // DASHBOARD
  // =========================================================
  function updatePendingBadge(){
    const orders = loadOrders();
    const pending = orders.filter(o => o.status === 'pendente').length;
    document.getElementById('pendingBadge').textContent = pending;
  }

  function renderDashboard(){
    const orders = loadOrders();

    document.getElementById('statTotalOrders').textContent = orders.length;

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('statRevenue').textContent = formatBRL(revenue);

    const pending = orders.filter(o => o.status === 'pendente').length;
    document.getElementById('statPending').textContent = pending;

    const flavorCount = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        flavorCount[item.name] = (flavorCount[item.name] || 0) + item.qty;
      });
    });
    const topFlavor = Object.entries(flavorCount).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('statTopFlavor').textContent = topFlavor ? topFlavor[0] : '—';

    const recentList = document.getElementById('recentOrdersList');
    const recent = [...orders].sort((a,b) => b.createdAt - a.createdAt).slice(0, 5);

    if(recent.length === 0){
      recentList.innerHTML = '<div class="empty-state"><span class="em">🧁</span>Nenhum pedido ainda.</div>';
      return;
    }

    recentList.innerHTML = recent.map(o => `
      <div class="mini-row">
        <span>
          <span class="who">Pedido #${o.id}</span><br>
          <span class="when">${formatDate(o.createdAt)}</span>
        </span>
        <span>${formatBRL(o.total)}</span>
        <span class="badge ${o.status}">${STATUS_LABEL[o.status]}</span>
      </div>
    `).join('');
  }

  function initDashboard(){
    renderDashboard();
    updatePendingBadge();
  }

  function formatDate(timestamp){
    const d = new Date(timestamp);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  }

  // =========================================================
  // PEDIDOS
  // =========================================================
  let orderFilter = 'todos';

  function renderOrders(){
    const orders = loadOrders();
    const list = document.getElementById('ordersList');

    const filtered = orderFilter === 'todos'
      ? orders
      : orders.filter(o => o.status === orderFilter);

    const sorted = [...filtered].sort((a,b) => b.createdAt - a.createdAt);

    if(sorted.length === 0){
      list.innerHTML = '<div class="empty-state"><span class="em">🧾</span>Nenhum pedido por aqui.</div>';
      updatePendingBadge();
      return;
    }

    list.innerHTML = sorted.map(o => `
      <div class="order-card" data-id="${o.id}">
        <div class="order-head" data-toggle="${o.id}">
          <span class="order-id">Pedido #${o.id}</span>
          <span class="order-when">${formatDate(o.createdAt)}</span>
          <span class="order-method">${o.paymentMethod}</span>
          <span class="order-total">${formatBRL(o.total)}</span>
          <button class="badge ${o.status}" data-cycle="${o.id}">${STATUS_LABEL[o.status]} ›</button>
        </div>
        <div class="order-items">
          ${(o.items || []).map(item => `
            <div class="order-item-row">
              <span>${item.qty}x ${item.name}</span>
              <span>${formatBRL(item.price * item.qty)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-toggle]').forEach(head => {
      head.addEventListener('click', (e) => {
        if(e.target.closest('[data-cycle]')) return;
        head.closest('.order-card').classList.toggle('open');
      });
    });

    list.querySelectorAll('[data-cycle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleOrderStatus(btn.dataset.cycle);
      });
    });

    updatePendingBadge();
  }

  function cycleOrderStatus(id){
    const orders = loadOrders();
    const order = orders.find(o => String(o.id) === String(id));
    if(!order) return;
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    order.status = STATUS_FLOW[(currentIndex + 1) % STATUS_FLOW.length];
    saveOrders(orders);
    renderOrders();
    renderDashboard();
  }

  function initOrders(){
    document.querySelectorAll('#orderFilters .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#orderFilters .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        orderFilter = btn.dataset.status;
        renderOrders();
      });
    });
    renderOrders();
  }

  // =========================================================
  // CARDÁPIO
  // =========================================================
  let menuFilter = 'todos';

  function renderMenuFilters(){
    const el = document.getElementById('menuFilters');
    const items = [{ id: 'todos', label: 'Todos' }, ...CATEGORIES];
    el.innerHTML = items.map(c =>
      `<button class="pill-btn${c.id === menuFilter ? ' active' : ''}" data-cat="${c.id}">${c.label}</button>`
    ).join('');
    el.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        menuFilter = btn.dataset.cat;
        renderMenuFilters();
        renderMenu();
      });
    });
  }

  function renderMenu(){
    const menu = loadMenu();
    const grid = document.getElementById('menuGrid');
    const items = menuFilter === 'todos' ? menu : menu.filter(i => i.category === menuFilter);

    if(items.length === 0){
      grid.innerHTML = '<div class="empty-state"><span class="em">🍰</span>Nenhum sabor cadastrado ainda.</div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="menu-card">
        <div class="menu-card-photo${item.img ? ' has-image' : ''}">
          ${item.img ? `<img src="${item.img}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">` : '🧁'}
          <span class="menu-card-badge">${CATEGORY_LABEL[item.category] || item.category}</span>
          <div class="menu-card-actions">
            <button class="icon-btn edit" data-edit="${item.id}" aria-label="Editar">✏️</button>
            <button class="icon-btn delete" data-delete="${item.id}" aria-label="Excluir">🗑️</button>
          </div>
        </div>
        <div class="menu-card-body">
          <div class="name">${item.name}</div>
          <div class="desc">${item.desc || ''}</div>
          <div class="price">${formatBRL(item.price)}</div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openFlavorModal(btn.dataset.edit));
    });
    grid.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteFlavor(btn.dataset.delete));
    });
  }

  function deleteFlavor(id){
    const menu = loadMenu();
    const item = menu.find(i => i.id === id);
    if(!item) return;
    if(!confirm(`Remover "${item.name}" do cardápio?`)) return;
    saveMenu(menu.filter(i => i.id !== id));
    renderMenu();
    showToast('Sabor removido');
  }

  // ---------- Modal de sabor (adicionar/editar) ----------
  const flavorModal = document.getElementById('flavorModal');
  const flavorForm = document.getElementById('flavorForm');
  const flavorModalTitle = document.getElementById('flavorModalTitle');
  const flavorIdInput = document.getElementById('flavorId');
  const flavorNameInput = document.getElementById('flavorName');
  const flavorCategoryInput = document.getElementById('flavorCategory');
  const flavorPriceInput = document.getElementById('flavorPrice');
  const flavorDescInput = document.getElementById('flavorDesc');
  const flavorImgInput = document.getElementById('flavorImg');

  flavorCategoryInput.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');

  function openFlavorModal(editId){
    const menu = loadMenu();
    const editing = editId ? menu.find(i => i.id === editId) : null;

    flavorModalTitle.textContent = editing ? 'Editar sabor' : 'Adicionar sabor';
    flavorIdInput.value = editing ? editing.id : '';
    flavorNameInput.value = editing ? editing.name : '';
    flavorCategoryInput.value = editing ? editing.category : CATEGORIES[0].id;
    flavorPriceInput.value = editing ? String(editing.price).replace('.', ',') : '';
    flavorDescInput.value = editing ? (editing.desc || '') : '';
    flavorImgInput.value = editing ? (editing.img || '') : '';

    flavorModal.classList.add('show');
    flavorNameInput.focus();
  }

  function closeFlavorModal(){
    flavorModal.classList.remove('show');
    flavorForm.reset();
  }

  document.getElementById('addFlavorBtn').addEventListener('click', () => openFlavorModal(null));
  document.getElementById('cancelFlavorBtn').addEventListener('click', closeFlavorModal);
  flavorModal.addEventListener('click', (e) => { if(e.target === flavorModal) closeFlavorModal(); });

  flavorForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = flavorNameInput.value.trim();
    if(!name) return;

    const menu = loadMenu();
    const editId = flavorIdInput.value;

    const data = {
      name,
      category: flavorCategoryInput.value,
      price: parsePriceInput(flavorPriceInput.value),
      desc: flavorDescInput.value.trim(),
      img: flavorImgInput.value.trim(),
    };

    if(editId){
      const item = menu.find(i => i.id === editId);
      if(item) Object.assign(item, data);
    } else {
      let id = slugify(name) || 'sabor';
      let uniqueId = id;
      let suffix = 1;
      while(menu.some(i => i.id === uniqueId)){
        uniqueId = `${id}-${++suffix}`;
      }
      menu.push({ id: uniqueId, ...data });
    }

    saveMenu(menu);
    closeFlavorModal();
    renderMenu();
    showToast(editId ? 'Sabor atualizado' : 'Sabor adicionado');
  });

  function initMenu(){
    renderMenuFilters();
    renderMenu();
  }

})();