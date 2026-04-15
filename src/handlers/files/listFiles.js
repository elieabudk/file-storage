import pool from '../../db/postgres.js'

export const listFiles = async (req, res) => {
  try {
    console.log('listFiles ejecutado')
    console.log('Usuario:', req.user)
    
    const userId = req.user.sub

    const result = await pool.query(
      `SELECT * FROM files WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )

    console.log('Archivos encontrados:', result.rows.length)

    res.status(200).json({ files: result.rows })

  } catch (error) {
    console.error('Error en listFiles:', error)
    res.status(500).json({ error: 'Error al listar archivos' })
  }
}