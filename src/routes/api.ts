import { Hono } from 'hono'
import type { CloudflareBindings, User, Workspace, Space, Task, TaskWithDetails } from '../types'

export function setupAPIRoutes(app: Hono<{ Bindings: CloudflareBindings }>) {
  
  // Health check
  app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Users API
  app.get('/api/users', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(`
        SELECT id, email, name, avatar_url, role, status, timezone, created_at, updated_at
        FROM users 
        ORDER BY name
      `).all()
      
      return c.json({ users: results })
    } catch (error) {
      return c.json({ error: 'Failed to fetch users' }, 500)
    }
  })

  app.get('/api/users/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const { results } = await c.env.DB.prepare(`
        SELECT id, email, name, avatar_url, role, status, timezone, created_at, updated_at
        FROM users 
        WHERE id = ?
      `).bind(id).all()
      
      if (results.length === 0) {
        return c.json({ error: 'User not found' }, 404)
      }
      
      return c.json({ user: results[0] })
    } catch (error) {
      return c.json({ error: 'Failed to fetch user' }, 500)
    }
  })

  // Workspaces API
  app.get('/api/workspaces', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(`
        SELECT w.*, u.name as owner_name
        FROM workspaces w
        LEFT JOIN users u ON w.owner_id = u.id
        ORDER BY w.name
      `).all()
      
      return c.json({ workspaces: results })
    } catch (error) {
      return c.json({ error: 'Failed to fetch workspaces' }, 500)
    }
  })

  app.get('/api/workspaces/:id', async (c) => {
    try {
      const id = c.req.param('id')
      
      // Get workspace details
      const { results: workspaceResults } = await c.env.DB.prepare(`
        SELECT w.*, u.name as owner_name
        FROM workspaces w
        LEFT JOIN users u ON w.owner_id = u.id
        WHERE w.id = ?
      `).bind(id).all()
      
      if (workspaceResults.length === 0) {
        return c.json({ error: 'Workspace not found' }, 404)
      }
      
      const workspace = workspaceResults[0]
      
      // Get workspace members
      const { results: membersResults } = await c.env.DB.prepare(`
        SELECT wm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
        FROM workspace_members wm
        LEFT JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ?
        ORDER BY wm.role, u.name
      `).bind(id).all()
      
      // Get spaces
      const { results: spacesResults } = await c.env.DB.prepare(`
        SELECT * FROM spaces 
        WHERE workspace_id = ?
        ORDER BY name
      `).bind(id).all()
      
      return c.json({ 
        workspace: {
          ...workspace,
          members: membersResults,
          spaces: spacesResults
        }
      })
    } catch (error) {
      return c.json({ error: 'Failed to fetch workspace' }, 500)
    }
  })

  // Spaces API
  app.get('/api/spaces/:id', async (c) => {
    try {
      const id = c.req.param('id')
      
      // Get space details
      const { results: spaceResults } = await c.env.DB.prepare(`
        SELECT * FROM spaces WHERE id = ?
      `).bind(id).all()
      
      if (spaceResults.length === 0) {
        return c.json({ error: 'Space not found' }, 404)
      }
      
      const space = spaceResults[0]
      
      // Get folders
      const { results: foldersResults } = await c.env.DB.prepare(`
        SELECT * FROM folders 
        WHERE space_id = ?
        ORDER BY position, name
      `).bind(id).all()
      
      // Get lists (both in folders and directly in space)
      const { results: listsResults } = await c.env.DB.prepare(`
        SELECT * FROM lists 
        WHERE space_id = ? OR folder_id IN (
          SELECT id FROM folders WHERE space_id = ?
        )
        ORDER BY position, name
      `).bind(id, id).all()
      
      return c.json({ 
        space: {
          ...space,
          folders: foldersResults,
          lists: listsResults
        }
      })
    } catch (error) {
      return c.json({ error: 'Failed to fetch space' }, 500)
    }
  })

  // Lists API
  app.get('/api/lists/:id', async (c) => {
    try {
      const id = c.req.param('id')
      
      // Get list details
      const { results: listResults } = await c.env.DB.prepare(`
        SELECT * FROM lists WHERE id = ?
      `).bind(id).all()
      
      if (listResults.length === 0) {
        return c.json({ error: 'List not found' }, 404)
      }
      
      const list = listResults[0]
      
      // Get task statuses
      const { results: statusesResults } = await c.env.DB.prepare(`
        SELECT * FROM task_statuses 
        WHERE list_id = ?
        ORDER BY position
      `).bind(id).all()
      
      // Get tasks with details
      const { results: tasksResults } = await c.env.DB.prepare(`
        SELECT 
          t.*,
          ts.name as status_name,
          ts.color as status_color,
          u_assignee.name as assignee_name,
          u_assignee.avatar_url as assignee_avatar,
          u_creator.name as creator_name,
          COUNT(c.id) as comments_count,
          SUM(te.duration) as time_tracked
        FROM tasks t
        LEFT JOIN task_statuses ts ON t.status_id = ts.id
        LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
        LEFT JOIN users u_creator ON t.creator_id = u_creator.id
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN time_entries te ON t.id = te.task_id
        WHERE t.list_id = ? AND t.is_archived = 0
        GROUP BY t.id
        ORDER BY t.position, t.created_at
      `).bind(id).all()
      
      return c.json({ 
        list: {
          ...list,
          statuses: statusesResults,
          tasks: tasksResults
        }
      })
    } catch (error) {
      return c.json({ error: 'Failed to fetch list' }, 500)
    }
  })

  // Tasks API
  app.get('/api/tasks/:id', async (c) => {
    try {
      const id = c.req.param('id')
      
      // Get task with full details
      const { results: taskResults } = await c.env.DB.prepare(`
        SELECT 
          t.*,
          ts.name as status_name,
          ts.color as status_color,
          u_assignee.name as assignee_name,
          u_assignee.avatar_url as assignee_avatar,
          u_creator.name as creator_name,
          l.name as list_name,
          COUNT(c.id) as comments_count,
          SUM(te.duration) as time_tracked
        FROM tasks t
        LEFT JOIN task_statuses ts ON t.status_id = ts.id
        LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
        LEFT JOIN users u_creator ON t.creator_id = u_creator.id
        LEFT JOIN lists l ON t.list_id = l.id
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN time_entries te ON t.id = te.task_id
        WHERE t.id = ?
        GROUP BY t.id
      `).bind(id).all()
      
      if (taskResults.length === 0) {
        return c.json({ error: 'Task not found' }, 404)
      }
      
      const task = taskResults[0]
      
      // Get task tags
      const { results: tagsResults } = await c.env.DB.prepare(`
        SELECT t.* FROM tags t
        JOIN task_tags tt ON t.id = tt.tag_id
        WHERE tt.task_id = ?
        ORDER BY t.name
      `).bind(id).all()
      
      // Get task assignees
      const { results: assigneesResults } = await c.env.DB.prepare(`
        SELECT u.* FROM users u
        JOIN task_assignees ta ON u.id = ta.user_id
        WHERE ta.task_id = ?
        ORDER BY u.name
      `).bind(id).all()
      
      // Get comments
      const { results: commentsResults } = await c.env.DB.prepare(`
        SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at DESC
      `).bind(id).all()
      
      return c.json({ 
        task: {
          ...task,
          tags: tagsResults,
          assignees: assigneesResults,
          comments: commentsResults
        }
      })
    } catch (error) {
      return c.json({ error: 'Failed to fetch task' }, 500)
    }
  })

  // Create new task
  app.post('/api/tasks', async (c) => {
    try {
      const body = await c.req.json()
      const { list_id, name, description, priority = 'normal', assignee_id, creator_id, due_date } = body
      
      const { success, meta } = await c.env.DB.prepare(`
        INSERT INTO tasks (list_id, name, description, priority, assignee_id, creator_id, due_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(list_id, name, description, priority, assignee_id, creator_id, due_date).run()
      
      if (!success) {
        return c.json({ error: 'Failed to create task' }, 500)
      }
      
      // Get the created task
      const { results } = await c.env.DB.prepare(`
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
        WHERE t.id = ?
      `).bind(meta.last_row_id).all()
      
      return c.json({ task: results[0] }, 201)
    } catch (error) {
      return c.json({ error: 'Failed to create task' }, 500)
    }
  })

  // Update task
  app.put('/api/tasks/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const body = await c.req.json()
      const { name, description, status_id, priority, assignee_id, due_date, progress } = body
      
      const { success } = await c.env.DB.prepare(`
        UPDATE tasks 
        SET name = ?, description = ?, status_id = ?, priority = ?, assignee_id = ?, due_date = ?, progress = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(name, description, status_id, priority, assignee_id, due_date, progress, id).run()
      
      if (!success) {
        return c.json({ error: 'Failed to update task' }, 500)
      }
      
      // Return updated task
      const { results } = await c.env.DB.prepare(`
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
        WHERE t.id = ?
      `).bind(id).all()
      
      return c.json({ task: results[0] })
    } catch (error) {
      return c.json({ error: 'Failed to update task' }, 500)
    }
  })

  // Dashboard stats
  app.get('/api/dashboard/stats', async (c) => {
    try {
      // Get basic stats
      const { results: statsResults } = await c.env.DB.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM tasks WHERE is_archived = 0) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE is_archived = 0 AND status_id IN (SELECT id FROM task_statuses WHERE is_closed = 1)) as completed_tasks,
          (SELECT COUNT(*) FROM tasks WHERE is_archived = 0 AND due_date < datetime('now') AND status_id NOT IN (SELECT id FROM task_statuses WHERE is_closed = 1)) as overdue_tasks,
          (SELECT COUNT(*) FROM workspaces) as total_workspaces,
          (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users
      `).all()
      
      return c.json({ stats: statsResults[0] })
    } catch (error) {
      return c.json({ error: 'Failed to fetch dashboard stats' }, 500)
    }
  })

  // Recent activity
  app.get('/api/dashboard/activity', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(`
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
      `).all()
      
      return c.json({ activities: results })
    } catch (error) {
      return c.json({ error: 'Failed to fetch activities' }, 500)
    }
  })

  // My tasks
  app.get('/api/dashboard/my-tasks/:user_id', async (c) => {
    try {
      const userId = c.req.param('user_id')
      
      const { results } = await c.env.DB.prepare(`
        SELECT 
          t.*,
          ts.name as status_name,
          ts.color as status_color,
          l.name as list_name,
          l.color as list_color
        FROM tasks t
        LEFT JOIN task_statuses ts ON t.status_id = ts.id
        LEFT JOIN lists l ON t.list_id = l.id
        WHERE (t.assignee_id = ? OR t.id IN (
          SELECT task_id FROM task_assignees WHERE user_id = ?
        )) 
        AND t.is_archived = 0
        AND ts.is_closed = 0
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
      `).bind(userId, userId).all()
      
      return c.json({ tasks: results })
    } catch (error) {
      return c.json({ error: 'Failed to fetch tasks' }, 500)
    }
  })

}