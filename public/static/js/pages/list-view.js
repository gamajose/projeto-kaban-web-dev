/**
 * ClickUp Clone - List View Page  
 * Visualização de tarefas em formato de lista/tabela com todas as propriedades
 */

class ListViewPage {
    constructor(app) {
        this.app = app;
        this.tasks = [];
        this.filteredTasks = [];
        this.selectedTasks = new Set();
        this.sortConfig = { key: 'created_at', direction: 'desc' };
        this.filters = {
            status: 'all',
            assignee: 'all',
            priority: 'all',
            search: ''
        };
        this.currentList = null;
    }

    async load(params = {}) {
        console.log('📋 Carregando visualização em lista...', params);
        
        try {
            if (params.listId) {
                await this.loadList(params.listId);
                await this.render();
                this.setupEventListeners();
                this.applyFilters();
            } else {
                throw new Error('ID da lista não fornecido');
            }
        } catch (error) {
            console.error('Erro ao carregar lista:', error);
            this.app.notifications.error('Erro ao carregar lista');
        }
    }

    async loadList(listId) {
        try {
            const data = await this.app.api.getList(listId);
            this.currentList = data.list;
            this.tasks = data.list.tasks || [];
            this.filteredTasks = [...this.tasks];
            
            console.log(`📋 Lista carregada: ${this.currentList.name} (${this.tasks.length} tarefas)`);
            
        } catch (error) {
            console.error('Erro ao carregar dados da lista:', error);
            throw error;
        }
    }

    async render() {
        const container = document.getElementById('list-page');
        if (!container) return;

        const list = this.currentList;

        container.innerHTML = `
            <div class="h-full bg-gray-50 flex flex-col">
                <!-- List Header -->
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
                                    <i class="fas fa-list text-white text-sm"></i>
                                </div>
                                <div>
                                    <h1 class="text-xl font-bold text-gray-900">${list.name}</h1>
                                    <p class="text-sm text-gray-600">${list.description || 'Lista de tarefas'}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <!-- View Switcher -->
                                <div class="bg-gray-100 rounded-lg p-1 flex">
                                    <button class="view-btn active" data-view="list">
                                        <i class="fas fa-list"></i>
                                        <span>Lista</span>
                                    </button>
                                    <button class="view-btn" data-view="board">
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
                                    <button id="list-options" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
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
                                <select id="status-filter" class="filter-select">
                                    <option value="all">Todos os Status</option>
                                    ${(list.statuses || []).map(status => 
                                        `<option value="${status.id}">${status.name}</option>`
                                    ).join('')}
                                </select>
                                
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
                                
                                <!-- Bulk Actions -->
                                <div id="bulk-actions" class="hidden flex items-center space-x-2">
                                    <span class="text-sm text-gray-600">
                                        <span id="selected-count">0</span> selecionadas
                                    </span>
                                    <button id="bulk-edit" class="btn-secondary-sm">
                                        <i class="fas fa-edit mr-1"></i>
                                        Editar
                                    </button>
                                    <button id="bulk-delete" class="btn-danger-sm">
                                        <i class="fas fa-trash mr-1"></i>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tasks Table -->
                <div class="flex-1 overflow-hidden">
                    <div class="h-full overflow-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th class="table-header w-12">
                                        <input type="checkbox" id="select-all" class="rounded border-gray-300">
                                    </th>
                                    <th class="table-header text-left sortable" data-sort="name">
                                        <div class="flex items-center space-x-2">
                                            <span>Nome da Tarefa</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-32 sortable" data-sort="status_name">
                                        <div class="flex items-center space-x-2">
                                            <span>Status</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-32 sortable" data-sort="assignee_name">
                                        <div class="flex items-center space-x-2">
                                            <span>Responsável</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-24 sortable" data-sort="priority">
                                        <div class="flex items-center space-x-2">
                                            <span>Prioridade</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-32 sortable" data-sort="due_date">
                                        <div class="flex items-center space-x-2">
                                            <span>Vencimento</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-24 sortable" data-sort="progress">
                                        <div class="flex items-center space-x-2">
                                            <span>Progresso</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-24 sortable" data-sort="created_at">
                                        <div class="flex items-center space-x-2">
                                            <span>Criado</span>
                                            <i class="fas fa-sort text-gray-400"></i>
                                        </div>
                                    </th>
                                    <th class="table-header w-16"></th>
                                </tr>
                            </thead>
                            <tbody id="tasks-tbody">
                                ${this.renderTaskRows()}
                            </tbody>
                        </table>
                        
                        ${this.tasks.length === 0 ? `
                            <div class="flex items-center justify-center h-64">
                                <div class="text-center">
                                    <i class="fas fa-tasks text-6xl text-gray-300 mb-4"></i>
                                    <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa ainda</h3>
                                    <p class="text-gray-600 mb-4">Crie sua primeira tarefa para começar</p>
                                    <button class="btn-primary" onclick="document.getElementById('new-task-btn').click()">
                                        <i class="fas fa-plus mr-2"></i>
                                        Criar Tarefa
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderTaskRows() {
        if (this.filteredTasks.length === 0 && this.tasks.length > 0) {
            return `
                <tr>
                    <td colspan="9" class="text-center py-8">
                        <div class="text-gray-500">
                            <i class="fas fa-search text-2xl mb-2"></i>
                            <p>Nenhuma tarefa encontrada com os filtros aplicados</p>
                            <button id="clear-filters-2" class="text-blue-600 hover:underline mt-2">
                                Limpar filtros
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        return this.filteredTasks.map(task => this.renderTaskRow(task)).join('');
    }

    renderTaskRow(task) {
        const isSelected = this.selectedTasks.has(task.id);
        const isOverdue = task.due_date && this.app.utils?.isOverdue(task.due_date);
        
        return `
            <tr class="task-row ${isSelected ? 'selected' : ''} ${isOverdue ? 'overdue' : ''}" 
                data-task-id="${task.id}">
                <td class="table-cell">
                    <input type="checkbox" 
                           class="task-checkbox rounded border-gray-300" 
                           ${isSelected ? 'checked' : ''}
                           data-task-id="${task.id}">
                </td>
                
                <td class="table-cell">
                    <div class="flex items-center space-x-3">
                        <div class="w-2 h-2 rounded-full priority-${task.priority}" 
                             style="background-color: ${this.app.getPriorityColor(task.priority)}"></div>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-gray-900 cursor-pointer hover:text-blue-600 truncate task-name" 
                                 data-task-id="${task.id}">
                                ${task.name}
                            </div>
                            ${task.description ? `
                                <div class="text-sm text-gray-500 truncate">
                                    ${utils.truncate(task.description, 60)}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            ${task.comments_count > 0 ? `
                                <span class="text-xs text-gray-500 flex items-center">
                                    <i class="fas fa-comment mr-1"></i>
                                    ${task.comments_count}
                                </span>
                            ` : ''}
                            
                            ${task.time_tracked > 0 ? `
                                <span class="text-xs text-gray-500 flex items-center">
                                    <i class="fas fa-clock mr-1"></i>
                                    ${this.formatDuration(task.time_tracked)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </td>
                
                <td class="table-cell">
                    <span class="status-badge" 
                          style="background-color: ${task.status_color}20; color: ${task.status_color}; border-color: ${task.status_color}40">
                        ${task.status_name || 'Sem status'}
                    </span>
                </td>
                
                <td class="table-cell">
                    ${task.assignee_name ? `
                        <div class="flex items-center space-x-2">
                            <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                ${task.assignee_avatar ? 
                                    `<img src="${task.assignee_avatar}" class="w-6 h-6 rounded-full" alt="${task.assignee_name}">` :
                                    `<span class="text-xs text-gray-600">${task.assignee_name.charAt(0)}</span>`
                                }
                            </div>
                            <span class="text-sm text-gray-900 truncate">${task.assignee_name}</span>
                        </div>
                    ` : `
                        <span class="text-sm text-gray-500">Não atribuída</span>
                    `}
                </td>
                
                <td class="table-cell">
                    <div class="priority-indicator priority-${task.priority}">
                        <i class="${this.app.getPriorityIcon(task.priority)}"></i>
                        <span class="text-xs capitalize">${task.priority}</span>
                    </div>
                </td>
                
                <td class="table-cell">
                    ${task.due_date ? `
                        <div class="text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}">
                            <div>${this.app.formatDate(task.due_date, 'short')}</div>
                            <div class="text-xs text-gray-500">
                                ${this.app.formatDate(task.due_date, 'relative')}
                            </div>
                        </div>
                    ` : `
                        <span class="text-sm text-gray-500">-</span>
                    `}
                </td>
                
                <td class="table-cell">
                    <div class="w-full">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" 
                                 style="width: ${task.progress || 0}%"></div>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${task.progress || 0}%</div>
                    </div>
                </td>
                
                <td class="table-cell">
                    <div class="text-sm text-gray-500">
                        ${this.app.formatDate(task.created_at, 'short')}
                    </div>
                </td>
                
                <td class="table-cell">
                    <button class="task-menu-btn p-1 text-gray-400 hover:text-gray-600" 
                            data-task-id="${task.id}">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </td>
            </tr>
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

        // Task row clicks
        document.addEventListener('click', (e) => {
            const taskName = e.target.closest('.task-name');
            if (taskName) {
                const taskId = parseInt(taskName.dataset.taskId);
                this.app.openTaskModal(taskId);
                return;
            }

            // Task row selection
            const taskRow = e.target.closest('.task-row');
            if (taskRow && !e.target.closest('input, button')) {
                const taskId = parseInt(taskRow.dataset.taskId);
                this.toggleTaskSelection(taskId, e.ctrlKey || e.metaKey);
            }
        });

        // Checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.id === 'select-all') {
                this.toggleAllTasks(e.target.checked);
            } else if (e.target.classList.contains('task-checkbox')) {
                const taskId = parseInt(e.target.dataset.taskId);
                this.toggleTaskSelection(taskId, false, e.target.checked);
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
        ['status-filter', 'assignee-filter', 'priority-filter'].forEach(filterId => {
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
        document.addEventListener('click', (e) => {
            if (e.target.id === 'clear-filters' || e.target.id === 'clear-filters-2') {
                this.clearFilters();
            }
        });

        // Sorting
        document.addEventListener('click', (e) => {
            const sortable = e.target.closest('.sortable');
            if (sortable) {
                const key = sortable.dataset.sort;
                this.setSortConfig(key);
            }
        });

        // New task button
        document.getElementById('new-task-btn')?.addEventListener('click', () => {
            this.app.openNewTaskModal();
        });

        // Bulk actions
        document.getElementById('bulk-edit')?.addEventListener('click', () => {
            this.bulkEditTasks();
        });

        document.getElementById('bulk-delete')?.addEventListener('click', () => {
            this.bulkDeleteTasks();
        });
    }

    switchView(viewType) {
        // Update active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`).classList.add('active');

        // Navigate to appropriate view
        switch (viewType) {
            case 'board':
                this.app.navigateToPage('board', { listId: this.currentList.id });
                break;
            case 'calendar':
                this.app.navigateToPage('calendar', { listId: this.currentList.id });
                break;
            case 'list':
                // Already in list view
                break;
        }
    }

    toggleTaskSelection(taskId, multiSelect = false, checked = null) {
        if (!multiSelect && checked === null) {
            this.selectedTasks.clear();
        }

        if (checked !== null) {
            if (checked) {
                this.selectedTasks.add(taskId);
            } else {
                this.selectedTasks.delete(taskId);
            }
        } else {
            if (this.selectedTasks.has(taskId)) {
                this.selectedTasks.delete(taskId);
            } else {
                this.selectedTasks.add(taskId);
            }
        }

        this.updateSelectionUI();
    }

    toggleAllTasks(checked) {
        if (checked) {
            this.filteredTasks.forEach(task => this.selectedTasks.add(task.id));
        } else {
            this.selectedTasks.clear();
        }

        // Update checkboxes
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });

        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedCount = this.selectedTasks.size;
        const totalCount = this.filteredTasks.length;
        
        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalCount;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
        }

        // Update task row classes
        document.querySelectorAll('.task-row').forEach(row => {
            const taskId = parseInt(row.dataset.taskId);
            row.classList.toggle('selected', this.selectedTasks.has(taskId));
        });

        // Show/hide bulk actions
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCountSpan = document.getElementById('selected-count');
        
        if (bulkActions && selectedCountSpan) {
            if (selectedCount > 0) {
                bulkActions.classList.remove('hidden');
                selectedCountSpan.textContent = selectedCount;
            } else {
                bulkActions.classList.add('hidden');
            }
        }
    }

    applyFilters() {
        this.filteredTasks = this.tasks.filter(task => {
            // Search filter
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                const matchesSearch = 
                    task.name.toLowerCase().includes(searchLower) ||
                    (task.description && task.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) return false;
            }

            // Status filter
            if (this.filters.status !== 'all') {
                if (task.status_id !== parseInt(this.filters.status)) return false;
            }

            // Assignee filter
            if (this.filters.assignee !== 'all') {
                if (this.filters.assignee === 'me') {
                    if (task.assignee_id !== this.app.currentUser?.id) return false;
                } else if (this.filters.assignee === 'unassigned') {
                    if (task.assignee_id) return false;
                }
            }

            // Priority filter
            if (this.filters.priority !== 'all') {
                if (task.priority !== this.filters.priority) return false;
            }

            return true;
        });

        this.applySorting();
        this.updateTasksTable();
        this.updateFilteredCount();
    }

    applySorting() {
        const { key, direction } = this.sortConfig;
        
        this.filteredTasks.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            // Handle different data types
            if (key.includes('date')) {
                aVal = aVal ? new Date(aVal) : new Date(0);
                bVal = bVal ? new Date(bVal) : new Date(0);
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal ? bVal.toLowerCase() : '';
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    setSortConfig(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }

        this.updateSortIcons();
        this.applyFilters();
    }

    updateSortIcons() {
        // Reset all sort icons
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort text-gray-400';
        });

        // Set active sort icon
        const activeSortable = document.querySelector(`[data-sort="${this.sortConfig.key}"]`);
        if (activeSortable) {
            const icon = activeSortable.querySelector('i');
            if (icon) {
                icon.className = `fas fa-sort-${this.sortConfig.direction === 'asc' ? 'up' : 'down'} text-blue-600`;
            }
        }
    }

    updateTasksTable() {
        const tbody = document.getElementById('tasks-tbody');
        if (tbody) {
            tbody.innerHTML = this.renderTaskRows();
        }
    }

    updateFilteredCount() {
        const filteredCountSpan = document.getElementById('filtered-count');
        if (filteredCountSpan) {
            filteredCountSpan.textContent = this.filteredTasks.length;
        }
    }

    clearFilters() {
        this.filters = {
            status: 'all',
            assignee: 'all', 
            priority: 'all',
            search: ''
        };

        // Reset UI
        document.getElementById('task-search').value = '';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('assignee-filter').value = 'all';
        document.getElementById('priority-filter').value = 'all';

        this.applyFilters();
    }

    bulkEditTasks() {
        const taskIds = Array.from(this.selectedTasks);
        console.log('Bulk edit tasks:', taskIds);
        this.app.notifications.info('Edição em lote em desenvolvimento');
    }

    bulkDeleteTasks() {
        const taskIds = Array.from(this.selectedTasks);
        if (confirm(`Tem certeza que deseja excluir ${taskIds.length} tarefa(s)?`)) {
            console.log('Bulk delete tasks:', taskIds);
            this.app.notifications.info('Exclusão em lote em desenvolvimento');
        }
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
        this.selectedTasks.clear();
    }
}

// Add list view styles
const listViewStyles = `
    .table-header {
        @apply px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200;
    }
    
    .table-cell {
        @apply px-4 py-4 whitespace-nowrap border-b border-gray-100;
    }
    
    .task-row {
        @apply hover:bg-gray-50 transition-colors;
    }
    
    .task-row.selected {
        @apply bg-blue-50;
    }
    
    .task-row.overdue {
        @apply bg-red-50 border-l-4 border-red-500;
    }
    
    .view-btn {
        @apply px-3 py-1.5 text-sm font-medium text-gray-600 rounded-md transition-colors flex items-center space-x-1;
    }
    
    .view-btn.active {
        @apply bg-white text-gray-900 shadow-sm;
    }
    
    .status-badge {
        @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border;
    }
    
    .priority-indicator {
        @apply flex items-center space-x-1 text-xs;
    }
    
    .priority-urgent {
        @apply text-red-600;
    }
    
    .priority-high {
        @apply text-orange-600;
    }
    
    .priority-normal {
        @apply text-blue-600;
    }
    
    .priority-low {
        @apply text-gray-600;
    }
    
    .filter-select {
        @apply text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clickup-purple;
    }
    
    .btn-secondary-sm {
        @apply bg-gray-100 text-gray-700 px-2 py-1 text-xs rounded-md hover:bg-gray-200 transition-colors inline-flex items-center;
    }
    
    .btn-danger-sm {
        @apply bg-red-100 text-red-700 px-2 py-1 text-xs rounded-md hover:bg-red-200 transition-colors inline-flex items-center;
    }
    
    .sortable {
        @apply cursor-pointer hover:bg-gray-100 transition-colors;
    }
`;

// Add styles to head
const listViewStyleSheet = document.createElement('style');
listViewStyleSheet.textContent = listViewStyles;
document.head.appendChild(listViewStyleSheet);