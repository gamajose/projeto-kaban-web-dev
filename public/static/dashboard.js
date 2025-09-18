// ClickUp Clone - Dashboard

class Dashboard {
    constructor() {
        this.currentUser = null
        this.stats = null
        this.myTasks = []
        this.activities = []
        this.charts = {}
        
        this.init()
    }
    
    async init() {
        try {
            await this.loadData()
            this.setupEventListeners()
            this.render()
        } catch (error) {
            console.error('Failed to initialize dashboard:', error)
            this.showError('Failed to load dashboard')
        }
    }
    
    async loadData() {
        try {
            // Load current user (demo user)
            const usersResponse = await axios.get('/api/users')
            const users = usersResponse.data.users
            this.currentUser = users.find(u => u.email === 'admin@clickupclone.com') || users[0]
            
            // Load dashboard stats
            const statsResponse = await axios.get('/api/dashboard/stats')
            this.stats = statsResponse.data.stats
            
            // Load my tasks
            if (this.currentUser) {
                const tasksResponse = await axios.get(`/api/dashboard/my-tasks/${this.currentUser.id}`)
                this.myTasks = tasksResponse.data.tasks
            }
            
            // Load recent activities
            const activitiesResponse = await axios.get('/api/dashboard/activity')
            this.activities = activitiesResponse.data.activities
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
            throw error
        }
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.dataset.action
                const id = e.target.dataset.id
                
                switch (action) {
                    case 'goto-home':
                        window.location.href = '/'
                        break
                    case 'view-task':
                        this.viewTask(id)
                        break
                    case 'toggle-task':
                        this.toggleTask(id)
                        break
                }
            }
        })
    }
    
    render() {
        const app = document.getElementById('app')
        
        app.innerHTML = `
            <div class="app-layout">
                ${this.renderSidebar()}
                ${this.renderHeader()}
                ${this.renderContent()}
            </div>
        `
        
        // Initialize charts after render
        setTimeout(() => {
            this.initializeCharts()
        }, 100)
    }
    
    renderSidebar() {
        return `
            <aside class="app-sidebar">
                <div class="sidebar-section">
                    <div class="px-6 py-4">
                        <h1 class="text-xl font-bold text-white flex items-center">
                            <i class="fas fa-check-circle mr-2"></i>
                            ClickUp Clone
                        </h1>
                    </div>
                </div>
                
                <nav class="sidebar-section">
                    <a href="/" class="sidebar-item" data-action="goto-home">
                        <i class="fas fa-home"></i>
                        <span>Home</span>
                    </a>
                    <a href="/dashboard" class="sidebar-item active">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="#" class="sidebar-item">
                        <i class="fas fa-inbox"></i>
                        <span>Inbox</span>
                    </a>
                    <a href="#" class="sidebar-item">
                        <i class="fas fa-calendar"></i>
                        <span>Calendário</span>
                    </a>
                </nav>
                
                <div class="sidebar-section">
                    <div class="px-6 py-2">
                        <h3 class="text-xs uppercase text-gray-400 font-semibold">Workspaces</h3>
                    </div>
                    <a href="#" class="sidebar-item">
                        <div class="w-6 h-6 bg-primary rounded mr-3 flex items-center justify-center text-white text-xs font-bold">A</div>
                        <span>Acme Corporation</span>
                    </a>
                </div>
                
                <div class="sidebar-section">
                    <div class="px-6 py-2">
                        <h3 class="text-xs uppercase text-gray-400 font-semibold">Ferramentas</h3>
                    </div>
                    <a href="#" class="sidebar-item">
                        <i class="fas fa-search"></i>
                        <span>Pesquisar</span>
                    </a>
                    <a href="#" class="sidebar-item">
                        <i class="fas fa-chart-bar"></i>
                        <span>Relatórios</span>
                    </a>
                    <a href="#" class="sidebar-item">
                        <i class="fas fa-cog"></i>
                        <span>Configurações</span>
                    </a>
                </div>
            </aside>
        `
    }
    
    renderHeader() {
        return `
            <header class="app-header">
                <div class="flex-1">
                    <h2 class="text-xl font-semibold text-gray-900">Dashboard</h2>
                </div>
                
                <div class="flex items-center space-x-4">
                    <button class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <i class="fas fa-bell"></i>
                    </button>
                    
                    <button class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <i class="fas fa-search"></i>
                    </button>
                    
                    <div class="flex items-center space-x-2">
                        <img src="${this.currentUser?.avatar_url || '/static/default-avatar.png'}" 
                             class="avatar avatar-sm" 
                             alt="${this.currentUser?.name || 'User'}">
                        <span class="font-medium text-gray-700">${this.currentUser?.name || 'User'}</span>
                    </div>
                </div>
            </header>
        `
    }
    
    renderContent() {
        return `
            <main class="app-content">
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    ${this.renderStatsCards()}
                </div>
                
                <!-- Main Dashboard Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- My Tasks -->
                    <div class="lg:col-span-2">
                        ${this.renderMyTasks()}
                    </div>
                    
                    <!-- Activity Feed -->
                    <div class="lg:col-span-1">
                        ${this.renderActivityFeed()}
                    </div>
                </div>
                
                <!-- Charts Section -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <div class="widget">
                        <div class="widget-header">
                            <h3 class="widget-title">Tarefas por Status</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="widget">
                        <div class="widget-header">
                            <h3 class="widget-title">Progresso da Semana</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="progressChart"></canvas>
                        </div>
                    </div>
                </div>
            </main>
        `
    }
    
    renderStatsCards() {
        if (!this.stats) {
            return Array(4).fill(0).map(() => `
                <div class="widget">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div class="ml-4">
                            <div class="h-4 bg-gray-200 rounded w-20 animate-pulse mb-2"></div>
                            <div class="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            `).join('')
        }
        
        const cards = [
            {
                title: 'Total de Tarefas',
                value: this.stats.total_tasks,
                icon: 'fas fa-tasks',
                color: 'bg-blue-500',
                textColor: 'text-blue-600'
            },
            {
                title: 'Concluídas',
                value: this.stats.completed_tasks,
                icon: 'fas fa-check-circle',
                color: 'bg-green-500',
                textColor: 'text-green-600'
            },
            {
                title: 'Atrasadas',
                value: this.stats.overdue_tasks,
                icon: 'fas fa-exclamation-triangle',
                color: 'bg-red-500',
                textColor: 'text-red-600'
            },
            {
                title: 'Usuários Ativos',
                value: this.stats.active_users,
                icon: 'fas fa-users',
                color: 'bg-purple-500',
                textColor: 'text-purple-600'
            }
        ]
        
        return cards.map(card => `
            <div class="widget">
                <div class="flex items-center">
                    <div class="p-3 ${card.color} rounded-lg">
                        <i class="${card.icon} text-white text-xl"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">${card.title}</p>
                        <p class="text-2xl font-bold ${card.textColor}">${card.value}</p>
                    </div>
                </div>
            </div>
        `).join('')
    }
    
    renderMyTasks() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">Minhas Tarefas</h3>
                    <button class="btn btn-sm btn-primary">
                        <i class="fas fa-plus mr-1"></i>
                        Nova Tarefa
                    </button>
                </div>
                
                <div class="space-y-3">
                    ${this.myTasks.length > 0 ? this.myTasks.map(task => `
                        <div class="task-card" data-action="view-task" data-id="${task.id}">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <button class="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center hover:border-primary"
                                            data-action="toggle-task" data-id="${task.id}">
                                        ${task.status_name && task.status_name.toLowerCase().includes('done') ? 
                                            '<i class="fas fa-check text-primary text-xs"></i>' : ''}
                                    </button>
                                    
                                    <div class="task-priority ${task.priority}"></div>
                                    
                                    <div>
                                        <h4 class="font-medium text-gray-900">${this.escapeHtml(task.name)}</h4>
                                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                                            <span class="status-badge" style="background-color: ${task.status_color}20; color: ${task.status_color};">
                                                ${task.status_name || 'No Status'}
                                            </span>
                                            <span>•</span>
                                            <span>${task.list_name}</span>
                                            ${task.due_date ? `
                                                <span>•</span>
                                                <span class="${this.isOverdue(task.due_date) ? 'text-red-600' : ''}">
                                                    <i class="fas fa-calendar-alt mr-1"></i>
                                                    ${this.formatDate(task.due_date)}
                                                </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="flex items-center space-x-2">
                                    ${task.progress > 0 ? `
                                        <div class="flex items-center space-x-1">
                                            <div class="w-16 h-2 bg-gray-200 rounded-full">
                                                <div class="h-full bg-primary rounded-full" style="width: ${task.progress}%"></div>
                                            </div>
                                            <span class="text-xs text-gray-500">${task.progress}%</span>
                                        </div>
                                    ` : ''}
                                    
                                    <i class="fas fa-chevron-right text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-tasks text-3xl mb-3"></i>
                            <p class="text-lg font-medium mb-1">Nenhuma tarefa encontrada</p>
                            <p class="text-sm">Todas as suas tarefas foram concluídas!</p>
                        </div>
                    `}
                </div>
            </div>
        `
    }
    
    renderActivityFeed() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">Atividade Recente</h3>
                </div>
                
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    ${this.activities.slice(0, 10).map(activity => `
                        <div class="flex items-start space-x-3">
                            <img src="${activity.user_avatar || '/static/default-avatar.png'}" 
                                 class="avatar avatar-xs mt-1" 
                                 alt="${activity.user_name}">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-gray-900">
                                    <span class="font-medium">${this.escapeHtml(activity.user_name)}</span>
                                    ${this.formatActivityAction(activity)}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">${this.formatTimeAgo(activity.created_at)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `
    }
    
    initializeCharts() {
        // Status Chart (Doughnut)
        const statusCtx = document.getElementById('statusChart')
        if (statusCtx && this.stats) {
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Concluídas', 'Em Andamento', 'Atrasadas'],
                    datasets: [{
                        data: [
                            this.stats.completed_tasks,
                            this.stats.total_tasks - this.stats.completed_tasks - this.stats.overdue_tasks,
                            this.stats.overdue_tasks
                        ],
                        backgroundColor: ['#10B981', '#6B73FF', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            })
        }
        
        // Progress Chart (Line)
        const progressCtx = document.getElementById('progressChart')
        if (progressCtx) {
            // Mock data for the week
            const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            const completed = [5, 8, 12, 10, 15, 7, 3]
            const created = [3, 6, 8, 12, 9, 4, 2]
            
            this.charts.progress = new Chart(progressCtx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [
                        {
                            label: 'Tarefas Concluídas',
                            data: completed,
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Tarefas Criadas',
                            data: created,
                            borderColor: '#6B73FF',
                            backgroundColor: 'rgba(107, 115, 255, 0.1)',
                            borderWidth: 2,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            })
        }
    }
    
    viewTask(taskId) {
        // Mock task view - you can implement a modal or navigation
        console.log('Viewing task:', taskId)
        alert(`Visualizando tarefa ${taskId}`)
    }
    
    async toggleTask(taskId) {
        try {
            // Mock toggle - you can implement actual API call
            console.log('Toggling task:', taskId)
            // Reload data after toggle
            await this.loadData()
            this.render()
        } catch (error) {
            console.error('Failed to toggle task:', error)
            this.showError('Failed to update task')
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
                return `alterou o status de "${this.escapeHtml(details.task_name || 'Untitled')}"`
            case 'completed':
                return `completou a tarefa "${this.escapeHtml(details.task_name || 'Untitled')}"`
            case 'commented':
                return `comentou na tarefa "${this.escapeHtml(details.task_name || 'Untitled')}"`
            default:
                return `realizou uma ação`
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
    
    formatDate(dateString) {
        return dayjs(dateString).format('DD/MM')
    }
    
    isOverdue(dateString) {
        return new Date(dateString) < new Date()
    }
    
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }
    
    showError(message) {
        const errorDiv = document.createElement('div')
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        errorDiv.textContent = message
        document.body.appendChild(errorDiv)
        
        setTimeout(() => {
            errorDiv.remove()
        }, 5000)
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard()
})