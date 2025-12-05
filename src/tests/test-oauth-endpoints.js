/**
 * Script pour tester les différents endpoints OAuth de Genuka
 * Utilisez ce script pour identifier le bon endpoint OAuth
 */

import dotenv from 'dotenv';

dotenv.config();

async function testOAuthEndpoints() {
  console.log('\n🔍 TEST DES ENDPOINTS OAUTH GENUKA\n');
  console.log('=' .repeat(80));

  const clientId = process.env.GENUKA_CLIENT_ID;
  const clientSecret = process.env.GENUKA_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('❌ ERREUR: GENUKA_CLIENT_ID ou GENUKA_CLIENT_SECRET manquant');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log('  CLIENT_ID:', clientId.substring(0, 10) + '...');
  console.log('  CLIENT_SECRET:', clientSecret.substring(0, 10) + '...');
  console.log('');

  // Liste des endpoints à tester
  const endpoints = [
    'https://api-staging.genuka.com/oauth/token',
    'https://api-staging.genuka.com/oauth/2023-11/token',
    'https://staging.genuka.com/oauth/token',
    'https://api.genuka.com/oauth/token',
    'https://api.genuka.com/oauth/2023-11/token',
    'https://platform.genuka.com/oauth/token',
  ];

  console.log('🧪 Test de connectivité sur', endpoints.length, 'endpoints\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Test: ${endpoint}`);
      
      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'test_code_invalid',  // Code invalide pour tester la réponse
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: 'http://localhost:3000/callback'
        }).toString()
      });
      
      const duration = Date.now() - startTime;
      const status = response.status;
      const contentType = response.headers.get('content-type');
      
      console.log(`  Status: ${status}`);
      console.log(`  Content-Type: ${contentType}`);
      console.log(`  Durée: ${duration}ms`);

      if (status === 404) {
        console.log(`  ❌ Endpoint non trouvé (404)\n`);
        continue;
      }

      if (contentType && contentType.includes('text/html')) {
        console.log(`  ❌ Réponse HTML (page d'erreur)\n`);
        continue;
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 200));
        
        if (status === 401 || status === 400) {
          // C'est normal avec un code invalide, mais l'endpoint existe !
          console.log(`  ✅ ENDPOINT VALIDE ! (erreur attendue car code invalide)\n`);
        } else {
          console.log(`  ⚠️  Réponse inattendue\n`);
        }
      }

    } catch (error) {
      console.log(`  ❌ Erreur:`, error.message, '\n');
    }
  }

  console.log('=' .repeat(80));
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('  1. Les endpoints qui retournent 401/400 avec JSON sont VALIDES');
  console.log('  2. Les endpoints qui retournent 404 ou HTML n\'existent PAS');
  console.log('  3. Utilisez l\'endpoint VALIDE trouvé dans GenukaService.js');
  console.log('\n');
}

testOAuthEndpoints();
