/**
 * Vortex POS — Expenses Module
 * Full rewrite: businessDate-aware, server-side stats, modal CRUD, category filter
 */

let businessDate = '';
let allExpenses = [];
let activeCategory = 'all';
let editingId = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) => `${parseFloat(n || 0).toFixed(2)} EGP`;

const CATEGORY_NAMES = {
    Supplies: 'خامات ومشتريات',
    Rent: 'إيجار',
    Utilities: 'مرافق',
    Salaries: 'رواتب',
    Maintenance: 'صيانة',
    Marketing: 'تسويق وإعلان',
    Other: 'أخرى'
};

const METHOD_ICONS = {
    cash: { icon: 'fas fa-money-bill-wave', label: 'كاش' },
    card: { icon: 'fas fa-credit-card', label: 'فيزا' },
    vcash: { icon: 'fas fa-mobile-alt', label: 'فودافون كاش' },
    instapay: { icon: 'fas fa-bolt', label: 'إنستاباي' }
};

function getToken() {
    return localStorage.getItem('token') || '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Set current date in header
    document.getElementById('current-date-display').textContent =
        new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Setup category filter pills
    document.querySelectorAll('#cat-filter .cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#cat-filter .cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.dataset.cat;
            renderTable();
        });
    });

    // Date filter change
    document.getElementById('date-filter').addEventListener('change', (e) => {
        fetchExpenses(e.target.value);
    });

    // Form submission
    document.getElementById('expense-form').addEventListener('submit', handleSubmit);

    // Close modal on overlay click
    document.getElementById('expense-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Initial load — fetch businessDate from server stats
    await fetchExpenses();
});

// ─── API Calls ────────────────────────────────────────────────────────────────

async function fetchExpenses(date = '') {
    showSkeleton();
    try {
        const url = date ? `/api/expenses?date=${date}` : '/api/expenses';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('فشل في جلب البيانات');
        }

        const data = await res.json();

        // Server returns { expenses, stats }
        allExpenses = data.expenses || [];
        const stats = data.stats || {};

        // Update businessDate from server
        businessDate = stats.activeBusinessDate || new Date().toLocaleDateString('en-CA');
        document.getElementById('date-filter').value = date || businessDate;
        document.getElementById('business-date-label').textContent =
            `وردية العمل: ${new Date(businessDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

        // Update stats cards
        document.getElementById('stat-today').textContent = fmt(stats.todayTotal);
        document.getElementById('stat-month').textContent = fmt(stats.monthTotal);
        document.getElementById('stat-cash').textContent = fmt(stats.byMethod?.cash);
        const digital = (stats.byMethod?.card || 0) + (stats.byMethod?.vcash || 0) + (stats.byMethod?.instapay || 0);
        document.getElementById('stat-digital').textContent = fmt(digital);

        renderTable();
    } catch (err) {
        console.error(err);
        document.getElementById('expenses-table-body').innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color:var(--error);opacity:0.4;font-size:2.5rem;"></i>
                    <p>فشل في تحميل البيانات. تأكد من الاتصال بالسيرفر.</p>
                </div>
            </td></tr>`;
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const description = document.getElementById('field-description').value.trim();
    const amount = parseFloat(document.getElementById('field-amount').value);
    const category = document.getElementById('field-category').value;
    const payment_method = document.getElementById('field-payment').value;
    const notes = document.getElementById('field-notes').value.trim();

    // Client-side validation
    if (!description || description.length < 2) {
        return flashError('field-description', 'الوصف يجب أن يكون حرفين على الأقل');
    }
    if (!amount || amount <= 0) {
        return flashError('field-amount', 'المبلغ يجب أن يكون أكبر من صفر');
    }

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    document.getElementById('submit-btn-text').textContent = 'جاري الحفظ...';

    const payload = { description, amount, category, payment_method, notes };

    try {
        const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'حدث خطأ غير متوقع');
        }

        closeModal();
        await fetchExpenses(document.getElementById('date-filter').value);

        Swal.fire({
            icon: 'success',
            title: editingId ? 'تم التعديل ✅' : 'تم التسجيل ✅',
            text: data.message,
            timer: 1800,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: err.message });
    } finally {
        submitBtn.disabled = false;
        document.getElementById('submit-btn-text').textContent = editingId ? 'حفظ التعديلات' : 'تسجيل المصروف';
    }
}

async function deleteExpense(id, description) {
    const result = await Swal.fire({
        title: 'حذف المصروف؟',
        html: `سيتم حذف: <strong>${description}</strong><br><small style="color:#64748b">لا يمكن التراجع عن هذا الإجراء</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fas fa-trash"></i> نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        await fetchExpenses(document.getElementById('date-filter').value);
        Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1500, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: err.message });
    }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTable() {
    const tbody = document.getElementById('expenses-table-body');

    let filtered = allExpenses;
    if (activeCategory !== 'all') {
        filtered = allExpenses.filter(e => e.category === activeCategory);
    }

    document.getElementById('expenses-count').textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>لا توجد مصروفات لهذا اليوم أو الفئة المحددة</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(exp => {
        const cat = exp.category || 'Other';
        const method = METHOD_ICONS[exp.payment_method] || { icon: 'fas fa-question', label: exp.payment_method };
        const dateStr = new Date(exp.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return `
            <tr class="animate-fade-in">
                <td style="font-size:0.8rem;color:var(--text-muted);font-weight:600;white-space:nowrap;">${dateStr}</td>
                <td>
                    <div class="expense-desc">${exp.description}</div>
                    ${exp.notes ? `<div class="expense-notes"><i class="fas fa-info-circle"></i> ${exp.notes}</div>` : ''}
                </td>
                <td><span class="cat-badge cat-${cat}">${CATEGORY_NAMES[cat] || cat}</span></td>
                <td class="amount-cell">-${parseFloat(exp.amount).toFixed(2)} EGP</td>
                <td>
                    <div class="method-badge">
                        <i class="${method.icon}"></i>
                        ${method.label}
                    </div>
                </td>
                <td class="added-by-cell">${exp.addedBy || '---'}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon btn-edit" onclick="openEditModal(${exp.id})" title="تعديل">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteExpense(${exp.id}, '${exp.description.replace(/'/g, "\\'")}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showSkeleton() {
    const tbody = document.getElementById('expenses-table-body');
    tbody.innerHTML = Array.from({ length: 5 }, () => `
        <tr>
            <td><div class="skeleton" style="width:70px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:150px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:80px;height:20px;border-radius:6px;"></div></td>
            <td><div class="skeleton" style="width:90px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:80px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:70px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:60px;height:28px;border-radius:8px;"></div></td>
        </tr>
    `).join('');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal() {
    editingId = null;
    document.getElementById('modal-title-text').textContent = 'تسجيل مصروف جديد';
    document.getElementById('submit-btn-text').textContent = 'تسجيل المصروف';
    document.getElementById('expense-form').reset();
    clearErrors();
    document.getElementById('expense-modal').classList.add('open');
    setTimeout(() => document.getElementById('field-description').focus(), 100);
}

function openEditModal(id) {
    const exp = allExpenses.find(e => e.id === id);
    if (!exp) return;

    editingId = id;
    document.getElementById('modal-title-text').textContent = 'تعديل المصروف';
    document.getElementById('submit-btn-text').textContent = 'حفظ التعديلات';

    document.getElementById('field-description').value = exp.description;
    document.getElementById('field-amount').value = parseFloat(exp.amount);
    document.getElementById('field-category').value = exp.category;
    document.getElementById('field-payment').value = exp.payment_method || 'cash';
    document.getElementById('field-notes').value = exp.notes || '';

    clearErrors();
    document.getElementById('expense-modal').classList.add('open');
}

function closeModal() {
    document.getElementById('expense-modal').classList.remove('open');
    editingId = null;
}

function resetToBusinessDate() {
    document.getElementById('date-filter').value = businessDate;
    fetchExpenses(businessDate);
}

// ─── Validation UI ────────────────────────────────────────────────────────────

function flashError(fieldId, message) {
    const el = document.getElementById(fieldId);
    el.classList.add('error');
    el.focus();
    Swal.fire({ icon: 'warning', title: 'تحقق من البيانات', text: message, timer: 2500, showConfirmButton: false });
    el.addEventListener('input', () => el.classList.remove('error'), { once: true });
}

function clearErrors() {
    document.querySelectorAll('.field-input.error').forEach(el => el.classList.remove('error'));
}
