import express from 'express';
import { initiateGenuka, handleGenuka, logoutGenuka } from '../controllers/Genuka.controller.js';

const router = express.Router();

/**
 * Routes pour l'authentification Genuka
 */

// Route pour initier l'authentification Genuka
router.get('/authorize', initiateGenuka);

// Route de callback après authentification Genuka
router.get('/callback', handleGenuka);

// Route pour la déconnexion Genuka
router.post('/logout', logoutGenuka);

export default router;
