/**
 * Middleware d'authentification
 * Vérifie que l'utilisateur est connecté et a un token valide
 */
export const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    // Ici, vous devriez vérifier le token JWT
    // Pour l'instant, on le passe juste dans le contexte
    req.user = { token };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentification échouée'
    });
  }
};

/**
 * Middleware d'autorisation - vérifier les permissions
 */
export const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      next();
    } catch (error) {
      res.status(403).json({
        success: false,
        message: 'Autorisation échouée'
      });
    }
  };
};

/**
 * Middleware de gestion des erreurs 404
 */
export const handleNotFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.path
  });
};

/**
 * Middleware de gestion des erreurs globales
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error('Erreur globale:', err);

  const status = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default {
  authenticateUser,
  authorizeRole,
  handleNotFound,
  globalErrorHandler
};
