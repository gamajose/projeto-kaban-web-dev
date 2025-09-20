// src/middleware/auth.ts

import { createMiddleware } from 'hono/factory';
import type { Pool } from 'pg';
import { verify } from 'hono/jwt';
import type { CloudflareBindings } from '../types';

type Permission = 'task:create' | 'task:edit:any' | 'workspace:edit';

const permissionMap = {
  // Mapeamento baseado na nossa tabela de permissões
  owner: ['task:create', 'task:edit:any', 'workspace:edit'],
  admin: ['task:create', 'task:edit:any', 'workspace:edit'],
  member: ['task:create'],
  guest: ['task:create'],
};

export const jwtMiddleware = createMiddleware<{ Bindings: CloudflareBindings }>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Token em falta ou mal formatado' }, 401);
    }
    
    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET;

    try {
        const decodedPayload = await verify(token, secret);
        c.set('jwtPayload', decodedPayload); // Guarda o payload do token para uso posterior
        await next();
    } catch (error) {
        return c.json({ error: 'Token inválido' }, 401);
    }
});


export const requirePermission = (permission: Permission) => {
  return createMiddleware<{ Bindings: CloudflareBindings }>(async (c, next) => {
    const payload = c.get('jwtPayload');
    if (!payload || !payload.sub) {
        return c.json({ error: 'Payload do token inválido' }, 401);
    }


    const currentUserId = payload.sub as number;
    
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