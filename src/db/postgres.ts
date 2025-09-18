import { Pool } from 'pg';

//Configurações do DB
const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'jose',
    password: 'Joseluiz1',
    database: 'kaban_dev',
});

export default pool;