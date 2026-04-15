import 'dotenv/config'
import pool from './postgres.js'

const createTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id     VARCHAR(255) NOT NULL,
      file_name   VARCHAR(255) NOT NULL,
      file_type   VARCHAR(100) NOT NULL,
      file_size   INTEGER NOT NULL,
      s3_key      VARCHAR(500) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `)
  console.log('Tabla files creada correctamente')
}

export const handler = async () => {
  try {
    await createTable()
    return { statusCode: 200, body: 'Migración completada' }
  } catch (error) {
    console.error('Error:', error)
    return { statusCode: 500, body: error.message }
  }
}

if (process.argv[1].includes('migrate')) {
  createTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}