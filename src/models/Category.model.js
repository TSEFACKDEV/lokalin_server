import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la catégorie est requis'],
    unique: true,
    trim: true,
    minlength: [2, 'Le nom de la catégorie doit contenir au moins 2 caractères']
  },
  description: {
    type: String,
    trim: true
  },
  icone: {
    type: String,
    default: '📦'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index pour les recherches par nom
categorySchema.index({ nom: 'text' });

const Category = mongoose.model('Category', categorySchema);

export default Category;