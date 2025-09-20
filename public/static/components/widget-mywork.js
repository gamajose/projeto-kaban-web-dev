// public/static/components/widget-mywork.js
class MyWorkWidget {
    constructor(element, userId) {
        this.element = element;
        this.userId = userId;
        this.data = {};
        this.init();
    }

    async init() {
        try {
            const response = await axios.get(`/api/home/my-work/${this.userId}`);
            this.data = response.data.categorizedTasks || {};
            this.render();
        } catch (error) {
            console.error("Erro ao carregar widget 'Meu Trabalho':", error);
            this.element.innerHTML = '<p class="text-sm text-red-500">Não foi possível carregar as tarefas.</p>';
        }
    }

    render() {
        const todayTasks = this.data.today || [];
        const upcomingTasks = this.data.upcoming || [];
        const overdueTasks = this.data.overdue || [];
        
        this.element.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-2">
                    <h2 class="font-semibold text-white cursor-move widget-drag-handle">Meu trabalho</h2>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="text-sm text-gray-200 bg-gray-700 px-3 py-1 rounded-md">Pendente</button>
                    <button class="text-sm text-gray-400 px-3 py-1 rounded-md hover:bg-gray-700">Feito</button>
                    <button class="text-sm text-gray-400 px-3 py-1 rounded-md hover:bg-gray-700">Delegado</button>
                </div>
            </div>
            <div class="widget-content">
                ${this.renderTaskSection('Hoje', todayTasks)}
                ${this.renderTaskSection('Em atraso', overdueTasks, true)}
                ${this.renderTaskSection('Próximo', upcomingTasks)}
            </div>
        `;
    }

    renderTaskSection(title, tasks, isOverdue = false) {
        if (tasks.length === 0) return '';
        const titleColor = isOverdue ? 'text-red-400' : 'text-gray-400';
        return `
            <div class="mb-4">
                <h3 class="text-sm font-bold ${titleColor} mb-2">${title} <span class="text-gray-500">${tasks.length}</span></h3>
                <ul class="space-y-2">
                    ${tasks.map(task => `
                        <li class="flex items-center text-sm p-1.5 rounded hover:bg-[var(--bg-header)] cursor-pointer">
                            <i class="far fa-circle text-gray-500 mr-3"></i>
                            <span class="text-gray-200 flex-grow">${task.name}</span>
                            <span class="text-xs text-gray-500 mr-3">${task.space_name}</span>
                            <span class="text-xs font-semibold px-2 py-0.5 rounded" style="background-color: ${task.space_color}30; color: ${task.space_color};">${task.list_name}</span>
                            <span class="text-xs w-24 text-right ${isOverdue ? 'text-red-400' : 'text-gray-400'}">${task.due_date}</span>
                            <i class="fas fa-ellipsis-v text-gray-600 ml-3"></i>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
}