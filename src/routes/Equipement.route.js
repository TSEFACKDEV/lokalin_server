import express from 'express';
import * as EquipementController from '../controllers/Equipement.controller.js';

const router = express.Router();

/**
 * Routes pour la gestion des équipements
 * Base: /api/lokalink/v1/equipements
 */

// GET - Rechercher les équipements avec filtrage
router.get('/', EquipementController.searchEquipements);

// POST - Créer un nouvel équipement
router.post('/', EquipementController.createEquipement);

// GET - Récupérer un équipement par ID
router.get('/:id', EquipementController.getEquipementById);

// PUT - Mettre à jour un équipement
router.put('/:id', EquipementController.updateEquipement);

// DELETE - Supprimer un équipement
router.delete('/:id', EquipementController.deleteEquipement);

// PATCH - Mettre à jour la disponibilité d'un équipement
router.patch('/:id/availability', EquipementController.updateAvailability);

// GET - Récupérer les disponibilités d'un équipement
router.get('/:id/availability', EquipementController.getAvailability);

export default router;
