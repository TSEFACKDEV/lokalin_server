/**
 * Routes de debug pour faciliter le développement et les tests
 * À SUPPRIMER EN PRODUCTION
 */

import express from 'express';
import PME from '../models/PME.model.js';
import Category from '../models/Category.model.js';
import Equipement from '../models/Equipement.model.js';
import ResponseApi from '../helpers/response.js';

const router = express.Router();

/**
 * Créer une PME de test (sans Genuka)
 */
router.post('/create-test-pme', async (req, res) => {
  try {
    console.log('[DEBUG] Création PME test - Début');
    console.log('[DEBUG] Body reçu:', req.body);
    
    const { nom, email, password, description, adresse } = req.body;

    // Vérifier si une PME avec cet email existe déjà
    console.log('[DEBUG] Vérification PME existante...');
    const existingPme = await PME.findOne({ email });
    if (existingPme) {
      console.log('[DEBUG] PME existe déjà:', existingPme._id);
      return ResponseApi.success(res, 'PME existe déjà', {
        id: existingPme._id,
        nom: existingPme.nom,
        email: existingPme.email
      });
    }

    console.log('[DEBUG] Création nouvelle PME...');
    const pme = await PME.create({
      nom,
      email,
      password,
      description,
      adresse,
      isVerified: true,
      isActive: true
    });

    console.log('[DEBUG] ✅ PME de test créée:', pme._id);

    return ResponseApi.success(res, 'PME de test créée avec succès', {
      id: pme._id,
      nom: pme.nom,
      email: pme.email
    }, 201);

  } catch (error) {
    console.error('[DEBUG] ❌ Erreur création PME de test:', error);
    console.error('[DEBUG] Stack trace:', error.stack);
    return ResponseApi.error(res, 'Erreur lors de la création de la PME de test', error.message);
  }
});

/**
 * Lister toutes les PMEs disponibles
 */
router.get('/list-pmes', async (req, res) => {
  try {
    const pmes = await PME.find({}).select('_id nom email genuka_id isVerified isActive createdAt');
    
    console.log(`📋 ${pmes.length} PME(s) trouvée(s)`);
    pmes.forEach(pme => {
      console.log(`  - ${pme._id} | ${pme.nom} | ${pme.email} | Genuka: ${pme.genuka_id || 'Non'}`);
    });

    ResponseApi.success(res, 'PMEs récupérées', {
      total: pmes.length,
      pmes: pmes.map(pme => ({
        _id: pme._id,
        nom: pme.nom,
        email: pme.email,
        genuka_id: pme.genuka_id,
        isVerified: pme.isVerified,
        isActive: pme.isActive,
        createdAt: pme.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Erreur récupération PMEs:', error);
    ResponseApi.error(res, 'Erreur lors de la récupération des PMEs', error.message);
  }
});

/**
 * Lister toutes les catégories disponibles
 */
router.get('/list-categories', async (req, res) => {
  try {
    const categories = await Category.find({}).select('_id nom description icon');
    
    ResponseApi.success(res, 'Catégories récupérées', {
      total: categories.length,
      categories
    });

  } catch (error) {
    console.error('❌ Erreur récupération catégories:', error);
    ResponseApi.error(res, 'Erreur lors de la récupération des catégories', error.message);
  }
});

/**
 * Lister tous les équipements avec détails
 */
router.get('/list-equipements', async (req, res) => {
  try {
    const equipements = await Equipement.find({})
      .populate('proprietaire', 'nom email')
      .populate('categorie', 'nom')
      .select('_id nom description prixParJour disponibilite proprietaire categorie createdAt');
    
    ResponseApi.success(res, 'Équipements récupérés', {
      total: equipements.length,
      equipements
    });

  } catch (error) {
    console.error('❌ Erreur récupération équipements:', error);
    ResponseApi.error(res, 'Erreur lors de la récupération des équipements', error.message);
  }
});

/**
 * Nettoyer la base de données (DANGER - Développement uniquement)
 */
router.post('/clean-database', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return ResponseApi.error(res, 'Action non autorisée en production', null, 403);
    }

    const { collections = [] } = req.body; // ['pmes', 'equipements', 'categories']

    const results = {};

    if (collections.includes('equipements')) {
      const deleted = await Equipement.deleteMany({});
      results.equipements = deleted.deletedCount;
    }

    if (collections.includes('categories')) {
      const deleted = await Category.deleteMany({});
      results.categories = deleted.deletedCount;
    }

    if (collections.includes('pmes')) {
      const deleted = await PME.deleteMany({});
      results.pmes = deleted.deletedCount;
    }

    console.log('🗑️ Base de données nettoyée:', results);

    ResponseApi.success(res, 'Base de données nettoyée', results);

  } catch (error) {
    console.error('❌ Erreur nettoyage DB:', error);
    ResponseApi.error(res, 'Erreur lors du nettoyage', error.message);
  }
});

/**
 * Simuler l'installation Genuka pour créer une PME avec genuka_id
 */
router.post('/simulate-genuka-install', async (req, res) => {
  try {
    const { company_id = 'test_company_123', nom = 'PME Genuka Test' } = req.body;

    // Vérifier si une PME avec ce genuka_id existe déjà
    let pme = await PME.findOne({ genuka_id: company_id });

    if (pme) {
      return ResponseApi.success(res, 'PME Genuka existe déjà', {
        id: pme._id,
        nom: pme.nom,
        genuka_id: pme.genuka_id
      });
    }

    // Créer une nouvelle PME avec genuka_id
    pme = await PME.create({
      nom,
      email: `${company_id}@genuka-test.com`,
      password: 'testpassword123',
      genuka_id: company_id,
      genuka_access_token: 'fake_access_token_for_testing',
      isVerified: true,
      isActive: true,
      lastLogin: new Date()
    });

    console.log('✅ PME Genuka simulée créée:', pme._id);

    ResponseApi.success(res, 'PME Genuka simulée créée avec succès', {
      id: pme._id,
      nom: pme.nom,
      email: pme.email,
      genuka_id: pme.genuka_id
    }, 201);

  } catch (error) {
    console.error('❌ Erreur simulation Genuka:', error);
    ResponseApi.error(res, 'Erreur lors de la simulation Genuka', error.message);
  }
});

export default router;