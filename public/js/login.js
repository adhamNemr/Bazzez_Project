document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('📥 إرسال بيانات تسجيل الدخول:', { username, password });

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('❌ فشل في تسجيل الدخول.');
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            console.log('🟢 Login successful:', data);
            localStorage.clear(); 
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('username', data.username || username); // Fallback to provided username
    
            // إعادة التوجيه لصفحة الـ Hub المركزية
            window.location.href = '/launcher.html';
        } else {
            alert(data.error || 'فشل تسجيل الدخول.');
        }
    })
    .catch(error => console.error('❌ خطأ أثناء تسجيل الدخول:', error));
    
});
