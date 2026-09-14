(function(){

  // ---------- Trava: exige login antes de acessar o pagamento ----------
  const logado = localStorage.getItem('doceencanto_token') || sessionStorage.getItem('doceencanto_token');
  if(!logado){
    localStorage.setItem('doceEncantoRedirect', 'pagamento.html');
    window.location.href = 'login.html';
    return; // interrompe o resto do script, já que vamos sair da página
  }

  // ---------- Chave usada para trocar dados entre as páginas ----------
  const CART_STORAGE_KEY = 'doceEncantoCart';
  const ORDERS_STORAGE_KEY = 'doceEncantoOrders';

  function formatBRL(value){
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Paleta de cores que gira entre os itens da caixinha (mesma família do site)
  const THUMB_COLORS = ['#E9A6B7', '#EBD98A', '#8C6248', '#D9A9C4', '#C4A6E9', '#A6C9E9'];

  // Tipo de cartão selecionado (crédito é o padrão)
  let cardType = 'credito';

  // ---------- Carrega o pedido salvo pela página do catálogo ----------
  function loadOrder(){
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!Array.isArray(data) || data.length === 0) return null;
      return data;
    } catch(e){
      return null;
    }
  }

  // Pedido de exemplo, usado só se a página for aberta sozinha (sem vir do catálogo)
  const FALLBACK_ORDER = [
    { name: 'Morango Silvestre', qty: 2, price: 14.00 },
    { name: 'Limão Siciliano',   qty: 1, price: 12.00 },
    { name: 'Chocolate Nobre',   qty: 1, price: 13.00 },
  ];

  const order = loadOrder() || FALLBACK_ORDER;
  const orderTotal = order.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ---------- Renderiza o resumo do pedido ----------
  function renderOrderSummary(){
    const itemList = document.getElementById('itemList');
    const subtotalValue = document.getElementById('subtotalValue');
    const grandTotal = document.getElementById('grandTotal');

    itemList.innerHTML = order.map((item, i) => `
      <div class="item">
        <span class="item-thumb" style="background:${THUMB_COLORS[i % THUMB_COLORS.length]};">🧁</span>
        <span class="item-info">
          <span class="name">${item.name}</span><br>
          <span class="qty">${item.qty} × ${formatBRL(item.price)}</span>
        </span>
        <span class="item-price">${formatBRL(item.price * item.qty)}</span>
      </div>
    `).join('');

    subtotalValue.textContent = formatBRL(orderTotal);
    grandTotal.textContent = formatBRL(orderTotal);
  }

  renderOrderSummary();

  // ---------- Tabs ----------
  const tabCartaoBtn = document.getElementById('tabCartaoBtn');
  const tabPixBtn = document.getElementById('tabPixBtn');
  const panelCartao = document.getElementById('panelCartao');
  const panelPix = document.getElementById('panelPix');

  function activateTab(which){
    const isCartao = which === 'cartao';
    tabCartaoBtn.classList.toggle('active', isCartao);
    tabPixBtn.classList.toggle('active', !isCartao);
    tabCartaoBtn.setAttribute('aria-selected', isCartao);
    tabPixBtn.setAttribute('aria-selected', !isCartao);
    panelCartao.classList.toggle('active', isCartao);
    panelPix.classList.toggle('active', !isCartao);
  }
  tabCartaoBtn.addEventListener('click', () => activateTab('cartao'));
  tabPixBtn.addEventListener('click', () => activateTab('pix'));

  // ---------- Card number formatting + brand detection ----------
  const cardNumber = document.getElementById('cardNumber');
  const brandIcon = document.getElementById('brandIcon');
  const brandPill = document.getElementById('brandPill');
  const previewNumber = document.getElementById('previewNumber');

  function detectBrand(digits){
    if(/^4/.test(digits)) return 'VISA';
    if(/^5[1-5]/.test(digits)) return 'MASTERCARD';
    if(/^3[47]/.test(digits)) return 'AMEX';
    if(/^6(?:011|5)/.test(digits)) return 'ELO';
    return '';
  }

  cardNumber.addEventListener('input', () => {
    let digits = cardNumber.value.replace(/\D/g,'').slice(0,16);
    let groups = digits.match(/.{1,4}/g) || [];
    cardNumber.value = groups.join(' ');

    const brand = detectBrand(digits);
    if(brand){
      brandIcon.textContent = brand;
      brandIcon.classList.add('show');
      brandPill.textContent = cardType === 'debito' ? 'débito' : brand.toLowerCase();
    } else {
      brandIcon.classList.remove('show');
      brandPill.textContent = cardType === 'debito' ? 'débito' : 'cartão';
    }

    let display = groups.length ? groups.join(' ') : '';
    for(let i = display.length; i < 19; i++){
      if((i+1) % 5 !== 0) display += '•'; else display += ' ';
    }
    previewNumber.textContent = display.trim() || '•••• •••• •••• ••••';
  });

  // ---------- Name ----------
  const cardName = document.getElementById('cardName');
  const previewName = document.getElementById('previewName');
  cardName.addEventListener('input', () => {
    previewName.textContent = cardName.value.trim() ? cardName.value.toUpperCase() : 'SEU NOME AQUI';
  });

  // ---------- Expiry ----------
  const cardExpiry = document.getElementById('cardExpiry');
  const previewExpiry = document.getElementById('previewExpiry');
  cardExpiry.addEventListener('input', () => {
    let v = cardExpiry.value.replace(/\D/g,'').slice(0,4);
    if(v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
    cardExpiry.value = v;
    previewExpiry.textContent = v || 'MM/AA';
  });

  // ---------- CVV + flip ----------
  const cardCvv = document.getElementById('cardCvv');
  const previewCvv = document.getElementById('previewCvv');
  const cardFlip = document.getElementById('cardFlip');
  cardCvv.addEventListener('input', () => {
    cardCvv.value = cardCvv.value.replace(/\D/g,'').slice(0,4);
    previewCvv.textContent = cardCvv.value ? cardCvv.value.replace(/./g,'•') : '•••';
  });
  cardCvv.addEventListener('focus', () => cardFlip.classList.add('flipped'));
  cardCvv.addEventListener('blur', () => cardFlip.classList.remove('flipped'));

  // ---------- Parcelas (calculadas a partir do total real) ----------
  const installments = document.getElementById('installments');
  const payBtn = document.getElementById('payBtn');
  const btnTextEl = payBtn.querySelector('.btn-text');

  function buildInstallmentOptions(){
    installments.innerHTML = '';
    for(let n = 1; n <= 3; n++){
      const opt = document.createElement('option');
      opt.value = String(n);
      const perParcel = orderTotal / n;
      opt.textContent = n === 1
        ? `1x de ${formatBRL(orderTotal)} sem juros`
        : `${n}x de ${formatBRL(perParcel)} sem juros`;
      installments.appendChild(opt);
    }
  }
  buildInstallmentOptions();

  function updatePayButtonText(){
    if(cardType === 'debito'){
      btnTextEl.textContent = `Pagar ${formatBRL(orderTotal)} no débito`;
      return;
    }
    const n = Number(installments.value);
    btnTextEl.textContent = n === 1
      ? `Pagar ${formatBRL(orderTotal)}`
      : `Pagar em ${n}x de ${formatBRL(orderTotal / n)}`;
  }
  updatePayButtonText();

  installments.addEventListener('change', updatePayButtonText);

  // ---------- Crédito / Débito toggle ----------
  const typeCreditoBtn = document.getElementById('typeCreditoBtn');
  const typeDebitoBtn = document.getElementById('typeDebitoBtn');
  const installmentsWrap = document.getElementById('installmentsWrap');
  const debitNote = document.getElementById('debitNote');

  function setCardType(type){
    cardType = type;
    const isDebito = type === 'debito';
    typeCreditoBtn.classList.toggle('active', !isDebito);
    typeDebitoBtn.classList.toggle('active', isDebito);
    installmentsWrap.classList.toggle('hidden', isDebito);
    debitNote.classList.toggle('show', isDebito);

    const digits = cardNumber.value.replace(/\D/g,'');
    const brand = detectBrand(digits);
    brandPill.textContent = isDebito ? 'débito' : (brand ? brand.toLowerCase() : 'cartão');

    if(isDebito) installments.value = '1';
    updatePayButtonText();
  }

  typeCreditoBtn.addEventListener('click', () => setCardType('credito'));
  typeDebitoBtn.addEventListener('click', () => setCardType('debito'));

  // ---------- Validation helpers ----------
  function setInvalid(fieldId, invalid){
    document.getElementById(fieldId).classList.toggle('invalid', invalid);
  }

  function validateCard(){
    let ok = true;
    const digits = cardNumber.value.replace(/\D/g,'');
    if(digits.length < 13){ setInvalid('fieldNumber', true); ok = false; } else setInvalid('fieldNumber', false);

    if(cardName.value.trim().length < 3){ setInvalid('fieldName', true); ok = false; } else setInvalid('fieldName', false);

    const expMatch = cardExpiry.value.match(/^(\d{2})\/(\d{2})$/);
    if(!expMatch || +expMatch[1] < 1 || +expMatch[1] > 12){ setInvalid('fieldExpiry', true); ok = false; } else setInvalid('fieldExpiry', false);

    if(cardCvv.value.length < 3){ setInvalid('fieldCvv', true); ok = false; } else setInvalid('fieldCvv', false);

    return ok;
  }

  // ---------- Success state ----------
  const successState = document.getElementById('successState');
  const orderNumber = document.getElementById('orderNumber');

  function saveCompletedOrder(paymentMethod){
    let orders = [];
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      orders = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(orders)) orders = [];
    } catch(e){ orders = []; }

    const id = Math.floor(1000 + Math.random()*9000);
    orders.push({
      id,
      createdAt: Date.now(),
      items: order.map(item => ({ name: item.name, qty: item.qty, price: item.price })),
      total: orderTotal,
      paymentMethod,
      status: 'pendente',
    });
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    return id;
  }

  function showSuccess(paymentMethod){
    document.querySelectorAll('.tabs, .panel').forEach(el => el.style.display = 'none');
    document.querySelector('.payment h1').style.display = 'none';
    document.querySelector('.payment .sub').style.display = 'none';
    const id = saveCompletedOrder(paymentMethod);
    orderNumber.textContent = 'Pedido #' + id;
    successState.classList.add('show');
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  document.getElementById('cardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if(!validateCard()) return;
    payBtn.classList.add('loading');
    payBtn.disabled = true;
    setTimeout(() => {
      payBtn.classList.remove('loading');
      payBtn.disabled = false;
      showSuccess(cardType === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito');
    }, 1600);
  });

  // ---------- Pix ----------
  const pixConfirmBtn = document.getElementById('pixConfirmBtn');
  pixConfirmBtn.addEventListener('click', () => {
    pixConfirmBtn.classList.add('loading');
    pixConfirmBtn.disabled = true;
    setTimeout(() => {
      pixConfirmBtn.classList.remove('loading');
      pixConfirmBtn.disabled = false;
      showSuccess('Pix');
    }, 1400);
  });

  const copyPixBtn = document.getElementById('copyPixBtn');
  const pixCode = document.getElementById('pixCode');
  copyPixBtn.addEventListener('click', () => {
    pixCode.select();
    navigator.clipboard && navigator.clipboard.writeText(pixCode.value).catch(()=>{});
    copyPixBtn.textContent = 'Copiado!';
    copyPixBtn.classList.add('copied');
    setTimeout(() => {
      copyPixBtn.textContent = 'Copiar código';
      copyPixBtn.classList.remove('copied');
    }, 1800);
  });

  // Pix countdown
  let secondsLeft = 600;
  const pixTimer = document.getElementById('pixTimer');
  setInterval(() => {
    if(secondsLeft <= 0) return;
    secondsLeft--;
    const m = String(Math.floor(secondsLeft/60)).padStart(2,'0');
    const s = String(secondsLeft%60).padStart(2,'0');
    pixTimer.textContent = m + ':' + s;
  }, 1000);

  // Fake QR pattern (estável por carregamento)
  const qrGrid = document.getElementById('qrGrid');
  let seed = 42;
  function rand(){ seed = (seed*9301+49297) % 233280; return seed/233280; }
  for(let i=0;i<100;i++){
    const cell = document.createElement('span');
    if(rand() > 0.52) cell.classList.add('on');
    qrGrid.appendChild(cell);
  }
})();