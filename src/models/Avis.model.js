import mongoose from 'mongoose';

const avisSchema = new mongoose.Schema({
  note: {
    type: Number,
    required: [true, 'La note est requise'],
    min: [1, 'La note doit être au moins 1'],
    max: [5, 'La note ne peut pas dépasser 5']
  },
  commentaire: {
    type: String,
    trim: true,
    maxlength: [1000, 'Le commentaire ne peut pas dépasser 1000 caractères']
  },
  auteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PME',
    required: [true, 'L\'auteur est requis']
  },
  equipement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipement',
    required: [true, 'L\'équipement est requis']
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: [true, 'La réservation est requise']
  },
  reponseProprietaire: {
    texte: String,
    date: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index pour optimiser les recherches
avisSchema.index({ equipement: 1, createdAt: -1 });
avisSchema.index({ auteur: 1 });
avisSchema.index({ note: 1 });
avisSchema.index({ reservation: 1 }, { unique: true }); // Un avis par réservation

// Middleware pour mettre à jour la note moyenne de l'équipement
avisSchema.post('save', async function(doc) {
  const Equipement = mongoose.model('Equipement');
  
  const stats = await mongoose.models.Avis.aggregate([
    { $match: { equipement: doc.equipement, isActive: true } },
    { $group: {
        _id: '$equipement',
        noteMoyenne: { $avg: '$note' },
        nombreAvis: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Equipement.findByIdAndUpdate(doc.equipement, {
      noteMoyenne: parseFloat(stats[0].noteMoyenne.toFixed(1)),
      nombreAvis: stats[0].nombreAvis
    });
  }
});

avisSchema.post('remove', async function(doc) {
  const Equipement = mongoose.model('Equipement');
  
  const stats = await mongoose.models.Avis.aggregate([
    { $match: { equipement: doc.equipement, isActive: true } },
    { $group: {
        _id: '$equipement',
        noteMoyenne: { $avg: '$note' },
        nombreAvis: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Equipement.findByIdAndUpdate(doc.equipement, {
      noteMoyenne: parseFloat(stats[0].noteMoyenne.toFixed(1)),
      nombreAvis: stats[0].nombreAvis
    });
  } else {
    await Equipement.findByIdAndUpdate(doc.equipement, {
      noteMoyenne: 0,
      nombreAvis: 0
    });
  }
});

const Avis = mongoose.model('Avis', avisSchema);

export default Avis;