/**
 * ClickUp Clone - Task Modal Component
 * Modal completo para visualizar e editar tarefas com todas as propriedades
 */

class TaskModal {
    constructor(app) {
        this.app = app;
        this.currentTask = null;
        this.isEditing = false;
        this.originalData = null;
        this.changesMade = false;
        this.commentText = '';
        this.timeTracker = null;
    }

    async open(taskId) {
        console.log(`📝 Abrindo modal da tarefa ${taskId}...`);
        
        try {
            await this.loadTask(taskId);
            this.render();
            this.setupEventListeners();
            this.show();
        } catch (error) {
            console.error('Erro ao abrir modal da tarefa:', error);
            this.app.notifications.error('Erro ao carregar tarefa');
        }
    }

    async loadTask(taskId) {
        try {
            const data = await this.app.api.getTask(taskId);
            this.currentTask = data.task;
            this.originalData = { ...this.currentTask };
            
            console.log('✅ Tarefa carregada:', this.currentTask.name);
            
        } catch (error) {
            console.error('Erro ao carregar tarefa:', error);
            throw error;
        }
    }

    render() {
        const modal = document.getElementById('task-modal');
        if (!modal) return;

        const task = this.currentTask;
        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

        modal.innerHTML = `
            <div class="task-modal-container">
                <!-- Modal Header -->
                <div class="task-modal-header">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 mr-4">
                            <div class="flex items-center space-x-3 mb-2">
                                <div class="w-3 h-3 rounded-full" 
                                     style="background-color: ${this.app.getPriorityColor(task.priority)}"></div>
                                <span class="text-sm text-gray-500">
                                    ${task.list_name || 'Lista'} • ID: ${task.id}
                                </span>
                            </div>
                            
                            <div class="task-name-section">
                                ${this.isEditing ? `
                                    <input type="text" 
                                           id="task-name-input" 
                                           value="${task.name}" 
                                           class="w-full text-xl font-bold text-gray-900 border-none p-0 focus:outline-none focus:ring-0"
                                           placeholder="Nome da tarefa...">
                                ` : `
                                    <h1 class="text-xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded" 
                                        onclick="this.parentElement.parentElement.parentElement.parentElement.querySelector('.edit-btn').click()">
                                        ${task.name}
                                    </h1>
                                `}
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            <button class="edit-btn p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100" 
                                    title="${this.isEditing ? 'Cancelar edição' : 'Editar tarefa'}">
                                <i class="fas ${this.isEditing ? 'fa-times' : 'fa-edit'}"></i>
                            </button>
                            
                            <button class="close-btn p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="task-modal-body">
                    <div class="grid grid-cols-3 gap-6">
                        <!-- Main Content -->
                        <div class="col-span-2 space-y-6">
                            <!-- Description -->
                            <div class="section">
                                <h3 class="section-title">Descrição</h3>
                                <div class="description-section">
                                    ${this.isEditing ? `
                                        <textarea id="task-description-input" 
                                                  class="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clickup-purple resize-none"
                                                  placeholder="Adicione uma descrição...">${task.description || ''}</textarea>
                                    ` : `
                                        <div class="min-h-16 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50" 
                                             onclick="document.querySelector('.edit-btn').click()">
                                            ${task.description ? 
                                                `<p class="text-gray-900 whitespace-pre-wrap">${task.description}</p>` :
                                                `<p class="text-gray-500 italic">Clique para adicionar uma descrição...</p>`
                                            }
                                        </div>
                                    `}
                                </div>
                            </div>

                            <!-- Subtasks -->
                            <div class="section">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="section-title">Subtarefas</h3>
                                    <button id="add-subtask-btn" class="btn-secondary-sm">
                                        <i class="fas fa-plus mr-1"></i>
                                        Adicionar
                                    </button>
                                </div>
                                
                                <div id="subtasks-list" class="space-y-2">
                                    ${this.renderSubtasks(task.subtasks || [])}
                                </div>
                            </div>

                            <!-- Comments -->
                            <div class="section">
                                <h3 class="section-title">Comentários (${task.comments?.length || 0})</h3>
                                
                                <!-- New Comment -->
                                <div class="comment-input-section mb-4">
                                    <div class="flex space-x-3">
                                        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                            <span class="text-sm text-gray-600">
                                                ${this.app.currentUser?.name?.charAt(0) || 'U'}
                                            </span>
                                        </div>
                                        <div class="flex-1">
                                            <textarea id="comment-textarea" 
                                                      placeholder="Adicionar um comentário..."
                                                      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clickup-purple resize-none"
                                                      rows="3"></textarea>
                                            <div class="mt-2 flex justify-end">
                                                <button id="add-comment-btn" class="btn-primary-sm" disabled>
                                                    Comentar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Comments List -->
                                <div id="comments-list" class="space-y-4">
                                    ${this.renderComments(task.comments || [])}
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="space-y-4">
                            <!-- Status -->
                            <div class="property-section">
                                <label class="property-label">Status</label>
                                ${this.isEditing ? `
                                    <select id="task-status-input" class="property-input">
                                        ${this.renderStatusOptions(task.status_id)}
                                    </select>
                                ` : `
                                    <div class="status-display" 
                                         style="background-color: ${task.status_color}20; color: ${task.status_color}; border-color: ${task.status_color}40">
                                        ${task.status_name || 'Sem status'}
                                    </div>
                                `}
                            </div>

                            <!-- Assignee -->
                            <div class="property-section">
                                <label class="property-label">Responsável</label>
                                ${this.isEditing ? `
                                    <select id="task-assignee-input" class="property-input">
                                        <option value="">Selecionar responsável...</option>
                                        ${this.renderAssigneeOptions(task.assignee_id)}
                                    </select>
                                ` : `
                                    ${task.assignee_name ? `
                                        <div class="assignee-display">
                                            <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                ${task.assignee_avatar ? 
                                                    `<img src="${task.assignee_avatar}" class="w-6 h-6 rounded-full" alt="${task.assignee_name}">` :
                                                    `<span class="text-xs text-gray-600">${task.assignee_name.charAt(0)}</span>`
                                                }
                                            </div>
                                            <span class="text-sm text-gray-900">${task.assignee_name}</span>
                                        </div>
                                    ` : `
                                        <div class="text-sm text-gray-500 cursor-pointer hover:text-gray-700" 
                                             onclick="document.querySelector('.edit-btn').click()">
                                            Não atribuída
                                        </div>
                                    `}
                                `}
                            </div>

                            <!-- Priority -->
                            <div class="property-section">
                                <label class="property-label">Prioridade</label>
                                ${this.isEditing ? `
                                    <select id="task-priority-input" class="property-input">
                                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baixa</option>
                                        <option value="normal" ${task.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
                                        <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgente</option>
                                    </select>
                                ` : `
                                    <div class="priority-display priority-${task.priority}">
                                        <i class="${this.app.getPriorityIcon(task.priority)}"></i>
                                        <span>${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                                    </div>
                                `}
                            </div>

                            <!-- Due Date -->
                            <div class="property-section">
                                <label class="property-label">Data de vencimento</label>
                                ${this.isEditing ? `
                                    <input type="datetime-local" 
                                           id="task-due-date-input" 
                                           value="${task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''}"
                                           class="property-input">
                                ` : `
                                    ${task.due_date ? `
                                        <div class="text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}">
                                            <div>${this.app.formatDate(task.due_date, 'medium')}</div>
                                            <div class="text-xs text-gray-500">
                                                ${this.app.formatDate(task.due_date, 'relative')}
                                                ${isOverdue ? ' (Atrasada)' : ''}
                                            </div>
                                        </div>
                                    ` : `
                                        <div class="text-sm text-gray-500 cursor-pointer hover:text-gray-700" 
                                             onclick="document.querySelector('.edit-btn').click()">
                                            Definir prazo
                                        </div>
                                    `}
                                `}
                            </div>

                            <!-- Progress -->
                            <div class="property-section">
                                <label class="property-label">Progresso</label>
                                ${this.isEditing ? `
                                    <div class="space-y-2">
                                        <input type="range" 
                                               id="task-progress-input" 
                                               min="0" max="100" 
                                               value="${task.progress || 0}"
                                               class="w-full">
                                        <div class="flex justify-between text-xs text-gray-500">
                                            <span>0%</span>
                                            <span id="progress-value">${task.progress || 0}%</span>
                                            <span>100%</span>
                                        </div>
                                    </div>
                                ` : `
                                    <div class="space-y-2">
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${task.progress || 0}%"></div>
                                        </div>
                                        <div class="text-xs text-gray-600">${task.progress || 0}% completo</div>
                                    </div>
                                `}
                            </div>

                            <!-- Time Tracking -->
                            <div class="property-section">
                                <div class="flex items-center justify-between mb-2">
                                    <label class="property-label">Tempo</label>
                                    <button id="time-tracker-btn" class="btn-secondary-sm">
                                        <i class="fas fa-play mr-1"></i>
                                        Iniciar
                                    </button>
                                </div>
                                
                                <div class="space-y-2">
                                    <div class="text-sm text-gray-600">
                                        Registrado: ${this.formatDuration(task.time_tracked || 0)}
                                    </div>
                                    ${task.estimated_time ? `
                                        <div class="text-sm text-gray-600">
                                            Estimado: ${this.formatDuration(task.estimated_time)}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Tags -->
                            <div class="property-section">
                                <label class="property-label">Tags</label>
                                <div id="task-tags" class="flex flex-wrap gap-1">
                                    ${this.renderTags(task.tags || [])}
                                </div>
                                ${this.isEditing ? `
                                    <button id="add-tag-btn" class="btn-secondary-sm mt-2">
                                        <i class="fas fa-plus mr-1"></i>
                                        Adicionar Tag
                                    </button>
                                ` : ''}
                            </div>

                            <!-- Activity -->
                            <div class="property-section">
                                <label class="property-label">Atividade</label>
                                <div id="task-activity" class="space-y-2 max-h-48 overflow-y-auto">
                                    ${this.renderActivity(task.activities || [])}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                ${this.isEditing ? `
                    <div class="task-modal-footer">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <button id="delete-task-btn" class="btn-danger">
                                    <i class="fas fa-trash mr-2"></i>
                                    Excluir Tarefa
                                </button>
                            </div>
                            
                            <div class="flex items-center space-x-3">
                                <button id="cancel-edit-btn" class="btn-secondary">
                                    Cancelar
                                </button>
                                <button id="save-task-btn" class="btn-primary">
                                    <i class="fas fa-save mr-2"></i>
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderSubtasks(subtasks) {
        if (!subtasks || subtasks.length === 0) {
            return `
                <div class="text-sm text-gray-500 text-center py-4">
                    Nenhuma subtarefa ainda
                </div>
            `;
        }

        return subtasks.map(subtask => `
            <div class="subtask-item" data-subtask-id="${subtask.id}">
                <div class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" 
                           ${subtask.status_id ? 'checked' : ''} 
                           class="subtask-checkbox rounded border-gray-300">
                    <span class="flex-1 text-sm ${subtask.status_id ? 'line-through text-gray-500' : 'text-gray-900'}">
                        ${subtask.name}
                    </span>
                    <button class="text-gray-400 hover:text-red-500">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderComments(comments) {
        if (!comments || comments.length === 0) {
            return `
                <div class="text-sm text-gray-500 text-center py-4">
                    Nenhum comentário ainda
                </div>
            `;
        }

        return comments.map(comment => `
            <div class="comment-item">
                <div class="flex space-x-3">
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        ${comment.user_avatar ? 
                            `<img src="${comment.user_avatar}" class="w-8 h-8 rounded-full" alt="${comment.user_name}">` :
                            `<span class="text-sm text-gray-600">${comment.user_name?.charAt(0) || 'U'}</span>`
                        }
                    </div>
                    <div class="flex-1">
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="text-sm font-medium text-gray-900">${comment.user_name}</span>
                                <span class="text-xs text-gray-500">${this.app.formatDate(comment.created_at, 'relative')}</span>
                            </div>
                            <p class="text-sm text-gray-700 whitespace-pre-wrap">${comment.content}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderStatusOptions(currentStatusId) {
        // Mock status options - replace with actual API call
        const statuses = [
            { id: 1, name: 'A Fazer', color: '#6b7280' },
            { id: 2, name: 'Em Progresso', color: '#3b82f6' },
            { id: 3, name: 'Em Revisão', color: '#f59e0b' },
            { id: 4, name: 'Concluído', color: '#10b981' }
        ];

        return statuses.map(status => 
            `<option value="${status.id}" ${status.id === currentStatusId ? 'selected' : ''}>
                ${status.name}
            </option>`
        ).join('');
    }

    renderAssigneeOptions(currentAssigneeId) {
        // Mock assignee options - replace with actual API call
        const users = [
            { id: 1, name: 'José Developer' },
            { id: 2, name: 'Alice Silva' },
            { id: 3, name: 'Bob Santos' }
        ];

        return users.map(user => 
            `<option value="${user.id}" ${user.id === currentAssigneeId ? 'selected' : ''}>
                ${user.name}
            </option>`
        ).join('');
    }

    renderTags(tags) {
        if (!tags || tags.length === 0) {
            return `<div class="text-sm text-gray-500">Nenhuma tag</div>`;
        }

        return tags.map(tag => `
            <span class="task-tag" style="background-color: ${tag.color}20; color: ${tag.color}">
                ${tag.name}
                ${this.isEditing ? `<button class="ml-1 hover:text-red-500"><i class="fas fa-times text-xs"></i></button>` : ''}
            </span>
        `).join('');
    }

    renderActivity(activities) {
        if (!activities || activities.length === 0) {
            return `
                <div class="text-sm text-gray-500 text-center py-2">
                    Nenhuma atividade
                </div>
            `;
        }

        return activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="flex items-start space-x-2">
                    <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span class="text-xs text-gray-600">${activity.user_name?.charAt(0) || 'U'}</span>
                    </div>
                    <div class="flex-1">
                        <p class="text-xs text-gray-700">
                            <span class="font-medium">${activity.user_name}</span>
                            ${this.getActivityMessage(activity)}
                        </p>
                        <p class="text-xs text-gray-500">${this.app.formatDate(activity.created_at, 'relative')}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Edit button
        document.querySelector('.edit-btn')?.addEventListener('click', () => {
            this.toggleEditMode();
        });

        // Close button
        document.querySelector('.close-btn')?.addEventListener('click', () => {
            this.close();
        });

        // Save button (only in edit mode)
        document.getElementById('save-task-btn')?.addEventListener('click', () => {
            this.saveTask();
        });

        // Cancel edit button
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            this.cancelEdit();
        });

        // Delete button
        document.getElementById('delete-task-btn')?.addEventListener('click', () => {
            this.deleteTask();
        });

        // Comment functionality
        const commentTextarea = document.getElementById('comment-textarea');
        const addCommentBtn = document.getElementById('add-comment-btn');
        
        if (commentTextarea) {
            commentTextarea.addEventListener('input', (e) => {
                this.commentText = e.target.value.trim();
                if (addCommentBtn) {
                    addCommentBtn.disabled = !this.commentText;
                }
            });
        }

        if (addCommentBtn) {
            addCommentBtn.addEventListener('click', () => {
                this.addComment();
            });
        }

        // Progress slider (in edit mode)
        const progressInput = document.getElementById('task-progress-input');
        if (progressInput) {
            progressInput.addEventListener('input', (e) => {
                document.getElementById('progress-value').textContent = e.target.value + '%';
            });
        }

        // Time tracker
        document.getElementById('time-tracker-btn')?.addEventListener('click', () => {
            this.toggleTimeTracker();
        });

        // Add subtask
        document.getElementById('add-subtask-btn')?.addEventListener('click', () => {
            this.addSubtask();
        });

        // Add tag
        document.getElementById('add-tag-btn')?.addEventListener('click', () => {
            this.addTag();
        });

        // Form change detection
        if (this.isEditing) {
            this.setupChangeDetection();
        }
    }

    setupChangeDetection() {
        const inputs = document.querySelectorAll('#task-modal input, #task-modal select, #task-modal textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.changesMade = true;
            });
        });
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        this.render();
        this.setupEventListeners();

        if (this.isEditing) {
            // Focus on task name input
            const nameInput = document.getElementById('task-name-input');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }
    }

    async saveTask() {
        try {
            const taskData = this.getTaskDataFromForm();
            
            console.log('💾 Salvando tarefa...', taskData);
            
            const updatedTask = await this.app.api.updateTask(this.currentTask.id, taskData);
            
            this.currentTask = { ...this.currentTask, ...updatedTask.task };
            this.originalData = { ...this.currentTask };
            this.changesMade = false;
            this.isEditing = false;
            
            this.render();
            this.setupEventListeners();
            
            this.app.notifications.success('Tarefa atualizada com sucesso');
            
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
            this.app.notifications.error('Erro ao salvar tarefa');
        }
    }

    getTaskDataFromForm() {
        return {
            name: document.getElementById('task-name-input')?.value || this.currentTask.name,
            description: document.getElementById('task-description-input')?.value || '',
            status_id: document.getElementById('task-status-input')?.value || this.currentTask.status_id,
            assignee_id: document.getElementById('task-assignee-input')?.value || null,
            priority: document.getElementById('task-priority-input')?.value || this.currentTask.priority,
            due_date: document.getElementById('task-due-date-input')?.value || null,
            progress: document.getElementById('task-progress-input')?.value || 0
        };
    }

    cancelEdit() {
        if (this.changesMade) {
            if (confirm('Você tem alterações não salvas. Deseja descartar?')) {
                this.isEditing = false;
                this.changesMade = false;
                this.render();
                this.setupEventListeners();
            }
        } else {
            this.isEditing = false;
            this.render();
            this.setupEventListeners();
        }
    }

    async deleteTask() {
        if (confirm(`Tem certeza que deseja excluir a tarefa "${this.currentTask.name}"?`)) {
            try {
                await this.app.api.deleteTask(this.currentTask.id);
                this.app.notifications.success('Tarefa excluída com sucesso');
                this.close();
                
                // Refresh current page
                window.location.reload();
                
            } catch (error) {
                console.error('Erro ao excluir tarefa:', error);
                this.app.notifications.error('Erro ao excluir tarefa');
            }
        }
    }

    async addComment() {
        if (!this.commentText) return;

        try {
            const commentData = {
                content: this.commentText,
                user_id: this.app.currentUser?.id || 1
            };

            await this.app.api.createTaskComment(this.currentTask.id, commentData);
            
            // Reload task to get updated comments
            await this.loadTask(this.currentTask.id);
            this.render();
            this.setupEventListeners();
            
            this.app.notifications.success('Comentário adicionado');
            
        } catch (error) {
            console.error('Erro ao adicionar comentário:', error);
            this.app.notifications.error('Erro ao adicionar comentário');
        }
    }

    toggleTimeTracker() {
        // Implementation for time tracking
        console.log('Toggle time tracker');
        this.app.notifications.info('Controle de tempo em desenvolvimento');
    }

    addSubtask() {
        const name = prompt('Nome da subtarefa:');
        if (name && name.trim()) {
            console.log('Add subtask:', name);
            this.app.notifications.info('Criação de subtarefa em desenvolvimento');
        }
    }

    addTag() {
        const name = prompt('Nome da tag:');
        if (name && name.trim()) {
            console.log('Add tag:', name);
            this.app.notifications.info('Criação de tag em desenvolvimento');
        }
    }

    getActivityMessage(activity) {
        const messages = {
            'created': 'criou esta tarefa',
            'assigned': 'foi atribuído à tarefa',
            'status_changed': 'mudou o status',
            'completed': 'marcou como concluída',
            'commented': 'adicionou um comentário'
        };
        
        return messages[activity.action_type] || activity.action_type;
    }

    formatDuration(seconds) {
        if (!seconds) return '0h';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    show() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    close() {
        if (this.changesMade && this.isEditing) {
            if (!confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
                return;
            }
        }

        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }

        // Reset state
        this.currentTask = null;
        this.isEditing = false;
        this.changesMade = false;
        this.commentText = '';
    }
}

// Add task modal styles
const taskModalStyles = `
    .task-modal-container {
        @apply max-w-6xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl;
    }
    
    .task-modal-header {
        @apply px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10;
    }
    
    .task-modal-body {
        @apply px-6 py-6;
    }
    
    .task-modal-footer {
        @apply px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0;
    }
    
    .section {
        @apply space-y-3;
    }
    
    .section-title {
        @apply text-lg font-semibold text-gray-900;
    }
    
    .property-section {
        @apply space-y-2;
    }
    
    .property-label {
        @apply block text-sm font-medium text-gray-700;
    }
    
    .property-input {
        @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clickup-purple;
    }
    
    .status-display {
        @apply inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border;
    }
    
    .assignee-display {
        @apply flex items-center space-x-2 p-2 bg-gray-50 rounded-lg;
    }
    
    .priority-display {
        @apply flex items-center space-x-2 text-sm font-medium;
    }
    
    .priority-display.priority-urgent {
        @apply text-red-600;
    }
    
    .priority-display.priority-high {
        @apply text-orange-600;
    }
    
    .priority-display.priority-normal {
        @apply text-blue-600;
    }
    
    .priority-display.priority-low {
        @apply text-gray-600;
    }
    
    .task-tag {
        @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium;
    }
    
    .btn-primary {
        @apply bg-clickup-purple text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-flex items-center;
    }
    
    .btn-secondary {
        @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center;
    }
    
    .btn-primary-sm {
        @apply bg-clickup-purple text-white px-3 py-1.5 text-sm rounded-md hover:bg-opacity-90 transition-colors;
    }
    
    .btn-secondary-sm {
        @apply bg-gray-100 text-gray-700 px-3 py-1.5 text-sm rounded-md hover:bg-gray-200 transition-colors inline-flex items-center;
    }
    
    .btn-danger {
        @apply bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center;
    }
    
    .subtask-item, .comment-item, .activity-item {
        @apply transition-colors;
    }
`;

// Add styles to head
const taskModalStyleSheet = document.createElement('style');
taskModalStyleSheet.textContent = taskModalStyles;
document.head.appendChild(taskModalStyleSheet);