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
    // Set current date in header (optional element)
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

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

    // Search filter
    document.getElementById('expense-search').addEventListener('input', () => {
        renderTable();
    });

    // Form submission
    document.getElementById('expense-form').addEventListener('submit', handleSubmit);

    // Close modal on overlay click
    document.getElementById('expense-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Initial load — fetch businessDate from server stats
    await fetchExpenses();

    // Convert Arabic numerals to English in real-time
    const amountInput = document.getElementById('field-amount');
    if (amountInput) {
        amountInput.addEventListener('input', function(e) {
            const arabicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
            let val = e.target.value;
            for (let i = 0; i < 10; i++) {
                val = val.replace(arabicNumerals[i], i);
            }
            // Also allow only numbers and decimal point
            val = val.replace(/[^\d.]/g, '');
            e.target.value = val;
        });
    }
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
                window.location.href = '/index.html';
                return;
            }
            throw new Error('فشل في جلب البيانات');
        }

        const data = await res.json();

        // Server returns { expenses, stats }
        allExpenses = data.expenses || [];
        const stats = data.stats || {};

        // Update businessDate from server (always keep the TRUE one for reset)
        businessDate = stats.activeBusinessDate;
        
        // Use filteredDate (what we are actually seeing) for UI
        const viewDate = stats.filteredDate;
        const dateInput = document.getElementById('date-filter');
        if (dateInput) dateInput.value = viewDate;

        const dateLabel = document.getElementById('business-date-label');
        if (dateLabel) {
            dateLabel.textContent = `عرض بيانات يوم: ${new Date(viewDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }

        // Update stats cards
        const updateStat = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = fmt(val);
        };
        
        updateStat('stat-today', stats.todayTotal);
        updateStat('stat-month', stats.monthTotal);
        updateStat('stat-cash', stats.byMethod?.cash);
        const digital = (stats.byMethod?.card || 0) + (stats.byMethod?.vcash || 0) + (stats.byMethod?.instapay || 0);
        updateStat('stat-digital', digital);

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
    const searchTerm = document.getElementById('expense-search').value.toLowerCase();
    const userRole = localStorage.getItem('role');

    let filtered = allExpenses;

    // 1. Filter by Category
    if (activeCategory !== 'all') {
        filtered = filtered.filter(e => e.category === activeCategory);
    }

    // 2. Filter by Search Term
    if (searchTerm) {
        filtered = filtered.filter(e => 
            e.description.toLowerCase().includes(searchTerm) || 
            (e.notes && e.notes.toLowerCase().includes(searchTerm)) ||
            (e.addedBy && e.addedBy.toLowerCase().includes(searchTerm))
        );
    }

    document.getElementById('expenses-count').textContent = filtered.length;

    let rowsHtml = '';
    const totalTarget = 8;

    if (filtered.length === 0) {
        // Show empty state in first row, then pad
        rowsHtml = `
            <tr><td colspan="7" style="height: 120px; border-bottom: none;">
                <div class="empty-state" style="padding: 1rem 0;">
                    <i class="fas fa-receipt" style="font-size: 1.5rem;"></i>
                    <p style="font-size: 0.85rem;">لا توجد مصروفات لهذا اليوم أو الفئة المحددة</p>
                </div>
            </td></tr>`;
        
        // Pad remaining 7 rows
        for (let i = 0; i < 7; i++) {
            rowsHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
        }
    } else {
        rowsHtml = filtered.map(exp => {
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
                            ${userRole === 'manager' ? `
                                <button class="btn-icon btn-edit" onclick="openEditModal(${exp.id})" title="تعديل">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-icon btn-delete" onclick="deleteExpense(${exp.id}, '${exp.description.replace(/'/g, "\\'")}')" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : '<span style="font-size:0.7rem;color:var(--text-muted)">عرض فقط</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Pad up to 8
        const currentCount = filtered.length;
        if (currentCount < totalTarget) {
            for (let i = 0; i < (totalTarget - currentCount); i++) {
                rowsHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
            }
        }
    }

    tbody.innerHTML = rowsHtml;
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

// ─── Export to Excel ──────────────────────────────────────────────────────────

function exportToExcel() {
    if (allExpenses.length === 0) {
        Swal.fire({ icon: 'info', title: 'لا يوجد بيانات', text: 'لا يوجد مصروفات لتصديرها في التاريخ المختار' });
        return;
    }

    const searchTerm = document.getElementById('expense-search').value.toLowerCase();
    let toExport = allExpenses;
    if (activeCategory !== 'all') {
        toExport = toExport.filter(e => e.category === activeCategory);
    }
    if (searchTerm) {
        toExport = toExport.filter(e => 
            e.description.toLowerCase().includes(searchTerm) || 
            (e.notes && e.notes.toLowerCase().includes(searchTerm))
        );
    }

    const rows = toExport.map(e => ({
        'التاريخ': e.date,
        'الوصف': e.description,
        'الفئة': CATEGORY_NAMES[e.category] || e.category,
        'المبلغ': parseFloat(e.amount),
        'طريقة الدفع': METHOD_ICONS[e.payment_method]?.label || e.payment_method,
        'ملاحظات': e.notes || '',
        'بواسطة': e.addedBy || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

    // Auto-size columns (rough estimate)
    const wscols = [
        {wch: 12}, {wch: 30}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 30}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Expenses_${document.getElementById('date-filter').value}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
