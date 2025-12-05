/**
 * Contrôleur Equipement
 * Gère l'ajout, la recherche et la gestion des équipements
 */

import Equipement from '../models/Equipement.model.js';
import PME from '../models/PME.model.js';
import Category from '../models/Category.model.js';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';

/**
 * Créer un équipement
 */
export const createEquipement = async (req, res) => {
  try {
    const { nom, description, categorie, prixParJour, caution, proprietaire, localisation, conditionsUtilisation } = req.body;

    // DEBUG: Log de la requête complète
    console.log('[Equipement Creation] ════════════════════════════════════════');
    console.log('[Equipement Creation] Body reçu:', JSON.stringify(req.body, null, 2));
    console.log('[Equipement Creation] ID Propriétaire reçu:', proprietaire);
    console.log('[Equipement Creation] Fichiers uploadés:', req.files ? req.files.length : 0);
    console.log('[Equipement Creation] URLs d\'images générées:', req.uploadedImageUrls);
    
    if (req.uploadedImageUrls && req.uploadedImageUrls.length > 0) {
      console.log('[Equipement Creation] 📸 Détails des images:');
      req.uploadedImageUrls.forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }
    
    // Validation des champs obligatoires
    if (!nom || !categorie || !prixParJour || !proprietaire) {
      console.error('[Equipement Creation] Données manquantes:', { nom: !!nom, categorie: !!categorie, prixParJour: !!prixParJour, proprietaire: !!proprietaire });
      return ResponseApi.error(res, 'Données manquantes', { nom, categorie, prixParJour, proprietaire }, 400);
    }

    // DEBUG: Vérifier toutes les PMEs disponibles
    const allPmes = await PME.find({}).select('_id nom genuka_id email');
    console.log('[Equipement Creation] PMEs disponibles dans la DB:', allPmes.length);
    allPmes.forEach(pme => {
      console.log(`  - PME: ${pme._id} | Nom: ${pme.nom} | Genuka ID: ${pme.genuka_id || 'N/A'} | Email: ${pme.email}`);
    });

    // Vérifier que la catégorie existe
    const categoryExists = await Category.findById(categorie);
    if (!categoryExists) {
      console.error('[Equipement Creation] Catégorie non trouvée:', categorie);
      return ResponseApi.error(res, 'Catégorie non trouvée', null, 404);
    }

    // Vérifier que le propriétaire (PME) existe
    console.log('[Equipement Creation] Recherche PME avec ID:', proprietaire);
    const pmeExists = await PME.findById(proprietaire);
    if (!pmeExists) {
      console.error('[Equipement Creation] ❌ PME NON TROUVÉE!');
      console.error('[Equipement Creation] ID recherché:', proprietaire);
      console.error('[Equipement Creation] Type de l\'ID:', typeof proprietaire);
      console.error('[Equipement Creation] IDs disponibles:', allPmes.map(p => p._id.toString()));
      
      return ResponseApi.error(res, `PME propriétaire non trouvée. L'ID "${proprietaire}" n'existe pas dans la base de données.`, { 
        proprietaire_recherche: proprietaire,
        pmes_disponibles: allPmes.map(p => ({ id: p._id.toString(), nom: p.nom })),
        total_pmes: allPmes.length,
        suggestion: allPmes.length > 0 ? `Utilisez l'ID: ${allPmes[0]._id.toString()}` : 'Créez d\'abord une PME'
      }, 404);
    }
    
    console.log('[Equipement Creation] ✅ PME trouvée:', pmeExists.nom);

    // Créer l'équipement
    const equipement = await Equipement.create({
      nom,
      description,
      categorie,
      prixParJour,
      caution: caution || 0,
      proprietaire,
      images: req.uploadedImageUrls || [],
      localisation: localisation ? JSON.parse(localisation) : {},
      conditionsUtilisation,
      disponibilite: 'disponible',
      isActive: true
    });

    // Ajouter l'équipement à la liste des équipements de la PME
    await PME.findByIdAndUpdate(
      proprietaire,
      { $push: { equipements: equipement._id } },
      { new: true }
    );

    // Notifier toutes les PME de la disponibilité du nouvel équipement
    NotificationService.broadcastNotification(
      'Nouvel Équipement Disponible',
      `${nom} est maintenant disponible à la location - ${prixParJour}€/jour`,
      'success',
      `/equipements/${equipement._id}`
    );

    ResponseApi.success(res, 'Équipement créé avec succès', equipement, 201);
  } catch (error) {
    console.error('Erreur création équipement:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return ResponseApi.error(res, 'Erreur de validation', errors, 400);
    }

    ResponseApi.error(res, 'Échec de la création de l\'équipement', error.message);
  }
};

/**
 * Récupérer tous les équipements avec filtrage et recherche
 */
export const searchEquipements = async (req, res) => {
  try {
    const { page = 1, limit = 10, categorie, disponibilite = 'disponible', search, prixMin, prixMax, localisation } = req.query;

    const filter = {
      isActive: true,
      disponibilite: disponibilite || 'disponible'
    };

    // Filtrer par catégorie
    if (categorie) {
      filter.categorie = categorie;
    }

    // Filtrer par prix
    if (prixMin || prixMax) {
      filter.prixParJour = {};
      if (prixMin) filter.prixParJour.$gte = parseFloat(prixMin);
      if (prixMax) filter.prixParJour.$lte = parseFloat(prixMax);
    }

    // Recherche textuelle
    if (search) {
      filter.$text = { $search: search };
    }

    // Filtrer par localisation
    if (localisation && localisation.coordinates) {
      const [longitude, latitude] = localisation.coordinates.split(',').map(parseFloat);
      filter['localisation.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: localisation.distance || 50000 // 50km par défaut
        }
      };
    }

    const equipements = await Equipement.find(filter)
      .populate('categorie', 'nom description')
      .populate('proprietaire', 'nom email telephone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ noteMoyenne: -1, createdAt: -1 });

    const total = await Equipement.countDocuments(filter);

    ResponseApi.success(res, 'Équipements récupérés avec succès', {
      equipements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur recherche équipements:', error);
    ResponseApi.error(res, 'Échec de la recherche des équipements', error.message);
  }
};

/**
 * Récupérer un équipement par ID
 */
export const getEquipementById = async (req, res) => {
  try {
    const { id } = req.params;

    const equipement = await Equipement.findById(id)
      .populate('categorie', 'nom description icone')
      .populate('proprietaire', 'nom email telephone logo description')
      .populate({
        path: 'reservations',
        select: 'dateDebut dateFin statut',
        sort: { createdAt: -1 },
        limit: 5
      });

    if (!equipement) {
      return ResponseApi.notFound(res, 'Équipement non trouvé');
    }

    ResponseApi.success(res, 'Équipement récupéré avec succès', equipement);
  } catch (error) {
    console.error('Erreur récupération équipement:', error);
    ResponseApi.error(res, 'Échec de la récupération de l\'équipement', error.message);
  }
};

/**
 * Mettre à jour un équipement
 */
export const updateEquipement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Ajouter les nouvelles images si uploadées
    if (req.uploadedImageUrls && req.uploadedImageUrls.length > 0) {
      const currentEquipement = await Equipement.findById(id);
      if (currentEquipement) {
        // Fusionner les anciennes et nouvelles images (max 5)
        const allImages = [...currentEquipement.images, ...req.uploadedImageUrls];
        updates.images = allImages.slice(0, 5);
      }
    }

    // Parser la localisation si elle est en format JSON string
    if (updates.localisation && typeof updates.localisation === 'string') {
      updates.localisation = JSON.parse(updates.localisation);
    }

    // Champs non modifiables
    delete updates.proprietaire;
    delete updates.categorie;

    const equipement = await Equipement.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).populate('categorie proprietaire');

    if (!equipement) {
      return ResponseApi.notFound(res, 'Équipement non trouvé');
    }

    ResponseApi.success(res, 'Équipement mis à jour avec succès', equipement);
  } catch (error) {
    console.error('Erreur mise à jour équipement:', error);
    ResponseApi.error(res, 'Échec de la mise à jour de l\'équipement', error.message);
  }
};

/**
 * Changer la disponibilité d'un équipement
 */
export const updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { disponibilite } = req.body;

    const validStates = ['disponible', 'reserve', 'indisponible', 'en_maintenance'];
    if (!validStates.includes(disponibilite)) {
      return ResponseApi.error(res, 'État invalide', null, 400);
    }

    const equipement = await Equipement.findByIdAndUpdate(
      id,
      { disponibilite },
      { new: true }
    ).populate('proprietaire');

    if (!equipement) {
      return ResponseApi.notFound(res, 'Équipement non trouvé');
    }

    // Notifier la PME propriétaire et autres PME
    if (disponibilite === 'disponible') {
      NotificationService.broadcastNotification(
        'Équipement Disponible',
        `${equipement.nom} est de nouveau disponible`,
        'success',
        `/equipements/${equipement._id}`
      );
    }

    ResponseApi.success(res, 'Disponibilité mise à jour', equipement);
  } catch (error) {
    console.error('Erreur mise à jour disponibilité:', error);
    ResponseApi.error(res, 'Échec de la mise à jour de la disponibilité', error.message);
  }
};

/**
 * Supprimer un équipement
 */
export const deleteEquipement = async (req, res) => {
  try {
    const { id } = req.params;

    const equipement = await Equipement.findByIdAndDelete(id);

    if (!equipement) {
      return ResponseApi.notFound(res, 'Équipement non trouvé');
    }

    // Retirer l'équipement de la liste des équipements de la PME
    await PME.findByIdAndUpdate(
      equipement.proprietaire,
      { $pull: { equipements: id } }
    );

    ResponseApi.success(res, 'Équipement supprimé avec succès', equipement);
  } catch (error) {
    console.error('Erreur suppression équipement:', error);
    ResponseApi.error(res, 'Échec de la suppression de l\'équipement', error.message);
  }
};

/**
 * Récupérer les disponibilités (calendrier) d'un équipement
 */
export const getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateDebut, dateFin } = req.query;

    const equipement = await Equipement.findById(id)
      .populate({
        path: 'reservations',
        select: 'dateDebut dateFin statut',
        match: {
          statut: { $in: ['confirmee', 'en_cours', 'en_attente'] }
        }
      });

    if (!equipement) {
      return ResponseApi.notFound(res, 'Équipement non trouvé');
    }

    // Créer un calendrier d'indisponibilité
    const unavailableDates = equipement.reservations.map(res => ({
      dateDebut: res.dateDebut,
      dateFin: res.dateFin,
      statut: res.statut
    }));

    ResponseApi.success(res, 'Disponibilités récupérées', {
      equipement: equipement.nom,
      disponibilite: equipement.disponibilite,
      unavailableDates
    });
  } catch (error) {
    console.error('Erreur récupération disponibilités:', error);
    ResponseApi.error(res, 'Échec de la récupération des disponibilités', error.message);
  }
};

export default {
  createEquipement,
  searchEquipements,
  getEquipementById,
  updateEquipement,
  updateAvailability,
  deleteEquipement,
  getAvailability
};
