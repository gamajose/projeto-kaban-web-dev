// public/static/authService.js
const authService = {
    getToken: () => {
        return localStorage.getItem('authToken');
    },

    getUser: () => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },

    logout: () => {
        localStorage.clear();
        window.location.href = '/login';
    },

    // Configura o Axios para enviar o token em todos os pedidos
    setupAxiosInterceptors: () => {
        axios.interceptors.request.use(
            config => {
                const token = authService.getToken();
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            error => {
                return Promise.reject(error);
            }
        );
    },

    // Verifica se o utilizador está logado, caso contrário, redireciona
    protectPage: () => {
        if (!authService.getToken()) {
            window.location.href = '/login';
        }
    }
};

// Inicializa o serviço
authService.setupAxiosInterceptors();