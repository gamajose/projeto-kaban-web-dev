/**
 * ClickUp Clone - Workspace Page
 * Página de navegação hierárquica por workspaces, spaces, folders e listas
 */

class WorkspacePage {
    constructor(app) {
        this.app = app;
        this.currentView = 'overview'; // overview, space, folder, list
        this.selectedItems = new Set();
    }

    async load(params = {}) {
        console.log('🏢 Carregando página de workspace...', params);
        
        try {
            this.params = params;
            
            if (params.spaceId) {
                await this.loadSpace(params.spaceId);
            } else if (params.workspaceId) {
                await this.loadWorkspace(params.workspaceId);
            } else {
                await this.loadWorkspaceOverview();
            }
            
        } catch (error) {
            console.error('Erro ao carregar workspace:', error);
            this.app.notifications.error('Erro ao carregar workspace');
        }
    }

    async loadWorkspaceOverview() {
        console.log('📋 Carregando visão geral do workspace...');
        
        try {
            const workspace = this.app.currentWorkspace;
            if (!workspace) {
                throw new Error('Nenhum workspace selecionado');
            }

            // Load workspace details if not already loaded
            if (!workspace.spaces) {
                const workspaceData = await this.app.api.getWorkspace(workspace.id);
                this.app.currentWorkspace = workspaceData.workspace;
            }

            await this.renderWorkspaceOverview();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Erro ao carregar visão geral do workspace:', error);
            throw error;
        }
    }

    async loadSpace(spaceId) {
        console.log(`📁 Carregando space ${spaceId}...`);
        
        try {
            const spaceData = await this.app.api.getSpace(spaceId);
            this.app.currentSpace = spaceData.space;
            
            await this.renderSpaceView();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Erro ao carregar space:', error);
            throw error;
        }
    }

    async renderWorkspaceOverview() {
        const container = document.getElementById('workspace-page');
        if (!container) return;

        const workspace = this.app.currentWorkspace;
        const spaces = workspace.spaces || [];
        const members = workspace.members || [];

        container.innerHTML = `
            <div class="h-full bg-gray-50">
                <!-- Workspace Header -->
                <div class="bg-white border-b border-gray-200">
                    <div class="px-6 py-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center"
                                     style="background-color: ${workspace.color || '#7b68ee'}">
                                    <i class="fas fa-briefcase text-white text-xl"></i>
                                </div>
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900">${workspace.name}</h1>
                                    <p class="text-gray-600">${workspace.description || 'Workspace principal'}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <button class="btn-secondary" onclick="window.app.navigateToPage('dashboard')">
                                    <i class="fas fa-chart-pie mr-2"></i>
                                    Dashboard
                                </button>
                                <button id="new-space-btn" class="btn-primary">
                                    <i class="fas fa-plus mr-2"></i>
                                    Novo Space
                                </button>
                                <div class="relative">
                                    <button id="workspace-menu" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Workspace Stats -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="workspace-stat">
                                <div class="stat-icon bg-blue-100">
                                    <i class="fas fa-folder text-blue-600"></i>
                                </div>
                                <div>
                                    <div class="stat-value">${spaces.length}</div>
                                    <div class="stat-label">Spaces</div>
                                </div>
                            </div>
                            
                            <div class="workspace-stat">
                                <div class="stat-icon bg-green-100">
                                    <i class="fas fa-list text-green-600"></i>
                                </div>
                                <div>
                                    <div class="stat-value" id="total-lists">-</div>
                                    <div class="stat-label">Listas</div>
                                </div>
                            </div>
                            
                            <div class="workspace-stat">
                                <div class="stat-icon bg-purple-100">
                                    <i class="fas fa-tasks text-purple-600"></i>
                                </div>
                                <div>
                                    <div class="stat-value" id="total-tasks">-</div>
                                    <div class="stat-label">Tarefas</div>
                                </div>
                            </div>
                            
                            <div class="workspace-stat">
                                <div class="stat-icon bg-orange-100">
                                    <i class="fas fa-users text-orange-600"></i>
                                </div>
                                <div>
                                    <div class="stat-value">${members.length}</div>
                                    <div class="stat-label">Membros</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="px-6 py-6">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Spaces -->
                        <div class="lg:col-span-2">
                            <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <div class="px-6 py-4 border-b border-gray-200">
                                    <div class="flex items-center justify-between">
                                        <h2 class="text-lg font-semibold text-gray-900">Spaces</h2>
                                        <button id="new-space-btn-2" class="text-sm text-blue-600 hover:text-blue-800">
                                            <i class="fas fa-plus mr-1"></i>
                                            Novo Space
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="p-6">
                                    ${spaces.length === 0 ? `
                                        <div class="text-center py-8">
                                            <i class="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
                                            <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum Space ainda</h3>
                                            <p class="text-gray-600 mb-4">Crie seu primeiro space para organizar projetos</p>
                                            <button class="btn-primary" onclick="document.getElementById('new-space-btn').click()">
                                                <i class="fas fa-plus mr-2"></i>
                                                Criar Space
                                            </button>
                                        </div>
                                    ` : `
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="spaces-grid">
                                            ${spaces.map(space => this.renderSpaceCard(space)).join('')}
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar Info -->
                        <div class="space-y-6">
                            <!-- Team Members -->
                            <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <div class="px-6 py-4 border-b border-gray-200">
                                    <h3 class="text-lg font-semibold text-gray-900">Equipe</h3>
                                </div>
                                <div class="p-6">
                                    ${members.length === 0 ? `
                                        <div class="text-center py-4">
                                            <i class="fas fa-user-plus text-gray-400 text-2xl mb-2"></i>
                                            <p class="text-gray-600">Convide membros para a equipe</p>
                                        </div>
                                    ` : `
                                        <div class="space-y-3">
                                            ${members.slice(0, 6).map(member => `
                                                <div class="flex items-center space-x-3">
                                                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                        ${member.user_avatar ? 
                                                            `<img src="${member.user_avatar}" class="w-8 h-8 rounded-full" alt="${member.user_name}">` :
                                                            `<span class="text-sm font-medium text-gray-600">${member.user_name?.charAt(0)}</span>`
                                                        }
                                                    </div>
                                                    <div class="flex-1 min-w-0">
                                                        <div class="text-sm font-medium text-gray-900 truncate">${member.user_name}</div>
                                                        <div class="text-xs text-gray-500">${this.getRoleLabel(member.role)}</div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                            ${members.length > 6 ? `
                                                <div class="text-center pt-2">
                                                    <button class="text-sm text-blue-600 hover:text-blue-800">
                                                        +${members.length - 6} mais membros
                                                    </button>
                                                </div>
                                            ` : ''}
                                        </div>
                                    `}
                                </div>
                            </div>

                            <!-- Recent Activity -->
                            <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <div class="px-6 py-4 border-b border-gray-200">
                                    <h3 class="text-lg font-semibold text-gray-900">Atividade Recente</h3>
                                </div>
                                <div class="p-6">
                                    <div id="workspace-activity" class="space-y-3">
                                        <div class="text-center py-4">
                                            <i class="fas fa-spinner fa-spin text-gray-400"></i>
                                            <p class="text-gray-600 text-sm mt-2">Carregando...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load additional data
        this.loadWorkspaceStats();
        this.loadWorkspaceActivity();
    }

    async renderSpaceView() {
        const container = document.getElementById('workspace-page');
        if (!container) return;

        const space = this.app.currentSpace;
        const folders = space.folders || [];
        const lists = space.lists || [];

        container.innerHTML = `
            <div class="h-full bg-gray-50">
                <!-- Space Header -->
                <div class="bg-white border-b border-gray-200">
                    <div class="px-6 py-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <button onclick="window.app.navigateToPage('workspace')" 
                                        class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <i class="fas fa-arrow-left text-gray-600"></i>
                                </button>
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                                     style="background-color: ${space.color || '#0078d4'}">
                                    <i class="${space.icon || 'fas fa-folder'} text-white"></i>
                                </div>
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900">${space.name}</h1>
                                    <p class="text-gray-600">${space.description || ''}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <button id="new-folder-btn" class="btn-secondary">
                                    <i class="fas fa-folder-plus mr-2"></i>
                                    Nova Pasta
                                </button>
                                <button id="new-list-btn" class="btn-primary">
                                    <i class="fas fa-list mr-2"></i>
                                    Nova Lista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Space Content -->
                <div class="px-6 py-6">
                    ${folders.length === 0 && lists.length === 0 ? `
                        <div class="bg-white rounded-lg shadow border border-gray-200 p-12">
                            <div class="text-center">
                                <i class="fas fa-rocket text-6xl text-gray-300 mb-6"></i>
                                <h2 class="text-2xl font-bold text-gray-900 mb-4">Bem-vindo ao ${space.name}!</h2>
                                <p class="text-gray-600 mb-8 max-w-md mx-auto">
                                    Organize seu trabalho criando listas de tarefas ou pastas para agrupar projetos relacionados.
                                </p>
                                <div class="flex items-center justify-center space-x-4">
                                    <button class="btn-primary" onclick="document.getElementById('new-list-btn').click()">
                                        <i class="fas fa-list mr-2"></i>
                                        Criar Lista
                                    </button>
                                    <button class="btn-secondary" onclick="document.getElementById('new-folder-btn').click()">
                                        <i class="fas fa-folder mr-2"></i>
                                        Criar Pasta
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <!-- Folders Section -->
                        ${folders.length > 0 ? `
                            <div class="mb-8">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-folder mr-2 text-yellow-600"></i>
                                    Pastas
                                </h2>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    ${folders.map(folder => this.renderFolderCard(folder)).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Lists Section -->
                        <div>
                            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <i class="fas fa-list mr-2 text-blue-600"></i>
                                Listas
                                ${folders.length === 0 ? '' : ' (Diretas)'}
                            </h2>
                            ${lists.filter(list => !list.folder_id).length === 0 ? `
                                <div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    <i class="fas fa-list text-gray-400 text-3xl mb-4"></i>
                                    <p class="text-gray-600 mb-4">Nenhuma lista ainda</p>
                                    <button class="btn-primary" onclick="document.getElementById('new-list-btn').click()">
                                        <i class="fas fa-plus mr-2"></i>
                                        Criar primeira lista
                                    </button>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    ${lists.filter(list => !list.folder_id).map(list => this.renderListCard(list)).join('')}
                                </div>
                            `}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderSpaceCard(space) {
        return `
            <div class="space-card" data-space-id="${space.id}">
                <div class="p-6 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div class="flex items-start justify-between mb-4">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                             style="background-color: ${space.color || '#0078d4'}">
                            <i class="${space.icon || 'fas fa-folder'} text-white"></i>
                        </div>
                        <div class="relative">
                            <button class="space-menu-btn p-1 text-gray-400 hover:text-gray-600">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    
                    <h3 class="font-semibold text-gray-900 mb-2">${space.name}</h3>
                    <p class="text-sm text-gray-600 mb-4 line-clamp-2">${space.description || 'Sem descrição'}</p>
                    
                    <div class="flex items-center justify-between text-sm text-gray-500">
                        <div class="flex items-center space-x-4">
                            <span class="flex items-center">
                                <i class="fas fa-list mr-1"></i>
                                ${space.lists_count || 0} listas
                            </span>
                            <span class="flex items-center">
                                <i class="fas fa-tasks mr-1"></i>
                                ${space.tasks_count || 0} tarefas
                            </span>
                        </div>
                        <div class="flex -space-x-1">
                            <!-- Team avatars would go here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFolderCard(folder) {
        return `
            <div class="folder-card" data-folder-id="${folder.id}">
                <div class="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div class="flex items-start justify-between mb-3">
                        <div class="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <i class="fas fa-folder text-yellow-600"></i>
                        </div>
                        <button class="folder-menu-btn p-1 text-gray-400 hover:text-gray-600">
                            <i class="fas fa-ellipsis-v text-xs"></i>
                        </button>
                    </div>
                    
                    <h4 class="font-medium text-gray-900 mb-1">${folder.name}</h4>
                    <p class="text-xs text-gray-600 mb-3">${folder.description || 'Pasta'}</p>
                    
                    <div class="text-xs text-gray-500">
                        ${folder.lists_count || 0} listas
                    </div>
                </div>
            </div>
        `;
    }

    renderListCard(list) {
        return `
            <div class="list-card" data-list-id="${list.id}">
                <div class="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div class="flex items-start justify-between mb-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                             style="background-color: ${list.color || '#3b82f6'}">
                            <i class="fas fa-list text-white text-xs"></i>
                        </div>
                        <button class="list-menu-btn p-1 text-gray-400 hover:text-gray-600">
                            <i class="fas fa-ellipsis-v text-xs"></i>
                        </button>
                    </div>
                    
                    <h4 class="font-medium text-gray-900 mb-1">${list.name}</h4>
                    <p class="text-xs text-gray-600 mb-3">${list.description || 'Lista de tarefas'}</p>
                    
                    <div class="flex items-center justify-between text-xs text-gray-500">
                        <span>${list.tasks_count || 0} tarefas</span>
                        <div class="flex items-center space-x-2">
                            <button class="hover:text-gray-700" title="Visualização em Lista">
                                <i class="fas fa-list"></i>
                            </button>
                            <button class="hover:text-gray-700" title="Visualização em Board">
                                <i class="fas fa-columns"></i>
                            </button>
                            <button class="hover:text-gray-700" title="Calendário">
                                <i class="fas fa-calendar"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Space card clicks
        document.addEventListener('click', (e) => {
            const spaceCard = e.target.closest('.space-card');
            if (spaceCard && !e.target.closest('.space-menu-btn')) {
                const spaceId = parseInt(spaceCard.dataset.spaceId);
                this.app.selectSpace(spaceId);
            }

            // Folder card clicks
            const folderCard = e.target.closest('.folder-card');
            if (folderCard && !e.target.closest('.folder-menu-btn')) {
                const folderId = parseInt(folderCard.dataset.folderId);
                this.openFolder(folderId);
            }

            // List card clicks
            const listCard = e.target.closest('.list-card');
            if (listCard && !e.target.closest('.list-menu-btn')) {
                const listId = parseInt(listCard.dataset.listId);
                this.app.selectList(listId, 'list');
            }

            // New buttons
            if (e.target.closest('#new-space-btn') || e.target.closest('#new-space-btn-2')) {
                this.openNewSpaceModal();
            }

            if (e.target.closest('#new-folder-btn')) {
                this.openNewFolderModal();
            }

            if (e.target.closest('#new-list-btn')) {
                this.openNewListModal();
            }
        });

        // Context menus
        this.setupContextMenus();
    }

    setupContextMenus() {
        // Space context menu
        document.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.space-menu-btn');
            if (menuBtn) {
                e.preventDefault();
                e.stopPropagation();
                const spaceCard = menuBtn.closest('.space-card');
                const spaceId = parseInt(spaceCard.dataset.spaceId);
                this.showSpaceContextMenu(e, spaceId);
            }
        });
    }

    showSpaceContextMenu(event, spaceId) {
        // Implementation for context menu would go here
        console.log('Space context menu for:', spaceId);
    }

    openFolder(folderId) {
        console.log('Opening folder:', folderId);
        // Implementation for folder navigation would go here
        this.app.notifications.info('Navegação para pastas em desenvolvimento');
    }

    openNewSpaceModal() {
        console.log('Opening new space modal');
        this.app.notifications.info('Modal de criação de space em desenvolvimento');
    }

    openNewFolderModal() {
        console.log('Opening new folder modal');
        this.app.notifications.info('Modal de criação de pasta em desenvolvimento');
    }

    openNewListModal() {
        console.log('Opening new list modal');
        this.app.notifications.info('Modal de criação de lista em desenvolvimento');
    }

    getRoleLabel(role) {
        const roles = {
            'owner': 'Proprietário',
            'admin': 'Administrador',
            'member': 'Membro',
            'guest': 'Convidado'
        };
        return roles[role] || role;
    }

    async loadWorkspaceStats() {
        try {
            // Mock stats for now - replace with real API calls
            const stats = {
                totalLists: 15,
                totalTasks: 247
            };

            document.getElementById('total-lists').textContent = stats.totalLists;
            document.getElementById('total-tasks').textContent = stats.totalTasks;
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async loadWorkspaceActivity() {
        try {
            const data = await this.app.api.getDashboardActivity();
            this.renderWorkspaceActivity(data.activities || []);
        } catch (error) {
            console.error('Erro ao carregar atividade:', error);
            this.renderWorkspaceActivity([]);
        }
    }

    renderWorkspaceActivity(activities) {
        const container = document.getElementById('workspace-activity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-history text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-600">Nenhuma atividade recente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="flex items-start space-x-3">
                <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    ${activity.user_avatar ? 
                        `<img src="${activity.user_avatar}" class="w-6 h-6 rounded-full" alt="${activity.user_name}">` :
                        `<span class="text-xs text-gray-600">${activity.user_name?.charAt(0)}</span>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-800">
                        <span class="font-medium">${activity.user_name}</span>
                        ${this.getActivityMessage(activity)}
                    </p>
                    <p class="text-xs text-gray-500">${this.app.formatDate(activity.created_at, 'relative')}</p>
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

    destroy() {
        // Cleanup when leaving the page
        this.selectedItems.clear();
    }
}

// Add workspace-specific styles
const workspaceStyles = `
    .workspace-stat {
        @apply flex items-center space-x-3 p-4 bg-gray-50 rounded-lg;
    }
    
    .stat-icon {
        @apply w-10 h-10 rounded-lg flex items-center justify-center;
    }
    
    .stat-value {
        @apply text-xl font-bold text-gray-900;
    }
    
    .stat-label {
        @apply text-sm text-gray-600;
    }
    
    .space-card, .folder-card, .list-card {
        @apply transition-all duration-200;
    }
    
    .space-card:hover, .folder-card:hover, .list-card:hover {
        @apply transform -translate-y-1;
    }
    
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .btn-primary {
        @apply bg-clickup-purple text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center;
    }
    
    .btn-secondary {
        @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center;
    }
`;

// Add styles to head
const workspaceStyleSheet = document.createElement('style');
workspaceStyleSheet.textContent = workspaceStyles;
document.head.appendChild(workspaceStyleSheet);