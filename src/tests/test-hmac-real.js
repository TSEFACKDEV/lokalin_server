/**
 * Script de test HMAC avec les données réelles de Genuka
 * Utilisez ce script pour diagnostiquer les problèmes de validation HMAC
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// VOS DONNÉES RÉELLES DU LOG
const REAL_DATA = {
  company_id: '01kbne8v1ym2apxgqr8331dzpz',
  timestamp: '1764936309',
  hmac: 'adb2ada080ada782c1c62381547e3583c99ce40b34a7982ca5249f57ad46050b',
  code: '6Q1KloKeweqpYlpELXJ2rEZFq4jD75sE3eGqKoUf',
  redirect_to: 'https%3A%2F%2Fstaging.genuka.com%2Fapps-installed%2F01kbq6dpd1kxgpsddb7pkkxz1v',
  rawQueryString: 'code=6Q1KloKeweqpYlpELXJ2rEZFq4jD75sE3eGqKoUf&company_id=01kbne8v1ym2apxgqr8331dzpz&redirect_to=https%253A%252F%252Fstaging.genuka.com%252Fapps-installed%252F01kbq6dpd1kxgpsddb7pkkxz1v&timestamp=1764936309&hmac=adb2ada080ada782c1c62381547e3583c99ce40b34a7982ca5249f57ad46050b'
};

function testHmac() {
  console.log('\n🔍 DIAGNOSTIC HMAC GENUKA\n');
  console.log('=' .repeat(80));
  
  const secret = process.env.GENUKA_CLIENT_SECRET;
  
  if (!secret) {
    console.error('❌ ERREUR: GENUKA_CLIENT_SECRET non trouvé dans .env');
    process.exit(1);
  }

  console.log('📋 DONNÉES REÇUES:');
  console.log('  company_id:', REAL_DATA.company_id);
  console.log('  timestamp:', REAL_DATA.timestamp);
  console.log('  hmac:', REAL_DATA.hmac);
  console.log('  code:', REAL_DATA.code.substring(0, 15) + '...');
  console.log('\n📌 CONFIGURATION:');
  console.log('  CLIENT_SECRET length:', secret.length);
  console.log('  CLIENT_SECRET (first 10):', secret.substring(0, 10) + '...');
  console.log('  CLIENT_SECRET (last 10):', '...' + secret.substring(secret.length - 10));
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST DES DIFFÉRENTES MÉTHODES DE CALCUL HMAC\n');

  // MÉTHODE 1: Documentation officielle Genuka
  console.log('📝 MÉTHODE 1: Documentation officielle (company_id + timestamp)');
  const string1 = `company_id=${REAL_DATA.company_id}&timestamp=${REAL_DATA.timestamp}`;
  const hmac1 = crypto.createHmac('sha256', secret).update(string1).digest('hex');
  console.log('  String:', string1);
  console.log('  Calculé:', hmac1);
  console.log('  Reçu:   ', REAL_DATA.hmac);
  console.log('  Match:', hmac1 === REAL_DATA.hmac ? '✅ OUI' : '❌ NON');
  
  // MÉTHODE 2: Tous les paramètres sauf hmac (ordre URL)
  console.log('\n📝 MÉTHODE 2: Tous paramètres sans hmac (ordre original)');
  const queryParts = REAL_DATA.rawQueryString.split('&').filter(p => !p.startsWith('hmac='));
  const string2 = queryParts.join('&');
  const hmac2 = crypto.createHmac('sha256', secret).update(string2).digest('hex');
  console.log('  String:', string2.substring(0, 100) + '...');
  console.log('  Calculé:', hmac2);
  console.log('  Reçu:   ', REAL_DATA.hmac);
  console.log('  Match:', hmac2 === REAL_DATA.hmac ? '✅ OUI' : '❌ NON');

  // MÉTHODE 3: Paramètres triés alphabétiquement
  console.log('\n📝 MÉTHODE 3: Paramètres triés alphabétiquement');
  const params = new URLSearchParams(REAL_DATA.rawQueryString);
  params.delete('hmac');
  const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const string3 = sortedParams.map(([k, v]) => `${k}=${v}`).join('&');
  const hmac3 = crypto.createHmac('sha256', secret).update(string3).digest('hex');
  console.log('  String:', string3.substring(0, 100) + '...');
  console.log('  Calculé:', hmac3);
  console.log('  Reçu:   ', REAL_DATA.hmac);
  console.log('  Match:', hmac3 === REAL_DATA.hmac ? '✅ OUI' : '❌ NON');

  // MÉTHODE 4: Sans décodage des valeurs
  console.log('\n📝 MÉTHODE 4: Query string brute sans décodage');
  const rawWithoutHmac = REAL_DATA.rawQueryString.replace(/&hmac=[^&]*/, '').replace(/hmac=[^&]*&/, '');
  const hmac4 = crypto.createHmac('sha256', secret).update(rawWithoutHmac).digest('hex');
  console.log('  String:', rawWithoutHmac.substring(0, 100) + '...');
  console.log('  Calculé:', hmac4);
  console.log('  Reçu:   ', REAL_DATA.hmac);
  console.log('  Match:', hmac4 === REAL_DATA.hmac ? '✅ OUI' : '❌ NON');

  console.log('\n' + '='.repeat(80));
  
  // Vérifier si au moins une méthode fonctionne
  if (hmac1 === REAL_DATA.hmac || hmac2 === REAL_DATA.hmac || hmac3 === REAL_DATA.hmac || hmac4 === REAL_DATA.hmac) {
    console.log('✅ SUCCÈS: Au moins une méthode a fonctionné!');
    if (hmac1 === REAL_DATA.hmac) console.log('   → Utilisez la MÉTHODE 1 (documentation officielle)');
    if (hmac2 === REAL_DATA.hmac) console.log('   → Utilisez la MÉTHODE 2 (tous params ordre URL)');
    if (hmac3 === REAL_DATA.hmac) console.log('   → Utilisez la MÉTHODE 3 (params triés)');
    if (hmac4 === REAL_DATA.hmac) console.log('   → Utilisez la MÉTHODE 4 (query brute)');
  } else {
    console.log('❌ ÉCHEC: Aucune méthode n\'a fonctionné');
    console.log('\n🔧 SOLUTIONS POSSIBLES:');
    console.log('  1. Vérifiez que GENUKA_CLIENT_SECRET dans .env est EXACTEMENT le même que dans le dashboard Genuka');
    console.log('  2. Copiez le secret depuis le dashboard Genuka et collez-le dans .env (sans espace)');
    console.log('  3. Si vous utilisez l\'environnement staging, utilisez le CLIENT_SECRET de staging');
    console.log('  4. Regénérez le CLIENT_SECRET dans le dashboard Genuka si nécessaire');
    console.log('\n💡 CLIENT_SECRET actuel dans .env:');
    console.log('   ', secret);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

testHmac();
