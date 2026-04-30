document.addEventListener('DOMContentLoaded', () => {
    fetchExpenses();
    
    document.getElementById('expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const expenseData = {
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            payment_method: document.getElementById('payment_method').value,
            date: new Date().toISOString().slice(0, 10)
        };

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(expenseData)
            });

            const data = await response.json();
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'تمت الإضافة',
                    text: data.message,
                    timer: 1500,
                    showConfirmButton: false
                });
                document.getElementById('expense-form').reset();
                fetchExpenses();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: error.message
            });
        }
    });
});

async function fetchExpenses() {
    try {
        const response = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const expenses = await response.json();
        renderExpenses(expenses);
        updateStats(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
    }
}

function renderExpenses(expenses) {
    const tbody = document.getElementById('expenses-table-body');
    tbody.innerHTML = '';

    expenses.forEach(exp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(exp.date).toLocaleDateString('ar-EG')}</td>
            <td>${exp.description}</td>
            <td><span class="category-tag cat-${exp.category.toLowerCase()}">${getCategoryName(exp.category)}</span></td>
            <td style="font-weight: 700;">${parseFloat(exp.amount).toFixed(2)} EGP</td>
            <td style="color: #64748b;">${exp.addedBy || '---'}</td>
            <td>${getPaymentMethodName(exp.payment_method)}</td>
            <td>
                <button onclick="deleteExpense(${exp.id})" class="delete-btn">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(expenses) {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todayTotal = expenses
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const monthTotal = expenses
        .filter(e => e.date.startsWith(thisMonth))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    document.getElementById('today-total').textContent = `${todayTotal.toFixed(2)} EGP`;
    document.getElementById('month-total').textContent = `${monthTotal.toFixed(2)} EGP`;
}

async function deleteExpense(id) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لن تتمكن من التراجع عن هذا!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                Swal.fire('تم الحذف!', 'تم حذف المصروف بنجاح.', 'success');
                fetchExpenses();
            }
        } catch (error) {
            Swal.fire('خطأ!', 'فشل في حذف المصروف.', 'error');
        }
    }
}

function getCategoryName(cat) {
    const names = {
        'Supplies': 'خامات ومشتريات',
        'Rent': 'إيجار',
        'Utilities': 'مرافق',
        'Salaries': 'رواتب',
        'Maintenance': 'صيانة',
        'Other': 'أخرى'
    };
    return names[cat] || cat;
}

function getPaymentMethodName(method) {
    const names = {
        'cash': 'كاش',
        'card': 'فيزا',
        'vcash': 'فودافون كاش'
    };
    return names[method] || method;
}
