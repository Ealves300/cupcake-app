// ---------- Dados do cardápio ----------
const DEFAULT_CUPCAKES = [
  { id: 'morango',    name: 'Morango Silvestre ',            category: 'frutas',    price: 14.00,  desc: 'Massa amanteigada, chantininho de morango e morango fresco.', img: 'imagens/cupcakes/cupcake_morango.png' },
  { id: 'limao',       name: 'Limão Siciliano',               category: 'frutas',    price: 12.0,  desc: 'Massa cítrica de limão siciliano com cobertura aveludada.',   img: 'imagens/cupcakes/cupcake_limao.png' },
  { id: 'chocolate',   name: 'Chocolate Nobre ',           category: 'classicos', price: 13.0,  desc: 'Massa de chocolate belga com ganache em camadas.',           img: 'imagens/cupcakes/cupcake_chocolate.png' },
  { id: 'red-velvet',  name: 'Red Velvet',          category: 'especiais', price: 16.0, desc: 'Clássico aveludado com cream cheese e toque de baunilha.',   img: 'imagens/cupcakes/cupcake_red_velvet.png' },
  { id: 'caramelo',    name: 'Caramelo Salgado ',            category: 'especiais', price: 14.0, desc: 'Massa amanteigada com recheio e calda de caramelo salgado.', img: 'imagens/cupcakes/cupcake_caramelo.png' },
  { id: 'baunilha',    name: 'Baunilha com Frutas', category: 'frutas',    price: 15.0, desc: 'Baunilha de Madagascar coroada com frutas vermelhas frescas.', img: 'imagens/cupcakes/cupcake_baunilha_frutas.png' },

  // Sabores Nostálgicos (inspirados na infância)
  { id: 'doce-de-leite',  name: 'Doce de Leite da Vovó', category: 'nostalgicos', price: 11.0, desc: 'Massa leve de baunilha com doce de leite cozido lentamente, açúcar e canela.',img: 'imagens/cupcakes/cupcake_doce_leite.png' },
  { id: 'beijinho-coco',  name: 'Beijinho de Coco',      category: 'nostalgicos', price: 10.0, desc: 'O clássico das festinhas: massa de coco úmida, recheio cremoso e cravo-da-índia no topo.', img: 'imagens/cupcakes/cupcake_beijinho.jpg' },
  { id: 'fuba-goiabada',  name: 'Fubá com Goiabada',     category: 'nostalgicos', price: 10.5, desc: 'Releitura do bolo da tarde: massa macia de fubá mimoso com coração de goiabada cascão.', img: 'imagens/cupcakes/cupcake_goiabada.png' },

  // Sabores Florais e Perfumados (estilo chá das cinco)
  { id: 'lavanda-mel',              name: 'Lavanda com Mel',                category: 'florais', price: 12.0, desc: 'Massa delicada perfumada com infusão de lavanda de jardim e mel silvestre.',img: 'imagens/cupcakes/cupcake_lavanda.png' },
  { id: 'earl-grey',                name: 'Earl Grey',                      category: 'florais', price: 12.0, desc: 'Inspirado nos salões de chá ingleses: massa de chá preto com leve toque cítrico.', img: 'imagens/cupcakes/cupcake_bergamota.png' },
  { id: 'amendoas-flor-laranjeira', name: 'Amêndoas com Flor de Laranjeira', category: 'florais', price: 12.5, desc: 'Massa rica de amêndoas moídas com um perfume sutil de água de flor de laranjeira.',img: 'imagens/cupcakes/cupcake_amendoas.png' },

  // Sabores Intensos e Confortantes
  { id: 'cafe-chocolate',  name: 'Café com Chocolate Amargo', category: 'intensos', price: 11.5, desc: 'Massa de cacau intenso combinada com um creme macio de café espresso artesanal.', img: 'imagens/cupcakes/cupcake_amargo.jpg' },
  { id: 'nozes-baba-moca', name: 'Nozes com Baba de Moça',    category: 'intensos', price: 12.5, desc: 'Combinação nobre dos casamentos antigos: creme de ovos clássico e nozes picadas.', img: 'imagens/cupcakes/cupcake_nozes.png' },
  { id: 'banana-mel-aveia', name: 'Banana, Mel e Aveia',      category: 'intensos', price: 10.0, desc: 'Simples e acolhedor: massa úmida de banana madura, especiarias, mel da fazenda e aveia.', img: 'imagens/cupcakes/cupcake_banana.png' },
];

// Chave usada pelo painel admin para guardar o cardápio editado
const MENU_STORAGE_KEY = 'doceEncantoMenu';

// Lê o cardápio salvo pelo admin; se ainda não existir, usa os sabores
// padrão e já grava no localStorage, para o admin conseguir editá-los depois.
function loadCupcakes(){
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if(Array.isArray(saved) && saved.length > 0) return saved;
  } catch(e){ /* ignora e usa o padrão */ }

  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(DEFAULT_CUPCAKES));
  return DEFAULT_CUPCAKES;
}

const CUPCAKES = loadCupcakes();

const CATEGORIES = [
  { id: 'todos',       label: 'Todos' },
  { id: 'classicos',   label: 'Clássicos' },
  { id: 'frutas',      label: 'Frutas' },
  { id: 'especiais',   label: 'Especiais' },
  { id: 'nostalgicos', label: 'Nostálgicos' },
  { id: 'florais',     label: 'Florais' },
  { id: 'intensos',    label: 'Intensos' },
];

const WHATSAPP_NUMBER = '5511999999999';

// Chave usada para passar o carrinho para a página de pagamento
const CART_STORAGE_KEY = 'doceEncantoCart';

let activeCategory = 'todos';
const cart = {};

function formatBRL(value){
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------- Renderização do catálogo ----------
function renderFilters(){
  const el = document.getElementById('filters');
  el.innerHTML = CATEGORIES.map(cat =>
    `<button class="filter-btn${cat.id === activeCategory ? ' active' : ''}" data-cat="${cat.id}">${cat.label}</button>`
  ).join('');

  el.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderFilters();
      renderGrid();
    });
  });
}

function renderQtyControl(id){
  const qty = cart[id] || 0;

  if(qty === 0){
    return `<button class="add-btn" data-action="add" data-id="${id}">Adicionar</button>`;
  }

  return `
    <div class="stepper">
      <button class="qty-btn" data-action="dec" data-id="${id}" aria-label="Diminuir quantidade">−</button>
      <span class="qty-value">${qty}</span>
      <button class="qty-btn" data-action="inc" data-id="${id}" aria-label="Aumentar quantidade">+</button>
    </div>`;
}

function renderGrid(){
  const el = document.getElementById('grid');
  const items = CUPCAKES.filter(c => activeCategory === 'todos' || c.category === activeCategory);

  el.innerHTML = items.map(c => `
    <div class="card">
      <div class="card-photo">
        ${c.img
          ? `<img src="${c.img}" alt="Cupcake de ${c.name}" loading="lazy">`
          : `<div class="placeholder-photo placeholder-${c.category}"><span class="placeholder-icon">🧁</span></div>`
        }
        <span class="card-badge">${CATEGORIES.find(cat => cat.id === c.category).label}</span>
      </div>
      <div class="card-body">
        <p class="card-name">${c.name}</p>
        <p class="card-desc">${c.desc}</p>
        <div class="card-footer">
          <span class="card-price">${formatBRL(c.price)}</span>
          <div class="qty-area" data-id="${c.id}">${renderQtyControl(c.id)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function initGridEvents(){
  document.getElementById('grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if(action === 'add' || action === 'inc') addToCart(id);
    else if(action === 'dec') changeQty(id, -1);
  });
}

// ---------- Carrinho ----------
function addToCart(id){
  cart[id] = (cart[id] || 0) + 1;
  refreshCartState();
}

function changeQty(id, delta){
  if(!cart[id]) return;
  cart[id] += delta;
  if(cart[id] <= 0) delete cart[id];
  refreshCartState();
}

function refreshCartState(){
  updateCardControl();
  updateCartUI();
}

function updateCardControl(){
  document.querySelectorAll('.qty-area').forEach(area => {
    area.innerHTML = renderQtyControl(area.dataset.id);
  });
}

function cartTotalItems(){
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function cartTotalPrice(){
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = CUPCAKES.find(c => c.id === id);
    return sum + item.price * qty;
  }, 0);
}

function updateCartUI(){
  document.getElementById('cartCount').textContent = cartTotalItems();

  const summary = document.getElementById('orderSummary');
  const entries = Object.entries(cart);

  if(entries.length === 0){
    summary.innerHTML = '<p class="order-empty">Sua caixinha está vazia. Escolha seus sabores favoritos acima ♡</p>';
    document.getElementById('orderCta').disabled = true;
    return;
  }

  document.getElementById('orderCta').disabled = false;

  summary.innerHTML = entries.map(([id, qty]) => {
    const item = CUPCAKES.find(c => c.id === id);
    return `
      <div class="order-row">
        <span class="order-row-name">${item.name}</span>
        <div class="order-row-controls">
          <button class="qty-btn" data-id="${id}" data-delta="-1">−</button>
          <span>${qty}</span>
          <button class="qty-btn" data-id="${id}" data-delta="1">+</button>
          <span>${formatBRL(item.price * qty)}</span>
        </div>
      </div>`;
  }).join('') + `
    <div class="order-total">
      <span>Total</span>
      <span>${formatBRL(cartTotalPrice())}</span>
    </div>`;

  summary.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, Number(btn.dataset.delta)));
  });
}

function goToOrderSection(){
  document.getElementById('orderSummary').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function isLoggedIn(){
  return !!(localStorage.getItem('doceencanto_token') || sessionStorage.getItem('doceencanto_token'));
}

function goToPayment(){
  const entries = Object.entries(cart);
  if(entries.length === 0) return;

  const payload = entries.map(([id, qty]) => {
    const item = CUPCAKES.find(c => c.id === id);
    return { name: item.name.trim(), qty, price: item.price };
  });

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));

  if(!isLoggedIn()){
    // guarda para onde a pessoa deve ir depois de logar
    localStorage.setItem('doceEncantoRedirect', 'pagamento.html');
    window.location.href = 'login.html';
    return;
  }

  window.location.href = 'pagamento.html';
}

function sendOrderToWhatsapp(){
  const entries = Object.entries(cart);
  if(entries.length === 0) return;

  const lines = entries.map(([id, qty]) => {
    const item = CUPCAKES.find(c => c.id === id);
    return `• ${qty}x ${item.name} — ${formatBRL(item.price * qty)}`;
  });

  const message = [
    'Olá! Quero fazer um pedido na Doce Encanto 💕',
    '',
    ...lines,
    '',
    `Total: ${formatBRL(cartTotalPrice())}`,
  ].join('\n');

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// ---------- Header (some ao rolar) ----------
function initHeaderScroll(){
  const header = document.getElementById('siteHeader');
  let lastY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.style.transform = (y > lastY && y > 120) ? 'translateY(-100%)' : 'translateY(0)';
    lastY = y;
  });
}

// ---------- Pétalas decorativas ----------
function initPetals(){
  const container = document.getElementById('petals');
  const glyphs = ['❀', '❁', '♡'];
  const total = 14;

  for(let i = 0; i < total; i++){
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.textContent = glyphs[i % glyphs.length];
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.fontSize = `${10 + Math.random() * 10}px`;
    petal.style.animationDuration = `${14 + Math.random() * 10}s`;
    petal.style.animationDelay = `${Math.random() * 12}s`;
    container.appendChild(petal);
  }
}

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', () => {
  renderFilters();
  renderGrid();
  updateCartUI();
  initGridEvents();
  initHeaderScroll();
  initPetals();

  document.getElementById('cartBtn').addEventListener('click', goToOrderSection);
  document.getElementById('orderCta').addEventListener('click', goToPayment);
});