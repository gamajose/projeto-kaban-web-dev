// public/static/components/widget-agenda.js
class AgendaWidget {
    constructor(element, userId) {
        this.element = element;
        this.userId = userId;
        this.items = [];
        this.currentDate = new Date();
        this.init();
    }

    async init() {
        try {
            const response = await axios.get(`/api/home/agenda/${this.userId}`);
            this.items = response.data.agenda_items;
            this.render();
        } catch (error) {
            console.error("Erro ao carregar widget 'Agenda':", error);
            this.element.innerHTML = '<p class="text-sm text-red-500">Não foi possível carregar a agenda.</p>';
        }
    }

    formatDate(date) {
        return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
    }

    render() {
        this.element.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-white cursor-move widget-drag-handle">Agenda</h2>
                <div class="flex items-center space-x-2 text-sm text-gray-400">
                    <span>${this.formatDate(this.currentDate)}</span>
                    <button class="hover:text-white"><i class="fas fa-chevron-left text-xs"></i></button>
                    <button class="hover:text-white"><i class="fas fa-chevron-right text-xs"></i></button>
                    <button class="text-xs hover:text-white">Hoje</button>
                </div>
            </div>
            <div class="widget-content">
                <ul class="space-y-2">
                    ${this.items.length > 0 ? this.items.map(item => `
                        <li class="flex items-center p-1.5 rounded hover:bg-[var(--bg-header)] cursor-pointer group">
                            <i class="far fa-check-circle text-gray-500 group-hover:text-purple-400 mr-3"></i>
                            <span class="text-gray-200 group-hover:text-white text-sm flex-grow">${item.name}</span>
                            <span class="text-xs text-gray-500">O dia todo</span>
                        </li>
                    `).join('') : '<p class="text-sm text-gray-500">Nenhum item na sua agenda para os próximos dias.</p>'}
                </ul>
            </div>
        `;
    }
}