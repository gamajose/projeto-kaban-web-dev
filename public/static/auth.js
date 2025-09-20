// public/static/auth.js
class AuthManager {
    constructor() {
        this.form = document.getElementById('auth-form');
        this.loginButton = document.getElementById('login-button');
        this.registerButton = document.getElementById('register-button');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.loginButton) {
            this.loginButton.addEventListener('click', () => this.handleLogin());
        }
        if (this.registerButton) {
            this.registerButton.addEventListener('click', () => this.handleRegister());
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            const response = await axios.post('/auth/login', { email, password });
            const { token, user } = response.data;

            // Guardar o token e os dados do utilizador no armazenamento local do navegador
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Redirecionar para a página principal
            window.location.href = '/';

        } catch (error) {
            console.error('Erro de login:', error);
            alert('Falha no login. Verifique as suas credenciais.');
        }
    }

    async handleRegister() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!name || !email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            await axios.post('/auth/register', { name, email, password });
            
            alert('Registo efetuado com sucesso! Por favor, inicie sessão.');
            window.location.href = '/login';

        } catch (error) {
            console.error('Erro de registo:', error);
            alert('Falha no registo. O email pode já estar em uso.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});