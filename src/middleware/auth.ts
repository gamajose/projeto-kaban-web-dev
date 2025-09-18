// src/middleware/auth.ts

import { createMiddleware } from 'hono/factory';
import type { Pool } from 'pg';
import type { CloudflareBindings } from '../types';

type Permission = 'task:create' | 'task:edit:any' | 'workspace:edit';

const permissionMap = {
  // Mapeamento baseado na nossa tabela de permissões
  owner: ['task:create', 'task:edit:any', 'workspace:edit'],
  admin: ['task:create', 'task:edit:any', 'workspace:edit'],
  member: ['task:create'],
  guest: ['task:create'],
};

export const requirePermission = (permission: Permission) => {
  return createMiddleware<{ Bindings: CloudflareBindings }>(async (c, next) => {
    // Em um sistema real, o ID do usuário viria de um token de sessão/JWT
    // Por agora, vamos simular que o usuário é o 'Admin User' (ID 1)
    const currentUserId = 1;
    
    // Precisamos saber em qual workspace a ação está a ocorrer
    // Vamos extrair o workspaceId a partir dos parâmetros da rota ou do corpo do pedido
    let workspaceId: number | undefined;
    if (c.req.param('workspace_id')) {
      workspaceId = parseInt(c.req.param('workspace_id'));
    } else {
        const body = await c.req.json().catch(() => ({}));
        if (body.workspace_id) workspaceId = body.workspace_id;
    }

    if (!workspaceId) {
        // Se não conseguirmos determinar o workspace, não podemos verificar a permissão
        return c.json({ error: 'Workspace ID não especificado' }, 400);
    }

    const pool = c.get('PG');
    const memberResult = await pool.query(
      'SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2',
      [currentUserId, workspaceId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: 'Acesso negado: Você não é membro deste workspace.' }, 403);
    }

    const userRole = memberResult.rows[0].role as keyof typeof permissionMap;
    const userPermissions = permissionMap[userRole] || [];

    if (!userPermissions.includes(permission)) {
      return c.json({ error: 'Acesso negado: Você não tem permissão para realizar esta ação.' }, 403);
    }

    // Se tudo estiver OK, prossiga para a próxima função
    await next();
  });
};