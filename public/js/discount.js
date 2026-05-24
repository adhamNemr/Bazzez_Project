'use strict';

/* ── i18n Dictionary ── */
const TRANSLATIONS = {
  ar: {
    pageTitle:        'إدارة الخصومات',
    pageSubtitle:     'أنشئ وأدر أكواد الخصم بكل سهولة',
    addBtn:           'إضافة كود جديد',
    statTotal:        'إجمالي الأكواد',
    statActive:       'أكواد نشطة',
    statInactive:     'أكواد معطلة',
    statExpired:      'منتهية الصلاحية',
    searchPlaceholder:'ابحث عن كود خصم...',
    filterAll:        'الكل',
    filterActive:     'نشط',
    filterInactive:   'معطل',
    filterExpired:    'منتهي',
    loading:          'جاري التحميل...',
    emptyTitle:       'لا توجد خصومات بعد',
    emptySubtitle:    'أضف أول كود خصم لبدء العروض الترويجية',
    formAddTitle:     '➕ إضافة كود خصم جديد',
    formEditTitle:    '✏️ تعديل كود الخصم',
    labelCode:        'كود الخصم',
    labelType:        'نوع الخصم',
    labelValue:       'قيمة الخصم',
    labelStartDate:   'تاريخ البداية',
    labelEndDate:     'تاريخ الانتهاء',
    labelProducts:    'المنتجات المشمولة',
    labelStatus:      'الحالة (نشط)',
    typePercentage:   'نسبة مئوية (%)',
    typeFixed:        'مبلغ ثابت (ج.م)',
    placeholderCode:  'مثال: SUMMER20',
    placeholderValue: '0',
    placeholderProducts: 'اختر المنتجات...',
    allProducts:      'جميع المنتجات',
    searchProducts:   'ابحث عن منتج...',
    btnSave:          'حفظ',
    btnCancel:        'إلغاء',
    btnEdit:          'تعديل',
    btnDelete:        'حذف',
    btnToggle:        'تغيير الحالة',
    statusActive:     'نشط',
    statusInactive:   'معطل',
    statusExpired:    'منتهي',
    discountValue:    'قيمة الخصم',
    allProductsLabel: 'جميع المنتجات',
    andMore:          'و {n} أخرى',
    noLimit:          'بلا حد',
    confirmDeleteTitle: 'تأكيد الحذف',
    confirmDeleteText:  'هل أنت متأكد من حذف كود "{code}"؟ لا يمكن التراجع.',
    confirmDeleteBtn:   'نعم، احذفه',
    cancelBtn:          'إلغاء',
    successSaved:    'تم حفظ الخصم بنجاح!',
    successDeleted:  'تم حذف الخصم بنجاح!',
    successToggled:  'تم تحديث حالة الخصم!',
    errorLoad:       'حدث خطأ أثناء تحميل البيانات',
    errorSave:       'حدث خطأ أثناء الحفظ',
    errorDelete:     'حدث خطأ أثناء الحذف',
    errorRequired:   'يرجى تعبئة جميع الحقول المطلوبة',
    errorValue:      'يجب أن تكون قيمة الخصم أكبر من صفر',
    errorPercent:    'النسبة المئوية لا يمكن أن تتجاوز 100%',
  },
  en: {
    pageTitle:        'Manage Discounts',
    pageSubtitle:     'Create and manage discount codes with ease',
    addBtn:           'Add New Code',
    statTotal:        'Total Codes',
    statActive:       'Active Codes',
    statInactive:     'Inactive Codes',
    statExpired:      'Expired Codes',
    searchPlaceholder:'Search discount codes...',
    filterAll:        'All',
    filterActive:     'Active',
    filterInactive:   'Inactive',
    filterExpired:    'Expired',
    loading:          'Loading...',
    emptyTitle:       'No discounts yet',
    emptySubtitle:    'Add your first discount code to start promotions',
    formAddTitle:     '➕ Add New Discount Code',
    formEditTitle:    '✏️ Edit Discount Code',
    labelCode:        'Discount Code',
    labelType:        'Discount Type',
    labelValue:       'Discount Value',
    labelStartDate:   'Start Date',
    labelEndDate:     'End Date',
    labelProducts:    'Applicable Products',
    labelStatus:      'Status (Active)',
    typePercentage:   'Percentage (%)',
    typeFixed:        'Fixed Amount (EGP)',
    placeholderCode:  'E.g: SUMMER20',
    placeholderValue: '0',
    placeholderProducts: 'Select products...',
    allProducts:      'All Products',
    searchProducts:   'Search products...',
    btnSave:          'Save',
    btnCancel:        'Cancel',
    btnEdit:          'Edit',
    btnDelete:        'Delete',
    btnToggle:        'Toggle Status',
    statusActive:     'Active',
    statusInactive:   'Inactive',
    statusExpired:    'Expired',
    discountValue:    'Discount Value',
    allProductsLabel: 'All Products',
    andMore:          '+{n} more',
    noLimit:          'No limit',
    confirmDeleteTitle: 'Confirm Delete',
    confirmDeleteText:  'Are you sure you want to delete "{code}"? This cannot be undone.',
    confirmDeleteBtn:   'Yes, Delete',
    cancelBtn:          'Cancel',
    successSaved:    'Discount saved successfully!',
    successDeleted:  'Discount deleted successfully!',
    successToggled:  'Discount status updated!',
    errorLoad:       'Error loading data',
    errorSave:       'Error saving discount',
    errorDelete:     'Error deleting discount',
    errorRequired:   'Please fill all required fields',
    errorValue:      'Discount value must be greater than zero',
    errorPercent:    'Percentage cannot exceed 100%',
  }
};

/* ── State ── */
let discounts       = [];
let products        = [];
let currentFilter   = 'all';
let searchQuery     = '';
let selectedProductIds = [];
const lang = localStorage.getItem('lang') === 'en' ? 'en' : 'ar';

const t = (key, vars = {}) => {
  let str = TRANSLATIONS[lang][key] || key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
};

const escHtml = str => String(str)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return dateStr; }
};

const parseProductIds = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  try { return JSON.parse(raw).map(Number).filter(Boolean); } catch { return []; }
};

/* ── DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  applyI18n();
  bindEvents();
  loadData();
});

/* ── Language ── */
function applyLang() {
  document.documentElement.lang = lang;
  document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val !== key) el.placeholder = val;
  });
}

/* ── Events ── */
function bindEvents() {
  document.getElementById('btnAddDiscount')?.addEventListener('click', () => openFormModal(null));
  document.getElementById('btnAddDiscountEmpty')?.addEventListener('click', () => openFormModal(null));

  document.getElementById('searchInput')?.addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderGrid();
    });
  });
}

/* ── Data Loading ── */
async function loadData() {
  showLoading(true);
  try {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [discountsRes, productsRes] = await Promise.all([
      fetch('/api/discounts', { headers }),
      fetch('/api/products', { headers }),
    ]);

    const discountsData = await discountsRes.json();
    const productsData  = await productsRes.json();

    // Normalise discounts response
    if (Array.isArray(discountsData)) {
      discounts = discountsData;
    } else if (discountsData.discounts) {
      discounts = discountsData.discounts;
    } else {
      discounts = [];
    }

    // Normalise products response (object of categories or flat array)
    if (Array.isArray(productsData)) {
      products = productsData;
    } else if (productsData.data) {
      products = productsData.data;
    } else if (typeof productsData === 'object') {
      // keyed by category
      products = Object.values(productsData).flat();
    } else {
      products = [];
    }

  } catch (err) {
    console.error('Load error:', err);
    showToast(t('errorLoad'), 'error');
    discounts = [];
    products  = [];
  } finally {
    showLoading(false);
    renderGrid();
    updateStats();
  }
}

function showLoading(show) {
  const el = document.getElementById('loadingState');
  if (el) el.style.display = show ? 'flex' : 'none';
}

/* ── Filtering ── */
function getStatus(d) {
  const now = new Date();
  if (d.end_date && new Date(d.end_date) < now) return 'expired';
  return d.is_active ? 'active' : 'inactive';
}

function getFilteredDiscounts() {
  return discounts.filter(d => {
    const status = getStatus(d);
    if (currentFilter !== 'all' && currentFilter !== status) return false;
    if (searchQuery && !d.code.toLowerCase().includes(searchQuery)) return false;
    return true;
  });
}

/* ── Stats ── */
function updateStats() {
  const total    = discounts.length;
  const active   = discounts.filter(d => getStatus(d) === 'active').length;
  const inactive = discounts.filter(d => getStatus(d) === 'inactive').length;
  const expired  = discounts.filter(d => getStatus(d) === 'expired').length;

  setEl('statTotal',    total);
  setEl('statActive',   active);
  setEl('statInactive', inactive);
  setEl('statExpired',  expired);
}

/* ── Render Grid ── */
function renderGrid() {
  const grid     = document.getElementById('discountsGrid');
  const empty    = document.getElementById('emptyState');
  const filtered = getFilteredDiscounts();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    empty.style.flexDirection = 'column';
    empty.style.alignItems = 'center';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map((d, i) => buildCard(d, i)).join('');

  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id     = parseInt(btn.dataset.id);
      if (action === 'edit')   openFormModal(discounts.find(d => d.id === id));
      if (action === 'delete') confirmDelete(id);
      if (action === 'toggle') toggleStatus(id);
    });
  });
}

function buildCard(d, index) {
  const statusKey   = getStatus(d);
  const statusLabel = t(`status${statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}`);

  // Normalise field names (API might use different keys)
  const discType  = d.discount_type  || d.type  || 'fixed';
  const discValue = d.discount_value ?? d.value ?? 0;
  const startDate = d.start_date;
  const endDate   = d.end_date;
  const productIds = parseProductIds(d.applicable_products || d.product_ids);

  const valueDisplay = discType === 'percentage'
    ? `${discValue}%`
    : `${Number(discValue).toLocaleString()} ج.م`;

  const typeLabel = discType === 'percentage' ? t('typePercentage') : t('typeFixed');

  // Validity
  let validityText = t('noLimit');
  if (startDate || endDate) {
    const s = startDate ? formatDate(startDate) : '—';
    const e = endDate   ? formatDate(endDate)   : '—';
    validityText = `${s} ← ${e}`;
  }

  // Products
  let productsHtml = '';
  if (!productIds || productIds.length === 0) {
    productsHtml = `<span class="product-tag">${t('allProductsLabel')}</span>`;
  } else {
    const names   = productIds.map(id => {
      const p = products.find(p => p.id === id || p.product_id === id);
      return p ? (p.name || p.product_name || `#${id}`) : `#${id}`;
    });
    const visible = names.slice(0, 2);
    const extra   = names.length - 2;
    productsHtml  = visible.map(n => `<span class="product-tag">${escHtml(n)}</span>`).join('');
    if (extra > 0) productsHtml += `<span class="product-tag product-tag--more">${t('andMore', { n: extra })}</span>`;
  }

  return `
  <div class="discount-card is-${statusKey}" style="animation-delay:${index * 0.05}s" data-id="${d.id}">
    <div class="discount-card__header">
      <div class="discount-card__code-wrap">
        <div class="discount-card__icon"><i class="fa-solid fa-tag"></i></div>
        <div>
          <div class="discount-card__code">${escHtml(d.code)}</div>
          <div class="discount-card__type">${typeLabel}</div>
        </div>
      </div>
      <span class="status-badge status-badge--${statusKey}">${statusLabel}</span>
    </div>

    <div class="discount-card__body">
      <div class="discount-card__value-row">
        <span class="discount-card__value-label">${t('discountValue')}</span>
        <span class="discount-card__value-amount">${valueDisplay}</span>
      </div>
      <div class="discount-card__meta">
        <div class="discount-card__meta-row">
          <i class="fa-regular fa-calendar"></i>
          <span>${validityText}</span>
        </div>
        <div class="discount-card__meta-row" style="flex-wrap:wrap;gap:6px;">
          <i class="fa-solid fa-box-open"></i>
          <div class="products-tags">${productsHtml}</div>
        </div>
      </div>
    </div>

    <div class="discount-card__footer">
      <button class="btn-toggle-status" data-action="toggle" data-id="${d.id}" title="${t('btnToggle')}">
        <i class="fa-solid fa-${d.is_active ? 'toggle-on' : 'toggle-off'}"></i>
        <span>${d.is_active ? t('statusActive') : t('statusInactive')}</span>
      </button>
      <button class="btn-icon" data-action="edit" data-id="${d.id}" title="${t('btnEdit')}">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
      <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${d.id}" title="${t('btnDelete')}">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  </div>`;
}

/* ── Form Modal ── */
async function openFormModal(discount) {
  const isEdit    = !!discount;
  const productIds = isEdit ? parseProductIds(discount.applicable_products || discount.product_ids) : [];
  const discType  = discount ? (discount.discount_type || discount.type || 'fixed') : 'fixed';
  const discValue = discount ? (discount.discount_value ?? discount.value ?? '') : '';

  const formHtml = `
  <div class="vortex-form" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
    <div class="form-row">
      <div class="form-group">
        <label for="swal-code">${t('labelCode')} <span class="required">*</span></label>
        <input id="swal-code" class="form-control" type="text"
               placeholder="${t('placeholderCode')}"
               value="${isEdit ? escHtml(discount.code) : ''}"
               style="text-transform:uppercase;font-family:'Outfit',sans-serif;letter-spacing:1px;" />
      </div>
      <div class="form-group">
        <label for="swal-type">${t('labelType')} <span class="required">*</span></label>
        <select id="swal-type" class="form-control">
          <option value="percentage" ${discType === 'percentage' ? 'selected' : ''}>${t('typePercentage')}</option>
          <option value="fixed"      ${discType === 'fixed'      ? 'selected' : ''}>${t('typeFixed')}</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="swal-value">${t('labelValue')} <span class="required">*</span></label>
      <input id="swal-value" class="form-control" type="text" inputmode="decimal"
             placeholder="${t('placeholderValue')}" value="${discValue}" oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="swal-start">${t('labelStartDate')}</label>
        <input id="swal-start" class="form-control" type="text" placeholder="YYYY-MM-DD"
               value="${isEdit && discount.start_date ? discount.start_date.substring(0,10) : ''}" />
      </div>
      <div class="form-group">
        <label for="swal-end">${t('labelEndDate')}</label>
        <input id="swal-end" class="form-control" type="text" placeholder="YYYY-MM-DD"
               value="${isEdit && discount.end_date ? discount.end_date.substring(0,10) : ''}" />
      </div>
    </div>

    <div class="form-group">
      <label>${t('labelProducts')}</label>
      <div class="multi-select-wrapper" id="ms-wrapper">
        <div class="multi-select-trigger" id="ms-trigger" tabindex="0">
          <span class="multi-select-placeholder" id="ms-placeholder">${t('placeholderProducts')}</span>
        </div>
        <div class="multi-select-dropdown" id="ms-dropdown">
          <div class="multi-select-search">
            <input type="text" id="ms-search" placeholder="${t('searchProducts')}" />
          </div>
          <div id="ms-options">
            <div class="multi-select-option multi-select-all-option" data-value="all">
              <input type="checkbox" id="ms-chk-all" />
              <label for="ms-chk-all" style="cursor:pointer;">${t('allProducts')}</label>
            </div>
            ${products.map(p => {
              const pid   = p.id || p.product_id;
              const pname = p.name || p.product_name || `#${pid}`;
              const chked = productIds.includes(Number(pid)) ? 'checked' : '';
              return `<div class="multi-select-option" data-value="${pid}">
                <input type="checkbox" id="ms-chk-${pid}" value="${pid}" ${chked} />
                <label for="ms-chk-${pid}" style="cursor:pointer;">${escHtml(pname)}</label>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="status-toggle-row">
      <label for="swal-status">${t('labelStatus')}</label>
      <label class="toggle-switch">
        <input type="checkbox" id="swal-status" ${!isEdit || discount.is_active ? 'checked' : ''} />
        <span class="toggle-track"></span>
      </label>
    </div>
  </div>`;

  const result = await Swal.fire({
    title:             isEdit ? t('formEditTitle') : t('formAddTitle'),
    html:              formHtml,
    showCancelButton:  true,
    confirmButtonText: t('btnSave'),
    cancelButtonText:  t('btnCancel'),
    customClass: {
      popup:         'vortex-swal',
      title:         'vortex-title',
      htmlContainer: 'vortex-html',
      confirmButton: 'vortex-confirm',
      cancelButton:  'vortex-cancel',
    },
    focusConfirm: false,
    width: '580px',
    didOpen: () => {
      // Auto-uppercase code
      const codeInput = document.getElementById('swal-code');
      codeInput?.addEventListener('input', () => {
        const pos = codeInput.selectionStart;
        codeInput.value = codeInput.value.toUpperCase();
        codeInput.setSelectionRange(pos, pos);
      });

      // Flatpickr dates
      const fpOpts = { dateFormat: 'Y-m-d', allowInput: true };
      if (lang === 'ar' && flatpickr.l10ns && flatpickr.l10ns.ar) {
        fpOpts.locale = flatpickr.l10ns.ar;
      }
      flatpickr('#swal-start', { ...fpOpts });
      flatpickr('#swal-end',   { ...fpOpts });

      // Init multi-select
      initMultiSelect(productIds);
    },
    preConfirm: () => collectFormData()
  });

  if (result.isConfirmed && result.value) {
    await saveDiscount(isEdit ? discount.id : null, result.value);
  }
}

/* ── MultiSelect ── */
function initMultiSelect(initialIds) {
  selectedProductIds = [...initialIds];
  renderChips();

  const trigger  = document.getElementById('ms-trigger');
  const dropdown = document.getElementById('ms-dropdown');
  const search   = document.getElementById('ms-search');
  const allChk   = document.getElementById('ms-chk-all');

  if (selectedProductIds.length === 0 && allChk) allChk.checked = true;

  trigger?.addEventListener('click', () => {
    dropdown?.classList.toggle('open');
    trigger.classList.toggle('open');
    if (dropdown?.classList.contains('open')) search?.focus();
  });

  document.addEventListener('mousedown', function outsideClick(e) {
    const wrapper = document.getElementById('ms-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      dropdown?.classList.remove('open');
      trigger?.classList.remove('open');
      document.removeEventListener('mousedown', outsideClick);
    }
  });

  search?.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    document.querySelectorAll('#ms-options .multi-select-option:not(.multi-select-all-option)').forEach(opt => {
      const label = opt.querySelector('label')?.textContent?.toLowerCase() || '';
      opt.style.display = label.includes(q) ? '' : 'none';
    });
  });

  allChk?.addEventListener('change', () => {
    if (allChk.checked) {
      selectedProductIds = [];
      document.querySelectorAll('#ms-options input[type="checkbox"]:not(#ms-chk-all)').forEach(c => c.checked = false);
    }
    renderChips();
  });

  document.querySelectorAll('#ms-options input[type="checkbox"]:not(#ms-chk-all)').forEach(chk => {
    chk.addEventListener('change', () => {
      const val = parseInt(chk.value);
      if (chk.checked) {
        if (!selectedProductIds.includes(val)) selectedProductIds.push(val);
        if (allChk) allChk.checked = false;
      } else {
        selectedProductIds = selectedProductIds.filter(id => id !== val);
      }
      renderChips();
    });
  });
}

function renderChips() {
  const trigger     = document.getElementById('ms-trigger');
  const placeholder = document.getElementById('ms-placeholder');
  if (!trigger) return;

  trigger.querySelectorAll('.multi-select-chip').forEach(c => c.remove());

  if (selectedProductIds.length === 0) {
    if (placeholder) placeholder.style.display = '';
    return;
  }

  if (placeholder) placeholder.style.display = 'none';

  selectedProductIds.forEach(id => {
    const p    = products.find(p => (p.id || p.product_id) === id);
    const name = p ? (p.name || p.product_name || `#${id}`) : `#${id}`;
    const chip = document.createElement('span');
    chip.className = 'multi-select-chip';
    chip.innerHTML = `${escHtml(name)} <button type="button" data-id="${id}">×</button>`;
    chip.querySelector('button')?.addEventListener('click', e => {
      e.stopPropagation();
      selectedProductIds = selectedProductIds.filter(i => i !== id);
      const chk = document.getElementById(`ms-chk-${id}`);
      if (chk) chk.checked = false;
      renderChips();
    });
    trigger.appendChild(chip);
  });
}

/* ── Collect Form Data ── */
function collectFormData() {
  const code  = document.getElementById('swal-code')?.value?.trim().toUpperCase();
  const type  = document.getElementById('swal-type')?.value;
  const value = parseFloat(document.getElementById('swal-value')?.value);
  const start = document.getElementById('swal-start')?.value || null;
  const end   = document.getElementById('swal-end')?.value   || null;
  const isActive = document.getElementById('swal-status')?.checked ?? true;

  if (!code || !type) {
    Swal.showValidationMessage(t('errorRequired'));
    return false;
  }
  if (isNaN(value) || value <= 0) {
    Swal.showValidationMessage(t('errorValue'));
    return false;
  }
  if (type === 'percentage' && value > 100) {
    Swal.showValidationMessage(t('errorPercent'));
    return false;
  }

  return {
    code,
    discount_type:         type,
    discount_value:        value,
    start_date:            start,
    end_date:              end,
    applicable_products:   JSON.stringify(selectedProductIds),
    is_active:             isActive,
  };
}

/* ── Save Discount ── */
async function saveDiscount(id, payload) {
  try {
    const token  = localStorage.getItem('token');
    const method = id ? 'PUT' : 'POST';
    const url    = id ? `/api/discounts/${id}` : '/api/discounts';

    const res  = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');

    showToast(t('successSaved'), 'success');
    await loadData();
  } catch (err) {
    console.error('Save error:', err);
    showToast(t('errorSave'), 'error');
  }
}

/* ── Delete ── */
async function confirmDelete(id) {
  const discount = discounts.find(d => d.id === id);
  if (!discount) return;

  const result = await Swal.fire({
    title:             t('confirmDeleteTitle'),
    text:              t('confirmDeleteText', { code: discount.code }),
    icon:              'warning',
    showCancelButton:  true,
    confirmButtonText: t('confirmDeleteBtn'),
    cancelButtonText:  t('cancelBtn'),
    customClass: {
      popup:         'vortex-swal',
      title:         'vortex-title',
      confirmButton: 'vortex-confirm',
      cancelButton:  'vortex-cancel',
    },
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) return;

  try {
    const token = localStorage.getItem('token');
    const res   = await fetch(`/api/discounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Delete failed');

    showToast(t('successDeleted'), 'success');
    await loadData();
  } catch (err) {
    console.error('Delete error:', err);
    showToast(t('errorDelete'), 'error');
  }
}

/* ── Toggle Status ── */
async function toggleStatus(id) {
  const discount = discounts.find(d => d.id === id);
  if (!discount) return;

  const discType  = discount.discount_type  || discount.type  || 'fixed';
  const discValue = discount.discount_value ?? discount.value ?? 0;

  const payload = {
    code:                 discount.code,
    discount_type:        discType,
    discount_value:       discValue,
    start_date:           discount.start_date  || null,
    end_date:             discount.end_date    || null,
    applicable_products:  typeof discount.applicable_products === 'string'
                            ? discount.applicable_products
                            : JSON.stringify(discount.applicable_products || []),
    is_active:            !discount.is_active,
  };

  try {
    const token = localStorage.getItem('token');
    const res   = await fetch(`/api/discounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Toggle failed');

    showToast(t('successToggled'), 'success');
    await loadData();
  } catch (err) {
    console.error('Toggle error:', err);
    showToast(t('errorSave'), 'error');
  }
}

/* ── Toast Notification ── */
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = {
    success: '#008060',
    error:   '#dc2626',
    warning: '#d97706',
    info:    '#2563eb'
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; ${lang === 'ar' ? 'right' : 'left'}:24px;
    background:white; border:1px solid #e2e8f0; border-radius:14px;
    padding:14px 20px; font-family:inherit; font-size:14px; font-weight:600;
    color:#1e293b; box-shadow:0 10px 40px rgba(0,0,0,0.12);
    display:flex; align-items:center; gap:10px; z-index:99999;
    border-right:4px solid ${colors[type] || colors.success};
    animation:slideInToast 0.3s ease;
    max-width:320px;
  `;
  toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${escHtml(message)}</span>`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInToast {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2700);
  setTimeout(() => { toast.remove(); style.remove(); }, 3000);
}