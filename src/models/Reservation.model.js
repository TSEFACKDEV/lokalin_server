import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  equipement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipement',
    required: [true, 'L\'équipement est requis']
  },
  locataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PME',
    required: [true, 'Le locataire est requis']
  },
  dateDebut: {
    type: Date,
    required: [true, 'La date de début est requise'],
    validate: {
      validator: function(value) {
        // Permettre les dates d'aujourd'hui ou futures
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'La date de début doit être aujourd\'hui ou dans le futur'
    }
  },
  dateFin: {
    type: Date,
    required: [true, 'La date de fin est requise'],
    validate: {
      validator: function(value) {
        return value > this.dateDebut;
      },
      message: 'La date de fin doit être après la date de début'
    }
  },
  statut: {
    type: String,
    enum: ['en_attente', 'confirmee', 'annulee', 'terminee', 'en_cours'],
    default: 'en_attente'
  },
  montantTotal: {
    type: Number,
    required: [true, 'Le montant total est requis'],
    min: [0, 'Le montant ne peut pas être négatif']
  },
  cautionPayee: {
    type: Boolean,
    default: false
  },
  cautionMontant: {
    type: Number,
    default: 0,
    min: [0, 'Le montant de la caution ne peut pas être négatif']
  },
  conditionsSpeciales: {
    type: String,
    trim: true
  },
  adresseLivraison: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  paiementStatut: {
    type: String,
    enum: ['en_attente', 'paye', 'rembourse', 'partiel'],
    default: 'en_attente'
  },
  dateConfirmation: {
    type: Date
  },
  dateAnnulation: {
    type: Date
  },
  raisonAnnulation: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index pour optimiser les requêtes
reservationSchema.index({ equipement: 1, dateDebut: 1, dateFin: 1 });
reservationSchema.index({ locataire: 1, statut: 1 });
reservationSchema.index({ dateDebut: 1, dateFin: 1 });
reservationSchema.index({ statut: 1, createdAt: -1 });

// Middleware pour mettre à jour la disponibilité de l'équipement
reservationSchema.post('save', async function(doc) {
  const Equipement = mongoose.model('Equipement');
  const equipement = await Equipement.findById(doc.equipement);
  
  if (equipement) {
    if (doc.statut === 'confirmee' || doc.statut === 'en_cours') {
      equipement.disponibilite = 'reserve';
    } else if (doc.statut === 'terminee' || doc.statut === 'annulee') {
      equipement.disponibilite = 'disponible';
    }
    
    await equipement.save();
  }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;