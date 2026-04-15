import { createRemoteJWKSet, jwtVerify } from 'jose'
import 'dotenv/config'

const JWKS = createRemoteJWKSet(
  new URL(`https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
)

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token

    if (!token) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
    })

    req.user = payload
    next()

  } catch (error) {
    console.error('Error verificando token:', error.message)
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}