import express from 'express';
import * as ReservationController from '../controllers/Reservation.controller.js';

const router = express.Router();

/**
 * Routes pour la gestion des réservations
 * Base: /api/lokalink/v1/reservations
 */

// GET - Récupérer toutes les réservations
router.get('/', ReservationController.getReservations);

// POST - Créer une nouvelle réservation
router.post('/', ReservationController.createReservation);

// GET - Récupérer une réservation par ID
router.get('/:id', ReservationController.getReservationById);

// PATCH - Confirmer une réservation
router.patch('/:id/confirm', ReservationController.confirmReservation);

// PATCH - Annuler une réservation
router.patch('/:id/cancel', ReservationController.cancelReservation);

// PATCH - Marquer une réservation comme terminée
router.patch('/:id/complete', ReservationController.completeReservation);

// PATCH - Mettre à jour le statut de paiement
router.patch('/:id/payment', ReservationController.updatePaymentStatus);

// GET - Récupérer les réservations d'une PME (locataire)
router.get('/pme/:pmeId/as-tenant', ReservationController.getPMEReservations);

// GET - Récupérer les réservations des équipements d'une PME (propriétaire)
router.get('/pme/:pmeId/as-owner', ReservationController.getPMEEquipementReservations);

export default router;
