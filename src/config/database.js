import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
  try {
    console.log('🔗 Tentative de connexion à MongoDB...');
    console.log(`📊 URI MongoDB: ${env.mongodbUri}`);
    console.log(`🌍 Environnement: ${env.nodeEnv}`);
    
    // ✅ Configuration corrigée pour Mongoose 6+
    const conn = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Ces options ne sont plus nécessaires avec Mongoose 6+
      // useNewUrlParser et useUnifiedTopology sont activés par défaut
    });
    
    console.info(`[Database] Connected successfully: ${conn.connection.host}`);
    console.log(`📁 Base de données: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error(`❌ Erreur de connexion MongoDB: ${error.message}`);
    console.error('💡 Vérifiez que:');
    console.error('   1. MongoDB est installé et en cours d\'exécution');
    console.error('   2. L\'URI MongoDB est correcte dans .env');
    console.error('   3. Le service MongoDB est démarré (mongod)');
    
    // En mode développement, on peut quitter
    if (env.nodeEnv === 'development') {
      process.exit(1);
    }
    
    throw error;
  }
};

export default connectDB;