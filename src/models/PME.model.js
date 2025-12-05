import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const pmeSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la PME est requis'],
    trim: true,
    minlength: [2, 'Le nom de la PME doit contenir au moins 2 caractères']
  },
  email: {
    type: String,
    required: function() {
      // Email requis uniquement si pas de genuka_id
      return !this.genuka_id;
    },
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Veuillez fournir un email valide']
  },
  password: {
    type: String,
    required: function() {
      // Password requis uniquement si pas de genuka_id
      return !this.genuka_id;
    },
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false
  },
  logo: {
    type: String,
    default: null
  },
  description: {
    type: String,
    trim: true
  },
  adresse: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: {
      type: String,
      default: 'France'
    }
  },
  telephone: {
    type: String,
    match: [/^[0-9\s\+\(\)\.-]+$/, 'Veuillez fournir un numéro de téléphone valide']
  },
  siteWeb: {
    type: String
  },
  siret: {
    type: String,
    unique: true,
    sparse: true // Permet les valeurs null uniques
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['pme', 'admin'],
    default: 'pme'
  },
  genuka_id: {
    type: String,
    unique: true,
    sparse: true
  },
  genuka_access_token: {
    type: String,
    select: false
  },
  genuka_refresh_token: {
    type: String,
    select: false
  },
  genuka_token_expires_at: {
    type: Date
  },
  equipements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipement'
  }],
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Middleware de pré-sauvegarde pour hacher le mot de passe
pmeSchema.pre('save', async function() {
  // Si password n'existe pas ou n'a pas été modifié, ne rien faire
  if (!this.password || !this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour comparer les mots de passe
pmeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour exclure le mot de passe des résultats
pmeSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Index pour les recherches
pmeSchema.index({ nom: 'text', email: 'text' });
pmeSchema.index({ ville: 1, pays: 1 });

const PME = mongoose.model('PME', pmeSchema);

export default PME;