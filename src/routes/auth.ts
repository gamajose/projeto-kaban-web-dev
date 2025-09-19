import { Hono } from 'hono';
import { sign } from 'hono/jwt'
import * as bcrypt from 'bcryptjs';
import type { CloudflareBindings } from '../types';

type Env = {
  Bindings: CloudflareBindings;
};

export const authRoutes = new Hono<Env>();

// Endpoint de Registo de Utilizador
authRoutes.post('/register', async (c) => {
  try {
    const { name, email, password } = await c.req.json();

    if (!name || !email || !password) {
      return c.json({ error: 'Nome, email e senha são obrigatórios.' }, 400);
    }

    const pool = c.get('PG');
    
    // Verificar se o utilizador já existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return c.json({ error: 'Este email já está em uso.' }, 409);
    }

    // Fazer o hash da senha - nunca guarde a senha em texto!
    const hashedPassword = await bcrypt.hash(password, 10); // O 10 é o "custo" do hash

    // Inserir o novo utilizador
    const newUserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, hashedPassword]
    );

    return c.json({ user: newUserResult.rows[0] }, 201);

  } catch (error) {
    console.error('Erro no registo:', error);
    return c.json({ error: 'Falha ao registar o utilizador.' }, 500);
  }
});

// Endpoint de Login
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: 'Email e senha são obrigatórios.' }, 400);
    }

    const pool = c.get('PG');
    const userResult = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return c.json({ error: 'Credenciais inválidas.' }, 401); // Erro genérico por segurança
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return c.json({ error: 'Credenciais inválidas.' }, 401);
    }

    // Se a senha for válida, gerar um token JWT
    const payload = {
      sub: user.id, // 'subject' do token, o ID do utilizador
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // Expira em 7 dias
    };
    const secret = c.env.JWT_SECRET; // Precisaremos de adicionar isto às nossas variáveis de ambiente
    const token = await sign(payload, secret);

    return c.json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (error) {
    console.error('Erro no login:', error);
    return c.json({ error: 'Falha ao tentar iniciar sessão.' }, 500);
  }
});