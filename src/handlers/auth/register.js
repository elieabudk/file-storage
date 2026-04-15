import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider'
import 'dotenv/config'

const cognito = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION
})

export const register = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      MessageAction: 'SUPPRESS',
      TemporaryPassword: password
    }))

    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    }))

    res.status(201).json({ message: 'Usuario creado correctamente' })

  } catch (error) {
    console.error(error)
    if (error.name === 'UsernameExistsException') {
      return res.status(400).json({ error: 'El email ya está registrado' })
    }
    res.status(500).json({ error: 'Error al crear el usuario' })
  }
}