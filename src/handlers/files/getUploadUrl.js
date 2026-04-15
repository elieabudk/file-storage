import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import 'dotenv/config'

const s3 = new S3Client({ region: process.env.S3_REGION })

export const getUploadUrl = async (req, res) => {
  try {
    console.log('getUploadUrl ejecutado')
    console.log('Body:', req.body)
    console.log('S3_BUCKET:', process.env.S3_BUCKET)
    console.log('S3_REGION:', process.env.S3_REGION)

    const { fileName, fileType } = req.body
    const userId = req.user.sub

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName y fileType son requeridos' })
    }

    const fileId = randomUUID()
    const s3Key = `${userId}/${fileId}/${fileName}`

    const command = new PutObjectCommand({
      Bucket:      process.env.S3_BUCKET,
      Key:         s3Key,
      ContentType: fileType
    })

    console.log('Generando URL firmada...')
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    console.log('URL generada correctamente')

    res.status(200).json({ uploadUrl, fileId, s3Key })

  } catch (error) {
    console.error('Error en getUploadUrl:', error)
    res.status(500).json({ error: 'Error al generar URL de subida' })
  }
}