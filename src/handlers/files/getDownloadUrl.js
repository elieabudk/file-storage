import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import pool from '../../db/postgres.js'
import 'dotenv/config'

const s3 = new S3Client({ region: process.env.S3_REGION })

export const getDownloadUrl = async (req, res) => {
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

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key:    file.s3_key
    })

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    res.status(200).json({ downloadUrl, fileName: file.file_name })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al generar URL de descarga' })
  }
}