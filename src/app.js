import 'dotenv/config'
import express from 'express'
import serverless from 'serverless-http'
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
  const origin = req.headers.origin
  const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://d1mbsf2ysinvol.cloudfront.net'
  ]

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }

  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(express.json())
app.use(cookieParser())

app.post('/auth/login', login)
app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' })
  res.status(200).json({ message: 'Sesión cerrada' })
})
app.get('/auth/me', verifyToken, (req, res) => {
  res.status(200).json({ email: req.user.email })
})

app.get('/files', verifyToken, listFiles)
app.post('/files/upload-url', verifyToken, getUploadUrl)
app.post('/files', verifyToken, saveFile)
app.get('/files/:id/download', verifyToken, getDownloadUrl)
app.delete('/files/:id', verifyToken, deleteFile)

export const handler = serverless(app)