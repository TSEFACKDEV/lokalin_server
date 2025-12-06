import mongoose from 'mongoose';
import env from '../config/env.js';
import Reservation from '../models/Reservation.model.js';

// Script pour nettoyer les réservations de test
async function cleanTestReservations() {
  try {
    // Connexion à la base de données
    await mongoose.connect(env.mongodbUri);
    console.log('✅ Connecté à MongoDB');

    // Supprimer toutes les réservations en attente
    const result = await Reservation.deleteMany({ 
      statut: 'en_attente'
    });

    console.log(`🗑️  ${result.deletedCount} réservation(s) en attente supprimée(s)`);

    // Ou supprimer TOUTES les réservations (décommenter si nécessaire)
    // const result = await Reservation.deleteMany({});
    // console.log(`🗑️  ${result.deletedCount} réservation(s) supprimée(s)`);

    await mongoose.connection.close();
    console.log('✅ Déconnexion de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanTestReservations();
