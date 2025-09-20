/**
 * ClickUp Clone - Dashboard Page
 * Dashboard completo com métricas, gráficos e visão geral
 */

class DashboardPage {
    constructor(app) {
        this.app = app;
        this.charts = new Map();
        this.refreshInterval = null;
    }

    async load() {
        console.log('📊 Carregando dashboard...');
        
        try {
            await this.render();
            this.setupEventListeners();
            await this.loadDashboardData();
            this.startAutoRefresh();
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.app.notifications.error('Erro ao carregar dashboard');
        }
    }

    async render() {
        const container = document.getElementById('dashboard-page');
        if (!container) return;

        container.innerHTML = `
            <div class="h-full bg-gray-50">
                <!-- Dashboard Header -->
                <div class="bg-white border-b border-gray-200">
                    <div class="px-6 py-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
                                <p class="mt-1 text-sm text-gray-600">
                                    Visão geral do workspace ${this.app.currentWorkspace?.name || 'Atual'}
                                </p>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <div class="flex items-center space-x-2 text-sm text-gray-500">
                                    <i class="fas fa-sync-alt"></i>
                                    <span>Atualizado há <span id="last-update">alguns segundos</span></span>
                                </div>
                                
                                <button id="refresh-dashboard" class="btn-primary">
                                    <i class="fas fa-refresh mr-2"></i>
                                    Atualizar
                                </button>
                                
                                <div class="relative">
                                    <button id="dashboard-options" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="px-6 py-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div class="stats-card" id="total-tasks-card">
                            <div class="stats-content">
                                <div class="stats-icon bg-blue-100">
                                    <i class="fas fa-tasks text-blue-600"></i>
                                </div>
                                <div class="stats-info">
                                    <div class="stats-value" id="total-tasks-value">-</div>
                                    <div class="stats-label">Total de Tarefas</div>
                                    <div class="stats-trend" id="total-tasks-trend"></div>
                                </div>
                            </div>
                        </div>

                        <div class="stats-card" id="completed-tasks-card">
                            <div class="stats-content">
                                <div class="stats-icon bg-green-100">
                                    <i class="fas fa-check-circle text-green-600"></i>
                                </div>
                                <div class="stats-info">
                                    <div class="stats-value" id="completed-tasks-value">-</div>
                                    <div class="stats-label">Concluídas</div>
                                    <div class="stats-trend" id="completed-tasks-trend"></div>
                                </div>
                            </div>
                        </div>

                        <div class="stats-card" id="overdue-tasks-card">
                            <div class="stats-content">
                                <div class="stats-icon bg-red-100">
                                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                                </div>
                                <div class="stats-info">
                                    <div class="stats-value" id="overdue-tasks-value">-</div>
                                    <div class="stats-label">Atrasadas</div>
                                    <div class="stats-trend" id="overdue-tasks-trend"></div>
                                </div>
                            </div>
                        </div>

                        <div class="stats-card" id="active-users-card">
                            <div class="stats-content">
                                <div class="stats-icon bg-purple-100">
                                    <i class="fas fa-users text-purple-600"></i>
                                </div>
                                <div class="stats-info">
                                    <div class="stats-value" id="active-users-value">-</div>
                                    <div class="stats-label">Usuários Ativos</div>
                                    <div class="stats-trend" id="active-users-trend"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Section -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <!-- Task Status Distribution -->
                        <div class="chart-container">
                            <div class="chart-header">
                                <h3 class="chart-title">Distribuição por Status</h3>
                                <div class="chart-actions">
                                    <button class="chart-action" data-chart="status">
                                        <i class="fas fa-refresh"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="chart-content">
                                <canvas id="status-chart" width="400" height="200"></canvas>
                            </div>
                        </div>

                        <!-- Priority Distribution -->
                        <div class="chart-container">
                            <div class="chart-header">
                                <h3 class="chart-title">Distribuição por Prioridade</h3>
                                <div class="chart-actions">
                                    <button class="chart-action" data-chart="priority">
                                        <i class="fas fa-refresh"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="chart-content">
                                <canvas id="priority-chart" width="400" height="200"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Trend Chart -->
                    <div class="chart-container mb-8">
                        <div class="chart-header">
                            <h3 class="chart-title">Tendência de Conclusão (Últimos 30 dias)</h3>
                            <div class="chart-actions">
                                <select class="chart-filter" id="trend-period">
                                    <option value="7">Últimos 7 dias</option>
                                    <option value="30" selected>Últimos 30 dias</option>
                                    <option value="90">Últimos 90 dias</option>
                                </select>
                                <button class="chart-action" data-chart="trend">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-content">
                            <canvas id="trend-chart" width="800" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Team Performance & Recent Activity -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Team Performance -->
                        <div class="chart-container">
                            <div class="chart-header">
                                <h3 class="chart-title">Performance da Equipe</h3>
                                <div class="chart-actions">
                                    <button class="chart-action" data-chart="team">
                                        <i class="fas fa-refresh"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="chart-content">
                                <div id="team-performance" class="space-y-4">
                                    <!-- Team performance data will be loaded here -->
                                </div>
                            </div>
                        </div>

                        <!-- My Tasks Overview -->
                        <div class="chart-container">
                            <div class="chart-header">
                                <h3 class="chart-title">Minhas Tarefas</h3>
                                <div class="chart-actions">
                                    <button class="chart-action" data-chart="mytasks">
                                        <i class="fas fa-refresh"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="chart-content">
                                <div id="my-tasks-overview" class="space-y-3">
                                    <!-- My tasks data will be loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity Feed -->
                    <div class="chart-container mt-6">
                        <div class="chart-header">
                            <h3 class="chart-title">Atividade Recente</h3>
                            <div class="chart-actions">
                                <button class="chart-action" data-chart="activity">
                                    <i class="fas fa-refresh"></i>
                                </button>
                                <button class="chart-action" onclick="window.app.navigateToPage('home')">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-content">
                            <div id="activity-feed" class="space-y-3 max-h-96 overflow-y-auto">
                                <!-- Activity feed will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Chart refresh buttons
        document.addEventListener('click', (e) => {
            const chartAction = e.target.closest('.chart-action');
            if (chartAction) {
                const chart = chartAction.dataset.chart;
                this.refreshChart(chart);
            }
        });

        // Trend period filter
        document.getElementById('trend-period')?.addEventListener('change', (e) => {
            this.loadTrendChart(parseInt(e.target.value));
        });

        // Stats cards click handlers
        document.getElementById('total-tasks-card')?.addEventListener('click', () => {
            // Navigate to all tasks view
            this.app.notifications.info('Navegando para todas as tarefas...');
        });

        document.getElementById('completed-tasks-card')?.addEventListener('click', () => {
            // Navigate to completed tasks
            this.app.notifications.info('Mostrando tarefas concluídas...');
        });

        document.getElementById('overdue-tasks-card')?.addEventListener('click', () => {
            // Navigate to overdue tasks
            this.app.notifications.info('Mostrando tarefas atrasadas...');
        });
    }

    async loadDashboardData() {
        console.log('📊 Carregando dados do dashboard...');
        
        try {
            const promises = [
                this.loadStats(),
                this.loadStatusChart(),
                this.loadPriorityChart(),
                this.loadTrendChart(),
                this.loadTeamPerformance(),
                this.loadMyTasksOverview(),
                this.loadActivityFeed()
            ];

            await Promise.allSettled(promises);
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.app.notifications.error('Erro ao carregar alguns dados do dashboard');
        }
    }

    async loadStats() {
        try {
            const data = await this.app.api.getDashboardStats();
            this.renderStats(data.stats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.renderStatsError();
        }
    }

    renderStats(stats) {
        const fields = [
            { id: 'total-tasks', value: stats.total_tasks, trend: '+12%' },
            { id: 'completed-tasks', value: stats.completed_tasks, trend: '+8%' },
            { id: 'overdue-tasks', value: stats.overdue_tasks, trend: '-3%' },
            { id: 'active-users', value: stats.active_users, trend: '+2%' }
        ];

        fields.forEach(field => {
            const valueElement = document.getElementById(`${field.id}-value`);
            const trendElement = document.getElementById(`${field.id}-trend`);
            
            if (valueElement) {
                this.animateNumber(valueElement, 0, field.value, 1000);
            }
            
            if (trendElement && field.trend) {
                const isPositive = field.trend.startsWith('+');
                trendElement.innerHTML = `
                    <span class="text-xs ${isPositive ? 'text-green-600' : 'text-red-600'} flex items-center">
                        <i class="fas fa-arrow-${isPositive ? 'up' : 'down'} mr-1"></i>
                        ${field.trend}
                    </span>
                `;
            }
        });
    }

    renderStatsError() {
        const valueElements = document.querySelectorAll('.stats-value');
        valueElements.forEach(el => {
            el.textContent = 'Erro';
            el.classList.add('text-red-500');
        });
    }

    async loadStatusChart() {
        try {
            // Mock data for now - replace with real API call
            const data = {
                labels: ['A Fazer', 'Em Progresso', 'Em Revisão', 'Concluídas'],
                datasets: [{
                    data: [45, 28, 12, 89],
                    backgroundColor: [
                        '#e5e7eb', // A Fazer - Gray
                        '#3b82f6', // Em Progresso - Blue
                        '#f59e0b', // Em Revisão - Amber
                        '#10b981'  // Concluídas - Green
                    ],
                    borderWidth: 0
                }]
            };

            this.renderStatusChart(data);
        } catch (error) {
            console.error('Erro ao carregar gráfico de status:', error);
        }
    }

    renderStatusChart(data) {
        const canvas = document.getElementById('status-chart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.charts.has('status')) {
            this.charts.get('status').destroy();
        }

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%'
            }
        });

        this.charts.set('status', chart);
    }

    async loadPriorityChart() {
        try {
            const workspaceId = this.app.currentWorkspace?.id || 1;
            const data = await this.app.api.getPriorityDistribution(workspaceId);
            this.renderPriorityChart(data.data || []);
        } catch (error) {
            console.error('Erro ao carregar gráfico de prioridade:', error);
            // Use mock data as fallback
            this.renderPriorityChart([
                { priority: 'urgent', task_count: 8 },
                { priority: 'high', task_count: 23 },
                { priority: 'normal', task_count: 89 },
                { priority: 'low', task_count: 34 }
            ]);
        }
    }

    renderPriorityChart(data) {
        const canvas = document.getElementById('priority-chart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.charts.has('priority')) {
            this.charts.get('priority').destroy();
        }

        const chartData = {
            labels: data.map(item => item.priority.charAt(0).toUpperCase() + item.priority.slice(1)),
            datasets: [{
                data: data.map(item => item.task_count),
                backgroundColor: [
                    '#ef4444', // Urgent - Red
                    '#f97316', // High - Orange
                    '#3b82f6', // Normal - Blue
                    '#6b7280'  // Low - Gray
                ],
                borderWidth: 0
            }]
        };

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%'
            }
        });

        this.charts.set('priority', chart);
    }

    async loadTrendChart(days = 30) {
        try {
            const workspaceId = this.app.currentWorkspace?.id || 1;
            const data = await this.app.api.getCompletionTrend(workspaceId);
            this.renderTrendChart(data.data || []);
        } catch (error) {
            console.error('Erro ao carregar gráfico de tendência:', error);
            // Use mock data as fallback
            const mockData = this.generateMockTrendData(days);
            this.renderTrendChart(mockData);
        }
    }

    generateMockTrendData(days) {
        const data = [];
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toISOString().split('T')[0],
                created_count: Math.floor(Math.random() * 10) + 2,
                completed_count: Math.floor(Math.random() * 8) + 1
            });
        }
        return data;
    }

    renderTrendChart(data) {
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.charts.has('trend')) {
            this.charts.get('trend').destroy();
        }

        const chartData = {
            labels: data.map(item => dayjs(item.date).format('DD/MM')),
            datasets: [
                {
                    label: 'Tarefas Criadas',
                    data: data.map(item => item.created_count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Tarefas Concluídas',
                    data: data.map(item => item.completed_count),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f3f4f6'
                        }
                    },
                    x: {
                        grid: {
                            color: '#f3f4f6'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    }
                }
            }
        });

        this.charts.set('trend', chart);
    }

    async loadTeamPerformance() {
        try {
            const workspaceId = this.app.currentWorkspace?.id || 1;
            const data = await this.app.api.getTeamPerformance(workspaceId);
            this.renderTeamPerformance(data.data || []);
        } catch (error) {
            console.error('Erro ao carregar performance da equipe:', error);
            // Use mock data as fallback
            this.renderTeamPerformance([
                { name: 'Alice Silva', completed_tasks: 42 },
                { name: 'Bob Santos', completed_tasks: 38 },
                { name: 'Carol Oliveira', completed_tasks: 31 },
                { name: 'David Costa', completed_tasks: 28 }
            ]);
        }
    }

    renderTeamPerformance(data) {
        const container = document.getElementById('team-performance');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-users text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Nenhum dado de performance</p>
                </div>
            `;
            return;
        }

        const maxTasks = Math.max(...data.map(item => item.completed_tasks));

        container.innerHTML = data.map(member => `
            <div class="team-member">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span class="text-sm font-medium text-gray-600">
                                ${member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                        </div>
                        <span class="text-sm font-medium text-gray-900">${member.name}</span>
                    </div>
                    <span class="text-sm font-semibold text-gray-900">${member.completed_tasks}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                         style="width: ${(member.completed_tasks / maxTasks) * 100}%"></div>
                </div>
            </div>
        `).join('');
    }

    async loadMyTasksOverview() {
        try {
            const userId = this.app.currentUser?.id || 1;
            const data = await this.app.api.getMyTasks(userId);
            this.renderMyTasksOverview(data.tasks || []);
        } catch (error) {
            console.error('Erro ao carregar minhas tarefas:', error);
            this.renderMyTasksOverview([]);
        }
    }

    renderMyTasksOverview(tasks) {
        const container = document.getElementById('my-tasks-overview');
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
                    <p class="text-gray-600">Nenhuma tarefa pendente!</p>
                    <button class="text-sm text-blue-600 hover:underline mt-2" onclick="window.app.openNewTaskModal()">
                        Criar nova tarefa
                    </button>
                </div>
            `;
            return;
        }

        // Group tasks by priority and status
        const grouped = tasks.reduce((acc, task) => {
            const key = `${task.priority}_${task.status_name}`;
            if (!acc[key]) {
                acc[key] = { 
                    priority: task.priority, 
                    status: task.status_name,
                    color: task.status_color,
                    tasks: [] 
                };
            }
            acc[key].tasks.push(task);
            return acc;
        }, {});

        container.innerHTML = Object.values(grouped).slice(0, 6).map(group => `
            <div class="task-group">
                <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${group.color}"></div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${group.status}</div>
                            <div class="text-xs text-gray-500">Prioridade: ${group.priority}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-semibold text-gray-900">${group.tasks.length}</span>
                        <i class="fas fa-chevron-right text-xs text-gray-400"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadActivityFeed() {
        try {
            const data = await this.app.api.getDashboardActivity();
            this.renderActivityFeed(data.activities || []);
        } catch (error) {
            console.error('Erro ao carregar feed de atividades:', error);
            this.renderActivityFeed([]);
        }
    }

    renderActivityFeed(activities) {
        const container = document.getElementById('activity-feed');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-history text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Nenhuma atividade recente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
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
                        <div class="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <span>${this.app.formatDate(activity.created_at, 'relative')}</span>
                            ${activity.workspace_name ? `<span>•</span><span>${activity.workspace_name}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
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

    async refreshChart(chartName) {
        try {
            switch (chartName) {
                case 'status':
                    await this.loadStatusChart();
                    break;
                case 'priority':
                    await this.loadPriorityChart();
                    break;
                case 'trend':
                    await this.loadTrendChart();
                    break;
                case 'team':
                    await this.loadTeamPerformance();
                    break;
                case 'mytasks':
                    await this.loadMyTasksOverview();
                    break;
                case 'activity':
                    await this.loadActivityFeed();
                    break;
            }
            
            this.app.notifications.success(`Gráfico ${chartName} atualizado`);
        } catch (error) {
            this.app.notifications.error(`Erro ao atualizar gráfico ${chartName}`);
        }
    }

    animateNumber(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString('pt-BR');
        }, 16);
    }

    updateLastUpdateTime() {
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = 'alguns segundos';
            
            let seconds = 0;
            const updateInterval = setInterval(() => {
                seconds += 30;
                if (seconds < 60) {
                    element.textContent = `${seconds} segundos`;
                } else if (seconds < 3600) {
                    const minutes = Math.floor(seconds / 60);
                    element.textContent = `${minutes} minuto${minutes > 1 ? 's' : ''}`;
                } else {
                    clearInterval(updateInterval);
                    element.textContent = 'mais de 1 hora';
                }
            }, 30000);
        }
    }

    startAutoRefresh() {
        // Refresh dashboard every 5 minutes
        this.refreshInterval = setInterval(async () => {
            await this.loadDashboardData();
        }, 5 * 60 * 1000);
    }

    destroy() {
        // Destroy all charts
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        
        // Clear refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Add dashboard-specific styles
const dashboardStyles = `
    .stats-card {
        @apply bg-white rounded-lg shadow border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow;
    }
    
    .stats-content {
        @apply flex items-center space-x-4;
    }
    
    .stats-icon {
        @apply w-12 h-12 rounded-lg flex items-center justify-center;
    }
    
    .stats-value {
        @apply text-2xl font-bold text-gray-900;
    }
    
    .stats-label {
        @apply text-sm text-gray-600;
    }
    
    .stats-trend {
        @apply mt-1;
    }
    
    .chart-container {
        @apply bg-white rounded-lg shadow border border-gray-200 overflow-hidden;
    }
    
    .chart-header {
        @apply px-6 py-4 border-b border-gray-200 flex items-center justify-between;
    }
    
    .chart-title {
        @apply text-lg font-semibold text-gray-900;
    }
    
    .chart-actions {
        @apply flex items-center space-x-2;
    }
    
    .chart-action {
        @apply p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors;
    }
    
    .chart-filter {
        @apply text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-clickup-purple;
    }
    
    .chart-content {
        @apply p-6;
    }
    
    .team-member {
        @apply space-y-2;
    }
    
    .task-group, .activity-item {
        @apply transition-colors;
    }
    
    .btn-primary {
        @apply bg-clickup-purple text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center;
    }
`;

// Add styles to head
const dashboardStyleSheet = document.createElement('style');
dashboardStyleSheet.textContent = dashboardStyles;
document.head.appendChild(dashboardStyleSheet);