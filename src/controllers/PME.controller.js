/**
 * Contrôleur PME
 * Gère la création, mise à jour et récupération des PME
 */

import PME from '../models/PME.model.js';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';
import GenukaService from '../services/GenukaService.js';

/**
 * Créer une PME avec Genuka
 */
export const createPME = async (req, res) => {
  try {
    const { nom, email, genuka_id, genuka_access_token, genuka_refresh_token, genuka_token_expires_at } = req.body;

    if (!nom || !email || !genuka_id) {
      return ResponseApi.error(res, 'Données manquantes', { nom, email, genuka_id }, 400);
    }

    // Vérifier si la PME existe déjà
    const existingPME = await PME.findOne({ $or: [{ email }, { genuka_id }] });
    if (existingPME) {
      return ResponseApi.error(res, 'Cette PME existe déjà', null, 409);
    }

    // Créer la PME
    const pme = await PME.create({
      nom,
      email,
      genuka_id,
      genuka_access_token,
      genuka_refresh_token,
      genuka_token_expires_at,
      isVerified: true,
      isActive: true
    });

    // Notifier la création
    NotificationService.broadcastNotification(
      'Nouvelle PME',
      `La PME "${nom}" a rejoint la plateforme`,
      'info',
      `/pmes/${pme._id}`
    );

    ResponseApi.success(res, 'PME créée avec succès', pme, 201);
  } catch (error) {
    console.error('Erreur création PME:', error);
    ResponseApi.error(res, 'Échec de la création de la PME', error.message);
  }
};

/**
 * Récupérer toutes les PME
 */
export const getPMEs = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const pmes = await PME.find(filter)
      .select('-password -genuka_access_token -genuka_refresh_token')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await PME.countDocuments(filter);

    ResponseApi.success(res, 'PME récupérées avec succès', {
      pmes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des PME', error.message);
  }
};

/**
 * Récupérer une PME par ID
 */
export const getPMEById = async (req, res) => {
  try {
    const { id } = req.params;

    const pme = await PME.findById(id)
      .select('-password -genuka_access_token -genuka_refresh_token')
      .populate('equipements');

    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    ResponseApi.success(res, 'PME récupérée avec succès', pme);
  } catch (error) {
    console.error('Erreur récupération PME par ID:', error);
    ResponseApi.error(res, 'Échec de la récupération de la PME', error.message);
  }
};

/**
 * Mettre à jour une PME
 */
export const updatePME = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Champs non modifiables
    delete updates.genuka_id;
    delete updates.password;

    const pme = await PME.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).select('-password -genuka_access_token -genuka_refresh_token');

    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    ResponseApi.success(res, 'PME mise à jour avec succès', pme);
  } catch (error) {
    console.error('Erreur mise à jour PME:', error);
    ResponseApi.error(res, 'Échec de la mise à jour de la PME', error.message);
  }
};

/**
 * Supprimer une PME
 */
export const deletePME = async (req, res) => {
  try {
    const { id } = req.params;

    const pme = await PME.findByIdAndDelete(id);

    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    ResponseApi.success(res, 'PME supprimée avec succès', pme);
  } catch (error) {
    console.error('Erreur suppression PME:', error);
    ResponseApi.error(res, 'Échec de la suppression de la PME', error.message);
  }
};

/**
 * Récupérer les équipements d'une PME
 */
export const getPMEEquipements = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pme = await PME.findById(id)
      .populate({
        path: 'equipements',
        options: {
          limit: limit * 1,
          skip: (page - 1) * limit,
          sort: { createdAt: -1 }
        }
      });

    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    ResponseApi.success(res, 'Équipements récupérés avec succès', {
      pme: pme.nom,
      equipements: pme.equipements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération équipements PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des équipements', error.message);
  }
};

/**
 * Vérifier et rafraîchir les tokens Genuka si nécessaire
 */
export const verifyAndRefreshToken = async (pmeId) => {
  try {
    const pme = await PME.findById(pmeId).select('+genuka_access_token +genuka_refresh_token');
    
    if (!pme || !pme.genuka_refresh_token) {
      return null;
    }

    // Vérifier si le token est expiré
    if (pme.genuka_token_expires_at && new Date() > pme.genuka_token_expires_at) {
      const result = await GenukaService.refreshAccessToken(pme.genuka_refresh_token);
      
      if (result.success) {
        pme.genuka_access_token = result.access_token;
        pme.genuka_refresh_token = result.refresh_token;
        pme.genuka_token_expires_at = new Date(Date.now() + result.expires_in * 1000);
        await pme.save();
        
        return pme.genuka_access_token;
      }
    }

    return pme.genuka_access_token;
  } catch (error) {
    console.error('Erreur vérification token Genuka:', error);
    return null;
  }
};

export default {
  createPME,
  getPMEs,
  getPMEById,
  updatePME,
  deletePME,
  getPMEEquipements,
  verifyAndRefreshToken
};
