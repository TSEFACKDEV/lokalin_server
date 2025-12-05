import Equipement from '../models/Equipement.model.js';
import PME from '../models/PME.model.js';
import Category from '../models/Category.model.js';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';

export const createEquipement = async (req, res) => {
  try {
    const { nom, description, categorie, prixParJour, caution, proprietaire, localisation, conditionsUtilisation } = req.body;

    if (!nom || !categorie || !prixParJour || !proprietaire) {
      return ResponseApi.error(res, 'Données manquantes', { nom, categorie, prixParJour, proprietaire }, 400);
    }

    const categoryExists = await Category.findById(categorie);
    if (!categoryExists) {
      return ResponseApi.error(res, 'Catégorie non trouvée', null, 404);
    }

    const pmeExists = await PME.findById(proprietaire);
    if (!pmeExists) {
      return ResponseApi.error(res, 'PME propriétaire non trouvée', null, 404);
    }

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

    await PME.findByIdAndUpdate(
      proprietaire,
      { $push: { equipements: equipement._id } },
      { new: true }
    );

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

export const searchEquipements = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      categorie, 
      category,
      disponibilite, 
      availability,
      search, 
      prixMin, 
      prixMax,
      maxPrice,
      minRating,
      localisation,
      pmeId,
      sortBy = 'recent',
      sortOrder = 'desc'
    } = req.query;

    const filter = {
      isActive: true
    };

    const availabilityValue = disponibilite || availability;
    if (availabilityValue) {
      filter.disponibilite = availabilityValue;
    }

    const categoryValue = categorie || category;
    if (categoryValue) {
      filter.categorie = categoryValue;
    }

    if (pmeId) {
      filter.proprietaire = pmeId;
    }

    if (prixMin || prixMax || maxPrice) {
      filter.prixParJour = {};
      if (prixMin) filter.prixParJour.$gte = parseFloat(prixMin);
      if (prixMax) filter.prixParJour.$lte = parseFloat(prixMax);
      if (maxPrice) filter.prixParJour.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter.noteMoyenne = { $gte: parseFloat(minRating) };
    }

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (localisation && localisation.coordinates) {
      const [longitude, latitude] = localisation.coordinates.split(',').map(parseFloat);
      filter['localisation.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: localisation.distance || 50000
        }
      };
    }

    let sortOptions = {};
    switch (sortBy) {
      case 'price_asc':
        sortOptions = { prixParJour: 1 };
        break;
      case 'price_desc':
        sortOptions = { prixParJour: -1 };
        break;
      case 'rating':
        sortOptions = { noteMoyenne: -1, nombreAvis: -1 };
        break;
      case 'popular':
        sortOptions = { nombreReservations: -1, noteMoyenne: -1 };
        break;
      case 'name':
        sortOptions = { nom: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'recent':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const [equipements, total] = await Promise.all([
      Equipement.find(filter)
        .populate('categorie', 'nom description icone')
        .populate('proprietaire', 'nom email telephone logo')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort(sortOptions)
        .lean(),
      Equipement.countDocuments(filter)
    ]);

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

export const updateEquipement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.uploadedImageUrls && req.uploadedImageUrls.length > 0) {
      const currentEquipement = await Equipement.findById(id);
      if (currentEquipement) {
        const allImages = [...currentEquipement.images, ...req.uploadedImageUrls];
        updates.images = allImages.slice(0, 5);
      }
    }

    if (updates.localisation && typeof updates.localisation === 'string') {
      updates.localisation = JSON.parse(updates.localisation);
    }

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

export const deleteEquipement = async (req, res) => {
  try {
    const { id } = req.params;

    const equipement = await Equipement.findByIdAndDelete(id);

    if (!equipement) {
      return ResponseApi.notFound(res, 'Équipement non trouvé');
    }

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
