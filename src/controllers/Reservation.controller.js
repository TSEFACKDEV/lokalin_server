/**
 * Contrôleur Reservation
 * Gère les réservations d'équipements
 */

import Reservation from '../models/Reservation.model.js';
import Equipement from '../models/Equipement.model.js';
import PME from '../models/PME.model.js';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';

/**
 * Créer une réservation
 */
export const createReservation = async (req, res) => {
  try {
    const { equipement, locataire, dateDebut, dateFin, adresseLivraison, notes, conditionsSpeciales } = req.body;

    if (!equipement || !locataire || !dateDebut || !dateFin) {
      return ResponseApi.error(res, 'Données manquantes', null, 400);
    }

    // Vérifier que l'équipement existe
    const equip = await Equipement.findById(equipement);
    if (!equip) {
      return ResponseApi.error(res, 'Équipement non trouvé', null, 404);
    }

    // Vérifier que le locataire existe
    const tenant = await PME.findById(locataire);
    if (!tenant) {
      return ResponseApi.error(res, 'Locataire non trouvé', null, 404);
    }

    // Vérifier les dates
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    const now = new Date();

    if (start <= now) {
      return ResponseApi.error(res, 'La date de début doit être dans le futur', null, 400);
    }

    if (end <= start) {
      return ResponseApi.error(res, 'La date de fin doit être après la date de début', null, 400);
    }

    // Vérifier les conflits de réservation
    const conflictingReservations = await Reservation.findOne({
      equipement,
      statut: { $in: ['confirmee', 'en_cours', 'en_attente'] },
      $or: [
        { dateDebut: { $lt: end }, dateFin: { $gt: start } }
      ]
    });

    if (conflictingReservations) {
      return ResponseApi.error(res, 'Cet équipement n\'est pas disponible pour ces dates', null, 409);
    }

    // Calculer le montant total
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const montantTotal = days * equip.prixParJour;
    const cautionMontant = equip.caution;

    // Créer la réservation
    const reservation = await Reservation.create({
      equipement,
      locataire,
      dateDebut: start,
      dateFin: end,
      adresseLivraison,
      notes,
      conditionsSpeciales,
      montantTotal,
      cautionMontant,
      statut: 'en_attente',
      paiementStatut: 'en_attente'
    });

    await reservation.populate('equipement', 'nom prixParJour').populate('locataire', 'nom email');

    // Notifier le propriétaire de l'équipement
    const proprietaire = await PME.findById(equip.proprietaire);
    if (proprietaire) {
      NotificationService.notifyUser(
        proprietaire._id.toString(),
        'Nouvelle Réservation',
        `${tenant.nom} a réservé ${equip.nom} du ${start.toLocaleDateString()} au ${end.toLocaleDateString()}`,
        'info',
        `/reservations/${reservation._id}`
      );
    }

    // Notifier le locataire
    NotificationService.notifyUser(
      locataire,
      'Réservation Créée',
      `Votre réservation de ${equip.nom} a été créée`,
      'success',
      `/reservations/${reservation._id}`
    );

    ResponseApi.success(res, 'Réservation créée avec succès', reservation, 201);
  } catch (error) {
    console.error('Erreur création réservation:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return ResponseApi.error(res, 'Erreur de validation', errors, 400);
    }

    ResponseApi.error(res, 'Échec de la création de la réservation', error.message);
  }
};

/**
 * Récupérer toutes les réservations
 */
export const getReservations = async (req, res) => {
  try {
    const { page = 1, limit = 10, statut, locataire, equipement } = req.query;

    const filter = {};
    if (statut) filter.statut = statut;
    if (locataire) filter.locataire = locataire;
    if (equipement) filter.equipement = equipement;

    const reservations = await Reservation.find(filter)
      .populate('equipement', 'nom prixParJour')
      .populate('locataire', 'nom email telephone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Reservation.countDocuments(filter);

    ResponseApi.success(res, 'Réservations récupérées avec succès', {
      reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    ResponseApi.error(res, 'Échec de la récupération des réservations', error.message);
  }
};

/**
 * Récupérer une réservation par ID
 */
export const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findById(id)
      .populate('equipement')
      .populate('locataire', '-password');

    if (!reservation) {
      return ResponseApi.notFound(res, 'Réservation non trouvée');
    }

    ResponseApi.success(res, 'Réservation récupérée avec succès', reservation);
  } catch (error) {
    console.error('Erreur récupération réservation:', error);
    ResponseApi.error(res, 'Échec de la récupération de la réservation', error.message);
  }
};

/**
 * Confirmer une réservation
 */
export const confirmReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return ResponseApi.notFound(res, 'Réservation non trouvée');
    }

    if (reservation.statut !== 'en_attente') {
      return ResponseApi.error(res, 'Seules les réservations en attente peuvent être confirmées', null, 400);
    }

    reservation.statut = 'confirmee';
    reservation.dateConfirmation = new Date();
    await reservation.save();

    await reservation.populate('equipement', 'nom').populate('locataire', 'nom email');

    // Notifier le locataire
    NotificationService.notifyUser(
      reservation.locataire._id.toString(),
      'Réservation Confirmée',
      `Votre réservation de ${reservation.equipement.nom} a été confirmée`,
      'success',
      `/reservations/${id}`
    );

    ResponseApi.success(res, 'Réservation confirmée avec succès', reservation);
  } catch (error) {
    console.error('Erreur confirmation réservation:', error);
    ResponseApi.error(res, 'Échec de la confirmation de la réservation', error.message);
  }
};

/**
 * Annuler une réservation
 */
export const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { raisonAnnulation } = req.body;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return ResponseApi.notFound(res, 'Réservation non trouvée');
    }

    if (['terminee', 'annulee'].includes(reservation.statut)) {
      return ResponseApi.error(res, 'Cette réservation ne peut pas être annulée', null, 400);
    }

    reservation.statut = 'annulee';
    reservation.dateAnnulation = new Date();
    reservation.raisonAnnulation = raisonAnnulation;
    await reservation.save();

    await reservation.populate('equipement', 'nom').populate('locataire', 'nom email');

    // Notifier le locataire
    NotificationService.notifyUser(
      reservation.locataire._id.toString(),
      'Réservation Annulée',
      `Votre réservation de ${reservation.equipement.nom} a été annulée`,
      'warning',
      `/reservations/${id}`
    );

    ResponseApi.success(res, 'Réservation annulée avec succès', reservation);
  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    ResponseApi.error(res, 'Échec de l\'annulation de la réservation', error.message);
  }
};

/**
 * Marquer une réservation comme terminée
 */
export const completeReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return ResponseApi.notFound(res, 'Réservation non trouvée');
    }

    if (reservation.statut !== 'en_cours') {
      return ResponseApi.error(res, 'Seules les réservations en cours peuvent être terminées', null, 400);
    }

    reservation.statut = 'terminee';
    await reservation.save();

    await reservation.populate('equipement', 'nom').populate('locataire', 'nom email');

    // Notifier le locataire
    NotificationService.notifyUser(
      reservation.locataire._id.toString(),
      'Réservation Terminée',
      `Votre réservation de ${reservation.equipement.nom} est terminée. Merci de laisser un avis!`,
      'info',
      `/reservations/${id}/avis`
    );

    ResponseApi.success(res, 'Réservation terminée avec succès', reservation);
  } catch (error) {
    console.error('Erreur clôture réservation:', error);
    ResponseApi.error(res, 'Échec de la clôture de la réservation', error.message);
  }
};

/**
 * Mettre à jour le statut de paiement
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paiementStatut } = req.body;

    const validStatuts = ['en_attente', 'paye', 'rembourse', 'partiel'];
    if (!validStatuts.includes(paiementStatut)) {
      return ResponseApi.error(res, 'Statut de paiement invalide', null, 400);
    }

    const reservation = await Reservation.findByIdAndUpdate(
      id,
      { paiementStatut },
      { new: true }
    ).populate('equipement', 'nom').populate('locataire', 'nom email');

    if (!reservation) {
      return ResponseApi.notFound(res, 'Réservation non trouvée');
    }

    ResponseApi.success(res, 'Statut de paiement mis à jour', reservation);
  } catch (error) {
    console.error('Erreur mise à jour paiement:', error);
    ResponseApi.error(res, 'Échec de la mise à jour du statut de paiement', error.message);
  }
};

/**
 * Récupérer les réservations d'une PME (en tant que locataire)
 */
export const getPMEReservations = async (req, res) => {
  try {
    const { pmeId } = req.params;
    const { page = 1, limit = 10, statut } = req.query;

    const filter = { locataire: pmeId };
    if (statut) filter.statut = statut;

    const reservations = await Reservation.find(filter)
      .populate('equipement', 'nom prixParJour')
      .populate('locataire', 'nom email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Reservation.countDocuments(filter);

    ResponseApi.success(res, 'Réservations de la PME récupérées', {
      reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération réservations PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des réservations', error.message);
  }
};

/**
 * Récupérer les réservations concernant les équipements d'une PME (en tant que propriétaire)
 */
export const getPMEEquipementReservations = async (req, res) => {
  try {
    const { pmeId } = req.params;
    const { page = 1, limit = 10, statut } = req.query;

    // Récupérer tous les équipements de la PME
    const pme = await PME.findById(pmeId);
    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    const filter = {
      equipement: { $in: pme.equipements },
      ...(statut && { statut })
    };

    const reservations = await Reservation.find(filter)
      .populate('equipement', 'nom prixParJour')
      .populate('locataire', 'nom email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Reservation.countDocuments(filter);

    ResponseApi.success(res, 'Réservations des équipements de la PME récupérées', {
      reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération réservations équipements PME:', error);
    ResponseApi.error(res, 'Échec de la récupération des réservations', error.message);
  }
};

export default {
  createReservation,
  getReservations,
  getReservationById,
  confirmReservation,
  cancelReservation,
  completeReservation,
  updatePaymentStatus,
  getPMEReservations,
  getPMEEquipementReservations
};
