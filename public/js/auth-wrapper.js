(function() {
    // 🔔 Inject SweetAlert2 dynamically if not present
    if (!document.getElementById('swal2-script')) {
        const swalScript = document.createElement('script');
        swalScript.id = 'swal2-script';
        swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(swalScript);
    }

    // 🔐 Inject auth.js if missing (for showToast and security)
    if (!document.getElementById('auth-script')) {
        const authScript = document.createElement('script');
        authScript.id = 'auth-script';
        authScript.src = '/js/auth.js';
        document.head.appendChild(authScript);
    }

    // 🚀 Global Loader Management
    const startLoading = () => {
        let loader = document.getElementById('global-loader');
        if (!loader && document.body) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            document.body.appendChild(loader);
        }
        if (loader) {
            loader.classList.remove('finished');
            loader.style.width = '0%';
            setTimeout(() => loader.style.width = '30%', 10);
            setTimeout(() => loader.style.width = '70%', 400);
        }
    };

    const stopLoading = () => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.width = '100%';
            setTimeout(() => {
                loader.classList.add('finished');
            }, 300);
        }
    };

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let [resource, config] = args;
        
        // Show loader for internal API calls
        const isInternalApi = typeof resource === 'string' && (resource.startsWith('/') || resource.includes(window.location.origin));
        if (isInternalApi) startLoading();

        // Don't add token to login requests
        if (typeof resource === 'string' && (resource.includes('/login') || resource.includes('/api/auth/login'))) {
            const res = await originalFetch(resource, config);
            if (isInternalApi) stopLoading();
            return res;
        }

        const token = localStorage.getItem('token');
        if (token) {
            config = config || {};
            config.headers = config.headers || {};
            
            // Handle both Headers object and plain object
            if (typeof Headers !== 'undefined' && config.headers instanceof Headers) {
                if (!config.headers.has('Authorization')) {
                    config.headers.set('Authorization', `Bearer ${token}`);
                }
            } else {
                if (!config.headers['Authorization'] && !config.headers['authorization']) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
            }
        }
        
        try {
            const response = await originalFetch(resource, config);
            
            // Auto redirect to login on 401
            if (response.status === 401 && !resource.includes('/login')) {
                console.warn('⚠️ Unauthorized access - redirecting to login');
                localStorage.removeItem('token');
                window.location.href = '/index.html'; 
            }
            
            if (isInternalApi) stopLoading();
            return response;
        } catch (error) {
            if (isInternalApi) stopLoading();
            throw error;
        }
    };
})();
