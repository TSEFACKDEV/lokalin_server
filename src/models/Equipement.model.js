import mongoose from 'mongoose';

const equipementSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de l\'équipement est requis'],
    trim: true,
    minlength: [2, 'Le nom de l\'équipement doit contenir au moins 2 caractères']
  },
  description: {
    type: String,
    trim: true
  },
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La catégorie est requise']
  },
  disponibilite: {
    type: String,
    enum: ['disponible', 'reserve', 'indisponible', 'en_maintenance'],
    default: 'disponible'
  },
  proprietaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PME',
    required: [true, 'Le propriétaire est requis']
  },
  images: [{
    type: String,
    validate: {
      validator: function(url) {
        // Validation simple d'URL
        return url && url.length > 0;
      },
      message: 'Les URLs d\'images doivent être valides'
    }
  }],
  prixParJour: {
    type: Number,
    required: [true, 'Le prix par jour est requis'],
    min: [0, 'Le prix ne peut pas être négatif']
  },
  caution: {
    type: Number,
    default: 0,
    min: [0, 'La caution ne peut pas être négative']
  },
  caracteristiques: {
    type: Map,
    of: String,
    default: {}
  },
  localisation: {
    adresse: String,
    ville: String,
    codePostal: String,
    pays: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  conditionsUtilisation: {
    type: String,
    trim: true
  },
  noteMoyenne: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  nombreAvis: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  reservations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Index pour les recherches
equipementSchema.index({ nom: 'text', description: 'text' });
equipementSchema.index({ categorie: 1, disponibilite: 1 });
equipementSchema.index({ proprietaire: 1 });
equipementSchema.index({ 'localisation.coordinates': '2dsphere' });
equipementSchema.index({ noteMoyenne: -1 });

// Middleware pour mettre à jour le compte d'équipements du propriétaire
equipementSchema.post('save', async function(doc) {
  if (doc.proprietaire) {
    const PME = mongoose.model('PME');
    await PME.findByIdAndUpdate(
      doc.proprietaire,
      { $addToSet: { equipements: doc._id } }
    );
  }
});

equipementSchema.post('remove', async function(doc) {
  if (doc.proprietaire) {
    const PME = mongoose.model('PME');
    await PME.findByIdAndUpdate(
      doc.proprietaire,
      { $pull: { equipements: doc._id } }
    );
  }
});

const Equipement = mongoose.model('Equipement', equipementSchema);

export default Equipement;