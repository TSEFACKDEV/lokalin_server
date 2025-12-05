import express from 'express';
import * as PMEController from '../controllers/PME.controller.js';

const router = express.Router();

/**
 * Routes pour la gestion des PME
 * Base: /api/lokalink/v1/pmes
 */

// GET - Récupérer toutes les PME
router.get('/', PMEController.getPMEs);

// POST - Créer une nouvelle PME
router.post('/', PMEController.createPME);

// GET - Récupérer une PME par ID
router.get('/:id', PMEController.getPMEById);

// PUT - Mettre à jour une PME
router.put('/:id', PMEController.updatePME);

// DELETE - Supprimer une PME
router.delete('/:id', PMEController.deletePME);

// GET - Récupérer les équipements d'une PME
router.get('/:id/equipements', PMEController.getPMEEquipements);

export default router;
