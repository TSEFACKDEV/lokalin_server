import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import fs from 'fs';
import connectDB from './config/database.js';
import env from './config/env.js';
import router from './routes/index.js';
import initializeSocket from './socket/socket.js';
import NotificationService from './services/NotificationService.js';
import { log } from 'node:console';
// Import des routes

const app = express();
const server = http.createServer(app);

// Configuration CORS flexible pour développement
const corsOptions = {
  origin: function (origin, callback) {
    // Autorise les requêtes sans origin (mobile, desktop apps)
    if (!origin) {
      return callback(null, true);
    }
    
    // Autorise localhost sur tous les ports en développement
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // En production, vérifier contre les domaines autorisés
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('CORS non autorisé'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Désactiver CSP pour développement
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (images uploadées)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration pour servir les fichiers uploads avec CORS
const uploadsPath = path.join(__dirname, 'uploads');
console.log('📁 Chemin des uploads:', uploadsPath);

app.use('/uploads', (req, res, next) => {
  // Ajouter les headers CORS pour les images
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

// Routes

// Route de test
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route de test pour les uploads
app.get('/api/v1/test-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    const equipementsPath = path.join(uploadsPath, 'equipements');
    const files = fs.existsSync(equipementsPath) ? fs.readdirSync(equipementsPath) : [];
    
    res.json({
      success: true,
      uploadsPath,
      equipementsPath,
      filesCount: files.length,
      files: files.slice(0, 10).map(file => ({
        name: file,
        url: `${req.protocol}://${req.get('host')}/uploads/equipements/${file}`
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      uploadsPath
    });
  }
});

//Routes principale de l'api lokalink
app.use('/api/lokalink/v1', router);



// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(env.nodeEnv === 'development' && { stack: err.stack })
  });
});

// Démarrage du serveur
const startServer = async () => {
  await connectDB();
  
  // Initialiser Socket.IO
  const io = initializeSocket(server);
  
  // Initialiser le NotificationService avec l'instance io
  NotificationService.initialize(io);
  
  // Stocker l'instance io dans app pour y accéder depuis les contrôleurs
  app.locals.io = io;
  app.locals.notificationService = NotificationService;

  server.listen(env.port, () => {
   console.log("=============================================");
   console.info(`[Server] Running on http://${env.host}:${env.port}`);
   console.log(`📡 WebSocket (Socket.IO) actif`);
   console.log(`📬 NotificationService actif`);
   console.log("=============================================");
   
  });
};

startServer();

export default app;