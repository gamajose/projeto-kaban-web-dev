// ClickUp Clone - Main Application

class ClickUpApp {
    constructor() {
        this.currentUser = null
        this.workspaces = []
        this.currentWorkspace = null
        
        this.init()
    }
    
    async init() {
        try {
            // Hide loading screen after initialization
            setTimeout(() => {
                const loading = document.getElementById('loading')
                if (loading) {
                    loading.style.opacity = '0'
                    setTimeout(() => loading.remove(), 300)
                }
            }, 1000)
            
            await this.loadInitialData()
            this.setupEventListeners()
            this.render()
        } catch (error) {
            console.error('Failed to initialize app:', error)
            this.showError('Failed to load application')
        }
    }
    
    async loadInitialData() {
        try {
            // Load workspaces
            const workspacesResponse = await axios.get('/api/workspaces')
            this.workspaces = workspacesResponse.data.workspaces
            
            // Load users (for demo, set first user as current)
            const usersResponse = await axios.get('/api/users')
            const users = usersResponse.data.users
            this.currentUser = users.find(u => u.email === 'admin@clickupclone.com') || users[0]
            
            // Set first workspace as current
            if (this.workspaces.length > 0) {
                this.currentWorkspace = this.workspaces[0]
            }
        } catch (error) {
            console.error('Failed to load initial data:', error)
            throw error
        }
    }
    
    setupEventListeners() {
        // Handle navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.dataset.action
                const id = e.target.dataset.id
                
                switch (action) {
                    case 'select-workspace':
                        this.selectWorkspace(id)
                        break
                    case 'goto-dashboard':
                        this.gotoDashboard()
                        break
                    case 'goto-workspace':
                        this.gotoWorkspace(id)
                        break
                }
            }
        })
    }
    
    selectWorkspace(workspaceId) {
        this.currentWorkspace = this.workspaces.find(w => w.id == workspaceId)
        this.render()
    }
    
    gotoDashboard() {
        window.location.href = '/dashboard'
    }
    
    gotoWorkspace(workspaceId) {
        window.location.href = `/workspace/${workspaceId}/`
    }
    
    render() {
        const app = document.getElementById('app')
        
        app.innerHTML = `
            <div class="min-h-screen bg-gray-50">
                <!-- Header -->
                <header class="bg-white border-b border-gray-200 px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <h1 class="text-2xl font-bold text-primary flex items-center">
                                <i class="fas fa-check-circle mr-3"></i>
                                ClickUp Clone
                            </h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            ${this.renderUserMenu()}
                        </div>
                    </div>
                </header>
                
                <!-- Main Content -->
                <div class="max-w-7xl mx-auto px-6 py-8">
                    <div class="mb-8">
                        <h2 class="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h2>
                        <p class="text-gray-600">Escolha um workspace para começar ou vá para o dashboard.</p>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" 
                             data-action="goto-dashboard">
                            <div class="flex items-center">
                                <div class="p-3 bg-blue-100 rounded-lg">
                                    <i class="fas fa-tachometer-alt text-blue-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <h3 class="font-semibold text-gray-900">Dashboard</h3>
                                    <p class="text-sm text-gray-600">Visão geral das suas tarefas</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                            <div class="flex items-center">
                                <div class="p-3 bg-green-100 rounded-lg">
                                    <i class="fas fa-plus-circle text-green-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <h3 class="font-semibold text-gray-900">Nova Tarefa</h3>
                                    <p class="text-sm text-gray-600">Criar uma nova tarefa</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                            <div class="flex items-center">
                                <div class="p-3 bg-purple-100 rounded-lg">
                                    <i class="fas fa-calendar text-purple-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <h3 class="font-semibold text-gray-900">Calendário</h3>
                                    <p class="text-sm text-gray-600">Ver tarefas por data</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Workspaces -->
                    <div class="mb-8">
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Seus Workspaces</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${this.renderWorkspaces()}
                        </div>
                    </div>
                    
                    <!-- Recent Activity Preview -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Atividade Recente</h3>
                            <button class="text-primary hover:text-primary-dark text-sm font-medium" 
                                    data-action="goto-dashboard">
                                Ver todas
                            </button>
                        </div>
                        <div id="recent-activity">
                            <div class="flex items-center justify-center py-8">
                                <div class="loading"></div>
                                <span class="ml-2 text-gray-600">Carregando atividades...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
        
        // Load recent activity
        this.loadRecentActivity()
    }
    
    renderUserMenu() {
        if (!this.currentUser) {
            return `
                <div class="flex items-center space-x-2">
                    <button class="btn btn-primary">Entrar</button>
                </div>
            `
        }
        
        return `
            <div class="flex items-center space-x-3">
                <div class="relative">
                    <button class="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                        <img src="${this.currentUser.avatar_url || '/static/default-avatar.png'}" 
                             class="avatar avatar-sm" 
                             alt="${this.currentUser.name}">
                        <span class="font-medium">${this.currentUser.name}</span>
                        <i class="fas fa-chevron-down text-xs"></i>
                    </button>
                </div>
            </div>
        `
    }
    
    renderWorkspaces() {
        if (this.workspaces.length === 0) {
            return `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-building text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum workspace encontrado</h3>
                    <p class="text-gray-600 mb-4">Crie seu primeiro workspace para começar.</p>
                    <button class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>
                        Criar Workspace
                    </button>
                </div>
            `
        }
        
        return this.workspaces.map(workspace => `
            <div class="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                 data-action="goto-workspace" data-id="${workspace.id}">
                <div class="p-6">
                    <div class="flex items-center mb-4">
                        <div class="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                             style="background-color: ${workspace.color}">
                            ${workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="ml-3">
                            <h4 class="font-semibold text-gray-900">${this.escapeHtml(workspace.name)}</h4>
                            <p class="text-sm text-gray-600">${workspace.owner_name || 'Owner'}</p>
                        </div>
                    </div>
                    
                    ${workspace.description ? `
                        <p class="text-sm text-gray-600 mb-4">${this.escapeHtml(workspace.description)}</p>
                    ` : ''}
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-users mr-1"></i>
                            <span>Equipe</span>
                        </div>
                        <i class="fas fa-arrow-right text-gray-400"></i>
                    </div>
                </div>
            </div>
        `).join('')
    }
    
    async loadRecentActivity() {
        try {
            const response = await axios.get('/api/dashboard/activity')
            const activities = response.data.activities.slice(0, 5) // Show only 5 recent
            
            const activityHtml = activities.length > 0 ? activities.map(activity => `
                <div class="flex items-center py-3 border-b border-gray-100 last:border-b-0">
                    <img src="${activity.user_avatar || '/static/default-avatar.png'}" 
                         class="avatar avatar-sm mr-3" 
                         alt="${activity.user_name}">
                    <div class="flex-1">
                        <p class="text-sm text-gray-900">
                            <span class="font-medium">${this.escapeHtml(activity.user_name)}</span>
                            ${this.formatActivityAction(activity)}
                        </p>
                        <p class="text-xs text-gray-500">${this.formatTimeAgo(activity.created_at)}</p>
                    </div>
                </div>
            `).join('') : `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-history text-2xl mb-2"></i>
                    <p>Nenhuma atividade recente</p>
                </div>
            `
            
            document.getElementById('recent-activity').innerHTML = activityHtml
        } catch (error) {
            console.error('Failed to load recent activity:', error)
            document.getElementById('recent-activity').innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Erro ao carregar atividades</p>
                </div>
            `
        }
    }
    
    formatActivityAction(activity) {
        const details = activity.details ? JSON.parse(activity.details) : {}
        
        switch (activity.action_type) {
            case 'created':
                return `criou a tarefa "${this.escapeHtml(details.task_name || 'Untitled')}"`
            case 'assigned':
                return `foi atribuído à tarefa "${this.escapeHtml(details.task_name || 'Untitled')}"`
            case 'status_changed':
                return `alterou o status de "${this.escapeHtml(details.task_name || 'Untitled')}" para ${this.escapeHtml(details.to_status || 'Unknown')}`
            case 'completed':
                return `completou a tarefa "${this.escapeHtml(details.task_name || 'Untitled')}"`
            case 'commented':
                return `comentou na tarefa "${this.escapeHtml(details.task_name || 'Untitled')}"`
            default:
                return `realizou uma ação em ${activity.entity_type}`
        }
    }
    
    formatTimeAgo(dateString) {
        const date = new Date(dateString)
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)
        
        if (diffInSeconds < 60) return 'Agora mesmo'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`
        return `${Math.floor(diffInSeconds / 86400)} dias atrás`
    }
    
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }
    
    showError(message) {
        // Simple error display - you can enhance this
        const errorDiv = document.createElement('div')
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        errorDiv.textContent = message
        document.body.appendChild(errorDiv)
        
        setTimeout(() => {
            errorDiv.remove()
        }, 5000)
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClickUpApp()
})