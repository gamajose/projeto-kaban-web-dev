import { Hono } from 'hono';
import type { CloudflareBindings } from '../types';
import { generateTaskSuggestions } from '../services/ai';
import { processAutomations } from '../services/automation';
import { requirePermission } from '../middleware/auth';

type Env = {
  Bindings: CloudflareBindings;
};

// --- API Router ---
// Criamos uma nova instância do Hono que servirá como o nosso router de API
export const apiRoutes = new Hono<Env>();

// Health check
apiRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users API
apiRoutes.get('/users', async (c) => {
  try {
    const pool = c.get('PG');
    const result = await pool.query(`
      SELECT id, email, name, avatar_url, role, status, timezone, created_at, updated_at
      FROM users 
      ORDER BY name
    `);
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
    const result = await pool.query(`
      SELECT id, email, name, avatar_url, role, status, timezone, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

apiRoutes.put('/users/:id/profile', async (c) => {
    const userId = c.req.param('id');
    const { name, timezone } = await c.req.json();

    if (parseInt(userId) !== 1) { // Simulação do utilizador atual
        return c.json({ error: 'Não autorizado' }, 403);
    }

    const pool = c.get('PG');
    await pool.query('UPDATE users SET name = $1, timezone = $2 WHERE id = $3', [name, timezone, userId]);
    return c.json({ success: true });
});

apiRoutes.post('/users/:id/avatar', async (c) => {
  const userId = c.req.param('id');
  const currentUserId = 1; // Simulação

  if (parseInt(userId) !== currentUserId) {
      return c.json({ error: 'Não autorizado' }, 403);
  }
  try {
      const body = await c.req.parseBody();
      const avatarFile = body['avatar'] as File;

      if (!avatarFile || !(avatarFile instanceof File)) {
          return c.json({ error: 'Ficheiro de avatar não enviado ou inválido.' }, 400);
      }
      
      const r2Bucket = c.env.AVATAR_BUCKET;
      const fileKey = `avatars/user-${userId}`;
      await r2Bucket.put(fileKey, await avatarFile.arrayBuffer(), {
          httpMetadata: { contentType: avatarFile.type },
      });

      const internalAvatarUrl = `/avatars/${userId}?v=${Date.now()}`;
      const pool = c.get('PG');
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [internalAvatarUrl, userId]);
      return c.json({ success: true, avatar_url: internalAvatarUrl });
  } catch (error) {
      console.error('Erro no upload do avatar:', error);
      return c.json({ error: 'Falha ao processar o upload do avatar.' }, 500);
  }
});

// Workspaces API
apiRoutes.get('/workspaces', async (c) => {
  try {
    const pool = c.get('PG');
    const result = await pool.query(`
      SELECT w.*, u.name as owner_name
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      ORDER BY w.name
    `);
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
    
    const workspaceResult = await pool.query(`
      SELECT w.*, u.name as owner_name
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.id = $1
    `, [id]);
    
    if (workspaceResult.rows.length === 0) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    const workspace = workspaceResult.rows[0];
    
    const membersResult = await pool.query(`
      SELECT wm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM workspace_members wm
      LEFT JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = $1
      ORDER BY wm.role, u.name
    `, [id]);
    
    const spacesResult = await pool.query(`
      SELECT * FROM spaces 
      WHERE workspace_id = $1
      ORDER BY name
    `, [id]);
    
    return c.json({ 
      workspace: {
        ...workspace,
        members: membersResult.rows,
        spaces: spacesResult.rows
      }
    });
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
    
    if (spaceResult.rows.length === 0) {
      return c.json({ error: 'Space not found' }, 404);
    }
    const space = spaceResult.rows[0];
    
    const foldersResult = await pool.query(`
      SELECT * FROM folders 
      WHERE space_id = $1
      ORDER BY position, name
    `, [id]);
    
    const listsResult = await pool.query(`
      SELECT * FROM lists 
      WHERE space_id = $1 OR folder_id IN (
        SELECT id FROM folders WHERE space_id = $1
      )
      ORDER BY position, name
    `, [id]);
    
    return c.json({ 
      space: {
        ...space,
        folders: foldersResult.rows,
        lists: listsResult.rows
      }
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch space' }, 500);
  }
});

// Lists API
apiRoutes.get('/lists/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pool = c.get('PG');

    const listResult = await pool.query('SELECT * FROM lists WHERE id = $1', [id]);
    if (listResult.rows.length === 0) {
      return c.json({ error: 'List not found' }, 404);
    }
    const list = listResult.rows[0];

    const statusesResult = await pool.query('SELECT * FROM task_statuses WHERE list_id = $1 ORDER BY position', [id]);

    const tasksResult = await pool.query(`
      SELECT 
        t.*, ts.name as status_name, ts.color as status_color, u_assignee.name as assignee_name,
        u_assignee.avatar_url as assignee_avatar, u_creator.name as creator_name,
        COUNT(c.id)::int as comments_count, SUM(te.duration)::int as time_tracked
      FROM tasks t
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
      LEFT JOIN users u_creator ON t.creator_id = u_creator.id
      LEFT JOIN comments c ON t.id = c.task_id
      LEFT JOIN time_entries te ON t.id = te.task_id
      WHERE t.list_id = $1 AND t.is_archived = false
      GROUP BY t.id, ts.name, ts.color, u_assignee.name, u_assignee.avatar_url, u_creator.name
      ORDER BY t.position, t.created_at
    `, [id]);

    return c.json({
      list: { ...list, statuses: statusesResult.rows, tasks: tasksResult.rows, },
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch list' }, 500);
  }
});

// Tasks API
apiRoutes.get('/tasks/:id', async (c) => {
  try {
      const id = c.req.param('id');
      const pool = c.get('PG');
      const taskResult = await pool.query(`
          SELECT 
              t.*, ts.name as status_name, ts.color as status_color, u_assignee.name as assignee_name,
              u_assignee.avatar_url as assignee_avatar, u_creator.name as creator_name, l.name as list_name,
              COALESCE((SELECT json_agg(tags.*) FROM tags JOIN task_tags tt ON tags.id = tt.tag_id WHERE tt.task_id = t.id), '[]'::json) as tags,
              COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url)) FROM users u JOIN task_assignees ta ON u.id = ta.user_id WHERE ta.task_id = t.id), '[]'::json) as assignees,
              COALESCE((SELECT json_agg(json_build_object('id', c.id, 'content', c.content, 'created_at', c.created_at, 'user_name', u.name, 'user_avatar', u.avatar_url)) FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = t.id), '[]'::json) as comments,
              COALESCE((SELECT json_agg(json_build_object('id', st.id, 'name', st.name, 'status_id', st.status_id)) FROM tasks st WHERE st.parent_task_id = t.id), '[]'::json) as subtasks,
              COALESCE((SELECT json_agg(json_build_object('id', a.id, 'action_type', a.action_type, 'details', a.details, 'created_at', a.created_at, 'user_name', u.name, 'user_avatar', u.avatar_url)) FROM activities a JOIN users u ON a.user_id = u.id WHERE a.entity_type = 'task' AND a.entity_id = t.id ORDER BY a.created_at DESC LIMIT 10), '[]'::json) as activities
          FROM tasks t
          LEFT JOIN task_statuses ts ON t.status_id = ts.id
          LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
          LEFT JOIN users u_creator ON t.creator_id = u_creator.id
          LEFT JOIN lists l ON t.list_id = l.id
          WHERE t.id = $1
          GROUP BY t.id, ts.id, u_assignee.id, u_creator.id, l.id
      `, [id]);

      if (taskResult.rows.length === 0) {
          return c.json({ error: 'Task not found' }, 404);
      }
      return c.json({ task: taskResult.rows[0] });
  } catch (error) {
      console.error("Erro ao buscar detalhes da tarefa:", error);
      return c.json({ error: 'Failed to fetch task details' }, 500);
  }
});

apiRoutes.post('/tasks', requirePermission('task:create'), async (c) => {
  try {
      const body = await c.req.json();
      const { list_id, name, description, priority = 'normal', assignee_id, creator_id, due_date } = body;
      const pool = c.get('PG');
      const insertResult = await pool.query(`
          INSERT INTO tasks (list_id, name, description, priority, assignee_id, creator_id, due_date, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id
      `, [list_id, name, description, priority, assignee_id, creator_id, due_date]);
      const newTaskId = insertResult.rows[0].id;
      const newTaskResult = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [newTaskId]);
      return c.json({ task: newTaskResult.rows[0] }, 201);
  } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to create task' }, 500);
  }
});

apiRoutes.put('/tasks/:id', async (c) => {
  try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const { name, description, status_id, priority, assignee_id, due_date, progress } = body;
      const pool = c.get('PG');

      const oldTaskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      const oldTask = oldTaskResult.rows[0];

      await pool.query(`
          UPDATE tasks 
          SET name = $1, description = $2, status_id = $3, priority = $4, assignee_id = $5, due_date = $6, progress = $7, updated_at = NOW()
          WHERE id = $8
      `, [name, description, status_id, priority, assignee_id, due_date, progress, id]);
      
      if (oldTask && oldTask.status_id !== status_id) {
        const updatedTask = { ...oldTask, status_id: status_id };
        processAutomations('status_changed', updatedTask, pool).catch(console.error);
      }

      const updatedTaskResult = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [id]);
      return c.json({ task: updatedTaskResult.rows[0] });
  } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to update task' }, 500);
  }
});

// Dashboard & Reports
apiRoutes.get('/dashboard/stats', async (c) => { /* ... */ });
apiRoutes.get('/dashboard/activity', async (c) => { /* ... */ });
apiRoutes.get('/dashboard/my-tasks/:user_id', async (c) => { /* ... */ });
apiRoutes.get('/reports/workspace/:id/team-performance', async (c) => { /* ... */ });
apiRoutes.get('/reports/workspace/:id/priority-distribution', async (c) => { /* ... */ });
apiRoutes.get('/reports/workspace/:id/completion-trend', async (c) => { /* ... */ });

// AI
apiRoutes.post('/ai/suggest-tasks', async (c) => {
  try {
    const { goal, list_id } = await c.req.json();
    const apiKey = c.env.GEMINI_API_KEY;
    if (!goal || !list_id || !apiKey) {
      return c.json({ error: 'Dados insuficientes ou chave de API não configurada' }, 400);
    }
    const suggestions = await generateTaskSuggestions(goal, apiKey);
    return c.json({ suggestions });
  } catch(e) {
    return c.json({ error: 'Falha ao gerar sugestões' }, 500);
  }
});

// Automations
apiRoutes.get('/lists/:id/automation-context', async (c) => { /* ... */ });
apiRoutes.get('/lists/:id/automations', async (c) => { /* ... */ });
apiRoutes.post('/automations', async (c) => { /* ... */ });

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