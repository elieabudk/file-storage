import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import { login } from './handlers/auth/login.js'
import { getUploadUrl } from './handlers/files/getUploadUrl.js'
import { saveFile } from './handlers/files/saveFile.js'
import { listFiles } from './handlers/files/listFiles.js'
import { getDownloadUrl } from './handlers/files/getDownloadUrl.js'
import { deleteFile } from './handlers/files/deleteFile.js'
import { verifyToken } from './middleware/auth.js'

const app = express()

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5500')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(express.json())
app.use(cookieParser())

app.get('/test', (req, res) => {
  res.status(200).json({ mensaje: 'funciona' })
})

app.post('/auth/login', login)
app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: false, sameSite: 'strict' })
  res.status(200).json({ message: 'Sesión cerrada' })
})

app.get('/files', verifyToken, listFiles)
app.post('/files/upload-url', verifyToken, getUploadUrl)
app.post('/files', verifyToken, saveFile)
app.get('/files/:id/download', verifyToken, getDownloadUrl)
app.delete('/files/:id', verifyToken, deleteFile)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})