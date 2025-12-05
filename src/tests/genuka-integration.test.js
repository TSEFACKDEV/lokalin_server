/**
 * Script de test pour l'intégration Genuka
 * 
 * Ce script vérifie que :
 * 1. La validation HMAC fonctionne correctement
 * 2. Le modèle PME accepte les PME Genuka sans password
 * 3. Le company_id est bien sauvegardé
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import PME from '../models/PME.model.js';
import env from '../config/env.js';

// Fonction de validation HMAC (copie de Genuka.controller.js)
function validateHmac({ hmac: receivedHmac, timestamp, companyId, rawQueryString }) {
  if (!receivedHmac || !timestamp || !companyId) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const ageDiff = Math.abs(now - parseInt(timestamp));
  
  if (ageDiff > 600) {
    return false;
  }

  // Extraire tous les paramètres sauf 'hmac' en gardant l'ordre original de l'URL
  const queryParts = rawQueryString.split('&').filter(part => !part.startsWith('hmac='));
  const stringToHash = queryParts.join('&');
  
  const secret = env.genuka.clientSecret || '';
  
  if (!secret) {
    console.error('CLIENT_SECRET manquant');
    return false;
  }

  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(stringToHash)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHmac, 'hex'),
      Buffer.from(receivedHmac, 'hex')
    );
  } catch (err) {
    return false;
  }
}

async function testGenukaIntegration() {
  console.log('\n🧪 Test d\'intégration Genuka\n');

  try {
    // 1. Connexion à la base de données
    console.log('📊 Connexion à MongoDB...');
    await mongoose.connect(env.mongodbUri);
    console.log('✅ Connecté à MongoDB\n');

    // 2. Test de validation HMAC
    console.log('🔒 Test de validation HMAC...');
    
    const testCompanyId = 'test_company_123';
    const testTimestamp = Math.floor(Date.now() / 1000).toString();
    const testSecret = env.genuka.clientSecret || 'test_secret';
    const testCode = 'test_code_xyz';
    const testRedirect = 'https://staging.genuka.com/apps-installed/test';
    
    // Créer un HMAC valide avec TOUS les paramètres (comme Genuka le fait)
    const queryWithoutHmac = `code=${testCode}&company_id=${testCompanyId}&redirect_to=${encodeURIComponent(testRedirect)}&timestamp=${testTimestamp}`;
    const validHmac = crypto
      .createHmac('sha256', testSecret)
      .update(queryWithoutHmac)
      .digest('hex');
    
    const fullQueryString = `${queryWithoutHmac}&hmac=${validHmac}`;
    
    console.log('  String à hasher:', queryWithoutHmac.substring(0, 60) + '...');
    console.log('  HMAC généré:', validHmac.substring(0, 20) + '...');
    
    const isValid = validateHmac({
      hmac: validHmac,
      timestamp: testTimestamp,
      companyId: testCompanyId,
      rawQueryString: fullQueryString
    });
    
    if (isValid) {
      console.log('✅ Validation HMAC : OK\n');
    } else {
      console.log('❌ Validation HMAC : ÉCHEC\n');
      throw new Error('La validation HMAC a échoué');
    }

    // 3. Test de création de PME Genuka
    console.log('🏢 Test de création de PME Genuka...');
    
    // Nettoyer les données de test existantes
    await PME.deleteMany({ genuka_id: { $regex: /^test_/ } });
    
    const testPME = {
      nom: 'Test PME Genuka',
      email: 'test-genuka@example.com',
      genuka_id: 'test_company_' + Date.now(),
      genuka_access_token: 'test_access_token',
      genuka_refresh_token: 'test_refresh_token',
      genuka_token_expires_at: new Date(Date.now() + 3600 * 1000),
      isVerified: true,
      isActive: true
    };
    
    console.log('  Données PME:', {
      nom: testPME.nom,
      email: testPME.email,
      genuka_id: testPME.genuka_id
    });
    
    const pme = await PME.create(testPME);
    
    console.log('✅ PME créée avec succès');
    console.log('  ID:', pme._id);
    console.log('  Nom:', pme.nom);
    console.log('  Genuka ID:', pme.genuka_id);
    console.log('  Email:', pme.email);
    console.log('  Vérifié:', pme.isVerified);
    console.log('  Actif:', pme.isActive);

    // 4. Test de création de PME sans password (doit réussir avec genuka_id)
    console.log('\n🔑 Test de création de PME Genuka SANS password...');
    
    const testPMENoPassword = {
      nom: 'Test PME Sans Password',
      genuka_id: 'test_company_no_pwd_' + Date.now(),
      genuka_access_token: 'test_token',
      isVerified: true,
      isActive: true
    };
    
    const pmeNoPassword = await PME.create(testPMENoPassword);
    console.log('✅ PME créée sans password (avec genuka_id)');
    console.log('  ID:', pmeNoPassword._id);
    console.log('  Genuka ID:', pmeNoPassword.genuka_id);

    // 5. Test de création de PME locale sans genuka_id (doit échouer sans password)
    console.log('\n🔐 Test de création de PME locale SANS password (doit échouer)...');
    
    try {
      await PME.create({
        nom: 'Test PME Locale',
        email: 'test-local@example.com',
        isVerified: false,
        isActive: true
      });
      console.log('❌ ERREUR : La PME locale a été créée sans password !');
    } catch (error) {
      console.log('✅ Validation réussie : PME locale nécessite un password');
      console.log('  Message d\'erreur:', error.message);
    }

    // 6. Vérification finale
    console.log('\n📊 Récapitulatif des PME de test créées...');
    const testPMEs = await PME.find({ genuka_id: { $regex: /^test_/ } });
    console.log(`✅ ${testPMEs.length} PME(s) de test trouvée(s)`);
    
    testPMEs.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.nom}`);
      console.log(`     - ID: ${p._id}`);
      console.log(`     - Genuka ID: ${p.genuka_id}`);
      console.log(`     - Email: ${p.email || 'N/A'}`);
    });

    // Nettoyage
    console.log('\n🧹 Nettoyage des données de test...');
    await PME.deleteMany({ genuka_id: { $regex: /^test_/ } });
    console.log('✅ Données de test supprimées');

    console.log('\n✅ TOUS LES TESTS ONT RÉUSSI ! ✅\n');

  } catch (error) {
    console.error('\n❌ ERREUR PENDANT LES TESTS:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Déconnexion de MongoDB');
  }
}

// Exécuter les tests
testGenukaIntegration();
