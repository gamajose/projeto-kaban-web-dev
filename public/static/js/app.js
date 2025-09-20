/**
 * ClickUp Clone - Main Application Controller
 * Gerencia navegação, estado global e inicialização da aplicação
 */

class ClickUpApp {
    constructor() {
        this.currentUser = null;
        this.currentWorkspace = null;
        this.currentSpace = null;
        this.currentList = null;
        this.currentPage = 'home';
        this.sidebarCollapsed = false;
        
        this.api = new ClickUpAPI();
        this.auth = new AuthService();
        this.notifications = new NotificationManager();
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando ClickUp Clone...');
        
        // Initialize dayjs plugins
        dayjs.extend(dayjs_plugin_relativeTime);
        dayjs.extend(dayjs_plugin_calendar);
        
        try {
            // Load initial data
            await this.loadInitialData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize pages
            this.initializePages();
            
            // Load initial page
            await this.navigateToPage('home');
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            console.log('✅ ClickUp Clone iniciado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação:', error);
            this.notifications.error('Erro ao carregar aplicação');
        }
    }

    async loadInitialData() {
        console.log('📊 Carregando dados iniciais...');
        
        try {
            // Load user data
            const userData = await this.api.get('/users/1'); // Mock user ID
            this.currentUser = userData.user;
            
            // Load workspaces
            const workspacesData = await this.api.get('/workspaces');
            this.workspaces = workspacesData.workspaces;
            
            // Set current workspace (first one)
            if (this.workspaces.length > 0) {
                this.currentWorkspace = this.workspaces[0];
                const workspaceDetails = await this.api.get(`/workspaces/${this.currentWorkspace.id}`);
                this.currentWorkspace = workspaceDetails.workspace;
            }
            
            // Update UI
            this.updateUserProfile();
            this.renderWorkspaces();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            // Use mock data as fallback
            this.loadMockData();
        }
    }

    loadMockData() {
        console.log('🎭 Carregando dados mock...');
        
        this.currentUser = {
            id: 1,
            name: 'José Developer',
            email: 'jose@clickupclone.com',
            avatar_url: null,
            timezone: 'America/Sao_Paulo'
        };

        this.workspaces = [{
            id: 1,
            name: 'Acme Corporation',
            description: 'Workspace principal da empresa',
            color: '#7b68ee',
            spaces: [
                {
                    id: 1,
                    name: 'Marketing',
                    description: 'Projetos de marketing',
                    color: '#ff6b35',
                    icon: 'fas fa-bullhorn'
                },
                {
                    id: 2,
                    name: 'Desenvolvimento',
                    description: 'Projetos de desenvolvimento',
                    color: '#0078d4',
                    icon: 'fas fa-code'
                },
                {
                    id: 3,
                    name: 'Suporte',
                    description: 'Atendimento ao cliente',
                    color: '#00d084',
                    icon: 'fas fa-headset'
                }
            ]
        }];

        this.currentWorkspace = this.workspaces[0];
        this.updateUserProfile();
        this.renderWorkspaces();
    }

    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.dataset.page) {
                e.preventDefault();
                this.navigateToPage(navItem.dataset.page);
            }
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // New task button
        const newTaskBtn = document.getElementById('new-task-btn');
        if (newTaskBtn) {
            newTaskBtn.addEventListener('click', () => this.openNewTaskModal());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+K for search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input[placeholder="Pesquisar..."]').focus();
            }
            
            // Ctrl+N for new task
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openNewTaskModal();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Modal overlay clicks
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.closeAllModals();
            }
        });
    }

    initializePages() {
        // Initialize page controllers
        this.pages = {
            home: new HomePage(this),
            dashboard: new DashboardPage(this),
            workspace: new WorkspacePage(this),
            list: new ListViewPage(this),
            board: new BoardViewPage(this),
            calendar: new CalendarViewPage(this)
        };
    }

    async navigateToPage(pageName, params = {}) {
        console.log(`🧭 Navegando para: ${pageName}`, params);
        
        try {
            // Hide current page
            document.querySelectorAll('.page-content').forEach(page => {
                page.classList.remove('active');
            });
            
            // Update nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
            if (activeNavItem) {
                activeNavItem.classList.add('active');
            }
            
            // Show new page
            const pageElement = document.getElementById(`${pageName}-page`);
            if (pageElement) {
                pageElement.classList.add('active');
            }
            
            // Load page content
            if (this.pages[pageName]) {
                await this.pages[pageName].load(params);
            }
            
            this.currentPage = pageName;
            this.updateBreadcrumb();
            
        } catch (error) {
            console.error(`Erro ao navegar para ${pageName}:`, error);
            this.notifications.error(`Erro ao carregar página: ${pageName}`);
        }
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        let breadcrumbItems = [];
        
        switch (this.currentPage) {
            case 'home':
                breadcrumbItems = [
                    { text: 'Início', icon: 'fas fa-home' }
                ];
                break;
                
            case 'dashboard':
                breadcrumbItems = [
                    { text: 'Dashboard', icon: 'fas fa-chart-pie' }
                ];
                break;
                
            case 'workspace':
                breadcrumbItems = [
                    { text: this.currentWorkspace?.name || 'Workspace', icon: 'fas fa-briefcase' }
                ];
                if (this.currentSpace) {
                    breadcrumbItems.push({ text: this.currentSpace.name, icon: 'fas fa-folder' });
                }
                break;
                
            case 'list':
                breadcrumbItems = [
                    { text: this.currentWorkspace?.name || 'Workspace', icon: 'fas fa-briefcase' },
                    { text: this.currentSpace?.name || 'Space', icon: 'fas fa-folder' },
                    { text: this.currentList?.name || 'Lista', icon: 'fas fa-list' }
                ];
                break;
        }
        
        breadcrumb.innerHTML = breadcrumbItems.map((item, index) => `
            ${index > 0 ? '<i class="fas fa-chevron-right text-gray-400 text-xs"></i>' : ''}
            <div class="flex items-center space-x-1 text-gray-600">
                <i class="${item.icon} text-xs"></i>
                <span class="text-sm">${item.text}</span>
            </div>
        `).join('');
    }

    updateUserProfile() {
        const userProfile = document.getElementById('user-profile');
        if (!userProfile || !this.currentUser) return;

        const initials = this.currentUser.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        userProfile.innerHTML = `
            <div class="w-8 h-8 bg-clickup-blue rounded-full flex items-center justify-center">
                ${this.currentUser.avatar_url ? 
                    `<img src="${this.currentUser.avatar_url}" class="w-8 h-8 rounded-full" alt="${this.currentUser.name}">` :
                    `<span class="text-xs font-medium text-white">${initials}</span>`
                }
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">${this.currentUser.name}</div>
                <div class="text-xs text-gray-300 truncate">
                    Workspace: ${this.currentWorkspace?.name || 'Carregando...'}
                </div>
            </div>
        `;
    }

    renderWorkspaces() {
        const workspacesNav = document.getElementById('workspaces-nav');
        if (!workspacesNav) return;

        const workspacesList = this.workspaces.map(workspace => `
            <div class="workspace-item ${workspace.id === this.currentWorkspace?.id ? 'bg-clickup-hover text-white' : ''}" 
                 data-workspace-id="${workspace.id}">
                <div class="w-4 h-4 rounded-sm" style="background-color: ${workspace.color || '#7b68ee'}"></div>
                <span class="flex-1 truncate">${workspace.name}</span>
                <i class="fas fa-chevron-right text-xs"></i>
            </div>
        `).join('');

        workspacesNav.innerHTML = `
            <div class="flex items-center justify-between px-3 py-1">
                <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Workspaces</div>
                <button class="text-gray-400 hover:text-white">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>
            ${workspacesList}
        `;

        // Add workspace click handlers
        workspacesNav.addEventListener('click', (e) => {
            const workspaceItem = e.target.closest('.workspace-item');
            if (workspaceItem) {
                const workspaceId = parseInt(workspaceItem.dataset.workspaceId);
                this.selectWorkspace(workspaceId);
            }
        });

        // Render current workspace details
        this.renderCurrentWorkspace();
    }

    renderCurrentWorkspace() {
        const currentWorkspaceEl = document.getElementById('current-workspace');
        if (!currentWorkspaceEl || !this.currentWorkspace) return;

        const spaces = this.currentWorkspace.spaces || [];
        
        currentWorkspaceEl.innerHTML = `
            <div class="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                ${this.currentWorkspace.name}
            </div>
            ${spaces.map(space => `
                <div class="space-item" data-space-id="${space.id}">
                    <i class="${space.icon || 'fas fa-folder'}" style="color: ${space.color}"></i>
                    <span class="flex-1 truncate">${space.name}</span>
                    <i class="fas fa-chevron-right text-xs"></i>
                </div>
            `).join('')}
        `;

        // Add space click handlers
        currentWorkspaceEl.addEventListener('click', (e) => {
            const spaceItem = e.target.closest('.space-item');
            if (spaceItem) {
                const spaceId = parseInt(spaceItem.dataset.spaceId);
                this.selectSpace(spaceId);
            }
        });
    }

    async selectWorkspace(workspaceId) {
        try {
            const workspaceData = await this.api.get(`/workspaces/${workspaceId}`);
            this.currentWorkspace = workspaceData.workspace;
            this.currentSpace = null;
            this.currentList = null;
            
            this.updateUserProfile();
            this.renderWorkspaces();
            
            await this.navigateToPage('workspace', { workspaceId });
            
        } catch (error) {
            console.error('Erro ao selecionar workspace:', error);
            this.notifications.error('Erro ao carregar workspace');
        }
    }

    async selectSpace(spaceId) {
        try {
            const spaceData = await this.api.get(`/spaces/${spaceId}`);
            this.currentSpace = spaceData.space;
            this.currentList = null;
            
            await this.navigateToPage('workspace', { spaceId });
            
        } catch (error) {
            console.error('Erro ao selecionar space:', error);
            this.notifications.error('Erro ao carregar space');
        }
    }

    async selectList(listId, viewType = 'list') {
        try {
            const listData = await this.api.get(`/lists/${listId}`);
            this.currentList = listData.list;
            
            await this.navigateToPage(viewType, { listId });
            
        } catch (error) {
            console.error('Erro ao selecionar lista:', error);
            this.notifications.error('Erro ao carregar lista');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const icon = document.querySelector('#sidebar-toggle i');
        
        this.sidebarCollapsed = !this.sidebarCollapsed;
        
        if (this.sidebarCollapsed) {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-16');
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        } else {
            sidebar.classList.remove('w-16');
            sidebar.classList.add('w-64');
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        }
    }

    openNewTaskModal() {
        const modal = document.getElementById('new-task-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            // Initialize new task modal if not already done
            if (!this.newTaskModal) {
                this.newTaskModal = new NewTaskModal(this);
            }
            
            this.newTaskModal.open();
            overlay.classList.add('active');
        }
    }

    openTaskModal(taskId) {
        const modal = document.getElementById('task-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            // Initialize task modal if not already done
            if (!this.taskModal) {
                this.taskModal = new TaskModal(this);
            }
            
            this.taskModal.open(taskId);
            overlay.classList.add('active');
        }
    }

    closeAllModals() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen && app) {
            loadingScreen.classList.add('hidden');
            app.classList.remove('hidden');
        }
    }

    // Utility methods
    formatDate(date, format = 'relative') {
        if (!date) return '';
        
        const d = dayjs(date);
        
        switch (format) {
            case 'relative':
                return d.fromNow();
            case 'calendar':
                return d.calendar();
            case 'short':
                return d.format('DD/MM');
            case 'full':
                return d.format('DD/MM/YYYY HH:mm');
            default:
                return d.format(format);
        }
    }

    getPriorityColor(priority) {
        const colors = {
            urgent: '#ff4757',
            high: '#ff6b35',
            normal: '#0078d4',
            low: '#7c7c7c'
        };
        return colors[priority] || colors.normal;
    }

    getPriorityIcon(priority) {
        const icons = {
            urgent: 'fas fa-exclamation-triangle',
            high: 'fas fa-arrow-up',
            normal: 'fas fa-minus',
            low: 'fas fa-arrow-down'
        };
        return icons[priority] || icons.normal;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClickUpApp();
});

// Global utilities
window.utils = {
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    sanitizeHtml: function(text) {
        const temp = document.createElement('div');
        temp.textContent = text;
        return temp.innerHTML;
    }
};