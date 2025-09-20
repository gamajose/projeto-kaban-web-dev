/**
 * ClickUp Clone - Notification Manager
 * Sistema de notificações toast estilo ClickUp
 */

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications');
        this.notifications = new Map();
        this.defaultTimeout = 5000;
        this.maxNotifications = 5;
        
        if (!this.container) {
            this.createContainer();
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notifications';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', options = {}) {
        const id = utils.generateId();
        const timeout = options.timeout !== undefined ? options.timeout : this.defaultTimeout;
        const persistent = options.persistent || false;
        const actions = options.actions || [];

        // Remove old notifications if we have too many
        this.cleanupOldNotifications();

        const notification = this.createNotification(id, message, type, actions, persistent);
        this.container.appendChild(notification);
        this.notifications.set(id, { element: notification, timeout: null });

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        });

        // Auto-remove after timeout
        if (!persistent && timeout > 0) {
            const timeoutId = setTimeout(() => {
                this.remove(id);
            }, timeout);
            this.notifications.get(id).timeout = timeoutId;
        }

        return id;
    }

    createNotification(id, message, type, actions, persistent) {
        const notification = document.createElement('div');
        notification.className = `
            transform translate-x-full transition-all duration-300 ease-out
            max-w-sm w-full bg-white rounded-lg shadow-lg border border-gray-200
            pointer-events-auto overflow-hidden
        `;
        notification.dataset.id = id;

        const typeConfig = this.getTypeConfig(type);
        
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center ${typeConfig.bgColor}">
                            <i class="${typeConfig.icon} text-sm ${typeConfig.textColor}"></i>
                        </div>
                    </div>
                    
                    <div class="ml-3 w-0 flex-1">
                        <p class="text-sm font-medium text-gray-900">
                            ${utils.sanitizeHtml(message)}
                        </p>
                        
                        ${actions.length > 0 ? `
                            <div class="mt-3 flex space-x-2">
                                ${actions.map(action => `
                                    <button class="btn-action text-xs px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                                            data-action="${action.id}">
                                        ${action.label}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${!persistent ? `
                        <div class="ml-4 flex-shrink-0 flex">
                            <button class="btn-close text-gray-400 hover:text-gray-600 transition-colors">
                                <i class="fas fa-times text-sm"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                ${!persistent && this.defaultTimeout > 0 ? `
                    <div class="mt-2">
                        <div class="w-full bg-gray-200 rounded-full h-1">
                            <div class="progress-bar h-1 rounded-full ${typeConfig.progressColor}" 
                                 style="width: 100%; animation: notification-progress ${this.defaultTimeout}ms linear forwards;"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Add event listeners
        const closeBtn = notification.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(id));
        }

        // Add action handlers
        const actionBtns = notification.querySelectorAll('.btn-action');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionId = e.target.dataset.action;
                const action = actions.find(a => a.id === actionId);
                if (action && action.handler) {
                    action.handler();
                    if (action.autoClose !== false) {
                        this.remove(id);
                    }
                }
            });
        });

        return notification;
    }

    getTypeConfig(type) {
        const configs = {
            success: {
                icon: 'fas fa-check',
                bgColor: 'bg-green-100',
                textColor: 'text-green-600',
                progressColor: 'bg-green-500'
            },
            error: {
                icon: 'fas fa-times',
                bgColor: 'bg-red-100',
                textColor: 'text-red-600',
                progressColor: 'bg-red-500'
            },
            warning: {
                icon: 'fas fa-exclamation-triangle',
                bgColor: 'bg-yellow-100',
                textColor: 'text-yellow-600',
                progressColor: 'bg-yellow-500'
            },
            info: {
                icon: 'fas fa-info',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-600',
                progressColor: 'bg-blue-500'
            }
        };
        
        return configs[type] || configs.info;
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Clear timeout
        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }

        // Animate out
        notification.element.classList.remove('translate-x-0');
        notification.element.classList.add('translate-x-full');

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    cleanupOldNotifications() {
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }
    }

    clear() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { timeout: 8000, ...options });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Task-specific notifications
    taskCreated(taskName) {
        return this.success(`Tarefa "${taskName}" criada com sucesso`, {
            actions: [
                {
                    id: 'view',
                    label: 'Ver Tarefa',
                    handler: () => {
                        // Navigate to task
                        console.log('Navigate to task');
                    }
                }
            ]
        });
    }

    taskUpdated(taskName) {
        return this.success(`Tarefa "${taskName}" atualizada`);
    }

    taskDeleted(taskName) {
        return this.info(`Tarefa "${taskName}" foi removida`, {
            actions: [
                {
                    id: 'undo',
                    label: 'Desfazer',
                    handler: () => {
                        // Undo action
                        console.log('Undo delete');
                    }
                }
            ]
        });
    }

    taskAssigned(taskName, assigneeName) {
        return this.info(`Tarefa "${taskName}" atribuída para ${assigneeName}`);
    }

    taskCompleted(taskName) {
        return this.success(`Tarefa "${taskName}" concluída! 🎉`);
    }

    connectionError() {
        return this.error('Erro de conexão. Verificando...', {
            persistent: true,
            actions: [
                {
                    id: 'retry',
                    label: 'Tentar Novamente',
                    handler: () => {
                        window.location.reload();
                    }
                }
            ]
        });
    }

    saveInProgress(message = 'Salvando...') {
        return this.info(message, { 
            persistent: true,
            timeout: 0
        });
    }

    bulkActionCompleted(count, action) {
        const actionText = {
            'update': 'atualizadas',
            'delete': 'removidas',
            'assign': 'atribuídas',
            'complete': 'concluídas'
        };
        
        return this.success(`${count} tarefas ${actionText[action] || action}`);
    }

    fileUploaded(filename) {
        return this.success(`Arquivo "${filename}" enviado com sucesso`);
    }

    inviteSent(email) {
        return this.success(`Convite enviado para ${email}`);
    }

    automationTriggered(automationName) {
        return this.info(`Automação "${automationName}" executada`);
    }
}

// Add CSS animation for progress bar
const style = document.createElement('style');
style.textContent = `
    @keyframes notification-progress {
        from { width: 100%; }
        to { width: 0%; }
    }
    
    .notification-enter {
        transform: translateX(100%);
    }
    
    .notification-enter-active {
        transform: translateX(0);
        transition: transform 300ms ease-out;
    }
    
    .notification-exit {
        transform: translateX(0);
    }
    
    .notification-exit-active {
        transform: translateX(100%);
        transition: transform 300ms ease-out;
    }
`;
document.head.appendChild(style);

// Global keyboard shortcut for clearing notifications
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        if (window.app && window.app.notifications) {
            window.app.notifications.clear();
        }
    }
});