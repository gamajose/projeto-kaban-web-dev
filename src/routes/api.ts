import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export function setupAPIRoutes(app: Hono<{ Bindings: CloudflareBindings }>) {
  
  // Health check
  app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Users API
  app.get('/api/users', async (c) => {
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
      return c.json({ error: 'Failed to fetch users' }, 500)
    }
  })

  app.get('/api/users/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const pool = c.get('PG');
      const result = await pool.query(`
        SELECT id, email, name, avatar_url, role, status, timezone, created_at, updated_at
        FROM users 
        WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return c.json({ error: 'User not found' }, 404)
      }
      
      return c.json({ user: result.rows[0] })
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to fetch user' }, 500)
    }
  })

  // Workspaces API
  app.get('/api/workspaces', async (c) => {
    try {
      const pool = c.get('PG');
      const result = await pool.query(`
        SELECT w.*, u.name as owner_name
        FROM workspaces w
        LEFT JOIN users u ON w.owner_id = u.id
        ORDER BY w.name
      `);
      return c.json({ workspaces: result.rows })
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to fetch workspaces' }, 500)
    }
  })

  app.get('/api/workspaces/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const pool = c.get('PG');
      
      const workspaceResult = await pool.query(`
        SELECT w.*, u.name as owner_name
        FROM workspaces w
        LEFT JOIN users u ON w.owner_id = u.id
        WHERE w.id = $1
      `, [id]);
      
      if (workspaceResult.rows.length === 0) {
        return c.json({ error: 'Workspace not found' }, 404)
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
      })
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to fetch workspace' }, 500)
    }
  })

  // Spaces API
  app.get('/api/spaces/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const pool = c.get('PG');
      
      const spaceResult = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
      
      if (spaceResult.rows.length === 0) {
        return c.json({ error: 'Space not found' }, 404)
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
      })
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to fetch space' }, 500)
    }
  })

  // Lists API
  app.get('/api/lists/:id', async (c) => {
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
          t.*,
          ts.name as status_name,
          ts.color as status_color,
          u_assignee.name as assignee_name,
          u_assignee.avatar_url as assignee_avatar,
          u_creator.name as creator_name,
          COUNT(c.id)::int as comments_count,
          SUM(te.duration)::int as time_tracked
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
        list: {
          ...list,
          statuses: statusesResult.rows,
          tasks: tasksResult.rows,
        },
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to fetch list' }, 500);
    }
  });


  // Tasks API
  app.get('/api/tasks/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const pool = c.get('PG');

        const taskResult = await pool.query(`
            SELECT 
                t.*,
                ts.name as status_name,
                ts.color as status_color,
                u_assignee.name as assignee_name,
                u_assignee.avatar_url as assignee_avatar,
                u_creator.name as creator_name,
                l.name as list_name,
                COUNT(c.id)::int as comments_count,
                SUM(te.duration)::int as time_tracked
            FROM tasks t
            LEFT JOIN task_statuses ts ON t.status_id = ts.id
            LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
            LEFT JOIN users u_creator ON t.creator_id = u_creator.id
            LEFT JOIN lists l ON t.list_id = l.id
            LEFT JOIN comments c ON t.id = c.task_id
            LEFT JOIN time_entries te ON t.id = te.task_id
            WHERE t.id = $1
            GROUP BY t.id, ts.name, ts.color, u_assignee.name, u_assignee.avatar_url, u_creator.name, l.name
        `, [id]);

        if (taskResult.rows.length === 0) {
            return c.json({ error: 'Task not found' }, 404);
        }
        const task = taskResult.rows[0];

        const tagsResult = await pool.query(`
            SELECT t.* FROM tags t
            JOIN task_tags tt ON t.id = tt.tag_id
            WHERE tt.task_id = $1
            ORDER BY t.name
        `, [id]);

        const assigneesResult = await pool.query(`
            SELECT u.* FROM users u
            JOIN task_assignees ta ON u.id = ta.user_id
            WHERE ta.task_id = $1
            ORDER BY u.name
        `, [id]);

        const commentsResult = await pool.query(`
            SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.task_id = $1
            ORDER BY c.created_at DESC
        `, [id]);

        return c.json({
            task: {
                ...task,
                tags: tagsResult.rows,
                assignees: assigneesResult.rows,
                comments: commentsResult.rows,
            },
        });
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to fetch task' }, 500);
    }
  });

  // Create new task
  app.post('/api/tasks', async (c) => {
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

        const newTaskResult = await pool.query(`
            SELECT 
                t.*,
                ts.name as status_name,
                ts.color as status_color,
                u_assignee.name as assignee_name,
                u_assignee.avatar_url as assignee_avatar,
                u_creator.name as creator_name
            FROM tasks t
            LEFT JOIN task_statuses ts ON t.status_id = ts.id
            LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
            LEFT JOIN users u_creator ON t.creator_id = u_creator.id
            WHERE t.id = $1
        `, [newTaskId]);

        return c.json({ task: newTaskResult.rows[0] }, 201);
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to create task' }, 500);
    }
  });

  // Update task
  app.put('/api/tasks/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { name, description, status_id, priority, assignee_id, due_date, progress } = body;
        const pool = c.get('PG');

        await pool.query(`
            UPDATE tasks 
            SET name = $1, description = $2, status_id = $3, priority = $4, assignee_id = $5, due_date = $6, progress = $7, updated_at = NOW()
            WHERE id = $8
        `, [name, description, status_id, priority, assignee_id, due_date, progress, id]);
        
        const updatedTaskResult = await pool.query(`
            SELECT 
                t.*,
                ts.name as status_name,
                ts.color as status_color,
                u_assignee.name as assignee_name,
                u_assignee.avatar_url as assignee_avatar,
                u_creator.name as creator_name
            FROM tasks t
            LEFT JOIN task_statuses ts ON t.status_id = ts.id
            LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
            LEFT JOIN users u_creator ON t.creator_id = u_creator.id
            WHERE t.id = $1
        `, [id]);

        return c.json({ task: updatedTaskResult.rows[0] });
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to update task' }, 500);
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', async (c) => {
    try {
        const pool = c.get('PG');
        const statsResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM tasks WHERE is_archived = false) as total_tasks,
                (SELECT COUNT(*) FROM tasks WHERE is_archived = false AND status_id IN (SELECT id FROM task_statuses WHERE is_closed = true)) as completed_tasks,
                (SELECT COUNT(*) FROM tasks WHERE is_archived = false AND due_date < NOW() AND status_id NOT IN (SELECT id FROM task_statuses WHERE is_closed = true)) as overdue_tasks,
                (SELECT COUNT(*) FROM workspaces) as total_workspaces,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users
        `);
        return c.json({ stats: statsResult.rows[0] });
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
    }
  });

  // Recent activity
  app.get('/api/dashboard/activity', async (c) => {
    try {
        const pool = c.get('PG');
        const result = await pool.query(`
            SELECT 
                a.*,
                u.name as user_name,
                u.avatar_url as user_avatar,
                w.name as workspace_name
            FROM activities a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN workspaces w ON a.workspace_id = w.id
            ORDER BY a.created_at DESC
            LIMIT 20
        `);
        return c.json({ activities: result.rows });
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to fetch activities' }, 500);
    }
  });

  // My tasks
  app.get('/api/dashboard/my-tasks/:user_id', async (c) => {
    try {
        const userId = c.req.param('user_id');
        const pool = c.get('PG');
        const result = await pool.query(`
            SELECT 
                t.*,
                ts.name as status_name,
                ts.color as status_color,
                l.name as list_name,
                l.color as list_color
            FROM tasks t
            LEFT JOIN task_statuses ts ON t.status_id = ts.id
            LEFT JOIN lists l ON t.list_id = l.id
            WHERE (t.assignee_id = $1 OR t.id IN (
                SELECT task_id FROM task_assignees WHERE user_id = $1
            )) 
            AND t.is_archived = false
            AND ts.is_closed = false
            ORDER BY 
                CASE t.priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                t.due_date ASC,
                t.created_at ASC
            LIMIT 50
        `, [userId]);
        return c.json({ tasks: result.rows });
    } catch (error) {
        console.error(error);
        return c.json({ error: 'Failed to fetch tasks' }, 500);
    }
  });

}