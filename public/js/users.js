document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();

    // إضافة مستخدم جديد
    document.querySelector('.btn-primary').addEventListener('click', async () => {
        const { value: formValues } = await Swal.fire({
            title: 'إضافة موظف جديد',
            html:
                '<input id="swal-username" class="swal2-input" placeholder="اسم المستخدم">' +
                '<input id="swal-password" type="password" class="swal2-input" placeholder="كلمة المرور">' +
                '<select id="swal-role" class="swal2-input">' +
                '<option value="cashier">كاشير</option>' +
                '<option value="manager">مدير</option>' +
                '</select>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                return {
                    username: document.getElementById('swal-username').value,
                    password: document.getElementById('swal-password').value,
                    role: document.getElementById('swal-role').value
                }
            }
        });

        if (formValues) {
            if (!formValues.username || !formValues.password) {
                return Swal.fire('خطأ', 'يرجى ملء جميع الحقول', 'error');
            }
            addUser(formValues);
        }
    });
});

async function fetchUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td><span class="role-tag ${user.role}">${user.role === 'manager' ? 'مدير' : 'كاشير'}</span></td>
            <td>
                <button onclick="deleteUser(${user.id})" class="btn-delete" style="color: #ef4444; border: none; background: none; cursor: pointer;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addUser(userData) {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            Swal.fire('تم!', 'تم إضافة المستخدم بنجاح', 'success');
            fetchUsers();
        } else {
            throw new Error('فشل في إضافة المستخدم');
        }
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
}

async function deleteUser(id) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "حذف حساب هذا الموظف نهائياً!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                Swal.fire('تم الحذف!', '', 'success');
                fetchUsers();
            }
        } catch (error) {
            Swal.fire('خطأ', 'فشل في حذف المستخدم', 'error');
        }
    }
}
