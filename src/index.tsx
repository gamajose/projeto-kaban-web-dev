import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

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

export default app