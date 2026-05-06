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
    
            // Fetch system settings to apply globally (like Language and System Mode)
            fetch('/api/settings', { headers: { 'Authorization': `Bearer ${data.token}` } })
            .then(res => res.json())
            .then(settings => {
                if (settings.language) localStorage.setItem('lang', settings.language);
                if (settings.system_mode) localStorage.setItem('systemMode', settings.system_mode);
                window.location.href = '/launcher.html';
            })
            .catch(() => {
                // If fetching settings fails, still proceed to launcher
                window.location.href = '/launcher.html';
            });
        } else {
            alert(data.error || 'فشل تسجيل الدخول.');
        }
    })
    .catch(error => console.error('❌ خطأ أثناء تسجيل الدخول:', error));
    
});
