// ClickUp Clone - Workspace View

class WorkspaceApp {
    constructor() {
        this.workspaceId = document.getElementById('app').dataset.workspaceId
        this.currentUser = null
        this.workspace = null
        this.currentView = 'list' // list, board, calendar, gantt
        this.currentSpace = null
        this.currentList = null
        this.selectedTasks = []
        
        this.init()
    }
    
    async init() {
        try {
            await this.loadData()
            this.setupEventListeners()
            this.render()
        } catch (error) {
            console.error('Failed to initialize workspace:', error)
            this.showError('Failed to load workspace')
        }
    }
    
    async loadData() {
        try {
            // Load current user
            const usersResponse = await axios.get('/api/users')
            const users = usersResponse.data.users
            this.currentUser = users.find(u => u.email === 'admin@clickupclone.com') || users[0]
            
            // Load workspace with content
            const workspaceResponse = await axios.get(`/api/workspaces/${this.workspaceId}`)
            this.workspace = workspaceResponse.data.workspace
            
            // Load first space if available
            if (this.workspace.spaces && this.workspace.spaces.length > 0) {
                const spaceResponse = await axios.get(`/api/spaces/${this.workspace.spaces[0].id}`)
                this.currentSpace = spaceResponse.data.space
                
                // Load first list if available
                if (this.currentSpace.lists && this.currentSpace.lists.length > 0) {
                    const listResponse = await axios.get(`/api/lists/${this.currentSpace.lists[0].id}`)
                    this.currentList = listResponse.data.list
                }
            }
        } catch (error) {
            console.error('Failed to load workspace data:', error)
            throw error
        }
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.dataset.action
                const id = e.target.dataset.id
                
                switch (action) {
                    case 'goto-dashboard':
                        window.location.href = '/dashboard'
                        break
                    case 'goto-home':
                        window.location.href = '/'
                        break
                    case 'select-space':
                        this.selectSpace(id)
                        break
                    case 'select-list':
                        this.selectList(id)
                        break
                    case 'change-view':
                        this.changeView(e.target.dataset.view)
                        break
                    case 'view-task':
                        this.viewTask(id)
                        break
                    case 'create-task':
                        this.createTask()
                        break
                    case 'toggle-task':
                        this.toggleTask(id)
                        break
                }
            }
        })
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault()
                        // Open search
                        break
                    case 'n':
                        e.preventDefault()
                        this.createTask()
                        break
                }
            }
        })
    }
    
    async selectSpace(spaceId) {
        try {
            const response = await axios.get(`/api/spaces/${spaceId}`)
            this.currentSpace = response.data.space
            
            // Select first list if available
            if (this.currentSpace.lists && this.currentSpace.lists.length > 0) {
                await this.selectList(this.currentSpace.lists[0].id)
            } else {
                this.currentList = null
                this.render()
            }
        } catch (error) {
            console.error('Failed to load space:', error)
            this.showError('Failed to load space')
        }
    }
    
    async selectList(listId) {
        try {
            const response = await axios.get(`/api/lists/${listId}`)
            this.currentList = response.data.list
            this.render()
        } catch (error) {
            console.error('Failed to load list:', error)
            this.showError('Failed to load list')
        }
    }
    
    changeView(view) {
        this.currentView = view
        this.render()
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
    }
    
    renderSidebar() {
        return `
            <aside class="app-sidebar">
                <div class="sidebar-section">
                    <div class="px-6 py-4">
                        <button class="text-left w-full" data-action="goto-home">
                            <h1 class="text-xl font-bold text-white flex items-center">
                                <i class="fas fa-check-circle mr-2"></i>
                                ClickUp Clone
                            </h1>
                        </button>
                    </div>
                </div>
                
                <nav class="sidebar-section">
                    <a href="/" class="sidebar-item" data-action="goto-home">
                        <i class="fas fa-home"></i>
                        <span>Home</span>
                    </a>
                    <a href="/dashboard" class="sidebar-item" data-action="goto-dashboard">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Dashboard</span>
                    </a>
                </nav>
                
                <div class="sidebar-section">
                    <div class="px-6 py-2 flex items-center justify-between">
                        <h3 class="text-xs uppercase text-gray-400 font-semibold">Workspace</h3>
                    </div>
                    <div class="px-6 py-2">
                        <div class="flex items-center space-x-2">
                            <div class="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                                 style="background-color: ${this.workspace?.color || '#6B73FF'}">
                                ${(this.workspace?.name || 'W').charAt(0).toUpperCase()}
                            </div>
                            <span class="text-white font-medium">${this.escapeHtml(this.workspace?.name || 'Workspace')}</span>
                        </div>
                    </div>
                </div>
                
                ${this.renderSpacesNavigation()}
            </aside>
        `
    }
    
    renderSpacesNavigation() {
        if (!this.workspace || !this.workspace.spaces) {
            return ''
        }
        
        return `
            <div class="sidebar-section">
                <div class="px-6 py-2">
                    <h3 class="text-xs uppercase text-gray-400 font-semibold">Spaces</h3>
                </div>
                ${this.workspace.spaces.map(space => `
                    <button class="sidebar-item w-full text-left ${this.currentSpace?.id === space.id ? 'active' : ''}"
                            data-action="select-space" data-id="${space.id}">
                        <div class="w-4 h-4 rounded mr-3" style="background-color: ${space.color}"></div>
                        <span>${this.escapeHtml(space.name)}</span>
                    </button>
                `).join('')}
            </div>
            
            ${this.currentSpace ? this.renderListsNavigation() : ''}
        `
    }
    
    renderListsNavigation() {
        if (!this.currentSpace.lists || this.currentSpace.lists.length === 0) {
            return ''
        }
        
        return `
            <div class="sidebar-section">
                <div class="px-6 py-2">
                    <h3 class="text-xs uppercase text-gray-400 font-semibold">Lists</h3>
                </div>
                ${this.currentSpace.lists.map(list => `
                    <button class="sidebar-item w-full text-left ${this.currentList?.id === list.id ? 'active' : ''}"
                            data-action="select-list" data-id="${list.id}">
                        <i class="fas fa-list mr-3"></i>
                        <span>${this.escapeHtml(list.name)}</span>
                    </button>
                `).join('')}
            </div>
        `
    }
    
    renderHeader() {
        return `
            <header class="app-header">
                <div class="flex items-center space-x-4">
                    <h2 class="text-xl font-semibold text-gray-900">
                        ${this.currentList ? this.escapeHtml(this.currentList.name) : this.currentSpace ? this.escapeHtml(this.currentSpace.name) : 'Workspace'}
                    </h2>
                    
                    ${this.currentList ? `
                        <div class="flex items-center space-x-2">
                            <button class="btn btn-sm ${this.currentView === 'list' ? 'btn-primary' : 'btn-secondary'}"
                                    data-action="change-view" data-view="list">
                                <i class="fas fa-list mr-1"></i>
                                Lista
                            </button>
                            <button class="btn btn-sm ${this.currentView === 'board' ? 'btn-primary' : 'btn-secondary'}"
                                    data-action="change-view" data-view="board">
                                <i class="fas fa-columns mr-1"></i>
                                Kanban
                            </button>
                            <button class="btn btn-sm ${this.currentView === 'calendar' ? 'btn-primary' : 'btn-secondary'}"
                                    data-action="change-view" data-view="calendar">
                                <i class="fas fa-calendar mr-1"></i>
                                Calendário
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="flex items-center space-x-4">
                    <button class="btn btn-primary" data-action="create-task">
                        <i class="fas fa-plus mr-2"></i>
                        Nova Tarefa
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
        if (!this.currentList) {
            return this.renderEmptyState()
        }
        
        switch (this.currentView) {
            case 'board':
                return this.renderKanbanView()
            case 'calendar':
                return this.renderCalendarView()
            case 'list':
            default:
                return this.renderListView()
        }
    }
    
    renderEmptyState() {
        return `
            <main class="app-content">
                <div class="text-center py-16">
                    <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-medium text-gray-900 mb-2">Selecione uma lista</h3>
                    <p class="text-gray-600 mb-6">Escolha uma lista na barra lateral para começar a gerenciar suas tarefas.</p>
                    
                    ${this.currentSpace && this.currentSpace.lists && this.currentSpace.lists.length > 0 ? `
                        <div class="flex justify-center space-x-2">
                            ${this.currentSpace.lists.slice(0, 3).map(list => `
                                <button class="btn btn-primary" data-action="select-list" data-id="${list.id}">
                                    ${this.escapeHtml(list.name)}
                                </button>
                            `).join('')}
                        </div>
                    ` : `
                        <button class="btn btn-primary">
                            <i class="fas fa-plus mr-2"></i>
                            Criar Lista
                        </button>
                    `}
                </div>
            </main>
        `
    }
    
    renderListView() {
        return `
            <main class="app-content">
                <div class="list-view">
                    <div class="list-header">
                        <div class="flex items-center">
                            <input type="checkbox" class="rounded">
                        </div>
                        <div class="font-medium">Tarefa</div>
                        <div class="font-medium">Status</div>
                        <div class="font-medium">Responsável</div>
                        <div class="font-medium">Prioridade</div>
                        <div class="font-medium">Vencimento</div>
                        <div></div>
                    </div>
                    
                    ${this.currentList.tasks && this.currentList.tasks.length > 0 ? 
                        this.currentList.tasks.map(task => `
                            <div class="list-row" data-action="view-task" data-id="${task.id}">
                                <div class="flex items-center">
                                    <input type="checkbox" class="rounded" ${task.progress === 100 ? 'checked' : ''}>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <div class="task-priority ${task.priority}"></div>
                                    <div>
                                        <div class="font-medium text-gray-900">${this.escapeHtml(task.name)}</div>
                                        ${task.description ? `
                                            <div class="text-sm text-gray-500 mt-1">${this.escapeHtml(task.description.substring(0, 50))}...</div>
                                        ` : ''}
                                    </div>
                                </div>
                                <div>
                                    <span class="status-badge" style="background-color: ${task.status_color}20; color: ${task.status_color};">
                                        ${task.status_name || 'No Status'}
                                    </span>
                                </div>
                                <div class="flex items-center">
                                    ${task.assignee_name ? `
                                        <img src="${task.assignee_avatar || '/static/default-avatar.png'}" 
                                             class="avatar avatar-xs mr-2" 
                                             alt="${task.assignee_name}">
                                        <span class="text-sm">${this.escapeHtml(task.assignee_name)}</span>
                                    ` : `
                                        <span class="text-sm text-gray-400">Não atribuída</span>
                                    `}
                                </div>
                                <div>
                                    <span class="text-capitalize text-sm px-2 py-1 rounded ${this.getPriorityClass(task.priority)}">
                                        ${this.translatePriority(task.priority)}
                                    </span>
                                </div>
                                <div>
                                    ${task.due_date ? `
                                        <span class="text-sm ${this.isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-600'}">
                                            ${this.formatDate(task.due_date)}
                                        </span>
                                    ` : `
                                        <span class="text-sm text-gray-400">—</span>
                                    `}
                                </div>
                                <div class="flex items-center justify-end">
                                    <button class="p-1 text-gray-400 hover:text-gray-600">
                                        <i class="fas fa-ellipsis-h"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    : `
                        <div class="text-center py-12">
                            <i class="fas fa-tasks text-4xl text-gray-300 mb-4"></i>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa ainda</h3>
                            <p class="text-gray-600 mb-4">Crie sua primeira tarefa para começar.</p>
                            <button class="btn btn-primary" data-action="create-task">
                                <i class="fas fa-plus mr-2"></i>
                                Criar Tarefa
                            </button>
                        </div>
                    `}
                </div>
            </main>
        `
    }
    
    renderKanbanView() {
        const statuses = this.currentList.statuses || []
        
        return `
            <main class="app-content">
                <div class="kanban-board">
                    ${statuses.map(status => `
                        <div class="kanban-column">
                            <div class="kanban-column-header">
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: ${status.color}"></div>
                                    <h3 class="font-semibold text-gray-900">${this.escapeHtml(status.name)}</h3>
                                    <span class="text-sm text-gray-500">
                                        (${this.getTasksForStatus(status.id).length})
                                    </span>
                                </div>
                                <button class="p-1 text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            
                            <div class="space-y-3">
                                ${this.getTasksForStatus(status.id).map(task => `
                                    <div class="kanban-card" data-action="view-task" data-id="${task.id}">
                                        <div class="flex items-start justify-between mb-2">
                                            <div class="task-priority ${task.priority}"></div>
                                            <button class="p-1 text-gray-400 hover:text-gray-600">
                                                <i class="fas fa-ellipsis-h text-xs"></i>
                                            </button>
                                        </div>
                                        
                                        <h4 class="font-medium text-gray-900 mb-2">${this.escapeHtml(task.name)}</h4>
                                        
                                        ${task.description ? `
                                            <p class="text-sm text-gray-600 mb-3">${this.escapeHtml(task.description.substring(0, 60))}...</p>
                                        ` : ''}
                                        
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center space-x-2">
                                                ${task.assignee_name ? `
                                                    <img src="${task.assignee_avatar || '/static/default-avatar.png'}" 
                                                         class="avatar avatar-xs" 
                                                         alt="${task.assignee_name}">
                                                ` : ''}
                                                
                                                ${task.due_date ? `
                                                    <span class="text-xs ${this.isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-500'}">
                                                        <i class="fas fa-calendar-alt mr-1"></i>
                                                        ${this.formatDate(task.due_date)}
                                                    </span>
                                                ` : ''}
                                            </div>
                                            
                                            ${task.progress > 0 ? `
                                                <div class="flex items-center space-x-1">
                                                    <div class="w-8 h-1 bg-gray-200 rounded-full">
                                                        <div class="h-full bg-primary rounded-full" style="width: ${task.progress}%"></div>
                                                    </div>
                                                    <span class="text-xs text-gray-500">${task.progress}%</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                                
                                ${this.getTasksForStatus(status.id).length === 0 ? `
                                    <div class="text-center py-8 text-gray-400">
                                        <i class="fas fa-plus-circle text-2xl mb-2"></i>
                                        <p class="text-sm">Adicionar tarefa</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </main>
        `
    }
    
    renderCalendarView() {
        return `
            <main class="app-content">
                <div class="mb-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900">Março 2024</h3>
                        <div class="flex items-center space-x-2">
                            <button class="p-2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="p-2 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="calendar-grid">
                    ${this.generateCalendarDays().map(day => `
                        <div class="calendar-day ${day.isOtherMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}">
                            <div class="font-semibold text-sm mb-2">${day.day}</div>
                            ${day.tasks.map(task => `
                                <div class="calendar-task" style="background-color: ${task.status_color}" 
                                     data-action="view-task" data-id="${task.id}">
                                    ${this.escapeHtml(task.name.substring(0, 20))}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </main>
        `
    }
    
    getTasksForStatus(statusId) {
        if (!this.currentList.tasks) return []
        return this.currentList.tasks.filter(task => task.status_id === statusId)
    }
    
    generateCalendarDays() {
        // Mock calendar data for March 2024
        const days = []
        const tasksWithDates = this.currentList.tasks?.filter(t => t.due_date) || []
        
        for (let i = 1; i <= 31; i++) {
            const dayTasks = tasksWithDates.filter(task => {
                const taskDate = new Date(task.due_date)
                return taskDate.getDate() === i
            })
            
            days.push({
                day: i,
                isOtherMonth: false,
                isToday: i === 15, // Mock today as 15th
                tasks: dayTasks
            })
        }
        
        return days
    }
    
    viewTask(taskId) {
        console.log('Viewing task:', taskId)
        // You can implement a modal here
        alert(`Visualizando tarefa ${taskId}`)
    }
    
    createTask() {
        console.log('Creating new task')
        // You can implement a modal here
        alert('Criar nova tarefa - Modal em desenvolvimento')
    }
    
    async toggleTask(taskId) {
        try {
            console.log('Toggling task:', taskId)
            // Implement API call to update task status
            await this.loadData()
            this.render()
        } catch (error) {
            console.error('Failed to toggle task:', error)
            this.showError('Failed to update task')
        }
    }
    
    getPriorityClass(priority) {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700'
            case 'high': return 'bg-orange-100 text-orange-700'
            case 'normal': return 'bg-green-100 text-green-700'
            case 'low': return 'bg-gray-100 text-gray-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }
    
    translatePriority(priority) {
        switch (priority) {
            case 'urgent': return 'Urgente'
            case 'high': return 'Alta'
            case 'normal': return 'Normal'
            case 'low': return 'Baixa'
            default: return 'Normal'
        }
    }
    
    formatDate(dateString) {
        return dayjs(dateString).format('DD/MM/YY')
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

// Initialize workspace app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.workspaceApp = new WorkspaceApp()
})