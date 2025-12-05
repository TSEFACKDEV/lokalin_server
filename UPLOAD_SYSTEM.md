# 📸 Système d'Upload d'Images - Lokalink

## Vue d'ensemble

Ce système permet l'upload et la gestion d'images pour les équipements et les logos de PME dans l'application Lokalink.

## 🎯 Fonctionnalités

### Pour les Équipements
- **Upload multiple** : Jusqu'à 5 images par équipement
- **Formats acceptés** : JPEG, JPG, PNG, GIF, WebP
- **Taille maximale** : 5 MB par image
- **Optimisation automatique** : Les images sont automatiquement redimensionnées et optimisées avec Sharp

### Pour les PME
- **Upload simple** : 1 logo par PME
- **Formats acceptés** : JPEG, JPG, PNG, GIF, WebP
- **Taille maximale** : 5 MB
- **Optimisation automatique** : Le logo est automatiquement optimisé

## 📁 Structure des fichiers

```
server/
├── src/
│   ├── utils/
│   │   └── uploadFiles.js          # Utilitaire principal d'upload
│   ├── uploads/
│   │   ├── equipements/            # Images des équipements
│   │   └── pmes/                   # Logos des PME
│   ├── controllers/
│   │   ├── Equipement.controller.js # Contrôleur équipements mis à jour
│   │   └── PME.controller.js        # Contrôleur PME mis à jour
│   └── routes/
│       ├── Equipement.route.js      # Routes équipements avec upload
│       └── PME.route.js             # Routes PME avec upload
```

## 🔧 Configuration Backend

### 1. Middlewares disponibles

#### `uploadEquipementImages`
Upload multiple d'images pour les équipements (max 5).

```javascript
import { uploadEquipementImages, processUploadedImages, handleMulterError } from '../utils/uploadFiles.js';

router.post('/', 
  uploadEquipementImages, 
  handleMulterError, 
  processUploadedImages, 
  EquipementController.createEquipement
);
```

#### `uploadPMELogo`
Upload d'un seul logo pour les PME.

```javascript
import { uploadPMELogo, processUploadedImages, handleMulterError } from '../utils/uploadFiles.js';

router.put('/:id', 
  uploadPMELogo, 
  handleMulterError, 
  processUploadedImages, 
  PMEController.updatePME
);
```

### 2. Accès aux fichiers uploadés

Dans les contrôleurs, les URLs des images sont disponibles via :

```javascript
req.uploadedImageUrls // Array d'URLs complètes
```

Exemple :
```javascript
const equipement = await Equipement.create({
  nom,
  description,
  images: req.uploadedImageUrls || [], // URLs des images uploadées
  // ... autres champs
});
```

### 3. Fonctions utilitaires

```javascript
// Optimiser une image
import { optimizeImage } from '../utils/uploadFiles.js';
const optimizedPath = await optimizeImage(filePath);

// Supprimer un fichier
import { deleteFile } from '../utils/uploadFiles.js';
deleteFile('/uploads/equipements/image-123.jpg');

// Supprimer plusieurs fichiers
import { deleteFiles } from '../utils/uploadFiles.js';
deleteFiles(['/uploads/equipements/img1.jpg', '/uploads/equipements/img2.jpg']);
```

## 💻 Utilisation Frontend

### Formulaire Multi-Step pour Équipements

Le formulaire `AddProductPage.jsx` est maintenant en 4 étapes :

1. **Étape 1** : Informations de base (nom, catégorie, description)
2. **Étape 2** : Localisation & Prix (prix, caution, adresse)
3. **Étape 3** : Photos (upload des images)
4. **Étape 4** : Confirmation (récapitulatif)

### Upload d'images

```javascript
// 1. État pour gérer les fichiers
const [imageFiles, setImageFiles] = useState([]);
const [imagePreviews, setImagePreviews] = useState([]);

// 2. Gérer la sélection d'images
const handleImageChange = (e) => {
  const files = Array.from(e.target.files);
  
  // Validation (max 5 images, 5MB par image)
  const validFiles = files.filter(file => {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} n'est pas une image`);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} est trop volumineux (max 5MB)`);
      return false;
    }
    return true;
  });
  
  setImageFiles([...imageFiles, ...validFiles]);
  // Créer les aperçus...
};

// 3. Envoyer au serveur avec FormData
const handleSubmit = async () => {
  const formData = new FormData();
  
  formData.append('nom', nom);
  formData.append('description', description);
  // ... autres champs
  
  // Ajouter les images
  imageFiles.forEach(file => {
    formData.append('equipements', file); // 'equipements' pour équipements
    // ou
    // formData.append('pmes', file); // 'pmes' pour logo PME
  });
  
  await equipementService.createEquipement(formData);
};
```

### Input HTML

```jsx
<input
  type="file"
  id="imageInput"
  multiple                    // Pour plusieurs images
  accept="image/*"            // Accepter uniquement les images
  onChange={handleImageChange}
  className="hidden"
/>
<label htmlFor="imageInput">
  Sélectionner des fichiers
</label>
```

## 🔐 Validation & Sécurité

### Côté serveur
- ✅ Types de fichiers validés (JPEG, PNG, GIF, WebP uniquement)
- ✅ Taille maximale : 5 MB par fichier
- ✅ Nombre maximal : 5 images pour équipements, 1 pour PME
- ✅ Noms de fichiers sécurisés (timestamp + random)
- ✅ Optimisation automatique avec Sharp

### Côté client
- ✅ Validation du type MIME
- ✅ Validation de la taille
- ✅ Aperçu avant upload
- ✅ Limite de 5 images affichée

## 📡 API Endpoints

### Créer un équipement avec images
```
POST /api/lokalink/v1/equipements
Content-Type: multipart/form-data

Fields:
- nom: string (required)
- description: string
- categorie: ObjectId (required)
- prixParJour: number (required)
- caution: number
- proprietaire: ObjectId (required)
- localisation: JSON string
- conditionsUtilisation: string
- equipements: file[] (max 5 images)
```

### Mettre à jour un équipement avec images
```
PUT /api/lokalink/v1/equipements/:id
Content-Type: multipart/form-data

Fields:
- Mêmes champs que POST
- Les nouvelles images sont ajoutées aux anciennes (max 5 total)
```

### Mettre à jour une PME avec logo
```
PUT /api/lokalink/v1/pmes/:id
Content-Type: multipart/form-data

Fields:
- nom: string
- description: string
- telephone: string
- adresse: JSON string
- pmes: file (1 image)
```

## 🌐 Accès aux images

Les images uploadées sont accessibles via :

```
http://localhost:3000/uploads/equipements/nom-du-fichier-timestamp.jpg
http://localhost:3000/uploads/pmes/logo-timestamp.jpg
```

Le serveur Express sert automatiquement les fichiers du dossier `uploads`.

## 🐛 Gestion des erreurs

### Erreurs Multer

```javascript
LIMIT_FILE_SIZE    → "Le fichier est trop volumineux (max 5 MB)"
LIMIT_FILE_COUNT   → "Trop de fichiers (maximum 5 images)"
LIMIT_UNEXPECTED_FILE → "Champ de fichier inattendu"
```

### Erreurs personnalisées

```javascript
"Seules les images (JPEG, PNG, GIF, WebP) sont autorisées"
"Erreur lors de l'upload"
```

## ⚡ Optimisation des performances

1. **Redimensionnement** : Les images sont redimensionnées à 1200x1200 max
2. **Compression** : Qualité JPEG à 85%
3. **Format** : Conversion en JPEG pour uniformité
4. **Traitement asynchrone** : Upload et optimisation en parallèle

## 📝 Exemples d'utilisation

### Créer un équipement avec Postman

1. Sélectionner `POST` → `http://localhost:3000/api/lokalink/v1/equipements`
2. Aller dans `Body` → `form-data`
3. Ajouter les champs :
   - `nom` : "Caméra Sony A7III"
   - `categorie` : "674a5b8e9f1234567890abcd"
   - `prixParJour` : 50000
   - `proprietaire` : "6932d2c311a92a28b6e96b6c"
   - `equipements` : [Fichier 1] (changer le type en File)
   - `equipements` : [Fichier 2]
   - ...

### Tester avec cURL

```bash
curl -X POST http://localhost:3000/api/lokalink/v1/equipements \
  -F "nom=Caméra Sony A7III" \
  -F "categorie=674a5b8e9f1234567890abcd" \
  -F "prixParJour=50000" \
  -F "proprietaire=6932d2c311a92a28b6e96b6c" \
  -F "equipements=@/path/to/image1.jpg" \
  -F "equipements=@/path/to/image2.jpg"
```

## 🚀 Déploiement

En production, pensez à :

1. Configurer un CDN pour servir les images
2. Mettre en place une politique de nettoyage des anciennes images
3. Augmenter les limites si nécessaire
4. Configurer CORS pour les domaines autorisés
5. Mettre en place un système de backup des images

## 📞 Support

Pour toute question ou problème, consultez la documentation ou contactez l'équipe de développement.
