import { Hono } from 'hono';
import type { CloudflareBindings } from '../types';
import { generateTaskSuggestions } from '../services/ai';
import { processAutomations } from '../services/automation';
import { requirePermission, jwtMiddleware } from '../middleware/auth';


type Env = {
  Bindings: CloudflareBindings;
};

// --- API Router ---
// Todas as suas rotas que devem começar com /api vêm aqui
export const apiRoutes = new Hono<Env>();

// Health check
apiRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users API
apiRoutes.get('/users', async (c) => {
  try {
    const pool = c.get('PG');
    const result = await pool.query(`SELECT id, email, name, avatar_url, role, status, timezone FROM users ORDER BY name`);
    return c.json({ users: result.rows });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

apiRoutes.get('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pool = c.get('PG');
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return c.json({ error: 'User not found' }, 404);
    return c.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

apiRoutes.put('/users/:id/profile', async (c) => {
  const userId = c.req.param('id');
  const { name, timezone } = await c.req.json();
  if (parseInt(userId) !== 1) return c.json({ error: 'Não autorizado' }, 403);
  const pool = c.get('PG');
  await pool.query('UPDATE users SET name = $1, timezone = $2, updated_at = NOW() WHERE id = $3', [name, timezone, userId]);
  return c.json({ success: true });
});

// Workspaces API
apiRoutes.get('/workspaces', async (c) => {
  try {
    const pool = c.get('PG');
    const result = await pool.query(`SELECT w.*, u.name as owner_name FROM workspaces w LEFT JOIN users u ON w.owner_id = u.id ORDER BY w.name`);
    return c.json({ workspaces: result.rows });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch workspaces' }, 500);
  }
});

apiRoutes.get('/workspaces/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pool = c.get('PG');
    const workspaceResult = await pool.query(`SELECT w.*, u.name as owner_name FROM workspaces w LEFT JOIN users u ON w.owner_id = u.id WHERE w.id = $1`, [id]);
    if (workspaceResult.rows.length === 0) return c.json({ error: 'Workspace not found' }, 404);
    const workspace = workspaceResult.rows[0];
    const membersResult = await pool.query(`SELECT wm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar FROM workspace_members wm LEFT JOIN users u ON wm.user_id = u.id WHERE wm.workspace_id = $1 ORDER BY wm.role, u.name`, [id]);
    const spacesResult = await pool.query(`SELECT * FROM spaces WHERE workspace_id = $1 ORDER BY name`, [id]);
    return c.json({ workspace: { ...workspace, members: membersResult.rows, spaces: spacesResult.rows } });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch workspace' }, 500);
  }
});

// Spaces API
apiRoutes.get('/spaces/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pool = c.get('PG');
    const spaceResult = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
    if (spaceResult.rows.length === 0) return c.json({ error: 'Space not found' }, 404);
    const space = spaceResult.rows[0];
    const foldersResult = await pool.query(`SELECT * FROM folders WHERE space_id = $1 ORDER BY position, name`, [id]);
    const listsResult = await pool.query(`SELECT * FROM lists WHERE space_id = $1 OR folder_id IN (SELECT id FROM folders WHERE space_id = $1) ORDER BY position, name`, [id]);
    return c.json({ space: { ...space, folders: foldersResult.rows, lists: listsResult.rows } });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch space' }, 500);
  }
});

// Lists API and Automations
apiRoutes.get('/lists/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pool = c.get('PG');
    const listResult = await pool.query('SELECT * FROM lists WHERE id = $1', [id]);
    if (listResult.rows.length === 0) return c.json({ error: 'List not found' }, 404);
    const list = listResult.rows[0];
    const statusesResult = await pool.query('SELECT * FROM task_statuses WHERE list_id = $1 ORDER BY position', [id]);
    const tasksResult = await pool.query(`SELECT t.*, ts.name as status_name, ts.color as status_color, u_assignee.name as assignee_name, u_assignee.avatar_url as assignee_avatar, u_creator.name as creator_name, COUNT(c.id)::int as comments_count, SUM(te.duration)::int as time_tracked FROM tasks t LEFT JOIN task_statuses ts ON t.status_id = ts.id LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id LEFT JOIN users u_creator ON t.creator_id = u_creator.id LEFT JOIN comments c ON t.id = c.task_id LEFT JOIN time_entries te ON t.id = te.task_id WHERE t.list_id = $1 AND t.is_archived = false GROUP BY t.id, ts.name, ts.color, u_assignee.name, u_assignee.avatar_url, u_creator.name ORDER BY t.position, t.created_at`, [id]);
    return c.json({ list: { ...list, statuses: statusesResult.rows, tasks: tasksResult.rows } });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch list' }, 500);
  }
});

apiRoutes.get('/lists/:id/automation-context', async (c) => {
  const listId = c.req.param('id');
  const pool = c.get('PG');
  const statusesResult = await pool.query('SELECT id, name FROM task_statuses WHERE list_id = $1 ORDER BY position', [listId]);
  const workspaceIdResult = await pool.query('SELECT s.workspace_id FROM lists l JOIN spaces s ON l.space_id = s.id WHERE l.id = $1', [listId]);
  const workspaceId = workspaceIdResult.rows[0]?.workspace_id;
  const membersResult = await pool.query(`SELECT u.id, u.name FROM users u JOIN workspace_members wm ON u.id = wm.user_id WHERE wm.workspace_id = $1 ORDER BY u.name`, [workspaceId]);
  return c.json({ statuses: statusesResult.rows, members: membersResult.rows });
});

apiRoutes.get('/lists/:id/automations', async (c) => {
  const listId = c.req.param('id');
  const pool = c.get('PG');
  const result = await pool.query('SELECT * FROM automations WHERE list_id = $1 ORDER BY name', [listId]);
  return c.json({ automations: result.rows });
});

apiRoutes.post('/automations', async (c) => {
  const { list_id, name, trigger_type, trigger_config, action_type, action_config } = await c.req.json();
  const pool = c.get('PG');
  const result = await pool.query(`INSERT INTO automations (list_id, name, trigger_type, trigger_config, action_type, action_config) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [list_id, name, trigger_type, JSON.stringify(trigger_config), action_type, JSON.stringify(action_config)]);
  return c.json({ automation: result.rows[0] }, 201);
});

// Tasks API
apiRoutes.use('/*', jwtMiddleware);

apiRoutes.post('/tasks', requirePermission('task:create'), async (c) => {
  const body = await c.req.json();
  const { list_id, name, description, priority, assignee_id, creator_id, due_date } = body;
  const pool = c.get('PG');
  const result = await pool.query(`INSERT INTO tasks (list_id, name, description, priority, assignee_id, creator_id, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [list_id, name, description, priority || 'normal', assignee_id, creator_id, due_date]);
  return c.json({ task: result.rows[0] }, 201);
});

apiRoutes.get('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const pool = c.get('PG');
  const taskResult = await pool.query(`SELECT t.*, ts.name as status_name, ts.color as status_color, u_assignee.name as assignee_name, u_assignee.avatar_url as assignee_avatar, u_creator.name as creator_name, l.name as list_name, COALESCE((SELECT json_agg(tags.*) FROM tags JOIN task_tags tt ON tags.id = tt.tag_id WHERE tt.task_id = t.id), '[]'::json) as tags, COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url)) FROM users u JOIN task_assignees ta ON u.id = ta.user_id WHERE ta.task_id = t.id), '[]'::json) as assignees, COALESCE((SELECT json_agg(json_build_object('id', c.id, 'content', c.content, 'created_at', c.created_at, 'user_name', u.name, 'user_avatar', u.avatar_url)) FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = t.id), '[]'::json) as comments, COALESCE((SELECT json_agg(json_build_object('id', st.id, 'name', st.name, 'status_id', st.status_id)) FROM tasks st WHERE st.parent_task_id = t.id), '[]'::json) as subtasks, COALESCE((SELECT json_agg(json_build_object('id', a.id, 'action_type', a.action_type, 'details', a.details, 'created_at', a.created_at, 'user_name', u.name, 'user_avatar', u.avatar_url)) FROM activities a JOIN users u ON a.user_id = u.id WHERE a.entity_type = 'task' AND a.entity_id = t.id ORDER BY a.created_at DESC LIMIT 10), '[]'::json) as activities FROM tasks t LEFT JOIN task_statuses ts ON t.status_id = ts.id LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id LEFT JOIN users u_creator ON t.creator_id = u_creator.id LEFT JOIN lists l ON t.list_id = l.id WHERE t.id = $1 GROUP BY t.id, ts.id, u_assignee.id, u_creator.id, l.id`, [id]);
  if (taskResult.rows.length === 0) return c.json({ error: 'Task not found' }, 404);
  return c.json({ task: taskResult.rows[0] });
});

apiRoutes.put('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, description, status_id, priority, assignee_id, due_date, progress } = body;
  const pool = c.get('PG');
  const oldTaskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  const oldTask = oldTaskResult.rows[0];
  await pool.query(`UPDATE tasks SET name = $1, description = $2, status_id = $3, priority = $4, assignee_id = $5, due_date = $6, progress = $7, updated_at = NOW() WHERE id = $8`, [name, description, status_id, priority, assignee_id, due_date, progress, id]);
  if (oldTask && oldTask.status_id !== status_id) {
    processAutomations('status_changed', { ...oldTask, status_id }, pool).catch(console.error);
  }
  const updatedTaskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return c.json({ task: updatedTaskResult.rows[0] });
});

// Dashboard & Reports
apiRoutes.get('/dashboard/stats', async (c) => {
  const pool = c.get('PG');
  const result = await pool.query(`SELECT (SELECT COUNT(*) FROM tasks WHERE is_archived = false) as total_tasks, (SELECT COUNT(*) FROM tasks WHERE is_archived = false AND status_id IN (SELECT id FROM task_statuses WHERE is_closed = true)) as completed_tasks, (SELECT COUNT(*) FROM tasks WHERE is_archived = false AND due_date < NOW() AND status_id NOT IN (SELECT id FROM task_statuses WHERE is_closed = true)) as overdue_tasks, (SELECT COUNT(*) FROM workspaces) as total_workspaces, (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users`);
  return c.json({ stats: result.rows[0] });
});

apiRoutes.get('/dashboard/activity', async (c) => {
  const pool = c.get('PG');
  const result = await pool.query(`SELECT a.*, u.name as user_name, u.avatar_url as user_avatar, w.name as workspace_name FROM activities a LEFT JOIN users u ON a.user_id = u.id LEFT JOIN workspaces w ON a.workspace_id = w.id ORDER BY a.created_at DESC LIMIT 20`);
  return c.json({ activities: result.rows });
});

apiRoutes.get('/dashboard/my-tasks/:user_id', async (c) => {
  const userId = c.req.param('user_id');
  const pool = c.get('PG');
  const result = await pool.query(`SELECT t.*, ts.name as status_name, ts.color as status_color, l.name as list_name, l.color as list_color FROM tasks t LEFT JOIN task_statuses ts ON t.status_id = ts.id LEFT JOIN lists l ON t.list_id = l.id WHERE (t.assignee_id = $1 OR t.id IN (SELECT task_id FROM task_assignees WHERE user_id = $1)) AND t.is_archived = false AND ts.is_closed = false ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END, t.due_date ASC, t.created_at ASC LIMIT 50`, [userId]);
  return c.json({ tasks: result.rows });
});

apiRoutes.get('/reports/workspace/:id/team-performance', async (c) => {
  const workspaceId = c.req.param('id');
  const pool = c.get('PG');
  const result = await pool.query(`SELECT u.name, COUNT(t.id)::int as completed_tasks FROM tasks t JOIN users u ON t.assignee_id = u.id JOIN task_statuses ts ON t.status_id = ts.id JOIN lists l ON t.list_id = l.id LEFT JOIN spaces s_direct ON l.space_id = s_direct.id LEFT JOIN folders f ON l.folder_id = f.id LEFT JOIN spaces s_folder ON f.space_id = s_folder.id WHERE (s_direct.workspace_id = $1 OR s_folder.workspace_id = $1) AND ts.is_closed = true GROUP BY u.name ORDER BY completed_tasks DESC;`, [workspaceId]);
  return c.json({ data: result.rows });
});

apiRoutes.get('/reports/workspace/:id/priority-distribution', async (c) => {
  const workspaceId = c.req.param('id');
  const pool = c.get('PG');
  const result = await pool.query(`SELECT t.priority, COUNT(t.id)::int as task_count FROM tasks t JOIN lists l ON t.list_id = l.id LEFT JOIN spaces s_direct ON l.space_id = s_direct.id LEFT JOIN folders f ON l.folder_id = f.id LEFT JOIN spaces s_folder ON f.space_id = s_folder.id WHERE s_direct.workspace_id = $1 OR s_folder.workspace_id = $1 GROUP BY t.priority;`, [workspaceId]);
  return c.json({ data: result.rows });
});

apiRoutes.get('/reports/workspace/:id/completion-trend', async (c) => {
  const workspaceId = c.req.param('id');
  const pool = c.get('PG');
  const result = await pool.query(`WITH dates AS (SELECT generate_series((SELECT MIN(created_at) FROM tasks)::date, CURRENT_DATE, '1 day'::interval) AS date), created AS (SELECT created_at::date as date, COUNT(id) as count FROM tasks t JOIN lists l ON t.list_id = l.id JOIN spaces s ON l.space_id = s.id WHERE s.workspace_id = $1 GROUP BY 1), completed AS (SELECT updated_at::date as date, COUNT(id) as count FROM tasks t JOIN task_statuses ts ON t.status_id = ts.id JOIN lists l ON t.list_id = l.id JOIN spaces s ON l.space_id = s.id WHERE ts.is_closed = true AND s.workspace_id = $1 GROUP BY 1) SELECT to_char(dates.date, 'YYYY-MM-DD') as date, COALESCE(created.count, 0) as created_count, COALESCE(completed.count, 0) as completed_count FROM dates LEFT JOIN created ON dates.date = created.date LEFT JOIN completed ON dates.date = completed.date ORDER BY dates.date;`, [workspaceId]);
  return c.json({ data: result.rows });
});


apiRoutes.get('/home/agenda/:userId', async (c) => {
    const userId = c.req.param('userId');
    const pool = c.get('PG');
    try {
        // Busca as próximas 7 tarefas do utilizador com data de vencimento, a partir de hoje
        const result = await pool.query(`
            SELECT
                id,
                name,
                due_date
            FROM tasks
            WHERE assignee_id = $1
              AND due_date IS NOT NULL
              AND due_date >= CURRENT_DATE
              AND status_id NOT IN (SELECT id FROM task_statuses WHERE is_closed = true)
            ORDER BY due_date ASC
            LIMIT 7;
        `, [userId]);
        return c.json({ agenda_items: result.rows });
    } catch (error) {
        console.error("Erro ao buscar agenda:", error);
        return c.json({ error: 'Falha ao buscar agenda' }, 500);
    }
});

// AI
apiRoutes.post('/ai/suggest-tasks', async (c) => {
  const { goal, list_id } = await c.req.json();
  const apiKey = c.env.GEMINI_API_KEY;
  if (!goal || !list_id || !apiKey) return c.json({ error: 'Dados insuficientes' }, 400);
  const suggestions = await generateTaskSuggestions(goal, apiKey);
  const formatted = suggestions.map(s => ({ ...s, list_id, creator_id: 1 }));
  return c.json({ suggestions: formatted });
});

apiRoutes.get('/home/my-work/:userId', async (c) => {
    const userId = c.req.param('userId');
    const pool = c.get('PG');
    try {
        const result = await pool.query(`
            WITH user_tasks AS (
                SELECT 
                    t.id,
                    t.name,
                    t.due_date,
                    l.name as list_name,
                    s.name as space_name,
                    s.color as space_color
                FROM tasks t
                JOIN lists l ON t.list_id = l.id
                LEFT JOIN spaces s ON l.space_id = s.id OR l.folder_id IN (SELECT f.id FROM folders f WHERE f.space_id = s.id)
                WHERE t.assignee_id = $1
                  AND t.status_id NOT IN (SELECT id FROM task_statuses WHERE is_closed = true)
            )
            SELECT 
                CASE
                    WHEN due_date IS NULL THEN 'unscheduled'
                    WHEN due_date::date = CURRENT_DATE THEN 'today'
                    WHEN due_date < CURRENT_DATE THEN 'overdue'
                    ELSE 'upcoming'
                END as category,
                json_agg(
                    json_build_object(
                        'id', id,
                        'name', name,
                        'due_date', to_char(due_date, 'MM/DD/YYYY'),
                        'list_name', list_name,
                        'space_name', space_name,
                        'space_color', space_color
                    ) ORDER BY due_date ASC
                ) as tasks
            FROM user_tasks
            GROUP BY category;
        `, [userId]);

        // Formata a resposta num objeto para fácil acesso no frontend
        const categorizedTasks = result.rows.reduce((acc, row) => {
            acc[row.category] = row.tasks;
            return acc;
        }, {});

        return c.json({ categorizedTasks });
    } catch (error) {
        console.error("Erro ao buscar 'Meu trabalho':", error);
        return c.json({ error: 'Falha ao buscar dados do widget' }, 500);
    }
});

// Endpoint para o widget "Recentes"
apiRoutes.get('/home/recent/:userId', async (c) => {
  const userId = c.req.param('userId');
  const pool = c.get('PG');
  try {
    // Busca as 5 últimas atividades únicas de tarefas do utilizador
    const result = await pool.query(`
              SELECT DISTINCT ON (a.entity_id)
                  a.entity_id as task_id,
                  t.name as task_name,
                  l.name as list_name,
                  s.name as space_name,
                  a.created_at
              FROM activities a
              JOIN tasks t ON a.entity_id = t.id
              JOIN lists l ON t.list_id = l.id
              LEFT JOIN spaces s ON l.space_id = s.id OR l.folder_id IN (SELECT f.id from folders f WHERE f.space_id = s.id)
              WHERE a.user_id = $1 AND a.entity_type = 'task'
              ORDER BY a.entity_id, a.created_at DESC
              LIMIT 8;
          `, [userId]);
    return c.json({ recent_items: result.rows });
  } catch (error) {
    console.error("Erro ao buscar itens recentes:", error);
    return c.json({ error: 'Falha ao buscar itens recentes' }, 500);
  }
});

// Endpoint para o widget "Atribuídas a mim"
apiRoutes.get('/home/assigned-tasks/:userId', async (c) => {
  const userId = c.req.param('userId');
  const pool = c.get('PG');
  try {
    const result = await pool.query(`
              SELECT 
                  t.id, t.name, t.priority, t.due_date,
                  ts.name as status_name, ts.color as status_color,
                  (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id) as subtasks_total,
                  (SELECT COUNT(*) FROM tasks st JOIN task_statuses sts ON st.status_id = sts.id WHERE st.parent_task_id = t.id AND sts.is_closed = true) as subtasks_completed
              FROM tasks t
              LEFT JOIN task_statuses ts ON t.status_id = ts.id
              WHERE t.assignee_id = $1 AND (ts.is_closed IS NULL OR ts.is_closed = false)
              ORDER BY t.due_date ASC NULLS LAST, t.priority;
          `, [userId]);
    return c.json({ tasks: result.rows });
  } catch (error) {
    console.error("Erro ao buscar tarefas atribuídas:", error);
    return c.json({ error: 'Falha ao buscar tarefas' }, 500);
  }
});


// --- Public File Router ---
export const publicRoutes = new Hono<Env>();

publicRoutes.get('/avatars/:id', async (c) => {
  const userId = c.req.param('id');
  const fileKey = `avatars/user-${userId}`;
  try {
    const r2Object = await c.env.AVATAR_BUCKET.get(fileKey);
    if (r2Object === null) return c.notFound();
    const headers = new Headers();
    r2Object.writeHttpMetadata(headers);
    headers.set('etag', r2Object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=3600');
    return new Response(r2Object.body, { headers });
  } catch (error) {
    console.error('Erro ao servir avatar do R2:', error);
    return c.text('Erro ao buscar imagem', 500);
  }
});