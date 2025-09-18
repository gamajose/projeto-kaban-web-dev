import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'
import { generateTaskSuggestions } from '../services/ai'; 
import { processAutomations } from '../services/automation';
import { requirePermission } from '../middleware/auth'; 

type Env = {
  Bindings: CloudflareBindings
}

export const apiRoutes = new Hono<Env>();
  
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
  // Atualizar informações do perfil do usuário
  app.put('/api/users/:id/profile', async (c) => {
      const userId = c.req.param('id');
      const { name, timezone } = await c.req.json();

      // Adicione validação para garantir que o usuário só pode editar o seu próprio perfil
      // (Simulando o usuário atual com ID 1)
      if (parseInt(userId) !== 1) {
          return c.json({ error: 'Não autorizado' }, 403);
      }

      const pool = c.get('PG');
      await pool.query('UPDATE users SET name = $1, timezone = $2 WHERE id = $3', [name, timezone, userId]);
      return c.json({ success: true });
  });

  app.post('/api/users/:id/avatar', async (c) => {
    const userId = c.req.param('id');
    // Simulação do ID do utilizador logado
    const currentUserId = 1;

    if (parseInt(userId) !== currentUserId) {
        return c.json({ error: 'Não autorizado' }, 403);
    }

    try {
        const body = await c.req.parseBody();
        const avatarFile = body['avatar'] as File;

        if (!avatarFile || !(avatarFile instanceof File)) {
            return c.json({ error: 'Ficheiro de avatar não enviado ou inválido.' }, 400);
        }
        
        // Obtenha o bucket R2 a partir do ambiente
        const r2Bucket = c.env.AVATAR_BUCKET;
        const fileKey = `avatars/user-${userId}`; // Usamos uma chave simples por utilizador

        // Faz o upload do ficheiro para o R2
        await r2Bucket.put(fileKey, await avatarFile.arrayBuffer(), {
            httpMetadata: { contentType: avatarFile.type },
        });

        // O URL que guardamos na base de dados é a nossa própria rota para servir o ficheiro
        const internalAvatarUrl = `/avatars/${userId}?v=${Date.now()}`;
        
        const pool = c.get('PG');
        await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [internalAvatarUrl, userId]);

        // Retornamos a nova URL para o frontend atualizar a imagem imediatamente
        return c.json({ success: true, avatar_url: internalAvatarUrl });

    } catch (error) {
        console.error('Erro no upload do avatar:', error);
        return c.json({ error: 'Falha ao processar o upload do avatar.' }, 500);
    }
  });

  


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

        // Esta é a nossa nova consulta "tudo-em-um"
        const taskResult = await pool.query(`
            SELECT 
                t.*,
                ts.name as status_name,
                ts.color as status_color,
                u_assignee.name as assignee_name,
                u_assignee.avatar_url as assignee_avatar,
                u_creator.name as creator_name,
                l.name as list_name,
                
                -- Agrega todas as tags em um array JSON. Retorna um array vazio se não houver tags.
                COALESCE(
                    (SELECT json_agg(tags.*) FROM tags JOIN task_tags tt ON tags.id = tt.tag_id WHERE tt.task_id = t.id),
                    '[]'::json
                ) as tags,
                
                -- Agrega todos os responsáveis (assignees) em um array JSON.
                COALESCE(
                    (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url)) 
                     FROM users u JOIN task_assignees ta ON u.id = ta.user_id WHERE ta.task_id = t.id),
                    '[]'::json
                ) as assignees,

                -- Agrega todos os comentários em um array JSON, incluindo dados do usuário.
                COALESCE(
                    (SELECT json_agg(json_build_object('id', c.id, 'content', c.content, 'created_at', c.created_at, 'user_name', u.name, 'user_avatar', u.avatar_url))
                     FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = t.id),
                    '[]'::json
                ) as comments,

                -- Agrega todas as subtarefas em um array JSON.
                COALESCE(
                    (SELECT json_agg(json_build_object('id', st.id, 'name', st.name, 'status_id', st.status_id)) 
                     FROM tasks st WHERE st.parent_task_id = t.id),
                    '[]'::json
                ) as subtasks,

                -- Agrega as últimas 10 atividades relacionadas a esta tarefa.
                COALESCE(
                    (SELECT json_agg(json_build_object('id', a.id, 'action_type', a.action_type, 'details', a.details, 'created_at', a.created_at, 'user_name', u.name, 'user_avatar', u.avatar_url))
                     FROM activities a JOIN users u ON a.user_id = u.id WHERE a.entity_type = 'task' AND a.entity_id = t.id ORDER BY a.created_at DESC LIMIT 10),
                    '[]'::json
                ) as activities

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
        
        // A resposta do banco de dados já contém tudo o que precisamos!
        const taskWithDetails = taskResult.rows[0];

        return c.json({ task: taskWithDetails });

    } catch (error) {
        console.error("Erro ao buscar detalhes da tarefa:", error);
        return c.json({ error: 'Failed to fetch task details' }, 500);
    }
  });
  // Create new task
  app.post('/api/tasks', requirePermission('task:create'), async (c) => {
    try {
        const body = await c.req.json();
        // Adicionei workspace_id ao corpo para que o middleware de permissão funcione
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

  // API de Inteligência Artificial
 app.post('/api/ai/suggest-tasks', async (c) => {
    try {
      const { goal, list_id } = await c.req.json();
      const apiKey = c.env.GEMINI_API_KEY; // Obtenha a chave do ambiente

      if (!goal || !list_id) {
        return c.json({ error: 'O objetivo (goal) e o ID da lista (list_id) são obrigatórios' }, 400);
      }
      
      if (!apiKey) {
        return c.json({ error: 'A chave de API do servidor não está configurada.' }, 500);
      }

      // Passe a chave da API para a função
      const suggestions = await generateTaskSuggestions(goal, apiKey);

      const formattedSuggestions = suggestions.map(s => ({
        ...s,
        list_id: list_id,
        creator_id: 1, 
      }));
      
      return c.json({ suggestions: formattedSuggestions });

    } catch (error) {
      console.error(error);
      return c.json({ error: 'Falha ao gerar sugestões de tarefas' }, 500);
    }
  });

  // 1. Endpoint para obter dados para construir o formulário de automação
  app.get('/api/lists/:id/automation-context', async (c) => {
    try {
      const listId = c.req.param('id');
      const pool = c.get('PG');

      // Obter os status da lista
      const statusesResult = await pool.query('SELECT id, name FROM task_statuses WHERE list_id = $1 ORDER BY position', [listId]);
      
      // Obter os membros do workspace (para atribuição)
      const workspaceIdResult = await pool.query('SELECT s.workspace_id FROM lists l JOIN spaces s ON l.space_id = s.id WHERE l.id = $1', [listId]);
      const workspaceId = workspaceIdResult.rows[0]?.workspace_id;
      
      const membersResult = await pool.query(`
        SELECT u.id, u.name FROM users u
        JOIN workspace_members wm ON u.id = wm.user_id
        WHERE wm.workspace_id = $1 ORDER BY u.name
      `, [workspaceId]);

      return c.json({
        statuses: statusesResult.rows,
        members: membersResult.rows
      });

    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to fetch automation context' }, 500);
    }
  });

  // 2. Endpoint para listar as automações de uma lista
  app.get('/api/lists/:id/automations', async (c) => {
    const listId = c.req.param('id');
    const pool = c.get('PG');
    const result = await pool.query('SELECT * FROM automations WHERE list_id = $1 ORDER BY name', [listId]);
    return c.json({ automations: result.rows });
  });

  // 3. Endpoint para criar uma nova automação
  app.post('/api/automations', async (c) => {
    try {
      const { list_id, name, trigger_type, trigger_config, action_type, action_config } = await c.req.json();
      const pool = c.get('PG');
      
      const result = await pool.query(`
        INSERT INTO automations (list_id, name, trigger_type, trigger_config, action_type, action_config)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [list_id, name, trigger_type, JSON.stringify(trigger_config), action_type, JSON.stringify(action_config)]);

      return c.json({ automation: result.rows[0] }, 201);
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Failed to create automation' }, 500);
    }
  });
}

export function setupPublicRoutes(app: Hono<{ Bindings: CloudflareBindings }>) {
    app.get('/avatars/:id', async (c) => {
        const userId = c.req.param('id');
        const fileKey = `avatars/user-${userId}`;
        
        try {
            const r2Object = await c.env.AVATAR_BUCKET.get(fileKey);

            if (r2Object === null) {
                return c.notFound();
            }

            const headers = new Headers();
            r2Object.writeHttpMetadata(headers);
            headers.set('etag', r2Object.httpEtag);
            // Adicione um cache header para que o navegador não peça a imagem repetidamente
            headers.set('Cache-Control', 'public, max-age=3600'); 

            return new Response(r2Object.body, {
                headers,
            });
        } catch (error) {
            console.error('Erro ao servir avatar do R2:', error);
            return c.text('Erro ao buscar imagem', 500);
        }
    });

    // Endpoint para o relatório de Desempenho da Equipa
  app.get('/api/reports/workspace/:id/team-performance', async (c) => {
    const workspaceId = c.req.param('id');
    const pool = c.get('PG');

    try {
      // Esta consulta conta as tarefas concluídas (is_closed = true) e agrupa-as por utilizador
      const result = await pool.query(`
        SELECT u.name, COUNT(t.id)::int as completed_tasks
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        JOIN task_statuses ts ON t.status_id = ts.id
        JOIN lists l ON t.list_id = l.id
        LEFT JOIN spaces s_direct ON l.space_id = s_direct.id
        LEFT JOIN folders f ON l.folder_id = f.id
        LEFT JOIN spaces s_folder ON f.space_id = s_folder.id
        WHERE (s_direct.workspace_id = $1 OR s_folder.workspace_id = $1) AND ts.is_closed = true
        GROUP BY u.name
        ORDER BY completed_tasks DESC;
      `, [workspaceId]);

      return c.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao gerar relatório de desempenho:', error);
      return c.json({ error: 'Falha ao gerar relatório' }, 500);
    }
  });

  // Endpoint para o relatório de Distribuição de Tarefas por Prioridade
  app.get('/api/reports/workspace/:id/priority-distribution', async (c) => {
    const workspaceId = c.req.param('id');
    const pool = c.get('PG');

     try {
      const result = await pool.query(`
        SELECT t.priority, COUNT(t.id)::int as task_count
        FROM tasks t
        JOIN lists l ON t.list_id = l.id
        LEFT JOIN spaces s_direct ON l.space_id = s_direct.id
        LEFT JOIN folders f ON l.folder_id = f.id
        LEFT JOIN spaces s_folder ON f.space_id = s_folder.id
        WHERE s_direct.workspace_id = $1 OR s_folder.workspace_id = $1
        GROUP BY t.priority;
      `, [workspaceId]);

      return c.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao gerar relatório de prioridade:', error);
      return c.json({ error: 'Falha ao gerar relatório' }, 500);
    }
  });

  // Endpoint para o relatório de Tendência de Conclusão
  app.get('/api/reports/workspace/:id/completion-trend', async (c) => {
    const workspaceId = c.req.param('id');
    const pool = c.get('PG');
    // Esta consulta é mais complexa e pode ser otimizada com o tempo.
    // Ela agrupa as tarefas criadas e concluídas por dia.
    try {
      const result = await pool.query(`
        WITH dates AS (
          SELECT generate_series(
            (SELECT MIN(created_at) FROM tasks)::date,
            CURRENT_DATE,
            '1 day'::interval
          ) AS date
        ),
        created AS (
          SELECT created_at::date as date, COUNT(id) as count
          FROM tasks t JOIN lists l ON t.list_id = l.id JOIN spaces s ON l.space_id = s.id WHERE s.workspace_id = $1
          GROUP BY 1
        ),
        completed AS (
          SELECT updated_at::date as date, COUNT(id) as count
          FROM tasks t
          JOIN task_statuses ts ON t.status_id = ts.id JOIN lists l ON t.list_id = l.id JOIN spaces s ON l.space_id = s.id
          WHERE ts.is_closed = true AND s.workspace_id = $1
          GROUP BY 1
        )
        SELECT 
          to_char(dates.date, 'YYYY-MM-DD') as date,
          COALESCE(created.count, 0) as created_count,
          COALESCE(completed.count, 0) as completed_count
        FROM dates
        LEFT JOIN created ON dates.date = created.date
        LEFT JOIN completed ON dates.date = completed.date
        ORDER BY dates.date;
      `, [workspaceId]);

      return c.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao gerar relatório de tendência:', error);
      return c.json({ error: 'Falha ao gerar relatório' }, 500);
    }
  });

}

