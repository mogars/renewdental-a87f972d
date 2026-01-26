import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const getEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is missing. Please check your .env file.`);
  }
  return value;
};

const poolConfig: PoolOptions = {
  host: getEnvVar('DATABASE_HOST'),
  port: parseInt(getEnvVar('DATABASE_PORT')),
  database: getEnvVar('DATABASE_NAME'),
  user: getEnvVar('DATABASE_USER'),
  password: getEnvVar('DATABASE_PASSWORD'),
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
};

export const pool: Pool = mysql.createPool(poolConfig);

// Convert PostgreSQL $1, $2 placeholders to MySQL ? placeholders
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\$\d+/g, () => '?');
}

// Convert PostgreSQL-specific syntax to MySQL
function convertQuery(sql: string): string {
  let converted = convertPlaceholders(sql);

  // Convert RETURNING * to nothing (MySQL doesn't support it directly)
  // We'll handle this separately in the query functions
  converted = converted.replace(/\s+RETURNING\s+\*/gi, '');
  converted = converted.replace(/\s+RETURNING\s+\w+/gi, '');

  // Convert PostgreSQL boolean literals
  converted = converted.replace(/\btrue\b/gi, '1');
  converted = converted.replace(/\bfalse\b/gi, '0');

  // Convert json_build_object to JSON_OBJECT
  converted = converted.replace(/json_build_object\s*\(/gi, 'JSON_OBJECT(');

  // Convert ON CONFLICT to ON DUPLICATE KEY UPDATE
  const onConflictMatch = converted.match(/ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+NOTHING/gi);
  if (onConflictMatch) {
    converted = converted.replace(/ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+NOTHING/gi,
      'ON DUPLICATE KEY UPDATE id = id');
  }

  return converted;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const connection = await pool.getConnection();
  try {
    const convertedQuery = convertQuery(text);
    const [rows] = await connection.query<RowDataPacket[]>(convertedQuery, params);
    return rows as T[];
  } catch (error) {
    console.error(`Database query error: ${text}`);
    console.error(error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Special function for INSERT that returns the inserted row
export async function insertAndReturn<T = any>(
  tableName: string,
  insertQuery: string,
  params: any[]
): Promise<T | null> {
  const connection = await pool.getConnection();
  try {
    const convertedQuery = convertQuery(insertQuery);
    const [result] = await connection.query<ResultSetHeader>(convertedQuery, params);

    // For UUIDs, the ID should be in params[0]
    const id = params[0];
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
    return (rows[0] as T) || null;
  } finally {
    connection.release();
  }
}

// Special function for UPDATE that returns the updated row
export async function updateAndReturn<T = any>(
  tableName: string,
  updateQuery: string,
  params: any[],
  idParamIndex: number
): Promise<T | null> {
  const connection = await pool.getConnection();
  try {
    const convertedQuery = convertQuery(updateQuery);
    await connection.query<ResultSetHeader>(convertedQuery, params);

    const id = params[idParamIndex];
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
    return (rows[0] as T) || null;
  } finally {
    connection.release();
  }
}

export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('✗ MySQL connection failed:', err.message);
  });
