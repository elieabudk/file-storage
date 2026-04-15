import pool from '../../db/postgres.js'

export const saveFile = async (req, res) => {
  try {
    const { fileName, fileType, fileSize, s3Key } = req.body
    const userId = req.user.sub

    if (!fileName || !fileType || !fileSize || !s3Key) {
      return res.status(400).json({ error: 'Faltan datos del archivo' })
    }

    const result = await pool.query(
      `INSERT INTO files (user_id, file_name, file_type, file_size, s3_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, fileName, fileType, fileSize, s3Key]
    )

    res.status(201).json({ file: result.rows[0] })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al guardar el archivo' })
  }
}