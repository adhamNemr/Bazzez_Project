let currentTab = 'supplier';
let allMerchants = [];
let activeMerchantId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchMerchants();
    updateSummary();
    document.getElementById('trans-date').valueAsDate = new Date();
    document.getElementById('merchant-form').addEventListener('submit', handleMerchantSubmit);
    document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });

    // تحويل الأرقام العربي إلى إنجليزي تلقائياً في أي حقل إدخال
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            let val = e.target.value;
            
            // 1. تحويل الأرقام العربي لإنجليزي
            let convertedVal = val.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
            
            // 2. لو الحقل رقمي، نمنع أي حروف تتكتب
            if (e.target.inputMode === 'decimal' || e.target.type === 'number') {
                convertedVal = convertedVal.replace(/[^0-9.]/g, '');
                // نمنع أكتر من علامة عشرية
                const parts = convertedVal.split('.');
                if (parts.length > 2) {
                    convertedVal = parts[0] + '.' + parts.slice(1).join('');
                }
            }

            if (val !== convertedVal) {
                let start = e.target.selectionStart;
                let end = e.target.selectionEnd;
                e.target.value = convertedVal;
                try { e.target.setSelectionRange(start, end); } catch (err) {}
            }
        }
    });
});

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchMerchants() {
    try {
        const res = await fetch(`/api/merchants?type=${currentTab}&_t=${Date.now()}`);
        allMerchants = await res.json();
        renderMerchantsList();
    } catch (err) {
        showToast('فشل في تحميل البيانات', 'error');
    }
}

async function updateSummary() {
    try {
        const [supRes, cliRes] = await Promise.all([
            fetch(`/api/merchants?type=supplier&_t=${Date.now()}`),
            fetch(`/api/merchants?type=wholesale_client&_t=${Date.now()}`)
        ]);
        const suppliers = await supRes.json();
        const clients   = await cliRes.json();
        const supDebt   = suppliers.reduce((s, m) => s + parseFloat(m.balance || 0), 0);
        const cliCredit = clients.reduce((s, m) => s + parseFloat(m.balance || 0), 0);
        document.getElementById('total-supplier-debt').textContent   = `${supDebt.toLocaleString()}  `;
        document.getElementById('total-client-credit').textContent   = `${cliCredit.toLocaleString()}  `;
    } catch (e) {}
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderMerchantsList() {
    const list       = document.getElementById('merchants-list');
    const searchTerm = document.getElementById('merchant-search').value.toLowerCase();

    const filtered = allMerchants.filter(m =>
        m.name.toLowerCase().includes(searchTerm) ||
        (m.phone && m.phone.includes(searchTerm))
    );

    if (filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#94a3b8;">لا توجد نتائج مطابقة</td></tr>`;
        resetActionBar();
        return;
    }

    list.innerHTML = filtered.map(m => {
        const balance       = parseFloat(m.balance || 0);
        const totalInvoices = parseFloat(m.totalInvoices || 0);
        const totalPayments = parseFloat(m.totalPayments || 0);
        const statusClass   = balance > 0 ? 'status-debt' : 'status-credit';
        const statusText    = currentTab === 'supplier'
            ? (balance > 0 ? 'مديونية' : 'خالص')
            : (balance > 0 ? 'مستحق' : 'خالص');

        return `
            <tr class="clickable-row" id="row-${m.id}" onclick="selectMerchantRow(${m.id})">
                <td style="text-align:right;">
                    <strong>${m.name}</strong>
                    ${m.phone ? `<small style="display:block;color:#94a3b8;font-weight:500;">${m.phone}</small>` : ''}
                </td>
                <td style="color:#dc2626;font-weight:700;">${totalInvoices.toLocaleString()}  </td>
                <td style="color:#16a34a;font-weight:700;">${totalPayments.toLocaleString()}  </td>
                <td style="font-weight:800;color:${balance > 0 ? '#dc2626' : '#16a34a'}">${balance.toLocaleString()}  </td>
                <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td>${m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('ar-EG') : '---'}</td>
                <td class="action-btns" onclick="event.stopPropagation()">
                    <button class="btn-icon delete" onclick="deleteMerchant(${m.id},'${m.name.replace(/'/g,"\\'")}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    // Re-highlight previously selected row
    if (activeMerchantId) {
        const row = document.getElementById(`row-${activeMerchantId}`);
        if (row) row.classList.add('row-selected');
    }
}

function filterMerchants() { renderMerchantsList(); }

function switchTab(type) {
    currentTab = type;
    activeMerchantId = null;
    document.getElementById('merchant-filter').value = type;
    resetActionBar();
    fetchMerchants();
}

// ─── Action Bar ───────────────────────────────────────────────────────────────

function selectMerchantRow(id) {
    activeMerchantId = id;
    const m = allMerchants.find(x => x.id === id);
    if (!m) return;

    // Highlight row
    document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-selected'));
    const row = document.getElementById(`row-${id}`);
    if (row) row.classList.add('row-selected');

    const balance       = parseFloat(m.balance || 0);
    const totalInvoices = parseFloat(m.totalInvoices || 0);
    const totalPayments = parseFloat(m.totalPayments || 0);

    document.getElementById('abar-name-text').textContent = m.name;
    document.getElementById('abar-total-invoices').textContent = `${totalInvoices.toLocaleString()}  `;
    document.getElementById('abar-total-paid').textContent     = `${totalPayments.toLocaleString()}  `;

    const remEl = document.getElementById('abar-remaining');
    remEl.textContent    = `${balance.toLocaleString()}  `;
    remEl.style.color    = balance > 0 ? '#dc2626' : '#16a34a';

    const payInput       = document.getElementById('abar-payment-input');
    payInput.value       = '';
    payInput.max         = balance > 0 ? balance : 0;
    payInput.disabled    = balance <= 0;
    payInput.placeholder = balance > 0
        ? `أقصى دفعة: ${balance.toLocaleString()}`
        : 'الحساب خالص ✅';

    // Display Action Bar
    document.getElementById('abar-content').style.display = 'flex';

    // Smooth scroll to top to show the unified toolbar
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function resetActionBar() {
    activeMerchantId = null;
    document.getElementById('abar-content').style.display = 'none';
    document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-selected'));
}

async function quickPayment() {
    if (!activeMerchantId) return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
    const payInput = document.getElementById('abar-payment-input');
    const amount   = parseFloat(payInput.value);
    const m        = allMerchants.find(x => x.id === activeMerchantId);
    const balance  = parseFloat(m?.balance || 0);

    if (!amount || amount <= 0) { showToast('أدخل مبلغ الدفعة أولاً', 'warning'); payInput.focus(); return; }
    if (amount > balance) {
        showToast(`لا يمكن دفع أكثر من المتبقي (${balance.toLocaleString()})`, 'error');
        payInput.value = balance;
        return;
    }

    try {
        const res = await fetch(`/api/merchants/${activeMerchantId}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'payment', amount,
                date:  new Date().toISOString().split('T')[0],
                notes: `دفعة سداد - ${new Date().toLocaleDateString('ar-EG')}`
            })
        });
        if (res.ok) {
            showToast(`✅ تم تسجيل دفعة ${amount.toLocaleString()}  `, 'success');
            await fetchMerchants();
            updateSummary();
            selectMerchantRow(activeMerchantId);
            if (document.getElementById('ledger-drawer').classList.contains('open')) {
                fetchMerchantLedger(activeMerchantId);
            }
        } else {
            const err = await res.json();
            showToast(err.error || 'فشل تسجيل الدفعة', 'error');
        }
    } catch { showToast('خطأ في الاتصال', 'error'); }
}

function editSelectedMerchant() {
    if (!activeMerchantId) return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
    const m = allMerchants.find(x => x.id === activeMerchantId);
    if (m) openMerchantModal(m);
}

// ─── Ledger Drawer ─────────────────────────────────────────────────────────────

function toggleLedgerDrawer(open = null) {
    const drawer = document.getElementById('ledger-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const isOpen = open !== null ? open : !drawer.classList.contains('open');

    if (isOpen) {
        if (!activeMerchantId) {
            drawer.classList.remove('open');
            overlay.classList.remove('active');
            return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
        }
        drawer.classList.add('open');
        overlay.classList.add('active');
        fetchMerchantLedger(activeMerchantId);
    } else {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
    }
}

async function fetchMerchantLedger(id) {
    try {
        const res = await fetch(`/api/merchants/${id}/transactions?_t=${Date.now()}`);
        const { merchant, transactions } = await res.json();

        // Update Drawer Header & Stats
        document.getElementById('active-merchant-name-drawer').textContent = merchant.name;
        document.getElementById('active-merchant-phone-drawer').textContent = merchant.phone || 'بدون تليفون';

        const balance = parseFloat(merchant.balance || 0);
        const balEl = document.getElementById('active-merchant-balance-drawer');
        balEl.textContent = `${balance.toLocaleString()}  `;
        balEl.style.color = balance > 0 ? '#4ade80' : '#4ade80'; // Keeping it green/neutral in dark summary

        const totalPayments = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + parseFloat(t.amount), 0);
        const totalInvoices = balance + totalPayments;

        document.getElementById('ledger-total-invoices-drawer').textContent = `${totalInvoices.toLocaleString()}  `;
        document.getElementById('ledger-total-payments-drawer').textContent = `${totalPayments.toLocaleString()}  `;

        renderTransactionsTimeline(transactions);
    } catch (err) {
        showToast('فشل في تحميل كشف الحساب', 'error');
    }
}

function renderTransactionsTimeline(list) {
    const container = document.getElementById('transactions-list-timeline');
    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;font-weight:600;">لا توجد حركات مسجلة بعد</div>`;
        return;
    }

    container.innerHTML = list.map(t => {
        const isInvoice = t.type === 'invoice';
        return `
            <div class="timeline-item">
                <div class="t-header">
                    <span class="t-date">${new Date(t.date).toLocaleDateString('ar-EG')}</span>
                    <span class="t-type ${t.type}">${isInvoice ? '📦 فاتورة' : '💳 سداد'}</span>
                </div>
                <div class="t-notes">${t.notes || '---'}</div>
                <div class="t-amount ${isInvoice ? 'red' : 'green'}">
                    ${isInvoice ? '+' : '-'}${parseFloat(t.amount).toLocaleString()}
                </div>
                <div class="t-actions">
                    <button class="t-btn" onclick="editTransaction(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="t-btn delete" onclick="deleteTransaction(${t.id})" title="حذف">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportLedger() {
    const name = document.getElementById('active-merchant-name-drawer').textContent;
    const items = document.querySelectorAll('.timeline-item');
    let csv = `كشف حساب: ${name}\n\nالتاريخ,البيان,المبلغ,النوع\n`;
    items.forEach(item => {
        const date = item.querySelector('.t-date').textContent;
        const notes = item.querySelector('.t-notes').textContent;
        const amount = item.querySelector('.t-amount').textContent.replace(/[+-]/, '').trim();
        const type = item.querySelector('.t-type').textContent;
        csv += `${date},"${notes}",${amount},${type}\n`;
    });
    downloadCSV(csv, `كشف_${name}.csv`);
}

function exportMerchants() {
    const label = currentTab === 'supplier' ? 'الموردين' : 'عملاء_الجملة';
    let csv = `قائمة ${label}\n\nالاسم,التليفون,المبلغ كامل,المدفوع,المتبقي\n`;
    allMerchants.forEach(m => {
        csv += `"${m.name}",${m.phone||''},${parseFloat(m.totalInvoices||0).toLocaleString()},${parseFloat(m.totalPayments||0).toLocaleString()},${parseFloat(m.balance||0).toLocaleString()}\n`;
    });
    downloadCSV(csv, `${label}.csv`);
}

function downloadCSV(content, filename) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`تم تحميل "${filename}"`, 'success');
}

// ─── Transaction Actions ──────────────────────────────────────────────────────

async function editTransaction(t) {
    const { value } = await Swal.fire({
        title: t.type === 'invoice' ? '📦 تعديل فاتورة' : '💳 تعديل دفعة',
        html: `
            <div style="text-align:right;font-family:inherit;">
                <label style="font-weight:700;display:block;margin-bottom:5px;">المبلغ</label>
                <input id="sa" class="swal2-input" type="number" step="0.01" value="${t.amount}" style="margin:0 0 12px;width:100%;">
                <label style="font-weight:700;display:block;margin-bottom:5px;">التاريخ</label>
                <input id="sd" class="swal2-input" type="date" value="${(t.date||'').split('T')[0]}" style="margin:0 0 12px;width:100%;">
                <label style="font-weight:700;display:block;margin-bottom:5px;">ملاحظات</label>
                <textarea id="sn" class="swal2-textarea" style="margin:0;width:100%;height:70px;">${t.notes||''}</textarea>
            </div>`,
        focusConfirm: false, showCancelButton: true,
        confirmButtonText: 'حفظ', cancelButtonText: 'إلغاء', confirmButtonColor: '#008060',
        preConfirm: () => {
            const a = document.getElementById('sa').value;
            if (!a || parseFloat(a) <= 0) { Swal.showValidationMessage('أدخل مبلغ صحيح'); return false; }
            return { amount: a, date: document.getElementById('sd').value, notes: document.getElementById('sn').value };
        }
    });
    if (value) {
        try {
            const res = await fetch(`/api/merchants/transactions/${t.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value)
            });
            if (res.ok) {
                showToast('تم التعديل بنجاح', 'success');
                await fetchMerchants(); 
                updateSummary();
                selectMerchantRow(activeMerchantId);
                if (document.getElementById('ledger-drawer').classList.contains('open')) {
                    fetchMerchantLedger(activeMerchantId);
                }
            } else showToast((await res.json()).error || 'فشل', 'error');
        } catch { showToast('خطأ في الاتصال', 'error'); }
    }
}

async function deleteTransaction(id) {
    const r = await Swal.fire({ title: 'حذف الحركة؟', icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
    if (r.isConfirmed) {
        try {
            const res = await fetch(`/api/merchants/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('تم الحذف', 'success');
                await fetchMerchants(); 
                updateSummary();
                selectMerchantRow(activeMerchantId);
                if (document.getElementById('ledger-drawer').classList.contains('open')) {
                    fetchMerchantLedger(activeMerchantId);
                }
            }
        } catch { showToast('فشل الحذف', 'error'); }
    }
}

async function deleteMerchant(id, name) {
    const r = await Swal.fire({ title: `حذف "${name}"؟`, icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
    if (r.isConfirmed) {
        try {
            const res = await fetch(`/api/merchants/${id}`, { method: 'DELETE' });
            if (res.ok) { showToast('تم الحذف', 'success'); fetchMerchants(); updateSummary(); resetActionBar(); }
            else showToast((await res.json()).error || 'فشل', 'error');
        } catch { showToast('خطأ', 'error'); }
    }
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function openMerchantModal(merchant = null) {
    const form = document.getElementById('merchant-form');
    form.reset();
    const ibg = document.getElementById('initial-balance-group');
    if (merchant) {
        document.getElementById('modal-title').textContent = 'تعديل بيانات الجهة';
        document.getElementById('merchant-id').value       = merchant.id;
        document.getElementById('merchant-name').value     = merchant.name;
        document.getElementById('merchant-phone').value    = merchant.phone || '';
        document.getElementById('merchant-type').value     = merchant.type;
        document.getElementById('merchant-notes').value    = merchant.notes || '';
        document.getElementById('type-group').style.display = 'none';
        ibg.style.display = 'none';
    } else {
        document.getElementById('modal-title').textContent = 'إضافة جهة جديدة';
        document.getElementById('merchant-id').value = '';
        document.getElementById('merchant-type').value = currentTab;
        document.getElementById('type-group').style.display = 'block';
        ibg.style.display = 'block';
    }
    document.getElementById('merchant-modal').style.display = 'flex';
}

async function handleMerchantSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('merchant-id').value;
    const data = {
        name:  document.getElementById('merchant-name').value,
        phone: document.getElementById('merchant-phone').value,
        type:  document.getElementById('merchant-type').value,
        notes: document.getElementById('merchant-notes').value
    };
    if (!id) data.initialBalance = parseFloat(document.getElementById('merchant-initial-balance').value) || 0;

    try {
        const res = await fetch(id ? `/api/merchants/${id}` : '/api/merchants', {
            method:  id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('merchant-modal');
            showToast(id ? 'تم التعديل' : 'تمت الإضافة', 'success');
            fetchMerchants(); updateSummary();
        } else showToast((await res.json()).error || 'فشل', 'error');
    } catch { showToast('خطأ في الاتصال', 'error'); }
}

function openTransactionModal(type) {
    if (!activeMerchantId) return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
    document.getElementById('trans-type').value = type;
    document.getElementById('trans-modal-title').textContent = type === 'invoice' ? '📦 إضافة فاتورة / بضاعة' : '💳 إضافة دفعة / سداد';
    document.getElementById('trans-date').valueAsDate = new Date();
    document.getElementById('transaction-modal').style.display = 'flex';
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const data = {
        type:   document.getElementById('trans-type').value,
        amount: document.getElementById('trans-amount').value,
        date:   document.getElementById('trans-date').value,
        notes:  document.getElementById('trans-notes').value
    };
    try {
        const res = await fetch(`/api/merchants/${activeMerchantId}/transactions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('transaction-modal');
            showToast('تمت إضافة الحركة', 'success');
            await fetchMerchants(); 
            updateSummary();
            selectMerchantRow(activeMerchantId);
            if (document.getElementById('ledger-drawer').classList.contains('open')) {
                fetchMerchantLedger(activeMerchantId);
            }
        } else showToast((await res.json()).error || 'فشل', 'error');
    } catch { showToast('خطأ', 'error'); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showToast(msg, icon = 'success') {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, icon, title: msg });
}
