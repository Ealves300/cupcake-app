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

  // ---------- Card number: bandeira, tamanho e formatação ----------
  const cardNumber = document.getElementById('cardNumber');
  const brandIcon = document.getElementById('brandIcon');
  const brandPill = document.getElementById('brandPill');
  const previewNumber = document.getElementById('previewNumber');

  // Cada bandeira tem um padrão de prefixo E um tamanho esperado de número.
  // Isso evita, por exemplo, aceitar um número que começa com 4 (Visa) mas
  // tem 12 dígitos — o que claramente não é um cartão Visa de verdade.
  const BRAND_RULES = [
    { brand: 'AMEX',       test: /^3[47]/,        lengths: [15], cvvLength: 4 },
    { brand: 'VISA',       test: /^4/,            lengths: [13, 16, 19], cvvLength: 3 },
    { brand: 'MASTERCARD', test: /^(5[1-5]|2[2-7])/, lengths: [16], cvvLength: 3 },
    { brand: 'ELO',        test: /^(?:401178|401179|431274|438935|451416|457393|4576|457631|457632|504175|506699|5067|509|627780|636297|636368|65)/, lengths: [16], cvvLength: 3 },
  ];

  function getBrandRule(digits){
    return BRAND_RULES.find(r => r.test.test(digits)) || null;
  }

  // Algoritmo de Luhn: é o dígito verificador real usado por todas as
  // bandeiras. Um número "aleatório" digitado no campo quase sempre falha
  // nele, então é a checagem mais simples para saber se o número é plausível.
  function passesLuhn(digits){
    let sum = 0;
    let shouldDouble = false;
    for(let i = digits.length - 1; i >= 0; i--){
      let d = parseInt(digits[i], 10);
      if(shouldDouble){
        d *= 2;
        if(d > 9) d -= 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return digits.length > 0 && sum % 10 === 0;
  }

  cardNumber.addEventListener('input', () => {
    let digits = cardNumber.value.replace(/\D/g,'').slice(0,19);
    let groups = digits.match(/.{1,4}/g) || [];
    cardNumber.value = groups.join(' ');

    const rule = getBrandRule(digits);
    if(rule){
      brandIcon.textContent = rule.brand;
      brandIcon.classList.add('show');
      brandPill.textContent = cardType === 'debito' ? 'débito' : rule.brand.toLowerCase();
    } else {
      brandIcon.classList.remove('show');
      brandPill.textContent = cardType === 'debito' ? 'débito' : 'cartão';
    }

    let display = groups.length ? groups.join(' ') : '';
    for(let i = display.length; i < 19; i++){
      if((i+1) % 5 !== 0) display += '•'; else display += ' ';
    }
    previewNumber.textContent = display.trim() || '•••• •••• •••• ••••';

    // Ajusta automaticamente o tamanho máximo do CVV para a bandeira detectada
    if(rule){
      cardCvv.setAttribute('maxlength', String(rule.cvvLength));
    } else {
      cardCvv.setAttribute('maxlength', '4');
    }

    clearFieldError('fieldNumber');
  });

  // ---------- Nome: exige nome completo, só letras e espaços ----------
  const cardName = document.getElementById('cardName');
  const previewName = document.getElementById('previewName');

  function isValidCardName(value){
    const trimmed = value.trim().replace(/\s+/g, ' ');
    // Letras (com acentos), espaços e apóstrofos/hífen (nomes compostos)
    const onlyLetters = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmed);
    const hasTwoWords = trimmed.split(' ').filter(Boolean).length >= 2;
    return onlyLetters && hasTwoWords && trimmed.length >= 5;
  }

  cardName.addEventListener('input', () => {
    previewName.textContent = cardName.value.trim() ? cardName.value.toUpperCase() : 'SEU NOME AQUI';
    clearFieldError('fieldName');
  });

  // ---------- Validade: mês real e não vencida ----------
  const cardExpiry = document.getElementById('cardExpiry');
  const previewExpiry = document.getElementById('previewExpiry');

  function isValidExpiry(value){
    const match = value.match(/^(\d{2})\/(\d{2})$/);
    if(!match) return false;
    const month = parseInt(match[1], 10);
    const year = 2000 + parseInt(match[2], 10);
    if(month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Não aceita cartão já vencido (mês/ano anterior ao atual)
    if(year < currentYear || (year === currentYear && month < currentMonth)) return false;
    // Nem uma validade absurdamente distante (mais de 15 anos), sinal de erro de digitação
    if(year > currentYear + 15) return false;

    return true;
  }

  cardExpiry.addEventListener('input', () => {
    let v = cardExpiry.value.replace(/\D/g,'').slice(0,4);
    if(v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
    cardExpiry.value = v;
    previewExpiry.textContent = v || 'MM/AA';
    clearFieldError('fieldExpiry');
  });

  // ---------- CVV + flip ----------
  const cardCvv = document.getElementById('cardCvv');
  const previewCvv = document.getElementById('previewCvv');
  const cardFlip = document.getElementById('cardFlip');
  cardCvv.addEventListener('input', () => {
    cardCvv.value = cardCvv.value.replace(/\D/g,'').slice(0,4);
    previewCvv.textContent = cardCvv.value ? cardCvv.value.replace(/./g,'•') : '•••';
    clearFieldError('fieldCvv');
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
    const rule = getBrandRule(digits);
    brandPill.textContent = isDebito ? 'débito' : (rule ? rule.brand.toLowerCase() : 'cartão');

    if(isDebito) installments.value = '1';
    updatePayButtonText();
  }

  typeCreditoBtn.addEventListener('click', () => setCardType('credito'));
  typeDebitoBtn.addEventListener('click', () => setCardType('debito'));

  // ---------- Validação + mensagens de erro por campo ----------
  function setInvalid(fieldId, invalid, message){
    const field = document.getElementById(fieldId);
    field.classList.toggle('invalid', invalid);

    let msgEl = field.parentElement.querySelector('.field-error-msg');
    if(invalid && message){
      if(!msgEl){
        msgEl = document.createElement('small');
        msgEl.className = 'field-error-msg';
        msgEl.style.color = '#c0392b';
        msgEl.style.display = 'block';
        msgEl.style.marginTop = '4px';
        field.parentElement.appendChild(msgEl);
      }
      msgEl.textContent = message;
    } else if(msgEl){
      msgEl.remove();
    }
  }

  function clearFieldError(fieldId){
    setInvalid(fieldId, false);
  }

  function validateCard(){
    let ok = true;
    const digits = cardNumber.value.replace(/\D/g,'');
    const rule = getBrandRule(digits);

    if(!rule){
      setInvalid('fieldNumber', true, 'Bandeira não reconhecida.');
      ok = false;
    } else if(!rule.lengths.includes(digits.length)){
      setInvalid('fieldNumber', true, `Número de ${rule.brand} deve ter ${rule.lengths.join(' ou ')} dígitos.`);
      ok = false;
    } else if(!passesLuhn(digits)){
      setInvalid('fieldNumber', true, 'Número de cartão inválido.');
      ok = false;
    } else {
      setInvalid('fieldNumber', false);
    }

    if(!isValidCardName(cardName.value)){
      setInvalid('fieldName', true, 'Digite o nome completo como está no cartão.');
      ok = false;
    } else {
      setInvalid('fieldName', false);
    }

    if(!isValidExpiry(cardExpiry.value)){
      setInvalid('fieldExpiry', true, 'Validade inválida ou vencida.');
      ok = false;
    } else {
      setInvalid('fieldExpiry', false);
    }

    const expectedCvvLength = rule ? rule.cvvLength : 3;
    if(cardCvv.value.length !== expectedCvvLength){
      setInvalid('fieldCvv', true, `CVV deve ter ${expectedCvvLength} dígitos.`);
      ok = false;
    } else {
      setInvalid('fieldCvv', false);
    }

    return ok;
  }

  // ---------- Success state ----------
  const successState = document.getElementById('successState');
  const orderNumber = document.getElementById('orderNumber');

  // Importante: NUNCA salvamos número de cartão, nome impresso ou CVV em
  // lugar nenhum (nem localStorage, nem no objeto de pedido). Só guardamos
  // o método de pagamento escolhido (ex.: "Cartão de Crédito", "Pix").
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