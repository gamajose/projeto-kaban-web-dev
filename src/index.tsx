import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { CloudflareBindings } from './types';
import { Pool } from 'pg';
import { apiRoutes, publicRoutes } from './routes/api';
import { authRoutes } from './routes/auth';

type Env = {
  Bindings: CloudflareBindings;
};

const app = new Hono<Env>();

// Middleware de conexão com o banco de dados
app.use('*', async (c, next) => {
  const requiredEnvVars: (keyof CloudflareBindings)[] = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'JWT_SECRET'];
  for (const varName of requiredEnvVars) {
    if (!c.env[varName]) {
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

// Outros Middlewares
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/api/*', cors());
app.use('/auth/*', cors());

// Montagem dos Routers
app.route('/api', apiRoutes);
app.route('/auth', authRoutes);
app.route('/', publicRoutes);

// --- ROTAS QUE SERVEM AS PÁGINAS HTML ---

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ClickUp Clone - Gerenciamento de Projetos</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        <div id="loading" class="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div class="text-center"><div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><h2 class="text-xl font-semibold text-gray-700">Carregando...</h2></div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>

        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        
        <script src="/static/components/widget-mytasks.js"></script>
        <script src="/static/components/widget-recent.js"></script>
        <script src="/static/components/widget-agenda.js"></script>
        <script src="/static/components/widget-mywork.js"></script>
        <script src="/static/components/widget-assignedtome.js"></script>

        <script src="/static/authService.js"></script>
        
        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/dashboard.js"></script>

        <script src="/static/authService.js"></script>

        <script src="/static/components/widget-mywork.js"></script>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

app.get('/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8"><title>Login - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-800 flex items-center justify-center h-screen">
        <div class="w-full max-w-md">
            <div id="auth-form" class="bg-[var(--bg-secondary)] p-8 rounded-lg shadow-md border border-[var(--border-color)]">
                <h2 class="text-2xl font-bold text-center text-white mb-6">Iniciar Sessão</h2>
                <div class="form-group"><label class="form-label text-gray-300" for="email">Email</label><input id="email" type="email" class="form-input bg-gray-700 text-white border-gray-600" required></div>
                <div class="form-group"><label class="form-label text-gray-300" for="password">Senha</label><input id="password" type="password" class="form-input bg-gray-700 text-white border-gray-600" required></div>
                <button id="login-button" class="btn btn-primary w-full" style="background-color: var(--accent-color);">Entrar</button>
                <p class="text-center text-sm text-gray-400 mt-4">Ainda não tem conta? <a href="/register" class="text-[var(--accent-color)] hover:underline">Registe-se</a></p>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script src="/static/auth.js"></script>
    </body>
    </html>
  `);
});

app.get('/register', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8"><title>Registo - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-800 flex items-center justify-center h-screen">
        <div class="w-full max-w-md">
            <div id="auth-form" class="bg-[var(--bg-secondary)] p-8 rounded-lg shadow-md border border-[var(--border-color)]">
                <h2 class="text-2xl font-bold text-center text-white mb-6">Criar Conta</h2>
                <div class="form-group"><label class="form-label text-gray-300" for="name">Nome Completo</label><input id="name" type="text" class="form-input bg-gray-700 text-white border-gray-600" required></div>
                <div class="form-group"><label class="form-label text-gray-300" for="email">Email</label><input id="email" type="email" class="form-input bg-gray-700 text-white border-gray-600" required></div>
                <div class="form-group"><label class="form-label text-gray-300" for="password">Senha</label><input id="password" type="password" class="form-input bg-gray-700 text-white border-gray-600" required></div>
                <button id="register-button" class="btn btn-primary w-full" style="background-color: var(--accent-color);">Registar</button>
                <p class="text-center text-sm text-gray-400 mt-4">Já tem uma conta? <a href="/login" class="text-[var(--accent-color)] hover:underline">Inicie sessão</a></p>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script src="/static/auth.js"></script>
    </body>
    </html>
  `);
});

app.get('/logout', (c) => {
    // Esta rota apenas serve um HTML que aciona o logout no JS e redireciona
    return c.html(`
        <script>
            localStorage.clear();
            window.location.href = '/login';
        </script>
    `);
});

app.get('/workspace/:workspace_id/*', (c) => {
  const workspaceId = c.req.param('workspace_id');
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app" data-workspace-id="${workspaceId}"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="/static/workspace.js"></script>

        <script src="/static/authService.js"></script>

        <script src="/static/components/widget-mywork.js"></script>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

app.get('/profile', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meu Perfil - ClickUp Clone</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app-profile">
            <div class="max-w-4xl mx-auto py-8">
                <h1 class="text-3xl font-bold mb-6">Meu Perfil</h1>
                <div class="bg-white p-6 rounded-lg border">
                    <div class="flex items-center space-x-6 mb-6">
                        <img id="profile-avatar-img" src="/static/default-avatar.png" class="w-24 h-24 rounded-full bg-gray-200">
                        <div>
                            <label for="avatar-upload" class="btn btn-secondary cursor-pointer"><i class="fas fa-upload mr-2"></i>Alterar Foto</label>
                            <input type="file" id="avatar-upload" class="hidden" accept="image/png, image/jpeg">
                        </div>
                    </div>
                    <div class="form-group"><label class="form-label">Nome</label><input id="profile-name" type="text" class="form-input" placeholder="Carregando..."></div>
                    <div class="form-group"><label class="form-label">Email</label><input id="profile-email" type="email" class="form-input" disabled placeholder="Carregando..."></div>
                    <div class="form-group"><label class="form-label">Fuso Horário</label><select id="profile-timezone" class="form-input"><option value="America/Sao_Paulo">São Paulo (GMT-3)</option><option value="Europe/Lisbon">Lisboa (GMT+1)</option><option value="UTC">UTC</option></select></div>
                    <button id="save-profile" class="btn btn-primary"><i class="fas fa-save mr-2"></i>Guardar Alterações</button>
                </div>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>

        <script src="/static/authService.js"></script>

        <script src="/static/components/widget-mywork.js"></script>

        <script src="/static/app.js"></script>

        <script src="/static/profile.js"></script>
    </body>
    </html>
  `);
});

app.get('/reports/workspace/:id', (c) => {
    const workspaceId = c.req.param('id');
    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8"><title>Relatórios - ClickUp Clone</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="/static/style.css" rel="stylesheet">
        </head>
        <body class="bg-gray-50">
            <div id="app-reports" data-workspace-id="${workspaceId}">
                <div class="p-8"><h1 class="text-3xl font-bold mb-8">Relatórios do Workspace</h1><div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="widget"><h3 class="widget-title mb-4">Desempenho da Equipa</h3><div class="chart-container" style="height: 300px;"><canvas id="team-performance-chart"></canvas></div></div><div class="widget"><h3 class="widget-title mb-4">Distribuição por Prioridade</h3><div class="chart-container" style="height: 300px;"><canvas id="priority-chart"></canvas></div></div><div class="widget col-span-1 lg:col-span-2"><h3 class="widget-title mb-4">Tendência de Conclusão</h3><div class="chart-container" style="height: 300px;"><canvas id="completion-trend-chart"></canvas></div></div></div></div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <script src="/static/reports.js"></script>
            <script src="/static/authService.js"></script>

            <script src="/static/components/widget-mywork.js"></script>

            <script src="/static/app.js"></script>
        </body>
        </html>
    `);
});

export default app;