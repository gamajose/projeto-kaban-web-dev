class AssignedToMeWidget {
    constructor(element, userId) {
        this.element = element;
        this.userId = userId;
        this.init();
    }
    
    async init() {
        try {
            const response = await axios.get(`/api/home/assigned-tasks/${this.userId}`);
            this.render(response.data.tasks);
        } catch (error) {
            this.element.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar tarefas.</p>';
        }
    }

    render(tasks = []) {
        this.element.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-white cursor-move widget-drag-handle">Atribuídas a mim</h2>
            </div>
            <ul class="space-y-2">
                ${tasks.length > 0 ? tasks.map(task => `
                    <li class="flex items-center p-1.5 rounded hover:bg-[var(--bg-header)]">
                        <i class="far fa-circle text-purple-400 mr-3"></i>
                        <span class="text-gray-200 text-sm flex-grow">${task.name}</span>
                        ${task.due_date ? `<span class="text-xs text-green-400">${new Date(task.due_date).toLocaleDateString('pt-BR')}</span>` : ''}
                    </li>
                `).join('') : '<p class="text-sm text-gray-500">Nenhuma tarefa atribuída.</p>'}
            </ul>
        `;
    }
}