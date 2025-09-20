// public/static/components/widget-recent.js
class RecentWidget {
    constructor(element, userId) {
        this.element = element;
        this.userId = userId;
        this.items = [];
        this.init();
    }

    async init() {
        try {
            const response = await axios.get(`/api/home/recent/${this.userId}`);
            this.items = response.data.recent_items;
            this.render();
        } catch (error) {
            console.error("Erro ao carregar widget 'Recentes':", error);
            this.element.innerHTML = '<p class="text-sm text-red-500">Não foi possível carregar os itens recentes.</p>';
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-white cursor-move widget-drag-handle">Recentes</h2>
                <button class="text-gray-400 hover:text-white"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <div class="widget-content">
                <ul class="space-y-3">
                    ${this.items.length > 0 ? this.items.map(item => `
                        <li class="flex items-center text-sm cursor-pointer group">
                            <i class="fas fa-history text-gray-500 w-5 text-center mr-3"></i>
                            <span class="text-gray-200 group-hover:text-white truncate">${item.task_name}</span>
                            <span class="text-gray-600 mx-2">•</span>
                            <span class="text-gray-500 flex-shrink-0">${item.space_name}</span>
                        </li>
                    `).join('') : '<p class="text-sm text-gray-500">Nenhuma atividade recente encontrada.</p>'}
                </ul>
            </div>
        `;
    }
}