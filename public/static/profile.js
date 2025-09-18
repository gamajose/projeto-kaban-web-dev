// public/static/profile.js

class ProfilePage {
    constructor() {
        this.currentUserId = 1; 

        this.elements = {
            avatarImg: document.getElementById('profile-avatar-img'),
            avatarUpload: document.getElementById('avatar-upload'),
            nameInput: document.getElementById('profile-name'),
            emailInput: document.getElementById('profile-email'),
            timezoneSelect: document.getElementById('profile-timezone'),
            saveButton: document.getElementById('save-profile')
        };

        this.loadUser();
        this.setupEventListeners();
    }

    async loadUser() {
        try {
            const response = await axios.get(`/api/users/${this.currentUserId}`);
            const user = response.data.user;
            
            this.elements.avatarImg.src = user.avatar_url || '/static/default-avatar.png';
            this.elements.nameInput.value = user.name;
            this.elements.emailInput.value = user.email;
            this.elements.timezoneSelect.value = user.timezone || 'UTC';

        } catch (error) {
            console.error('Falha ao carregar perfil', error);
            alert('Não foi possível carregar os dados do perfil.');
        }
    }

        setupEventListeners() {
        this.elements.saveButton.addEventListener('click', () => this.saveProfile());
        this.elements.avatarUpload.addEventListener('change', (event) => this.handleAvatarUpload(event));
    }

    render() {
        document.getElementById('profile-avatar-img').src = this.currentUser.avatar_url || '/static/default-avatar.png';
        document.getElementById('profile-name').value = this.currentUser.name;
        document.getElementById('profile-email').value = this.currentUser.email;
        document.getElementById('profile-timezone').value = this.currentUser.timezone || 'UTC';
    }

    setupEventListeners() {
        document.getElementById('save-profile').addEventListener('click', () => this.saveProfile());
        document.getElementById('avatar-upload').addEventListener('change', (event) => this.uploadAvatar(event));
    }

    async saveProfile() {
        const name = this.elements.nameInput.value;
        const timezone = this.elements.timezoneSelect.value;

        if (!name) {
            alert('O nome não pode ficar em branco.');
            return;
        }

        try {
            this.setLoading(true);
            await axios.put(`/api/users/${this.currentUserId}/profile`, { name, timezone });
            alert('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar o perfil:', error);
            alert('Erro ao atualizar o perfil.');
        } finally {
            this.setLoading(false);
        }
    }


    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            this.setLoading(true);
            const response = await axios.post(`/api/users/${this.currentUserId}/avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            this.elements.avatarImg.src = response.data.avatar_url;
            alert('Avatar atualizado!');

        } catch (error) {
            console.error('Erro ao fazer upload do avatar:', error);
            alert('Erro ao fazer upload do avatar.');
        } finally {
            this.setLoading(false);
        }
    }


    async uploadAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            // A chamada real para o endpoint de upload
            const response = await axios.post('/api/users/1/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Atualiza a imagem na tela
            document.getElementById('profile-avatar-img').src = response.data.avatar_url;
            alert('Avatar atualizado!');
        } catch (error) {
            alert('Erro ao fazer upload do avatar.');
        }
    }

 setLoading(isLoading) {
        this.elements.saveButton.disabled = isLoading;
        this.elements.saveButton.textContent = isLoading ? 'A guardar...' : 'Guardar Alterações';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfilePage();
});