// ===============================
// EntreGo - Adicionar Cartão (JS)
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  // Render ícones Lucide (se presente)
  if (window.lucide?.createIcons) lucide.createIcons();

  // --------- elementos
  const tipo            = document.getElementById('tipo');
  const bandeira        = document.getElementById('bandeira');
  const numero          = document.getElementById('numero');
  const nome            = document.getElementById('nome');
  const venc            = document.getElementById('venc');
  const cvv             = document.getElementById('cvv');
  const numeroHelp      = document.getElementById('numeroHelp');
  const form            = document.getElementById('formCartao');

  // preview
  const pvNumber        = document.getElementById('pvNumber');
  const pvName          = document.getElementById('pvName');
  const pvExp           = document.getElementById('pvExp');
  const pvCvv           = document.getElementById('pvCvv');
  const brandBadge      = document.getElementById('brandBadge');
  const brandBadgeBack  = document.getElementById('brandBadgeBack');
  const card3d          = document.getElementById('card3d');

  // --------- helpers
  const onlyDigits = v => (v || '').replace(/\D/g, '');
  const chunk = (s, n) => (s || '').replace(new RegExp(`(.{${n}})`, 'g'), '$1 ').trim();

  // Algoritmo de Luhn para validar PAN
  function luhnValid(num) {
    const arr = onlyDigits(num).split('').reverse().map(n => +n);
    if (!arr.length) return false;
    const sum = arr.reduce((acc, d, i) => acc + (i % 2 ? ((d *= 2) > 9 ? d - 9 : d) : d), 0);
    return sum % 10 === 0;
  }

  // Detecta bandeira (simplificado para BR)
  function detectBrand(num) {
    const n = onlyDigits(num);
    if (/^4\d{12,18}$/.test(n)) return 'visa';
    if (/^5[1-5]\d{14}$/.test(n) || /^2(2[2-9]|[3-6]\d|7[01])\d{12}$/.test(n)) return 'mastercard';
    if (/^3[47]\d{13}$/.test(n)) return 'amex';
    if (/^(4011|4312|4389|4514|4576|5041|5067|509|6277|650|651|652)\d+/.test(n)) return 'elo';
    if (/^606282|637095|637568|637599/.test(n)) return 'hipercard';
    return 'desconhecida';
  }
  const brandLabel = b => ({visa:'VISA', mastercard:'Mastercard', elo:'Elo', amex:'Amex', hipercard:'Hipercard'}[b] || '••••');

  // Máscaras
  function maskNumber(v) {
    let d = onlyDigits(v);
    if (detectBrand(d) === 'amex') { // 15 dígitos 4-6-5
      d = d.slice(0, 15);
      return d.replace(/(\d{1,4})(\d{1,6})?(\d{1,5})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    }
    d = d.slice(0, 19);
    return chunk(d, 4);
  }
  function maskVenc(v) {
    let d = onlyDigits(v).slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    // corrige mês 00 -> 01, >12 -> 12
    if (d.length >= 2) {
      const mm = Math.max(1, Math.min(12, parseInt(d.slice(0,2) || '0', 10)));
      d = String(mm).padStart(2, '0') + d.slice(2);
    }
    return d;
  }
  function maskCVV(v) {
    const brand = (bandeira?.value === 'auto') ? detectBrand(numero?.value) : bandeira?.value;
    const max = brand === 'amex' ? 4 : 3;
    return onlyDigits(v).slice(0, max);
  }

  //preview dinâmico
  function updatePreview() {
    const brand = (bandeira?.value === 'auto') ? detectBrand(numero?.value) : bandeira?.value;

    if (brandBadge)     brandBadge.textContent     = brandLabel(brand);
    if (brandBadgeBack) brandBadgeBack.textContent = brandLabel(brand);

    if (pvNumber) pvNumber.textContent = (numero?.value || '•••• •••• •••• ••••');
    if (pvName)   pvName.textContent   = (nome?.value || 'NOME IMPRESSO').toUpperCase();
    if (pvExp)    pvExp.textContent    = (venc?.value || 'MM/AA');
    if (pvCvv)    pvCvv.textContent    = (cvv?.value || '').replace(/\d/g, '•') || '•••';
  }

  // --------- listeners de entrada
  if (numero) {
    numero.addEventListener('input', (e) => {
      e.target.value = maskNumber(e.target.value);
      updatePreview();

      // validação Luhn quando comprimento esperado
      const digits = onlyDigits(e.target.value);
      const brand = (bandeira?.value === 'auto') ? detectBrand(digits) : bandeira?.value;
      const isComplete =
        (brand === 'amex' && digits.length === 15) ||
        (brand !== 'amex' && (digits.length === 13 || digits.length === 16 || digits.length === 19));
      numeroHelp && (numeroHelp.textContent = isComplete && !luhnValid(digits) ? 'Número inválido (falha no Luhn).' : '');
    });
  }

  if (nome) {
    // mantém maiúsculas e bloqueia números
    nome.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ú\s]/g, '').toUpperCase().slice(0, 26);
      updatePreview();
    });
  }

  if (venc) {
    venc.addEventListener('input', (e) => {
      e.target.value = maskVenc(e.target.value);
      updatePreview();
    });
  }

  if (cvv) {
    cvv.addEventListener('input', (e) => {
      e.target.value = maskCVV(e.target.value);
      updatePreview();
    });

    // Flip no foco do CVV
    if (card3d) {
      cvv.addEventListener('focus', () => { card3d.style.transform = 'rotateY(180deg)'; });
      cvv.addEventListener('blur',  () => { card3d.style.transform = 'rotateY(0deg)';  });
    }
  }

  if (bandeira) {
    bandeira.addEventListener('change', updatePreview);
  }

  // Mostrar/ocultar número e CVV
  document.querySelectorAll('.eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const icon = btn.querySelector('i');

      if (target.dataset.masked === 'true') {
        target.value = target.dataset.original || target.value;
        target.dataset.masked = 'false';
        icon?.setAttribute('data-lucide', 'eye-off');
      } else {
        target.dataset.original = target.value;
        target.value = target.id === 'numero'
          ? target.value.replace(/\d(?=\d{4})/g, '•')     // mantém últimos 4
          : target.value.replace(/\d/g, '•');             // tudo mascarado
        target.dataset.masked = 'true';
        icon?.setAttribute('data-lucide', 'eye');
      }
      // re-render ícones
      if (window.lucide?.createIcons) lucide.createIcons();
      updatePreview();
    });
  });

  // --------- envio (somente validação no front; tokenizar no backend)
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const brand  = (bandeira?.value === 'auto') ? detectBrand(numero?.value) : bandeira?.value;
      const digits = onlyDigits(numero?.value);

      const ok =
        luhnValid(digits) &&
        (nome?.value || '').trim().length >= 3 &&
        /^\d{2}\/\d{2}$/.test(venc?.value || '') &&
        ((brand === 'amex') ? /^\d{4}$/.test(cvv?.value || '') : /^\d{3}$/.test(cvv?.value || ''));

      if (!ok) {
        alert('Verifique os dados do cartão.');
        return;
      }

      // Próximo passo: tokenizar com provedor PCI (Stripe Elements ou Mercado Pago Brick)
      // e enviar SOMENTE o token para sua Cloud Function no Firebase.
      alert('Dados verificados. Próximo passo: tokenizar via backend seguro.');
    });
  }

  // inicializa preview
  updatePreview();
});
