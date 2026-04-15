import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import 'dotenv/config'

const cognito = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION
})

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    const response = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }))

    const tokens = response.AuthenticationResult

    res.cookie('token', tokens.IdToken, {
      httpOnly: true,
      secure: true,       // en producción: true (requiere HTTPS)
      sameSite: 'none',
      maxAge: 3600000      // 1 hora en milisegundos
    })

    res.status(200).json({ message: 'Login exitoso', email })

  } catch (error) {
    console.error(error)
    if (error.name === 'NotAuthorizedException') {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' })
    }
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}