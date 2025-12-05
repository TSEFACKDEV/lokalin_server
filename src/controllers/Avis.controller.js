import Avis from '../models/Avis.model.js';
import Equipement from '../models/Equipement.model.js';
import Reservation from '../models/Reservation.model.js';
import PME from '../models/PME.model.js';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';

export const createAvis = async (req, res) => {
  try {
    const { note, commentaire, auteur, equipement, reservation } = req.body;

    if (!note || !auteur || !equipement || !reservation) {
      return ResponseApi.error(res, 'Données manquantes', null, 400);
    }

    if (note < 1 || note > 5) {
      return ResponseApi.error(res, 'La note doit être entre 1 et 5', null, 400);
    }

    const equip = await Equipement.findById(equipement);
    if (!equip) {
      return ResponseApi.error(res, 'Équipement non trouvé', null, 404);
    }

    const reservation_obj = await Reservation.findById(reservation);
    if (!reservation_obj) {
      return ResponseApi.error(res, 'Réservation non trouvée', null, 404);
    }

    if (reservation_obj.locataire.toString() !== auteur) {
      return ResponseApi.error(res, 'Vous ne pouvez évaluer que vos propres réservations', null, 403);
    }

    if (reservation_obj.statut !== 'terminee') {
      return ResponseApi.error(res, 'Vous ne pouvez évaluer que les réservations terminées', null, 400);
    }

    const existingAvis = await Avis.findOne({ reservation });
    if (existingAvis) {
      return ResponseApi.error(res, 'Un avis existe déjà pour cette réservation', null, 409);
    }

    const avis = await Avis.create({
      note,
      commentaire,
      auteur,
      equipement,
      reservation,
      isActive: true,
      isVerified: true
    });

    await avis.populate('auteur', 'nom email').populate('equipement', 'nom');

    NotificationService.notifyUser(
      equip.proprietaire.toString(),
      'Nouvel Avis',
      `${avis.auteur.nom} a laissé un avis ${note}⭐ sur ${equip.nom}`,
      'info',
      `/equipements/${equipement}/avis`
    );

    NotificationService.broadcastNotification(
      'Avis Disponible',
      `${equip.nom} a reçu un nouvel avis: ${note}⭐`,
      'info',
      `/equipements/${equipement}`
    );

    ResponseApi.success(res, 'Avis créé avec succès', avis, 201);
  } catch (error) {
    console.error('Erreur création avis:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return ResponseApi.error(res, 'Erreur de validation', errors, 400);
    }

    ResponseApi.error(res, 'Échec de la création de l\'avis', error.message);
  }
};

export const getEquipementAvis = async (req, res) => {
  try {
    const { equipement } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

    const filter = { equipement, isActive: true };

    let sortOption = { createdAt: -1 };
    if (sortBy === 'rating_high') {
      sortOption = { note: -1 };
    } else if (sortBy === 'rating_low') {
      sortOption = { note: 1 };
    }

    const avis = await Avis.find(filter)
      .populate('auteur', 'nom email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOption);

    const total = await Avis.countDocuments(filter);

    const stats = await Avis.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          noteMoyenne: { $avg: '$note' },
          nombreAvis: { $sum: 1 },
          distribution: {
            $push: '$note'
          }
        }
      }
    ]);

    const distribution = stats.length > 0 ? {
      '5': stats[0].distribution.filter(n => n === 5).length,
      '4': stats[0].distribution.filter(n => n === 4).length,
      '3': stats[0].distribution.filter(n => n === 3).length,
      '2': stats[0].distribution.filter(n => n === 2).length,
      '1': stats[0].distribution.filter(n => n === 1).length
    } : {};

    ResponseApi.success(res, 'Avis récupérés avec succès', {
      avis,
      stats: stats.length > 0 ? {
        noteMoyenne: parseFloat(stats[0].noteMoyenne.toFixed(1)),
        nombreAvis: stats[0].nombreAvis,
        distribution
      } : { noteMoyenne: 0, nombreAvis: 0, distribution: {} },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération avis équipement:', error);
    ResponseApi.error(res, 'Échec de la récupération des avis', error.message);
  }
};

export const getAllAvis = async (req, res) => {
  try {
    const { page = 1, limit = 10, auteur, note } = req.query;

    const filter = { isActive: true };
    if (auteur) filter.auteur = auteur;
    if (note) filter.note = note;

    const avis = await Avis.find(filter)
      .populate('auteur', 'nom email')
      .populate('equipement', 'nom')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Avis.countDocuments(filter);

    ResponseApi.success(res, 'Avis récupérés avec succès', {
      avis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    ResponseApi.error(res, 'Échec de la récupération des avis', error.message);
  }
};

export const getAvisById = async (req, res) => {
  try {
    const { id } = req.params;

    const avis = await Avis.findById(id)
      .populate('auteur', 'nom email')
      .populate('equipement', 'nom')
      .populate('reservation', 'dateDebut dateFin');

    if (!avis) {
      return ResponseApi.notFound(res, 'Avis non trouvé');
    }

    ResponseApi.success(res, 'Avis récupéré avec succès', avis);
  } catch (error) {
    console.error('Erreur récupération avis par ID:', error);
    ResponseApi.error(res, 'Échec de la récupération de l\'avis', error.message);
  }
};

export const addOwnerResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { texte } = req.body;

    if (!texte) {
      return ResponseApi.error(res, 'La réponse est requise', null, 400);
    }

    const avis = await Avis.findById(id);

    if (!avis) {
      return ResponseApi.notFound(res, 'Avis non trouvé');
    }

    const equipement = await Equipement.findById(avis.equipement);

    avis.reponseProprietaire = {
      texte,
      date: new Date()
    };

    await avis.save();
    await avis.populate('auteur', 'nom email').populate('equipement', 'nom');

    NotificationService.notifyUser(
      avis.auteur._id.toString(),
      'Réponse du Propriétaire',
      `Le propriétaire de ${avis.equipement.nom} a répondu à votre avis`,
      'info',
      `/avis/${id}`
    );

    ResponseApi.success(res, 'Réponse ajoutée avec succès', avis);
  } catch (error) {
    console.error('Erreur ajout réponse propriétaire:', error);
    ResponseApi.error(res, 'Échec de l\'ajout de la réponse', error.message);
  }
};

export const deleteAvis = async (req, res) => {
  try {
    const { id } = req.params;

    const avis = await Avis.findById(id);

    if (!avis) {
      return ResponseApi.notFound(res, 'Avis non trouvé');
    }

    await Avis.findByIdAndDelete(id);

    ResponseApi.success(res, 'Avis supprimé avec succès', avis);
  } catch (error) {
    console.error('Erreur suppression avis:', error);
    ResponseApi.error(res, 'Échec de la suppression de l\'avis', error.message);
  }
};

export const getPMEReceivedAvis = async (req, res) => {
  try {
    const { pmeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pme = await PME.findById(pmeId);
    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    const avis = await Avis.find({
      equipement: { $in: pme.equipements },
      isActive: true
    })
      .populate('auteur', 'nom email')
      .populate('equipement', 'nom')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Avis.countDocuments({
      equipement: { $in: pme.equipements },
      isActive: true
    });

    ResponseApi.success(res, 'Avis reçus par la PME récupérés', {
      avis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération avis reçus PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des avis', error.message);
  }
};

export const getPMEGivenAvis = async (req, res) => {
  try {
    const { pmeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const avis = await Avis.find({
      auteur: pmeId,
      isActive: true
    })
      .populate('equipement', 'nom')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Avis.countDocuments({
      auteur: pmeId,
      isActive: true
    });

    ResponseApi.success(res, 'Avis donnés par la PME récupérés', {
      avis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération avis donnés PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des avis', error.message);
  }
};

export default {
  createAvis,
  getEquipementAvis,
  getAllAvis,
  getAvisById,
  addOwnerResponse,
  deleteAvis,
  getPMEReceivedAvis,
  getPMEGivenAvis
};
