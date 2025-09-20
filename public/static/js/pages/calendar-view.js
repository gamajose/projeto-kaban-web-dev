/**
 * ClickUp Clone - Calendar View Page
 * Visualização de tarefas em calendário com integração FullCalendar
 */

class CalendarViewPage {
    constructor(app) {
        this.app = app;
        this.currentList = null;
        this.tasks = [];
        this.calendar = null;
        this.currentView = 'dayGridMonth';
        this.filters = {
            status: 'all',
            assignee: 'all',
            priority: 'all'
        };
    }

    async load(params = {}) {
        console.log('📅 Carregando visualização em calendário...', params);
        
        try {
            if (params.listId) {
                await this.loadList(params.listId);
            } else {
                // Load all tasks from current workspace
                await this.loadAllTasks();
            }
            
            await this.render();
            this.setupEventListeners();
            this.initializeCalendar();
            
        } catch (error) {
            console.error('Erro ao carregar calendário:', error);
            this.app.notifications.error('Erro ao carregar calendário');
        }
    }

    async loadList(listId) {
        try {
            const data = await this.app.api.getList(listId);
            this.currentList = data.list;
            this.tasks = data.list.tasks || [];
            
            console.log(`📅 Calendário carregado: ${this.currentList.name} (${this.tasks.length} tarefas)`);
            
        } catch (error) {
            console.error('Erro ao carregar dados da lista:', error);
            throw error;
        }
    }

    async loadAllTasks() {
        try {
            // Mock implementation - replace with actual API call
            this.tasks = [];
            this.currentList = null;
            
            console.log('📅 Calendário geral carregado');
            
        } catch (error) {
            console.error('Erro ao carregar todas as tarefas:', error);
            throw error;
        }
    }

    async render() {
        const container = document.getElementById('calendar-page');
        if (!container) return;

        const pageTitle = this.currentList ? 
            `Calendário - ${this.currentList.name}` : 
            'Calendário Geral';

        container.innerHTML = `
            <div class="h-full bg-white flex flex-col">
                <!-- Calendar Header -->
                <div class="border-b border-gray-200 flex-shrink-0">
                    <div class="px-6 py-4">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-4">
                                ${this.currentList ? `
                                    <button onclick="window.history.back()" 
                                            class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <i class="fas fa-arrow-left text-gray-600"></i>
                                    </button>
                                ` : ''}
                                <div class="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                    <i class="fas fa-calendar text-white text-sm"></i>
                                </div>
                                <div>
                                    <h1 class="text-xl font-bold text-gray-900">${pageTitle}</h1>
                                    <p class="text-sm text-gray-600">
                                        ${this.currentList ? 
                                            (this.currentList.description || 'Calendário de tarefas') :
                                            'Visualização geral de todas as tarefas'
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <!-- View Switcher (only show if we have a list) -->
                                ${this.currentList ? `
                                    <div class="bg-gray-100 rounded-lg p-1 flex">
                                        <button class="view-btn" data-view="list">
                                            <i class="fas fa-list"></i>
                                            <span>Lista</span>
                                        </button>
                                        <button class="view-btn" data-view="board">
                                            <i class="fas fa-columns"></i>
                                            <span>Board</span>
                                        </button>
                                        <button class="view-btn active" data-view="calendar">
                                            <i class="fas fa-calendar"></i>
                                            <span>Calendário</span>
                                        </button>
                                    </div>
                                ` : ''}
                                
                                <!-- Calendar View Options -->
                                <div class="bg-gray-100 rounded-lg p-1 flex">
                                    <button class="calendar-view-btn ${this.currentView === 'dayGridMonth' ? 'active' : ''}" 
                                            data-view="dayGridMonth">
                                        Mês
                                    </button>
                                    <button class="calendar-view-btn ${this.currentView === 'timeGridWeek' ? 'active' : ''}" 
                                            data-view="timeGridWeek">
                                        Semana
                                    </button>
                                    <button class="calendar-view-btn ${this.currentView === 'timeGridDay' ? 'active' : ''}" 
                                            data-view="timeGridDay">
                                        Dia
                                    </button>
                                    <button class="calendar-view-btn ${this.currentView === 'listWeek' ? 'active' : ''}" 
                                            data-view="listWeek">
                                        Agenda
                                    </button>
                                </div>
                                
                                <button id="today-btn" class="btn-secondary">
                                    <i class="fas fa-calendar-day mr-2"></i>
                                    Hoje
                                </button>
                                
                                <button id="new-task-btn" class="btn-primary">
                                    <i class="fas fa-plus mr-2"></i>
                                    Nova Tarefa
                                </button>
                                
                                <div class="relative">
                                    <button id="calendar-options" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Filters -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <!-- Filters -->
                                ${this.currentList ? `
                                    <select id="status-filter" class="filter-select">
                                        <option value="all">Todos os Status</option>
                                        ${(this.currentList.statuses || []).map(status => 
                                            `<option value="${status.id}">${status.name}</option>`
                                        ).join('')}
                                    </select>
                                ` : ''}
                                
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
                            
                            <div class="flex items-center space-x-4">
                                <!-- Calendar Navigation -->
                                <div class="flex items-center space-x-2">
                                    <button id="calendar-prev" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <div id="calendar-title" class="min-w-48 text-center font-semibold text-gray-900">
                                        <!-- Will be set by FullCalendar -->
                                    </div>
                                    <button id="calendar-next" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                
                                <!-- Task Count -->
                                <div class="text-sm text-gray-600">
                                    <span id="visible-tasks-count">${this.getFilteredTasks().length}</span> tarefas visíveis
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Calendar Content -->
                <div class="flex-1 overflow-hidden p-6">
                    <div id="calendar" class="h-full"></div>
                </div>
            </div>

            <!-- Task Details Popover -->
            <div id="task-popover" class="hidden absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md">
                <!-- Task details will be populated here -->
            </div>
        `;
    }

    setupEventListeners() {
        // View switcher (for list-specific calendar)
        if (this.currentList) {
            document.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-btn');
                if (viewBtn) {
                    const view = viewBtn.dataset.view;
                    this.switchView(view);
                }
            });
        }

        // Calendar view switcher
        document.addEventListener('click', (e) => {
            const calendarViewBtn = e.target.closest('.calendar-view-btn');
            if (calendarViewBtn) {
                const view = calendarViewBtn.dataset.view;
                this.changeCalendarView(view);
            }
        });

        // Navigation buttons
        document.getElementById('calendar-prev')?.addEventListener('click', () => {
            if (this.calendar) {
                this.calendar.prev();
            }
        });

        document.getElementById('calendar-next')?.addEventListener('click', () => {
            if (this.calendar) {
                this.calendar.next();
            }
        });

        document.getElementById('today-btn')?.addEventListener('click', () => {
            if (this.calendar) {
                this.calendar.today();
            }
        });

        // Filters
        ['status-filter', 'assignee-filter', 'priority-filter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', (e) => {
                    const filterType = filterId.replace('-filter', '');
                    this.filters[filterType] = e.target.value;
                    this.updateCalendarEvents();
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

        // Hide popover when clicking outside
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('task-popover');
            if (popover && !popover.contains(e.target) && !e.target.closest('.fc-event')) {
                popover.classList.add('hidden');
            }
        });
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        // Initialize FullCalendar
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: this.currentView,
            locale: 'pt-br',
            headerToolbar: false, // We handle navigation ourselves
            height: '100%',
            
            // Calendar options
            firstDay: 0, // Sunday
            weekNumbers: false,
            nowIndicator: true,
            
            // Event handling
            eventClick: (info) => this.handleEventClick(info),
            eventMouseEnter: (info) => this.handleEventMouseEnter(info),
            eventMouseLeave: (info) => this.handleEventMouseLeave(info),
            dateClick: (info) => this.handleDateClick(info),
            
            // Event rendering
            eventContent: (arg) => this.renderEventContent(arg),
            
            // Date formatting
            dayHeaderFormat: { weekday: 'short' },
            
            // View options
            views: {
                dayGridMonth: {
                    displayEventTime: false,
                    dayMaxEvents: 3,
                    moreLinkContent: (args) => `+${args.num} mais`
                },
                timeGridWeek: {
                    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
                    slotMinTime: '06:00:00',
                    slotMaxTime: '22:00:00'
                },
                timeGridDay: {
                    dayHeaderFormat: { weekday: 'long', day: 'numeric', month: 'long' },
                    slotMinTime: '06:00:00',
                    slotMaxTime: '22:00:00'
                },
                listWeek: {
                    noEventsContent: 'Nenhuma tarefa nesta semana'
                }
            },
            
            // Events
            events: this.getCalendarEvents(),
            
            // Callbacks
            datesSet: (info) => {
                document.getElementById('calendar-title').textContent = info.view.title;
            }
        });

        this.calendar.render();
    }

    getCalendarEvents() {
        const filteredTasks = this.getFilteredTasks();
        
        return filteredTasks.map(task => ({
            id: task.id.toString(),
            title: task.name,
            start: task.due_date || task.created_at,
            end: task.due_date,
            allDay: !task.due_time,
            
            // Custom properties
            extendedProps: {
                task: task,
                priority: task.priority,
                status: task.status_name,
                assignee: task.assignee_name,
                description: task.description,
                progress: task.progress || 0,
                isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status_name !== 'Concluído'
            },
            
            // Styling
            backgroundColor: this.getEventBackgroundColor(task),
            borderColor: this.getEventBorderColor(task),
            textColor: this.getEventTextColor(task),
            
            classNames: [
                `priority-${task.priority}`,
                task.due_date && new Date(task.due_date) < new Date() ? 'overdue' : '',
                `status-${task.status_name?.toLowerCase().replace(/\s+/g, '-') || 'no-status'}`
            ].filter(Boolean)
        }));
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            // Only show tasks with due dates (or all if in agenda view)
            if (this.currentView !== 'listWeek' && !task.due_date) {
                return false;
            }

            // Status filter
            if (this.filters.status !== 'all' && this.currentList) {
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
    }

    getEventBackgroundColor(task) {
        // Priority-based colors
        const priorityColors = {
            urgent: '#fee2e2', // red-100
            high: '#fed7aa',   // orange-100
            normal: '#dbeafe', // blue-100
            low: '#f3f4f6'     // gray-100
        };

        // Override with status color if available
        if (task.status_color) {
            return task.status_color + '20'; // Add transparency
        }

        return priorityColors[task.priority] || priorityColors.normal;
    }

    getEventBorderColor(task) {
        const priorityColors = {
            urgent: '#ef4444', // red-500
            high: '#f97316',   // orange-500
            normal: '#3b82f6', // blue-500
            low: '#6b7280'     // gray-500
        };

        // Use status color if available
        if (task.status_color) {
            return task.status_color;
        }

        return priorityColors[task.priority] || priorityColors.normal;
    }

    getEventTextColor(task) {
        // Check if task is overdue
        const isOverdue = task.due_date && new Date(task.due_date) < new Date();
        if (isOverdue && task.status_name !== 'Concluído') {
            return '#dc2626'; // red-600
        }

        return '#374151'; // gray-700
    }

    renderEventContent(arg) {
        const task = arg.event.extendedProps.task;
        const isMonthView = this.currentView === 'dayGridMonth';
        
        if (isMonthView) {
            // Compact view for month
            return {
                html: `
                    <div class="flex items-center space-x-2 text-xs">
                        <div class="w-2 h-2 rounded-full" style="background-color: ${this.getEventBorderColor(task)}"></div>
                        <span class="truncate flex-1">${task.name}</span>
                        ${task.assignee_name ? `
                            <div class="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                                <span class="text-xs text-gray-600">${task.assignee_name.charAt(0)}</span>
                            </div>
                        ` : ''}
                    </div>
                `
            };
        } else {
            // Detailed view for other views
            return {
                html: `
                    <div class="p-1">
                        <div class="font-medium text-sm mb-1">${task.name}</div>
                        <div class="flex items-center space-x-2 text-xs text-gray-600">
                            ${task.assignee_name ? `<span>${task.assignee_name}</span>` : ''}
                            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                            ${task.progress > 0 ? `<span>${task.progress}%</span>` : ''}
                        </div>
                    </div>
                `
            };
        }
    }

    handleEventClick(info) {
        info.jsEvent.preventDefault();
        
        const task = info.event.extendedProps.task;
        this.app.openTaskModal(task.id);
    }

    handleEventMouseEnter(info) {
        const task = info.event.extendedProps.task;
        this.showTaskPopover(info.jsEvent, task);
    }

    handleEventMouseLeave(info) {
        // Hide popover with a small delay
        setTimeout(() => {
            const popover = document.getElementById('task-popover');
            if (popover && !popover.matches(':hover')) {
                popover.classList.add('hidden');
            }
        }, 200);
    }

    handleDateClick(info) {
        // Open new task modal with pre-filled due date
        console.log('Create task for date:', info.dateStr);
        this.app.notifications.info('Criação de tarefa com data pré-definida em desenvolvimento');
    }

    showTaskPopover(event, task) {
        const popover = document.getElementById('task-popover');
        if (!popover) return;

        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

        popover.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-start justify-between">
                    <h4 class="font-semibold text-gray-900 text-sm">${task.name}</h4>
                    <div class="w-3 h-3 rounded-full ml-2" 
                         style="background-color: ${this.getEventBorderColor(task)}"></div>
                </div>
                
                ${task.description ? `
                    <p class="text-sm text-gray-600">${utils.truncate(task.description, 100)}</p>
                ` : ''}
                
                <div class="space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-500">Status:</span>
                        <span class="font-medium">${task.status_name || 'Sem status'}</span>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <span class="text-gray-500">Prioridade:</span>
                        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    </div>
                    
                    ${task.assignee_name ? `
                        <div class="flex items-center justify-between">
                            <span class="text-gray-500">Responsável:</span>
                            <span class="font-medium">${task.assignee_name}</span>
                        </div>
                    ` : ''}
                    
                    ${task.due_date ? `
                        <div class="flex items-center justify-between">
                            <span class="text-gray-500">Vencimento:</span>
                            <span class="font-medium ${isOverdue ? 'text-red-600' : ''}">
                                ${this.app.formatDate(task.due_date, 'medium')}
                            </span>
                        </div>
                    ` : ''}
                    
                    ${task.progress > 0 ? `
                        <div class="space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="text-gray-500">Progresso:</span>
                                <span class="font-medium">${task.progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${task.progress}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="pt-2 border-t border-gray-200">
                    <button class="text-xs text-blue-600 hover:text-blue-800" 
                            onclick="window.app.openTaskModal(${task.id}); document.getElementById('task-popover').classList.add('hidden')">
                        Ver detalhes <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
            </div>
        `;

        // Position popover
        const rect = event.target.getBoundingClientRect();
        popover.style.left = `${rect.left + window.scrollX}px`;
        popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
        
        popover.classList.remove('hidden');
    }

    switchView(viewType) {
        if (!this.currentList) return;

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
            case 'board':
                this.app.navigateToPage('board', { listId: this.currentList.id });
                break;
            case 'calendar':
                // Already in calendar view
                break;
        }
    }

    changeCalendarView(viewType) {
        this.currentView = viewType;
        
        // Update active calendar view button
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`).classList.add('active');

        // Change calendar view
        if (this.calendar) {
            this.calendar.changeView(viewType);
        }
    }

    updateCalendarEvents() {
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.getCalendarEvents());
        }

        // Update visible tasks count
        const visibleCount = this.getFilteredTasks().length;
        const countElement = document.getElementById('visible-tasks-count');
        if (countElement) {
            countElement.textContent = visibleCount;
        }
    }

    clearFilters() {
        this.filters = {
            status: 'all',
            assignee: 'all',
            priority: 'all'
        };

        // Reset UI
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.value = 'all';
        
        document.getElementById('assignee-filter').value = 'all';
        document.getElementById('priority-filter').value = 'all';

        this.updateCalendarEvents();
    }

    destroy() {
        // Destroy calendar instance
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }

        // Hide popover
        const popover = document.getElementById('task-popover');
        if (popover) {
            popover.classList.add('hidden');
        }
    }
}

// Add calendar view styles
const calendarViewStyles = `
    .view-btn, .calendar-view-btn {
        @apply px-3 py-1.5 text-sm font-medium text-gray-600 rounded-md transition-colors;
    }
    
    .view-btn.active, .calendar-view-btn.active {
        @apply bg-white text-gray-900 shadow-sm;
    }
    
    .filter-select {
        @apply text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clickup-purple;
    }
    
    .btn-primary {
        @apply bg-clickup-purple text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center;
    }
    
    .btn-secondary {
        @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center;
    }
    
    .priority-badge {
        @apply inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium capitalize;
    }
    
    .priority-badge.priority-urgent {
        @apply bg-red-100 text-red-800;
    }
    
    .priority-badge.priority-high {
        @apply bg-orange-100 text-orange-800;
    }
    
    .priority-badge.priority-normal {
        @apply bg-blue-100 text-blue-800;
    }
    
    .priority-badge.priority-low {
        @apply bg-gray-100 text-gray-800;
    }
    
    /* FullCalendar customizations */
    .fc-event {
        @apply cursor-pointer border-l-2;
    }
    
    .fc-event.overdue {
        @apply bg-red-100 border-red-500;
    }
    
    .fc-event.priority-urgent {
        @apply border-l-4;
        border-left-color: #ef4444 !important;
    }
    
    .fc-daygrid-event {
        @apply rounded-md px-2 py-1;
    }
    
    .fc-timegrid-event {
        @apply rounded-md;
    }
    
    .fc-list-event {
        @apply border-l-4;
    }
    
    .fc-toolbar-chunk {
        @apply flex items-center;
    }
    
    .fc-button {
        @apply bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200;
    }
    
    .fc-button-active {
        @apply bg-clickup-purple border-clickup-purple text-white;
    }
    
    .fc-today {
        @apply bg-blue-50;
    }
    
    .fc-day-past {
        @apply bg-gray-50;
    }
    
    .fc-more-link {
        @apply text-blue-600 hover:text-blue-800 text-xs;
    }
`;

// Add styles to head
const calendarViewStyleSheet = document.createElement('style');
calendarViewStyleSheet.textContent = calendarViewStyles;
document.head.appendChild(calendarViewStyleSheet);