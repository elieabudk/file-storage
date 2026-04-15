import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import pool from '../../db/postgres.js'
import 'dotenv/config'

const s3 = new S3Client({ region: process.env.S3_REGION })

export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.sub

    const result = await pool.query(
      `SELECT * FROM files WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' })
    }

    const file = result.rows[0]

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key:    file.s3_key
    }))

    await pool.query(
      `DELETE FROM files WHERE id = $1`,
      [id]
    )

    res.status(200).json({ message: 'Archivo eliminado correctamente' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar el archivo' })
  }
}