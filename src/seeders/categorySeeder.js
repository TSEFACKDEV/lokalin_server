import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.model.js';

dotenv.config();

const categories = [
  {
    nom: 'Outillage électrique',
    description: 'Perceuses, visseuses, scies électriques, ponceuses, etc.',
    icone: '🔧'
  },
  {
    nom: 'Matériel de chantier',
    description: 'Échafaudages, bétonnières, chariots élévateurs, compacteurs',
    icone: '🚧'
  },
  {
    nom: 'Équipement informatique',
    description: 'Ordinateurs, serveurs, imprimantes, matériel réseau',
    icone: '💻'
  },
  {
    nom: 'Mobilier de bureau',
    description: 'Bureaux, chaises, armoires, tables de réunion',
    icone: '🪑'
  },
  {
    nom: 'Matériel audiovisuel',
    description: 'Caméras, microphones, écrans, systèmes de sonorisation',
    icone: '🎥'
  },
  {
    nom: 'Matériel de restauration',
    description: 'Fourneaux, réfrigérateurs professionnels, lave-vaisselle',
    icone: '🍽️'
  },
  {
    nom: 'Véhicules utilitaires',
    description: 'Camionnettes, fourgons, véhicules de livraison',
    icone: '🚚'
  },
  {
    nom: 'Matériel médical',
    description: 'Équipements de diagnostic, mobilier médical, matériel de stérilisation',
    icone: '🏥'
  },
  {
    nom: 'Équipement sportif',
    description: 'Matériel de fitness, terrains sportifs, vestiaires',
    icone: '⚽'
  },
  {
    nom: 'Machines industrielles',
    description: 'Presses, tours, fraiseuses, machines à commande numérique',
    icone: '🏭'
  },
  {
    nom: 'Matériel de nettoyage',
    description: 'Aspirateurs industriels, machines à vapeur, autolaveuses',
    icone: '🧹'
  },
  {
    nom: 'Générateurs et groupes électrogènes',
    description: 'Groupes électrogènes, onduleurs, alimentations de secours',
    icone: '🔌'
  },
  {
    nom: 'Équipement de sécurité',
    description: 'Caméras de surveillance, systèmes d\'alarme, extincteurs',
    icone: '🚨'
  },
  {
    nom: 'Matériel agricole',
    description: 'Tracteurs, moissonneuses, systèmes d\'irrigation',
    icone: '🚜'
  },
  {
    nom: 'Équipement événementiel',
    description: 'Tentes, chapiteaux, stands d\'exposition, éclairage',
    icone: '🎪'
  }
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB pour le seeding');

    // Supprimer les anciennes catégories
    await Category.deleteMany({});
    console.log('🗑️  Anciennes catégories supprimées');

    // Insérer les nouvelles catégories
    await Category.insertMany(categories);
    console.log(`✅ ${categories.length} catégories insérées avec succès`);

    // Afficher les catégories créées
    const createdCategories = await Category.find({});
    console.log('\n📋 Catégories disponibles:');
    createdCategories.forEach(cat => {
      console.log(`${cat.icone} ${cat.nom} - ${cat.description}`);
    });

    mongoose.connection.close();
    console.log('\n✅ Seeding terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
};

// Exécuter le seeder
if (process.argv[2] === '--run') {
  seedCategories();
}

export default seedCategories;