/**
 * ClickUp Clone - Board View Page
 * Visualização Kanban com drag & drop de tarefas entre colunas de status
 */

class BoardViewPage {
    constructor(app) {
        this.app = app;
        this.currentList = null;
        this.tasks = [];
        this.statuses = [];
        this.sortables = [];
        this.filters = {
            assignee: 'all',
            priority: 'all',
            search: ''
        };
    }

    async load(params = {}) {
        console.log('📋 Carregando visualização em board...', params);
        
        try {
            if (params.listId) {
                await this.loadList(params.listId);
                await this.render();
                this.setupEventListeners();
                this.initializeDragAndDrop();
                this.applyFilters();
            } else {
                throw new Error('ID da lista não fornecido');
            }
        } catch (error) {
            console.error('Erro ao carregar board:', error);
            this.app.notifications.error('Erro ao carregar board');
        }
    }

    async loadList(listId) {
        try {
            const data = await this.app.api.getList(listId);
            this.currentList = data.list;
            this.tasks = data.list.tasks || [];
            this.statuses = data.list.statuses || [];
            
            console.log(`📋 Board carregado: ${this.currentList.name} (${this.tasks.length} tarefas)`);
            
        } catch (error) {
            console.error('Erro ao carregar dados da lista:', error);
            throw error;
        }
    }

    async render() {
        const container = document.getElementById('board-page');
        if (!container) return;

        const list = this.currentList;

        container.innerHTML = `
            <div class="h-full bg-gray-50 flex flex-col">
                <!-- Board Header -->
                <div class="bg-white border-b border-gray-200 flex-shrink-0">
                    <div class="px-6 py-4">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-4">
                                <button onclick="window.history.back()" 
                                        class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <i class="fas fa-arrow-left text-gray-600"></i>
                                </button>
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                                     style="background-color: ${list.color || '#3b82f6'}">
                                    <i class="fas fa-columns text-white text-sm"></i>
                                </div>
                                <div>
                                    <h1 class="text-xl font-bold text-gray-900">${list.name}</h1>
                                    <p class="text-sm text-gray-600">${list.description || 'Board de tarefas'}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <!-- View Switcher -->
                                <div class="bg-gray-100 rounded-lg p-1 flex">
                                    <button class="view-btn" data-view="list">
                                        <i class="fas fa-list"></i>
                                        <span>Lista</span>
                                    </button>
                                    <button class="view-btn active" data-view="board">
                                        <i class="fas fa-columns"></i>
                                        <span>Board</span>
                                    </button>
                                    <button class="view-btn" data-view="calendar">
                                        <i class="fas fa-calendar"></i>
                                        <span>Calendário</span>
                                    </button>
                                </div>
                                
                                <button id="new-task-btn" class="btn-primary">
                                    <i class="fas fa-plus mr-2"></i>
                                    Nova Tarefa
                                </button>
                                
                                <div class="relative">
                                    <button id="board-options" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Filters and Tools -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <!-- Search -->
                                <div class="relative">
                                    <input type="text" 
                                           id="task-search"
                                           placeholder="Buscar tarefas..." 
                                           class="w-64 px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clickup-purple">
                                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                </div>
                                
                                <!-- Filters -->
                                <select id="assignee-filter" class="filter-select">
                                    <option value="all">Todos os Responsáveis</option>
                                    <option value="me">Atribuídas a mim</option>
                                    <option value="unassigned">Não atribuídas</option>
                                </select>
                                
                                <select id="priority-filter" class="filter-select">
                                    <option value="all">Todas as Prioridades</option>
                                    <option value="urgent">Urgente</option>
                                    <option value="high">Alta</option>
                                    <option value="normal">Normal</option>
                                    <option value="low">Baixa</option>
                                </select>
                                
                                <button id="clear-filters" class="text-sm text-gray-500 hover:text-gray-700">
                                    Limpar filtros
                                </button>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <span class="text-sm text-gray-600">
                                    <span id="filtered-count">${this.tasks.length}</span> de ${this.tasks.length} tarefas
                                </span>
                                
                                <button id="add-status" class="text-sm text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-plus mr-1"></i>
                                    Adicionar Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Board Content -->
                <div class="flex-1 overflow-x-auto overflow-y-hidden">
                    <div class="h-full min-w-max">
                        <div class="flex h-full p-6 space-x-6" id="board-container">
                            ${this.renderStatusColumns()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStatusColumns() {
        if (this.statuses.length === 0) {
            return `
                <div class="flex items-center justify-center w-full h-full">
                    <div class="text-center">
                        <i class="fas fa-columns text-6xl text-gray-300 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Configure os Status</h3>
                        <p class="text-gray-600 mb-4">Adicione status para organizar suas tarefas em colunas</p>
                        <button class="btn-primary" onclick="document.getElementById('add-status').click()">
                            <i class="fas fa-plus mr-2"></i>
                            Adicionar Primeiro Status
                        </button>
                    </div>
                </div>
            `;
        }

        return this.statuses.map(status => this.renderStatusColumn(status)).join('');
    }

    renderStatusColumn(status) {
        const columnTasks = this.getTasksForStatus(status.id);
        const isBacklogColumn = status.is_default;
        
        return `
            <div class="kanban-column" data-status-id="${status.id}">
                <div class="kanban-column-header">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="w-4 h-4 rounded-full" 
                             style="background-color: ${status.color || '#6b7280'}"></div>
                        <h3 class="font-semibold text-gray-900">${status.name}</h3>
                        <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            ${columnTasks.length}
                        </span>
                        
                        <div class="ml-auto flex items-center space-x-1">
                            <button class="column-option-btn p-1 text-gray-400 hover:text-gray-600 rounded" 
                                    data-action="add-task" data-status-id="${status.id}">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                            <button class="column-option-btn p-1 text-gray-400 hover:text-gray-600 rounded"
                                    data-action="column-menu" data-status-id="${status.id}">
                                <i class="fas fa-ellipsis-h text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="kanban-column-body" 
                     data-status-id="${status.id}"
                     data-sortable="true">
                    ${columnTasks.length === 0 ? `
                        <div class="kanban-empty-state">
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-tasks text-2xl mb-2"></i>
                                <p class="text-sm">Arraste tarefas aqui</p>
                                ${isBacklogColumn ? `
                                    <button class="text-xs text-blue-600 hover:underline mt-2" 
                                            onclick="document.getElementById('new-task-btn').click()">
                                        ou crie uma nova
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    ` : columnTasks.map(task => this.renderTaskCard(task)).join('')}
                </div>
            </div>
        `;
    }

    renderTaskCard(task) {
        const isOverdue = task.due_date && utils.isOverdue && utils.isOverdue(task.due_date);
        
        return `
            <div class="task-card ${isOverdue ? 'overdue' : ''}" 
                 data-task-id="${task.id}" 
                 draggable="true">
                <div class="task-card-header">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 rounded-full priority-indicator-${task.priority}" 
                                 style="background-color: ${this.app.getPriorityColor(task.priority)}"></div>
                            ${task.priority === 'urgent' ? '<i class="fas fa-fire text-red-500 text-xs"></i>' : ''}
                        </div>
                        
                        <button class="task-card-menu p-1 text-gray-400 hover:text-gray-600" 
                                data-task-id="${task.id}">
                            <i class="fas fa-ellipsis-h text-xs"></i>
                        </button>
                    </div>
                    
                    <h4 class="task-card-title" data-task-id="${task.id}">
                        ${task.name}
                    </h4>
                    
                    ${task.description ? `
                        <p class="task-card-description">
                            ${utils.truncate(task.description, 80)}
                        </p>
                    ` : ''}
                </div>
                
                <div class="task-card-body">
                    ${task.progress > 0 ? `
                        <div class="progress-bar mb-3">
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-blue-600 h-1.5 rounded-full transition-all" 
                                     style="width: ${task.progress}%"></div>
                            </div>
                            <span class="text-xs text-gray-500 mt-1">${task.progress}% completo</span>
                        </div>
                    ` : ''}
                    
                    <!-- Tags -->
                    ${task.tags && task.tags.length > 0 ? `
                        <div class="task-tags mb-3">
                            ${task.tags.slice(0, 2).map(tag => `
                                <span class="task-tag" style="background-color: ${tag.color}20; color: ${tag.color}">
                                    ${tag.name}
                                </span>
                            `).join('')}
                            ${task.tags.length > 2 ? `<span class="task-tag-more">+${task.tags.length - 2}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Subtasks -->
                    ${task.subtasks && task.subtasks.length > 0 ? `
                        <div class="subtasks-indicator mb-3">
                            <div class="flex items-center space-x-2 text-xs text-gray-600">
                                <i class="fas fa-list"></i>
                                <span>${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} subtarefas</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-card-footer">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <!-- Due Date -->
                            ${task.due_date ? `
                                <div class="flex items-center space-x-1 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-600'}">
                                    <i class="fas fa-calendar"></i>
                                    <span>${this.app.formatDate(task.due_date, 'short')}</span>
                                </div>
                            ` : ''}
                            
                            <!-- Comments -->
                            ${task.comments_count > 0 ? `
                                <div class="flex items-center space-x-1 text-xs text-gray-600">
                                    <i class="fas fa-comment"></i>
                                    <span>${task.comments_count}</span>
                                </div>
                            ` : ''}
                            
                            <!-- Time Tracked -->
                            ${task.time_tracked > 0 ? `
                                <div class="flex items-center space-x-1 text-xs text-gray-600">
                                    <i class="fas fa-clock"></i>
                                    <span>${this.formatDuration(task.time_tracked)}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Assignee -->
                        ${task.assignee_name ? `
                            <div class="task-assignee">
                                <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center" 
                                     title="${task.assignee_name}">
                                    ${task.assignee_avatar ? 
                                        `<img src="${task.assignee_avatar}" class="w-6 h-6 rounded-full" alt="${task.assignee_name}">` :
                                        `<span class="text-xs text-gray-600">${task.assignee_name.charAt(0)}</span>`
                                    }
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // View switcher
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-btn');
            if (viewBtn) {
                const view = viewBtn.dataset.view;
                this.switchView(view);
            }
        });

        // Task card clicks
        document.addEventListener('click', (e) => {
            const taskTitle = e.target.closest('.task-card-title');
            if (taskTitle) {
                const taskId = parseInt(taskTitle.dataset.taskId);
                this.app.openTaskModal(taskId);
                return;
            }

            // Column option buttons
            const columnBtn = e.target.closest('.column-option-btn');
            if (columnBtn) {
                const action = columnBtn.dataset.action;
                const statusId = parseInt(columnBtn.dataset.statusId);
                this.handleColumnAction(action, statusId);
            }

            // Task card menu
            const taskMenu = e.target.closest('.task-card-menu');
            if (taskMenu) {
                e.stopPropagation();
                const taskId = parseInt(taskMenu.dataset.taskId);
                this.showTaskContextMenu(e, taskId);
            }
        });

        // Search
        const searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.addEventListener('input', utils.debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Filters
        ['assignee-filter', 'priority-filter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', (e) => {
                    const filterType = filterId.replace('-filter', '');
                    this.filters[filterType] = e.target.value;
                    this.applyFilters();
                });
            }
        });

        // Clear filters
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // New task button
        document.getElementById('new-task-btn')?.addEventListener('click', () => {
            this.app.openNewTaskModal();
        });

        // Add status button
        document.getElementById('add-status')?.addEventListener('click', () => {
            this.openAddStatusModal();
        });
    }

    initializeDragAndDrop() {
        // Destroy existing sortables
        this.sortables.forEach(sortable => sortable.destroy());
        this.sortables = [];

        // Initialize sortables for each column
        document.querySelectorAll('.kanban-column-body[data-sortable="true"]').forEach(column => {
            const sortable = Sortable.create(column, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'task-card-ghost',
                chosenClass: 'task-card-chosen',
                dragClass: 'task-card-drag',
                
                onStart: (evt) => {
                    document.body.classList.add('dragging');
                },
                
                onEnd: (evt) => {
                    document.body.classList.remove('dragging');
                    
                    // If item was moved to a different column
                    if (evt.from !== evt.to) {
                        const taskId = parseInt(evt.item.dataset.taskId);
                        const newStatusId = parseInt(evt.to.dataset.statusId);
                        const newIndex = evt.newIndex;
                        
                        this.moveTask(taskId, newStatusId, newIndex);
                    }
                },
                
                onMove: (evt) => {
                    // Prevent dropping on certain elements
                    return !evt.related.classList.contains('kanban-empty-state');
                }
            });
            
            this.sortables.push(sortable);
        });
    }

    async moveTask(taskId, newStatusId, newIndex) {
        try {
            console.log(`Moving task ${taskId} to status ${newStatusId} at position ${newIndex}`);
            
            // Update task status in backend
            await this.app.api.updateTask(taskId, {
                status_id: newStatusId,
                position: newIndex
            });
            
            // Update local task data
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.status_id = newStatusId;
                
                // Update status info
                const status = this.statuses.find(s => s.id === newStatusId);
                if (status) {
                    task.status_name = status.name;
                    task.status_color = status.color;
                }
            }
            
            // Update column counts
            this.updateColumnCounts();
            
            this.app.notifications.success('Tarefa movida com sucesso');
            
        } catch (error) {
            console.error('Erro ao mover tarefa:', error);
            this.app.notifications.error('Erro ao mover tarefa');
            
            // Revert the move by reloading the board
            await this.loadList(this.currentList.id);
            this.renderBoard();
        }
    }

    switchView(viewType) {
        // Update active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`).classList.add('active');

        // Navigate to appropriate view
        switch (viewType) {
            case 'list':
                this.app.navigateToPage('list', { listId: this.currentList.id });
                break;
            case 'calendar':
                this.app.navigateToPage('calendar', { listId: this.currentList.id });
                break;
            case 'board':
                // Already in board view
                break;
        }
    }

    getTasksForStatus(statusId) {
        return this.tasks.filter(task => {
            // Apply status filter
            if (task.status_id !== statusId) return false;

            // Apply other filters
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                const matchesSearch = 
                    task.name.toLowerCase().includes(searchLower) ||
                    (task.description && task.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) return false;
            }

            if (this.filters.assignee !== 'all') {
                if (this.filters.assignee === 'me') {
                    if (task.assignee_id !== this.app.currentUser?.id) return false;
                } else if (this.filters.assignee === 'unassigned') {
                    if (task.assignee_id) return false;
                }
            }

            if (this.filters.priority !== 'all') {
                if (task.priority !== this.filters.priority) return false;
            }

            return true;
        });
    }

    applyFilters() {
        this.renderBoard();
        this.updateFilteredCount();
    }

    renderBoard() {
        const container = document.getElementById('board-container');
        if (container) {
            container.innerHTML = this.renderStatusColumns();
            this.initializeDragAndDrop();
        }
    }

    updateColumnCounts() {
        this.statuses.forEach(status => {
            const columnTasks = this.getTasksForStatus(status.id);
            const countSpan = document.querySelector(`[data-status-id="${status.id}"] .text-sm.text-gray-500`);
            if (countSpan) {
                countSpan.textContent = columnTasks.length;
            }
        });
    }

    updateFilteredCount() {
        const totalFiltered = this.tasks.filter(task => {
            return this.statuses.some(status => 
                this.getTasksForStatus(status.id).includes(task)
            );
        }).length;
        
        const filteredCountSpan = document.getElementById('filtered-count');
        if (filteredCountSpan) {
            filteredCountSpan.textContent = totalFiltered;
        }
    }

    clearFilters() {
        this.filters = {
            assignee: 'all',
            priority: 'all',
            search: ''
        };

        // Reset UI
        document.getElementById('task-search').value = '';
        document.getElementById('assignee-filter').value = 'all';
        document.getElementById('priority-filter').value = 'all';

        this.applyFilters();
    }

    handleColumnAction(action, statusId) {
        switch (action) {
            case 'add-task':
                this.createTaskInStatus(statusId);
                break;
            case 'column-menu':
                this.showColumnMenu(statusId);
                break;
        }
    }

    createTaskInStatus(statusId) {
        // Open new task modal with pre-selected status
        console.log('Creating task in status:', statusId);
        this.app.notifications.info('Criação de tarefa com status pré-definido em desenvolvimento');
    }

    showColumnMenu(statusId) {
        console.log('Show column menu for status:', statusId);
        this.app.notifications.info('Menu de coluna em desenvolvimento');
    }

    showTaskContextMenu(event, taskId) {
        console.log('Task context menu for:', taskId);
        this.app.notifications.info('Menu contextual de tarefa em desenvolvimento');
    }

    openAddStatusModal() {
        console.log('Opening add status modal');
        this.app.notifications.info('Modal de adicionar status em desenvolvimento');
    }

    formatDuration(seconds) {
        if (!seconds) return '0m';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    destroy() {
        // Cleanup sortables
        this.sortables.forEach(sortable => sortable.destroy());
        this.sortables = [];
        
        // Remove dragging class if it exists
        document.body.classList.remove('dragging');
    }
}

// Add board view styles
const boardViewStyles = `
    .kanban-column {
        @apply min-w-80 w-80 bg-gray-100 rounded-lg p-4 flex flex-col;
        min-height: calc(100vh - 200px);
    }
    
    .kanban-column-header {
        @apply flex-shrink-0;
    }
    
    .kanban-column-body {
        @apply flex-1 space-y-3 overflow-y-auto;
        min-height: 200px;
    }
    
    .kanban-empty-state {
        @apply border-2 border-dashed border-gray-300 rounded-lg min-h-32 flex items-center justify-center;
    }
    
    .task-card {
        @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow;
    }
    
    .task-card.overdue {
        @apply border-l-4 border-red-500 bg-red-50;
    }
    
    .task-card-ghost {
        @apply opacity-50;
    }
    
    .task-card-chosen {
        @apply transform rotate-3;
    }
    
    .task-card-drag {
        @apply transform rotate-6 shadow-lg;
    }
    
    .task-card-title {
        @apply font-medium text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-blue-600;
    }
    
    .task-card-description {
        @apply text-xs text-gray-600 mb-3 line-clamp-2;
    }
    
    .task-tag {
        @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-1 mb-1;
    }
    
    .task-tag-more {
        @apply inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600;
    }
    
    .view-btn {
        @apply px-3 py-1.5 text-sm font-medium text-gray-600 rounded-md transition-colors flex items-center space-x-1;
    }
    
    .view-btn.active {
        @apply bg-white text-gray-900 shadow-sm;
    }
    
    .filter-select {
        @apply text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clickup-purple;
    }
    
    .btn-primary {
        @apply bg-clickup-purple text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center;
    }
    
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .dragging .kanban-column {
        @apply bg-blue-50 border-2 border-dashed border-blue-300;
    }
    
    .column-option-btn {
        @apply transition-colors;
    }
    
    .priority-indicator-urgent {
        @apply animate-pulse;
    }
`;

// Add styles to head
const boardViewStyleSheet = document.createElement('style');
boardViewStyleSheet.textContent = boardViewStyles;
document.head.appendChild(boardViewStyleSheet);