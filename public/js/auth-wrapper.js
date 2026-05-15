(function() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let [resource, config] = args;
        
        // Don't add token to login requests
        if (typeof resource === 'string' && (resource.includes('/login') || resource.includes('/api/auth/login'))) {
            return originalFetch(resource, config);
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
        
        const response = await originalFetch(resource, config);
        
        // Auto redirect to login on 401
        if (response.status === 401 && !resource.includes('/login')) {
            console.warn('⚠️ Unauthorized access - redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/index.html'; 
        }
        
        return response;
    };
})();
