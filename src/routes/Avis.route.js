import express from 'express';
import * as AvisController from '../controllers/Avis.controller.js';

const router = express.Router();

/**
 * Routes pour la gestion des avis
 * Base: /api/lokalink/v1/avis
 */

// GET - Récupérer tous les avis
router.get('/', AvisController.getAllAvis);

// POST - Créer un nouvel avis
router.post('/', AvisController.createAvis);

// GET - Récupérer un avis par ID
router.get('/:id', AvisController.getAvisById);

// DELETE - Supprimer un avis
router.delete('/:id', AvisController.deleteAvis);

// POST - Ajouter une réponse du propriétaire à un avis
router.post('/:id/response', AvisController.addOwnerResponse);

// GET - Récupérer les avis d'un équipement
router.get('/equipement/:equipement', AvisController.getEquipementAvis);

// GET - Récupérer les avis reçus par une PME (sur ses équipements)
router.get('/pme/:pmeId/received', AvisController.getPMEReceivedAvis);

// GET - Récupérer les avis donnés par une PME
router.get('/pme/:pmeId/given', AvisController.getPMEGivenAvis);

export default router;
