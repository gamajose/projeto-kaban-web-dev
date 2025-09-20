/**
 * ClickUp Clone - API Client
 * Gerencia todas as comunicações com o backend
 */

class ClickUpAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('auth_token');
        this.retryCount = 3;
        this.retryDelay = 1000;
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    // Get headers for requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Retry mechanism for failed requests
    async withRetry(fn, retries = this.retryCount) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                console.warn(`Request failed, retrying... (${retries} attempts left)`, error);
                await this.delay(this.retryDelay);
                return this.withRetry(fn, retries - 1);
            }
            throw error;
        }
    }

    // Check if error should trigger a retry
    shouldRetry(error) {
        return error.status >= 500 || error.status === 0;
    }

    // Delay utility for retries
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generic request method
    async request(method, endpoint, data = null) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: method.toUpperCase(),
            headers: this.getHeaders()
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
            config.body = JSON.stringify(data);
        }

        return this.withRetry(async () => {
            console.log(`🌐 ${config.method} ${url}`, data || '');
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.response = response;
                
                // Try to get error message from response
                try {
                    const errorData = await response.json();
                    error.message = errorData.error || error.message;
                    error.data = errorData;
                } catch (e) {
                    // Response is not JSON, use status text
                }
                
                throw error;
            }

            const result = await response.json();
            console.log(`✅ ${config.method} ${url} - Success`, result);
            return result;
        });
    }

    // HTTP methods
    async get(endpoint) {
        return this.request('GET', endpoint);
    }

    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    async patch(endpoint, data) {
        return this.request('PATCH', endpoint, data);
    }

    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    // Specific API endpoints

    // Health check
    async healthCheck() {
        return this.get('/health');
    }

    // Users
    async getUsers() {
        return this.get('/users');
    }

    async getUser(userId) {
        return this.get(`/users/${userId}`);
    }

    async updateUser(userId, data) {
        return this.put(`/users/${userId}`, data);
    }

    // Workspaces
    async getWorkspaces() {
        return this.get('/workspaces');
    }

    async getWorkspace(workspaceId) {
        return this.get(`/workspaces/${workspaceId}`);
    }

    async createWorkspace(data) {
        return this.post('/workspaces', data);
    }

    async updateWorkspace(workspaceId, data) {
        return this.put(`/workspaces/${workspaceId}`, data);
    }

    // Spaces
    async getSpace(spaceId) {
        return this.get(`/spaces/${spaceId}`);
    }

    async createSpace(data) {
        return this.post('/spaces', data);
    }

    async updateSpace(spaceId, data) {
        return this.put(`/spaces/${spaceId}`, data);
    }

    // Lists
    async getList(listId) {
        return this.get(`/lists/${listId}`);
    }

    async createList(data) {
        return this.post('/lists', data);
    }

    async updateList(listId, data) {
        return this.put(`/lists/${listId}`, data);
    }

    // Tasks
    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
        return this.get(endpoint);
    }

    async getTask(taskId) {
        return this.get(`/tasks/${taskId}`);
    }

    async createTask(data) {
        return this.post('/tasks', data);
    }

    async updateTask(taskId, data) {
        return this.put(`/tasks/${taskId}`, data);
    }

    async deleteTask(taskId) {
        return this.delete(`/tasks/${taskId}`);
    }

    // Task comments
    async getTaskComments(taskId) {
        return this.get(`/tasks/${taskId}/comments`);
    }

    async createTaskComment(taskId, data) {
        return this.post(`/tasks/${taskId}/comments`, data);
    }

    // Dashboard
    async getDashboardStats() {
        return this.get('/dashboard/stats');
    }

    async getDashboardActivity() {
        return this.get('/dashboard/activity');
    }

    async getMyTasks(userId) {
        return this.get(`/dashboard/my-tasks/${userId}`);
    }

    // Home widgets
    async getAgenda(userId) {
        return this.get(`/home/agenda/${userId}`);
    }

    async getMyWork(userId) {
        return this.get(`/home/my-work/${userId}`);
    }

    async getRecent(userId) {
        return this.get(`/home/recent/${userId}`);
    }

    async getAssignedTasks(userId) {
        return this.get(`/home/assigned-tasks/${userId}`);
    }

    // Reports
    async getTeamPerformance(workspaceId) {
        return this.get(`/reports/workspace/${workspaceId}/team-performance`);
    }

    async getPriorityDistribution(workspaceId) {
        return this.get(`/reports/workspace/${workspaceId}/priority-distribution`);
    }

    async getCompletionTrend(workspaceId) {
        return this.get(`/reports/workspace/${workspaceId}/completion-trend`);
    }

    // Automations
    async getListAutomations(listId) {
        return this.get(`/lists/${listId}/automations`);
    }

    async getAutomationContext(listId) {
        return this.get(`/lists/${listId}/automation-context`);
    }

    async createAutomation(data) {
        return this.post('/automations', data);
    }

    // AI suggestions
    async getTaskSuggestions(goal, listId) {
        return this.post('/ai/suggest-tasks', { goal, list_id: listId });
    }

    // Time tracking
    async getTimeEntries(taskId) {
        return this.get(`/tasks/${taskId}/time-entries`);
    }

    async startTimeEntry(taskId, data) {
        return this.post(`/tasks/${taskId}/time-entries`, data);
    }

    async stopTimeEntry(entryId) {
        return this.put(`/time-entries/${entryId}/stop`, {});
    }

    // Tags
    async getTags() {
        return this.get('/tags');
    }

    async createTag(data) {
        return this.post('/tags', data);
    }

    // Search
    async search(query, filters = {}) {
        const params = { query, ...filters };
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/search?${queryString}`);
    }

    // Bulk operations
    async bulkUpdateTasks(taskIds, data) {
        return this.put('/tasks/bulk', { task_ids: taskIds, ...data });
    }

    async bulkDeleteTasks(taskIds) {
        return this.delete('/tasks/bulk', { task_ids: taskIds });
    }

    // File uploads (for future use)
    async uploadFile(file, entityType, entityId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entity_type', entityType);
        formData.append('entity_id', entityId);

        const config = {
            method: 'POST',
            headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
            body: formData
        };

        const response = await fetch(`${this.baseURL}/upload`, config);
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return response.json();
    }

    // WebSocket connection (for real-time updates)
    connectWebSocket(onMessage, onError) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (onError) onError(error);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket connection closed');
            // Auto-reconnect after 3 seconds
            setTimeout(() => this.connectWebSocket(onMessage, onError), 3000);
        };
        
        return this.websocket;
    }

    // Close WebSocket connection
    disconnectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    // Cache mechanism for frequently accessed data
    cache = new Map();
    cacheTimeout = 5 * 60 * 1000; // 5 minutes

    async getCached(key, fetchFn) {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`📦 Cache hit: ${key}`);
            return cached.data;
        }
        
        console.log(`🔄 Cache miss: ${key}`);
        const data = await fetchFn();
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        return data;
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // Batch requests to reduce API calls
    batchRequests = [];
    batchTimeout = null;
    batchDelay = 100; // 100ms

    async batch(endpoint) {
        return new Promise((resolve, reject) => {
            this.batchRequests.push({ endpoint, resolve, reject });
            
            if (this.batchTimeout) {
                clearTimeout(this.batchTimeout);
            }
            
            this.batchTimeout = setTimeout(() => {
                this.executeBatch();
            }, this.batchDelay);
        });
    }

    async executeBatch() {
        const requests = [...this.batchRequests];
        this.batchRequests = [];
        this.batchTimeout = null;
        
        if (requests.length === 0) return;
        
        try {
            const endpoints = requests.map(r => r.endpoint);
            const result = await this.post('/batch', { endpoints });
            
            requests.forEach((request, index) => {
                request.resolve(result.responses[index]);
            });
        } catch (error) {
            requests.forEach(request => {
                request.reject(error);
            });
        }
    }
}

// Error handling utility
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClickUpAPI, APIError };
}