import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types'
import { Pool } from 'pg'; 


import { setupAPIRoutes, setupPublicRoutes } from './routes/api' // importe a nova função
setupAPIRoutes(app)
setupPublicRoutes(app) 

type Env = {
  Bindings: CloudflareBindings
}

const app = new Hono<Env>();


//middleware
app.use('*', async (c, next) => {
  // --- Adicionar Bloco de Verificação ---
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE'];
  for (const varName of requiredEnvVars) {
    if (!c.env[varName]) {
      console.error(`Erro Crítico: A variável de ambiente ${varName} não está definida.`);
      // Em produção, você poderia retornar um status 503 Service Unavailable
      return c.json({ error: `Configuração do servidor incompleta: ${varName} em falta.` }, 500);
    }
  }
  const pool = new Pool({
    host: c.env.DB_HOST,
    port: parseInt(c.env.DB_PORT, 10),
    user: c.env.DB_USER,
    password: c.env.DB_PASSWORD,
    database: c.env.DB_DATABASE,
  });
  c.set('PG', pool);
  await next();
});

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// API Routes
import { setupAPIRoutes } from './routes/api'
setupAPIRoutes(app)

// Main application route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ClickUp Clone - Gerenciamento de Projetos</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#6B73FF',
                  secondary: '#9DA4FF',
                  accent: '#FF6B6B',
                  success: '#81C784',
                  warning: '#FFB84D',
                  danger: '#F06292',
                  info: '#64B5F6',
                  dark: '#2C3E50',
                  light: '#F8F9FA'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <!-- Loading screen -->
        <div id="loading" class="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div class="text-center">
                <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 class="text-xl font-semibold text-gray-700">Carregando ClickUp Clone...</h2>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Dashboard route
app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#6B73FF',
                  secondary: '#9DA4FF',
                  accent: '#FF6B6B',
                  success: '#81C784',
                  warning: '#FFB84D',
                  danger: '#F06292',
                  info: '#64B5F6',
                  dark: '#2C3E50',
                  light: '#F8F9FA'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/dashboard.js"></script>
    </body>
    </html>
  `)
})

// Workspace route
app.get('/workspace/:workspace_id/*', (c) => {
  const workspaceId = c.req.param('workspace_id')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#6B73FF',
                  secondary: '#9DA4FF',
                  accent: '#FF6B6B',
                  success: '#81C784',
                  warning: '#FFB84D',
                  danger: '#F06292',
                  info: '#64B5F6',
                  dark: '#2C3E50',
                  light: '#F8F9FA'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="app" data-workspace-id="${workspaceId}"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/workspace.js"></script>
    </body>
    </html>
  `)
})

app.get('/profile', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meu Perfil - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
        <script>
          tailwind.config = { /* ... (configuração do tailwind) ... */ }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="app-profile">
            <div class="max-w-4xl mx-auto py-8">
                <h1 class="text-3xl font-bold mb-6">Meu Perfil</h1>
                <div class="bg-white p-6 rounded-lg border">
                    <div class="flex items-center space-x-6 mb-6">
                        <img id="profile-avatar-img" src="/static/default-avatar.png" class="w-24 h-24 rounded-full bg-gray-200">
                        <div>
                            <label for="avatar-upload" class="btn btn-secondary cursor-pointer">
                                <i class="fas fa-upload mr-2"></i>Alterar Foto
                            </label>
                            <input type="file" id="avatar-upload" class="hidden" accept="image/png, image/jpeg">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome</label>
                        <input id="profile-name" type="text" class="form-input" placeholder="Carregando...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input id="profile-email" type="email" class="form-input" disabled placeholder="Carregando...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fuso Horário</label>
                        <select id="profile-timezone" class="form-input">
                            <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                            <option value="Europe/Lisbon">Lisboa (GMT+1)</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                    <button id="save-profile" class="btn btn-primary">
                        <i class="fas fa-save mr-2"></i>Guardar Alterações
                    </button>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/profile.js"></script>
    </body>
    </html>
  `);
});

// --- ADICIONAR NOVA ROTA DE RELATÓRIOS ---
app.get('/reports/workspace/:id', (c) => {
  const workspaceId = c.req.param('id');
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatórios - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app-reports" data-workspace-id="${workspaceId}">
            <div class="p-8">
                <h1 class="text-3xl font-bold mb-8">Relatórios do Workspace</h1>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="widget">
                        <h3 class="widget-title mb-4">Desempenho da Equipa (Tarefas Concluídas)</h3>
                        <div class="chart-container" style="height: 300px;"><canvas id="team-performance-chart"></canvas></div>
                    </div>
                    <div class="widget">
                        <h3 class="widget-title mb-4">Distribuição por Prioridade</h3>
                        <div class="chart-container" style="height: 300px;"><canvas id="priority-chart"></canvas></div>
                    </div>
                    <div class="widget col-span-1 lg:col-span-2">
                        <h3 class="widget-title mb-4">Tendência de Conclusão de Tarefas</h3>
                        <div class="chart-container" style="height: 300px;"><canvas id="completion-trend-chart"></canvas></div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/reports.js"></script>
    </body>
    </html>
  `);
});


export default app