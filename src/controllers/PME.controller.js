import PME from '../models/PME.model.js';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';
import GenukaService from '../services/GenukaService.js';

export const createPME = async (req, res) => {
  try {
    const { nom, email, genuka_id, genuka_access_token, genuka_refresh_token, genuka_token_expires_at, password } = req.body;

    if (genuka_id) {
      if (!nom || !genuka_id) {
        return ResponseApi.error(res, 'Données manquantes pour PME Genuka', { nom, genuka_id }, 400);
      }
    } else {
      if (!nom || !email || !password) {
        return ResponseApi.error(res, 'Données manquantes pour PME locale', { nom, email, password: !!password }, 400);
      }
    }

    const existingPME = await PME.findOne({ 
      $or: [
        { email: email },
        { genuka_id: genuka_id }
      ].filter(condition => Object.values(condition)[0])
    });
    
    if (existingPME) {
      return ResponseApi.error(res, 'Cette PME existe déjà', null, 409);
    }

    const pmeData = {
      nom,
      isVerified: !!genuka_id,
      isActive: true
    };

    if (genuka_id) {
      pmeData.genuka_id = genuka_id;
      pmeData.genuka_access_token = genuka_access_token;
      pmeData.genuka_refresh_token = genuka_refresh_token;
      pmeData.genuka_token_expires_at = genuka_token_expires_at;
      pmeData.email = email || `company-${genuka_id}@genuka.temp`;
    } else {
      pmeData.email = email;
      pmeData.password = password;
    }

    const pme = await PME.create(pmeData);

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

export const updatePME = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.uploadedImageUrls && req.uploadedImageUrls.length > 0) {
      updates.logo = req.uploadedImageUrls[0];
    }

    if (updates.adresse && typeof updates.adresse === 'string') {
      updates.adresse = JSON.parse(updates.adresse);
    }

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
        
        // Logger le rafraîchissement
        logTokenRefresh({
          company_id: pme.genuka_id,
          pme_id: pmeId,
          success: true
        });
        
        return pme.genuka_access_token;
      } else {
        // Logger l'échec
        logTokenRefresh({
          company_id: pme.genuka_id,
          pme_id: pmeId,
          success: false,
          error: result.error
        });
      }
    }

    return pme.genuka_access_token;
  } catch (error) {
    console.error('Erreur vérification token Genuka:', error);
    return null;
  }
};

/**
 * Synchroniser les données Genuka d'une PME
 */
export const syncGenukaData = async (req, res) => {
  try {
    const { id } = req.params;

    const pme = await PME.findById(id).select('+genuka_access_token');
    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    if (!pme.genuka_id) {
      return ResponseApi.error(res, 'Cette PME n\'est pas liée à Genuka', null, 400);
    }

    // Vérifier et rafraîchir le token si nécessaire
    const accessToken = await verifyAndRefreshToken(id);
    if (!accessToken) {
      return ResponseApi.error(res, 'Impossible de récupérer le token d\'accès', null, 401);
    }

    // Récupérer les informations de la boutique
    const storeInfoResult = await GenukaService.getStoreInfo(accessToken, pme.genuka_id);
    
    if (!storeInfoResult.success) {
      return ResponseApi.error(res, 'Erreur lors de la récupération des infos Genuka', storeInfoResult.error);
    }

    const storeInfo = storeInfoResult.data;

    // Mettre à jour les informations de la PME
    if (storeInfo.name && pme.nom.startsWith('PME ')) {
      pme.nom = storeInfo.name;
    }
    if (storeInfo.description) {
      pme.description = storeInfo.description;
    }
    if (storeInfo.email && pme.email && pme.email.includes('@genuka.temp')) {
      pme.email = storeInfo.email;
    }
    if (storeInfo.phone) {
      pme.telephone = storeInfo.phone;
    }
    if (storeInfo.website) {
      pme.siteWeb = storeInfo.website;
    }
    if (storeInfo.address) {
      pme.adresse = {
        rue: storeInfo.address.street || pme.adresse?.rue,
        ville: storeInfo.address.city || pme.adresse?.ville,
        codePostal: storeInfo.address.postal_code || pme.adresse?.codePostal,
        pays: storeInfo.address.country || pme.adresse?.pays || 'France'
      };
    }
    if (storeInfo.logo) {
      pme.logo = storeInfo.logo;
    }

    await pme.save();

    // Logger la synchronisation
    const fieldsUpdated = [];
    if (storeInfo.name) fieldsUpdated.push('nom');
    if (storeInfo.description) fieldsUpdated.push('description');
    if (storeInfo.email) fieldsUpdated.push('email');
    if (storeInfo.phone) fieldsUpdated.push('telephone');
    if (storeInfo.website) fieldsUpdated.push('siteWeb');
    if (storeInfo.address) fieldsUpdated.push('adresse');
    if (storeInfo.logo) fieldsUpdated.push('logo');

    logGenukaSynchronization({
      company_id: pme.genuka_id,
      pme_id: id,
      fields_updated: fieldsUpdated,
      success: true
    });

    ResponseApi.success(res, 'Données Genuka synchronisées avec succès', {
      pme,
      genukaData: storeInfo
    });
  } catch (error) {
    console.error('Erreur synchronisation Genuka:', error);
    
    // Logger l'erreur
    logGenukaSynchronization({
      company_id: req.params.id,
      pme_id: req.params.id,
      fields_updated: [],
      success: false,
      error: error.message
    });
    
    ResponseApi.error(res, 'Échec de la synchronisation Genuka', error.message);
  }
};

/**
 * Récupérer les statistiques du dashboard d'une PME
 */
export const getPMEDashboardStats = async (req, res) => {
  try {
    const { id } = req.params;

    const pme = await PME.findById(id).select('nom email logo description');
    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    // Importer dynamiquement pour éviter les dépendances circulaires
    const Equipement = (await import('../models/Equipement.model.js')).default;
    const Reservation = (await import('../models/Reservation.model.js')).default;

    // Nombre d'équipements
    const nombreEquipements = await Equipement.countDocuments({ proprietaire: id });

    // Récupérer les IDs des équipements
    const equipements = await Equipement.find({ proprietaire: id }).select('_id');
    const equipementIds = equipements.map(e => e._id);

    // Nombre de réservations reçues
    const nombreReservations = await Reservation.countDocuments({ 
      equipement: { $in: equipementIds } 
    });

    // Statistiques des réservations par statut
    const reservationsParStatut = {
      en_attente: await Reservation.countDocuments({ 
        equipement: { $in: equipementIds }, 
        statut: 'en_attente' 
      }),
      confirmee: await Reservation.countDocuments({ 
        equipement: { $in: equipementIds }, 
        statut: 'confirmee' 
      }),
      en_cours: await Reservation.countDocuments({ 
        equipement: { $in: equipementIds }, 
        statut: 'en_cours' 
      }),
      terminee: await Reservation.countDocuments({ 
        equipement: { $in: equipementIds }, 
        statut: 'terminee' 
      }),
      annulee: await Reservation.countDocuments({ 
        equipement: { $in: equipementIds }, 
        statut: 'annulee' 
      })
    };

    // Revenus estimés (réservations confirmées ou terminées)
    const reservationsPayees = await Reservation.find({
      equipement: { $in: equipementIds },
      statut: { $in: ['confirmee', 'en_cours', 'terminee'] }
    }).select('montantTotal');

    const revenusEstimes = reservationsPayees.reduce((sum, r) => sum + r.montantTotal, 0);

    ResponseApi.success(res, 'Statistiques du dashboard récupérées', {
      pme: {
        _id: pme._id,
        nom: pme.nom,
        email: pme.email,
        logo: pme.logo,
        description: pme.description
      },
      stats: {
        nombreEquipements,
        nombreReservations,
        reservationsParStatut,
        revenusEstimes
      }
    });
  } catch (error) {
    console.error('Erreur récupération stats dashboard PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des statistiques', error.message);
  }
};

export default {
  createPME,
  getPMEs,
  getPMEById,
  updatePME,
  deletePME,
  getPMEEquipements,
  verifyAndRefreshToken,
  syncGenukaData,
  getPMEDashboardStats
};
