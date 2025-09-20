/**
 * ClickUp Clone - Authentication Service
 * Gerencia autenticação e autorização de usuários
 */

class AuthService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = null;
        this.refreshToken = localStorage.getItem('refresh_token');
        this.tokenExpiry = localStorage.getItem('token_expiry');
        
        this.init();
    }

    init() {
        // Check if token is expired
        if (this.token && this.tokenExpiry) {
            const expiry = new Date(this.tokenExpiry);
            if (expiry <= new Date()) {
                this.logout();
                return;
            }
        }

        // Load user data if token exists
        if (this.token) {
            this.loadUserData();
        }
    }

    async login(credentials) {
        try {
            console.log('🔐 Tentando fazer login...');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error('Credenciais inválidas');
            }

            const data = await response.json();
            
            this.setTokens(data.token, data.refresh_token, data.expires_in);
            this.user = data.user;
            
            console.log('✅ Login realizado com sucesso');
            return { success: true, user: this.user };
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            console.log('📝 Tentando registrar usuário...');
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao criar conta');
            }

            const data = await response.json();
            
            console.log('✅ Usuário registrado com sucesso');
            return { success: true, message: data.message };
            
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            throw error;
        }
    }

    async logout() {
        try {
            // Call logout endpoint if token exists
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(() => {
                    // Ignore network errors on logout
                });
            }
        } finally {
            // Clear local data
            this.clearTokens();
            this.user = null;
            
            console.log('👋 Logout realizado');
            
            // Redirect to login page if needed
            // window.location.href = '/login';
        }
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            console.log('🔄 Atualizando token de acesso...');

            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            
            this.setTokens(data.token, data.refresh_token, data.expires_in);
            
            console.log('✅ Token atualizado com sucesso');
            return data.token;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar token:', error);
            this.logout();
            throw error;
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    await this.refreshAccessToken();
                    return this.loadUserData();
                }
                throw new Error('Failed to load user data');
            }

            const data = await response.json();
            this.user = data.user;
            
            return this.user;
            
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            this.logout();
            throw error;
        }
    }

    setTokens(accessToken, refreshToken, expiresIn) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        
        // Calculate expiry time
        const expiry = new Date();
        expiry.setSeconds(expiry.getSeconds() + (expiresIn || 3600));
        this.tokenExpiry = expiry.toISOString();
        
        // Store in localStorage
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('refresh_token', this.refreshToken);
        localStorage.setItem('token_expiry', this.tokenExpiry);
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
    }

    isAuthenticated() {
        return !!this.token && this.user;
    }

    getToken() {
        return this.token;
    }

    getUser() {
        return this.user;
    }

    hasPermission(permission) {
        if (!this.user) return false;
        
        // Simple role-based permission check
        const userRole = this.user.role || 'member';
        const permissions = this.getRolePermissions(userRole);
        
        return permissions.includes(permission) || permissions.includes('*');
    }

    getRolePermissions(role) {
        const rolePermissions = {
            'owner': ['*'], // All permissions
            'admin': [
                'workspace:manage',
                'user:invite',
                'user:manage',
                'task:create',
                'task:edit',
                'task:delete',
                'list:create',
                'list:edit',
                'list:delete',
                'space:create',
                'space:edit',
                'space:delete'
            ],
            'member': [
                'task:create',
                'task:edit',
                'task:comment',
                'task:assign_self'
            ],
            'guest': [
                'task:view',
                'task:comment'
            ]
        };
        
        return rolePermissions[role] || [];
    }

    // Workspace-specific permissions
    hasWorkspacePermission(workspaceId, permission) {
        if (!this.user) return false;
        
        // Check if user is member of workspace
        const workspace = this.user.workspaces?.find(w => w.id === workspaceId);
        if (!workspace) return false;
        
        // Check role-based permissions
        const userRole = workspace.role || 'member';
        const permissions = this.getRolePermissions(userRole);
        
        return permissions.includes(permission) || permissions.includes('*');
    }

    // Auto-refresh token before expiry
    startTokenRefreshTimer() {
        if (!this.tokenExpiry) return;
        
        const expiry = new Date(this.tokenExpiry);
        const now = new Date();
        const timeUntilExpiry = expiry.getTime() - now.getTime();
        
        // Refresh 5 minutes before expiry
        const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
        
        if (refreshTime > 0) {
            setTimeout(async () => {
                try {
                    await this.refreshAccessToken();
                    this.startTokenRefreshTimer(); // Restart timer
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }, refreshTime);
        }
    }

    // Password change
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao alterar senha');
            }

            const data = await response.json();
            return { success: true, message: data.message };
            
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            throw error;
        }
    }

    // Password reset request
    async requestPasswordReset(email) {
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao solicitar reset de senha');
            }

            const data = await response.json();
            return { success: true, message: data.message };
            
        } catch (error) {
            console.error('Erro ao solicitar reset:', error);
            throw error;
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    new_password: newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao redefinir senha');
            }

            const data = await response.json();
            return { success: true, message: data.message };
            
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            throw error;
        }
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao atualizar perfil');
            }

            const data = await response.json();
            this.user = { ...this.user, ...data.user };
            
            return { success: true, user: this.user };
            
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }

    // Two-factor authentication
    async enableTwoFactor() {
        try {
            const response = await fetch('/api/auth/2fa/enable', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao habilitar 2FA');
            }

            const data = await response.json();
            return data; // Contains QR code URL and backup codes
            
        } catch (error) {
            console.error('Erro ao habilitar 2FA:', error);
            throw error;
        }
    }

    async verifyTwoFactor(code) {
        try {
            const response = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error('Código 2FA inválido');
            }

            const data = await response.json();
            this.user = { ...this.user, two_factor_enabled: true };
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro na verificação 2FA:', error);
            throw error;
        }
    }

    // Session management
    async getSessions() {
        try {
            const response = await fetch('/api/auth/sessions', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar sessões');
            }

            const data = await response.json();
            return data.sessions;
            
        } catch (error) {
            console.error('Erro ao carregar sessões:', error);
            throw error;
        }
    }

    async revokeSession(sessionId) {
        try {
            const response = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao revogar sessão');
            }

            return { success: true };
            
        } catch (error) {
            console.error('Erro ao revogar sessão:', error);
            throw error;
        }
    }

    // Utility methods
    getAuthHeader() {
        return this.token ? `Bearer ${this.token}` : null;
    }

    isTokenExpiringSoon(minutesThreshold = 5) {
        if (!this.tokenExpiry) return false;
        
        const expiry = new Date(this.tokenExpiry);
        const now = new Date();
        const timeDiff = expiry.getTime() - now.getTime();
        const minutesLeft = timeDiff / (1000 * 60);
        
        return minutesLeft <= minutesThreshold;
    }

    // Event handling for auth state changes
    onAuthStateChange(callback) {
        this.authStateCallbacks = this.authStateCallbacks || [];
        this.authStateCallbacks.push(callback);
    }

    triggerAuthStateChange(event, data) {
        if (this.authStateCallbacks) {
            this.authStateCallbacks.forEach(callback => {
                try {
                    callback(event, data);
                } catch (error) {
                    console.error('Error in auth state callback:', error);
                }
            });
        }
    }

    // Mock login for development (remove in production)
    async mockLogin(userRole = 'member') {
        console.log('🎭 Mock login ativado');
        
        const mockUser = {
            id: 1,
            name: 'José Developer',
            email: 'jose@clickupclone.com',
            role: userRole,
            avatar_url: null,
            timezone: 'America/Sao_Paulo',
            workspaces: [
                {
                    id: 1,
                    name: 'Acme Corporation',
                    role: userRole
                }
            ]
        };

        const mockToken = 'mock_token_' + Date.now();
        
        this.setTokens(mockToken, 'mock_refresh_token', 3600);
        this.user = mockUser;
        
        this.triggerAuthStateChange('login', this.user);
        
        return { success: true, user: this.user };
    }
}

// Global auth instance
if (typeof window !== 'undefined') {
    window.auth = new AuthService();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}