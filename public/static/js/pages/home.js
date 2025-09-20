/**
 * ClickUp Clone - Home Page
 * Página inicial com widgets e visão geral estilo ClickUp
 */

class HomePage {
    constructor(app) {
        this.app = app;
        this.widgets = new Map();
        this.refreshInterval = null;
    }

    async load() {
        console.log('📄 Carregando página inicial...');
        
        try {
            await this.render();
            this.setupEventListeners();
            await this.loadWidgets();
            this.startAutoRefresh();
        } catch (error) {
            console.error('Erro ao carregar página inicial:', error);
            this.app.notifications.error('Erro ao carregar página inicial');
        }
    }

    async render() {
        const container = document.getElementById('home-page');
        if (!container) return;

        container.innerHTML = `
            <div class="h-full bg-gray-50">
                <!-- Header Section -->
                <div class="bg-white border-b border-gray-200">
                    <div class="max-w-7xl mx-auto px-6 py-8">
                        <div class="flex items-center justify-between">
                            <div>
                                <h1 class="text-3xl font-bold text-gray-900">
                                    ${this.getGreeting()}, ${this.app.currentUser?.name || 'Usuário'}!
                                </h1>
                                <p class="mt-1 text-lg text-gray-600">
                                    ${this.getMotivationalMessage()}
                                </p>
                            </div>
                            
                            <div class="flex items-center space-x-4">
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-clickup-purple" id="current-time">
                                        ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        ${new Date().toLocaleDateString('pt-BR', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="mt-8 flex space-x-4">
                            <button class="quick-action-btn" data-action="dashboard">
                                <i class="fas fa-chart-pie text-blue-600"></i>
                                <span>Dashboard</span>
                            </button>
                            
                            <button class="quick-action-btn" data-action="new-task">
                                <i class="fas fa-plus text-green-600"></i>
                                <span>Nova Tarefa</span>
                            </button>
                            
                            <button class="quick-action-btn" data-action="calendar">
                                <i class="fas fa-calendar text-purple-600"></i>
                                <span>Calendário</span>
                            </button>
                            
                            <button class="quick-action-btn" data-action="reports">
                                <i class="fas fa-chart-bar text-orange-600"></i>
                                <span>Relatórios</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Widgets Grid -->
                <div class="max-w-7xl mx-auto px-6 py-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        <!-- Meu Trabalho -->
                        <div class="widget-container" id="my-work-widget">
                            <div class="widget-header">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-briefcase text-blue-600"></i>
                                    <h2 class="widget-title">Meu trabalho</h2>
                                </div>
                                <button class="widget-refresh" data-widget="my-work">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                            <div class="widget-content" id="my-work-content">
                                <div class="widget-loading">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>Carregando...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Recentes -->
                        <div class="widget-container" id="recent-widget">
                            <div class="widget-header">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-clock text-purple-600"></i>
                                    <h2 class="widget-title">Recentes</h2>
                                </div>
                                <button class="widget-refresh" data-widget="recent">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                            <div class="widget-content" id="recent-content">
                                <div class="widget-loading">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>Carregando...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Agenda -->
                        <div class="widget-container" id="agenda-widget">
                            <div class="widget-header">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-calendar-alt text-green-600"></i>
                                    <h2 class="widget-title">Agenda</h2>
                                </div>
                                <button class="widget-refresh" data-widget="agenda">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                            <div class="widget-content" id="agenda-content">
                                <div class="widget-loading">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>Carregando...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Atribuídas a mim -->
                        <div class="widget-container" id="assigned-widget">
                            <div class="widget-header">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-user-tag text-orange-600"></i>
                                    <h2 class="widget-title">Atribuídas a mim</h2>
                                </div>
                                <button class="widget-refresh" data-widget="assigned">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                            <div class="widget-content" id="assigned-content">
                                <div class="widget-loading">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>Carregando...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Lista pessoal -->
                        <div class="widget-container" id="personal-list-widget">
                            <div class="widget-header">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-list text-red-600"></i>
                                    <h2 class="widget-title">Lista pessoal</h2>
                                </div>
                                <button class="widget-add" data-widget="personal-list">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="widget-content" id="personal-list-content">
                                <div class="personal-task-input">
                                    <input type="text" placeholder="Adicione uma tarefa pessoal..." 
                                           class="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-clickup-purple">
                                </div>
                                <div id="personal-tasks-list" class="mt-4 space-y-2">
                                    <!-- Personal tasks will be loaded here -->
                                </div>
                            </div>
                        </div>

                        <!-- Atividade recente -->
                        <div class="widget-container" id="activity-widget">
                            <div class="widget-header">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-history text-gray-600"></i>
                                    <h2 class="widget-title">Atividade recente</h2>
                                </div>
                                <button class="widget-refresh" data-widget="activity">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                            <div class="widget-content" id="activity-content">
                                <div class="widget-loading">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <span>Carregando...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateClock();
    }

    setupEventListeners() {
        // Quick actions
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.quick-action-btn');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                this.handleQuickAction(action);
            }

            // Widget refresh buttons
            const refreshBtn = e.target.closest('.widget-refresh');
            if (refreshBtn) {
                const widget = refreshBtn.dataset.widget;
                this.refreshWidget(widget);
            }

            // Widget add buttons
            const addBtn = e.target.closest('.widget-add');
            if (addBtn) {
                const widget = addBtn.dataset.widget;
                this.handleWidgetAdd(widget);
            }
        });

        // Personal task input
        const personalTaskInput = document.querySelector('.personal-task-input input');
        if (personalTaskInput) {
            personalTaskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    this.addPersonalTask(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }
    }

    async loadWidgets() {
        const userId = this.app.currentUser?.id || 1;
        
        const promises = [
            this.loadMyWorkWidget(userId),
            this.loadRecentWidget(userId),
            this.loadAgendaWidget(userId),
            this.loadAssignedWidget(userId),
            this.loadActivityWidget()
        ];

        await Promise.allSettled(promises);
    }

    async loadMyWorkWidget(userId) {
        try {
            const data = await this.app.api.getMyWork(userId);
            this.renderMyWorkWidget(data.categorizedTasks || {});
        } catch (error) {
            console.error('Erro ao carregar widget "Meu trabalho":', error);
            this.renderWidgetError('my-work-content', 'Erro ao carregar tarefas');
        }
    }

    renderMyWorkWidget(categorizedTasks) {
        const content = document.getElementById('my-work-content');
        if (!content) return;

        const categories = [
            { key: 'overdue', title: 'Atrasadas', color: 'text-red-600', icon: 'fas fa-exclamation-triangle' },
            { key: 'today', title: 'Hoje', color: 'text-blue-600', icon: 'fas fa-calendar-day' },
            { key: 'upcoming', title: 'Próximas', color: 'text-green-600', icon: 'fas fa-calendar-plus' },
            { key: 'unscheduled', title: 'Sem data', color: 'text-gray-600', icon: 'fas fa-question-circle' }
        ];

        const hasAnyTasks = categories.some(cat => categorizedTasks[cat.key]?.length > 0);

        if (!hasAnyTasks) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
                    <p class="text-gray-600">Nenhuma tarefa pendente!</p>
                    <p class="text-sm text-gray-500">Que tal criar uma nova tarefa?</p>
                </div>
            `;
            return;
        }

        content.innerHTML = categories.map(category => {
            const tasks = categorizedTasks[category.key] || [];
            if (tasks.length === 0) return '';

            return `
                <div class="mb-4">
                    <div class="flex items-center space-x-2 mb-2">
                        <i class="${category.icon} ${category.color}"></i>
                        <span class="text-sm font-medium ${category.color}">${category.title}</span>
                        <span class="text-xs text-gray-500">(${tasks.length})</span>
                    </div>
                    <div class="space-y-1">
                        ${tasks.slice(0, 5).map(task => `
                            <div class="task-item" data-task-id="${task.id}">
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 rounded-sm" style="background-color: ${task.space_color || '#7b68ee'}"></div>
                                    <span class="text-sm text-gray-800 truncate flex-1">${task.name}</span>
                                    ${task.due_date ? `<span class="text-xs text-gray-500">${task.due_date}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                        ${tasks.length > 5 ? `
                            <div class="text-xs text-gray-500 text-center py-1">
                                +${tasks.length - 5} mais...
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadRecentWidget(userId) {
        try {
            const data = await this.app.api.getRecent(userId);
            this.renderRecentWidget(data.recent_items || []);
        } catch (error) {
            console.error('Erro ao carregar widget "Recentes":', error);
            this.renderWidgetError('recent-content', 'Erro ao carregar itens recentes');
        }
    }

    renderRecentWidget(recentItems) {
        const content = document.getElementById('recent-content');
        if (!content) return;

        if (recentItems.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-clock text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Nenhuma atividade recente</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="space-y-2">
                ${recentItems.slice(0, 8).map(item => `
                    <div class="recent-item" data-task-id="${item.task_id}">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-history text-gray-400 text-xs"></i>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium text-gray-800 truncate">
                                    ${item.task_name}
                                </div>
                                <div class="text-xs text-gray-500">
                                    ${item.space_name} • ${this.app.formatDate(item.created_at, 'relative')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadAgendaWidget(userId) {
        try {
            const data = await this.app.api.getAgenda(userId);
            this.renderAgendaWidget(data.agenda_items || []);
        } catch (error) {
            console.error('Erro ao carregar widget "Agenda":', error);
            this.renderWidgetError('agenda-content', 'Erro ao carregar agenda');
        }
    }

    renderAgendaWidget(agendaItems) {
        const content = document.getElementById('agenda-content');
        if (!content) return;

        if (agendaItems.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-calendar-check text-4xl text-green-500 mb-3"></i>
                    <p class="text-gray-600">Agenda livre!</p>
                    <p class="text-sm text-gray-500">Nenhuma tarefa com prazo próximo</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="space-y-2">
                ${agendaItems.map(item => `
                    <div class="agenda-item" data-task-id="${item.id}">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span class="text-xs font-medium text-blue-600">
                                    ${dayjs(item.due_date).format('DD')}
                                </span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium text-gray-800 truncate">
                                    ${item.name}
                                </div>
                                <div class="text-xs text-gray-500">
                                    ${this.app.formatDate(item.due_date, 'calendar')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadAssignedWidget(userId) {
        try {
            const data = await this.app.api.getAssignedTasks(userId);
            this.renderAssignedWidget(data.tasks || []);
        } catch (error) {
            console.error('Erro ao carregar widget "Atribuídas a mim":', error);
            this.renderWidgetError('assigned-content', 'Erro ao carregar tarefas atribuídas');
        }
    }

    renderAssignedWidget(tasks) {
        const content = document.getElementById('assigned-content');
        if (!content) return;

        if (tasks.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-user-check text-4xl text-blue-500 mb-3"></i>
                    <p class="text-gray-600">Nenhuma tarefa atribuída</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="space-y-2">
                ${tasks.slice(0, 8).map(task => `
                    <div class="assigned-task" data-task-id="${task.id}">
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 rounded-full" style="background-color: ${task.status_color || '#7b68ee'}"></div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium text-gray-800 truncate">
                                    ${task.name}
                                </div>
                                <div class="text-xs text-gray-500 flex items-center space-x-2">
                                    <span class="priority-${task.priority}">
                                        <i class="${this.app.getPriorityIcon(task.priority)}"></i>
                                        ${task.priority.toUpperCase()}
                                    </span>
                                    ${task.due_date ? `• ${this.app.formatDate(task.due_date, 'short')}` : ''}
                                    ${task.subtasks_total > 0 ? `• ${task.subtasks_completed}/${task.subtasks_total} subtarefas` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadActivityWidget() {
        try {
            const data = await this.app.api.getDashboardActivity();
            this.renderActivityWidget(data.activities || []);
        } catch (error) {
            console.error('Erro ao carregar widget "Atividade":', error);
            this.renderWidgetError('activity-content', 'Erro ao carregar atividades');
        }
    }

    renderActivityWidget(activities) {
        const content = document.getElementById('activity-content');
        if (!content) return;

        if (activities.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-history text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Nenhuma atividade</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="space-y-3">
                ${activities.slice(0, 6).map(activity => `
                    <div class="activity-item">
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                ${activity.user_avatar ? 
                                    `<img src="${activity.user_avatar}" class="w-8 h-8 rounded-full" alt="${activity.user_name}">` :
                                    `<span class="text-xs font-medium text-gray-600">${activity.user_name?.charAt(0)}</span>`
                                }
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-gray-800">
                                    <span class="font-medium">${activity.user_name}</span>
                                    ${this.getActivityMessage(activity)}
                                </p>
                                <p class="text-xs text-gray-500 flex items-center space-x-2">
                                    <span>${this.app.formatDate(activity.created_at, 'relative')}</span>
                                    ${activity.workspace_name ? `• <span>${activity.workspace_name}</span>` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getActivityMessage(activity) {
        const messages = {
            'created': 'criou uma tarefa',
            'assigned': 'atribuiu uma tarefa',
            'status_changed': 'mudou o status da tarefa',
            'completed': 'concluiu uma tarefa',
            'commented': 'comentou em uma tarefa'
        };
        
        return messages[activity.action_type] || activity.action_type;
    }

    renderWidgetError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                    <p class="text-red-600">${message}</p>
                    <button class="text-sm text-blue-600 hover:underline mt-2" onclick="location.reload()">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'dashboard':
                this.app.navigateToPage('dashboard');
                break;
            case 'new-task':
                this.app.openNewTaskModal();
                break;
            case 'calendar':
                this.app.navigateToPage('calendar');
                break;
            case 'reports':
                this.app.navigateToPage('dashboard');
                break;
        }
    }

    async refreshWidget(widgetName) {
        const userId = this.app.currentUser?.id || 1;
        
        try {
            switch (widgetName) {
                case 'my-work':
                    await this.loadMyWorkWidget(userId);
                    break;
                case 'recent':
                    await this.loadRecentWidget(userId);
                    break;
                case 'agenda':
                    await this.loadAgendaWidget(userId);
                    break;
                case 'assigned':
                    await this.loadAssignedWidget(userId);
                    break;
                case 'activity':
                    await this.loadActivityWidget();
                    break;
            }
            
            this.app.notifications.success('Widget atualizado');
        } catch (error) {
            this.app.notifications.error('Erro ao atualizar widget');
        }
    }

    addPersonalTask(taskName) {
        // Add to personal tasks list (stored locally for now)
        const personalTasks = JSON.parse(localStorage.getItem('personalTasks') || '[]');
        const newTask = {
            id: utils.generateId(),
            name: taskName,
            completed: false,
            created_at: new Date().toISOString()
        };
        
        personalTasks.unshift(newTask);
        localStorage.setItem('personalTasks', JSON.stringify(personalTasks));
        
        this.renderPersonalTasks();
        this.app.notifications.success('Tarefa pessoal adicionada');
    }

    renderPersonalTasks() {
        const container = document.getElementById('personal-tasks-list');
        if (!container) return;

        const personalTasks = JSON.parse(localStorage.getItem('personalTasks') || '[]');

        if (personalTasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-500 text-sm">Nenhuma tarefa pessoal</p>
                </div>
            `;
            return;
        }

        container.innerHTML = personalTasks.map(task => `
            <div class="personal-task ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           class="rounded border-gray-300 text-clickup-purple focus:ring-clickup-purple">
                    <span class="flex-1 text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}">
                        ${task.name}
                    </span>
                    <button class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for personal tasks
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const taskElement = e.target.closest('.personal-task');
                const taskId = taskElement.dataset.taskId;
                this.togglePersonalTask(taskId, e.target.checked);
            }
        });

        container.addEventListener('click', (e) => {
            if (e.target.closest('.fa-trash')) {
                const taskElement = e.target.closest('.personal-task');
                const taskId = taskElement.dataset.taskId;
                this.deletePersonalTask(taskId);
            }
        });
    }

    togglePersonalTask(taskId, completed) {
        const personalTasks = JSON.parse(localStorage.getItem('personalTasks') || '[]');
        const task = personalTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            localStorage.setItem('personalTasks', JSON.stringify(personalTasks));
            this.renderPersonalTasks();
        }
    }

    deletePersonalTask(taskId) {
        const personalTasks = JSON.parse(localStorage.getItem('personalTasks') || '[]');
        const updatedTasks = personalTasks.filter(t => t.id !== taskId);
        localStorage.setItem('personalTasks', JSON.stringify(updatedTasks));
        this.renderPersonalTasks();
        this.app.notifications.info('Tarefa pessoal removida');
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    }

    getMotivationalMessage() {
        const messages = [
            'Vamos fazer acontecer hoje!',
            'Pronto para ser produtivo?',
            'Que tal começar com uma tarefa pequena?',
            'Cada tarefa concluída é uma vitória!',
            'Organize seu dia e conquiste seus objetivos!'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    updateClock() {
        const clockElement = document.getElementById('current-time');
        if (clockElement) {
            const now = new Date();
            clockElement.textContent = now.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }

    startAutoRefresh() {
        // Update clock every minute
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 60000);

        // Refresh widgets every 5 minutes
        this.refreshInterval = setInterval(async () => {
            await this.loadWidgets();
        }, 5 * 60 * 1000);
    }

    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Add widget styles
const widgetStyles = `
    .widget-container {
        @apply bg-white rounded-lg shadow border border-gray-200 overflow-hidden;
    }
    
    .widget-header {
        @apply px-4 py-3 border-b border-gray-200 flex items-center justify-between;
    }
    
    .widget-title {
        @apply text-lg font-semibold text-gray-900;
    }
    
    .widget-refresh, .widget-add {
        @apply p-1 text-gray-400 hover:text-gray-600 rounded transition-colors;
    }
    
    .widget-content {
        @apply p-4;
    }
    
    .widget-loading {
        @apply flex items-center justify-center py-8 text-gray-500;
    }
    
    .quick-action-btn {
        @apply flex items-center space-x-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all;
    }
    
    .task-item, .recent-item, .agenda-item, .assigned-task, .personal-task {
        @apply p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors;
    }
    
    .personal-task {
        @apply group;
    }
    
    .personal-task.completed {
        @apply bg-gray-50;
    }
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = widgetStyles;
document.head.appendChild(styleSheet);