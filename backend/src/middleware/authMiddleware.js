import jwt from 'jsonwebtoken'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não informado.',
    })
  }

  const [, token] = authHeader.split(' ')

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'sitran_secret_key',
    )

    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({
      message: 'Token inválido.',
    })
  }
}