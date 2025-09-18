// public/static/reports.js

class ReportsPage {
    constructor() {
        this.workspaceId = document.getElementById('app-reports').dataset.workspaceId;
        this.charts = {};

        this.init();
    }

    async init() {
        this.loadTeamPerformance();
        this.loadPriorityDistribution();
        this.loadCompletionTrend();
    }

    async loadTeamPerformance() {
        const response = await axios.get(`/api/reports/workspace/${this.workspaceId}/team-performance`);
        const data = response.data.data;

        const ctx = document.getElementById('team-performance-chart');
        this.charts.teamPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    label: 'Tarefas Concluídas',
                    data: data.map(d => d.completed_tasks),
                    backgroundColor: '#6B73FF',
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    }

    async loadPriorityDistribution() {
        const response = await axios.get(`/api/reports/workspace/${this.workspaceId}/priority-distribution`);
        const data = response.data.data;
        
        const priorityMap = { urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baixa' };
        
        const ctx = document.getElementById('priority-chart');
        this.charts.priority = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => priorityMap[d.priority] || d.priority),
                datasets: [{
                    data: data.map(d => d.task_count),
                    backgroundColor: ['#F06292', '#FFB84D', '#81C784', '#9DA4FF'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async loadCompletionTrend() {
        const response = await axios.get(`/api/reports/workspace/${this.workspaceId}/completion-trend`);
        const data = response.data.data;
        
        let cumulativeCreated = 0;
        let cumulativeCompleted = 0;

        const ctx = document.getElementById('completion-trend-chart');
        this.charts.completionTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [
                    {
                        label: 'Total de Tarefas Criadas',
                        data: data.map(d => cumulativeCreated += d.created_count),
                        borderColor: '#64B5F6',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Total de Tarefas Concluídas',
                        data: data.map(d => cumulativeCompleted += d.completed_count),
                        borderColor: '#81C784',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ReportsPage();
});