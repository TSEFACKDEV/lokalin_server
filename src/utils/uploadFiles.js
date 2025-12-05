import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(uploadsDir, file.fieldname);
    
    // Créer le sous-dossier si nécessaire (equipements, pmes, etc.)
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtrer les types de fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images (JPEG, PNG, GIF, WebP) sont autorisées'));
  }
};

// Configuration Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max par fichier
  },
  fileFilter: fileFilter
});

/**
 * Middleware pour uploader plusieurs images (max 5)
 * Usage: uploadEquipementImages (dans routes)
 */
export const uploadEquipementImages = upload.array('equipements', 5);

/**
 * Middleware pour uploader une seule image (logo PME)
 * Usage: uploadPMELogo (dans routes)
 */
export const uploadPMELogo = upload.single('pmes');

/**
 * Optimiser une image avec Sharp
 */
export const optimizeImage = async (filePath) => {
  try {
    const optimizedPath = filePath.replace(path.extname(filePath), '-optimized.jpg');
    
    await sharp(filePath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);
    
    // Supprimer l'original et renommer l'optimisé
    fs.unlinkSync(filePath);
    fs.renameSync(optimizedPath, filePath.replace(path.extname(filePath), '.jpg'));
    
    return filePath.replace(path.extname(filePath), '.jpg');
  } catch (error) {
    console.error('Erreur optimisation image:', error);
    return filePath;
  }
};

/**
 * Supprimer un fichier
 */
export const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    return false;
  }
};

/**
 * Supprimer plusieurs fichiers
 */
export const deleteFiles = (filePaths) => {
  const results = filePaths.map(filePath => deleteFile(filePath));
  return results.every(result => result === true);
};

/**
 * Middleware pour gérer les erreurs Multer
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est trop volumineux (max 5 MB)'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers (maximum 5 images)'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Champ de fichier inattendu'
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de l\'upload'
    });
  }
  
  next();
};

/**
 * Générer les URLs publiques des fichiers uploadés
 */
export const generateFileUrls = (files, req) => {
  if (!files || files.length === 0) return [];
  
  const protocol = req.protocol;
  const host = req.get('host');
  
  return files.map(file => {
    // Extraire le chemin relatif après 'uploads/'
    const pathParts = file.path.replace(/\\/g, '/');
    const uploadsIndex = pathParts.indexOf('uploads/');
    
    if (uploadsIndex === -1) {
      console.error('❌ Chemin uploads/ non trouvé dans:', pathParts);
      return null;
    }
    
    const relativePath = pathParts.substring(uploadsIndex);
    const imageUrl = `${protocol}://${host}/${relativePath}`;
    
    console.log('📸 Image URL générée:', imageUrl);
    console.log('   Chemin original:', file.path);
    console.log('   Chemin relatif:', relativePath);
    
    return imageUrl;
  }).filter(url => url !== null);
};

/**
 * Middleware pour traiter les images après l'upload
 */
export const processUploadedImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }
  
  try {
    // Optimiser toutes les images
    const optimizedPaths = await Promise.all(
      req.files.map(file => optimizeImage(file.path))
    );
    
    // Mettre à jour les chemins dans req.files
    req.files = req.files.map((file, index) => ({
      ...file,
      path: optimizedPaths[index]
    }));
    
    // Générer les URLs
    req.uploadedImageUrls = generateFileUrls(req.files, req);
    
    next();
  } catch (error) {
    console.error('Erreur traitement images:', error);
    next(error);
  }
};

export default {
  uploadEquipementImages,
  uploadPMELogo,
  optimizeImage,
  deleteFile,
  deleteFiles,
  handleMulterError,
  generateFileUrls,
  processUploadedImages
};
