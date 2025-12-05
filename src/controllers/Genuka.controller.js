import crypto from 'crypto';
import env from '../config/env.js';
import ResponseApi from '../helpers/response.js';
import PME from '../models/PME.model.js';
import GenukaService from '../services/GenukaService.js';
import { logGenukaInstallation, logHmacValidationFailure } from '../utils/genukaLogger.js';

const MAX_AGE_SECONDS = 600; // 10 minutes - Temporaire pour développement (réduire à 300 en production)

/**
 * Valider la signature HMAC envoyée par Genuka
 * 
 * IMPORTANT: Genuka calcule le HMAC avec TOUS les paramètres (sauf hmac) dans l'ordre de l'URL
 * La documentation officielle simplifie l'exemple, mais en réalité Genuka utilise:
 * code=xxx&company_id=xxx&redirect_to=xxx&timestamp=xxx (sans le paramètre hmac)
 */
function validateHmac({ hmac: receivedHmac, timestamp, companyId, rawQueryString }) {
  if (!receivedHmac || !timestamp || !companyId) {
    console.warn('[HMAC Validator] Paramètres manquants:', { receivedHmac: !!receivedHmac, timestamp: !!timestamp, companyId: !!companyId });
    return false;
  }

  // 1. Vérifier le timestamp pour prévenir les attaques par rejeu
  const now = Math.floor(Date.now() / 1000);
  const ageDiff = Math.abs(now - parseInt(timestamp));
  
  if (ageDiff > MAX_AGE_SECONDS) {
    console.warn(`[HMAC Validator] Timestamp trop ancien: ${ageDiff}s (max: ${MAX_AGE_SECONDS}s)`);
    return false;
  }

  const secret = env.genuka.clientSecret || '';
  
  if (!secret) {
    console.error('[HMAC Validator] CRITICAL: CLIENT_SECRET not found in configuration');
    return false;
  }

  // 2. Extraire tous les paramètres sauf 'hmac' en gardant l'ordre original de l'URL
  const queryParts = rawQueryString.split('&').filter(part => !part.startsWith('hmac='));
  const stringToHash = queryParts.join('&');

  // 3. Calculer le HMAC using GENUKA_CLIENT_SECRET
  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(stringToHash)
    .digest('hex');

  console.info('[HMAC Validator] Configuration:');
  console.info('  CLIENT_SECRET length:', secret.length);
  console.info('  String to hash:', stringToHash.substring(0, 100) + (stringToHash.length > 100 ? '...' : ''));
  console.info('  Computed HMAC:', computedHmac);
  console.info('  Received HMAC:', receivedHmac);
  console.info('  Match:', computedHmac === receivedHmac ? '✅ YES' : '❌ NO');

  // 4. Comparer en temps constant pour éviter les attaques par minutage
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedHmac, 'hex'),
      Buffer.from(receivedHmac, 'hex')
    );
    
    if (isValid) {
      console.info('[HMAC Validator] ✅ Validation successful');
    } else {
      console.error('[HMAC Validator] ❌ HMAC MISMATCH');
      console.error('  Computed:', computedHmac);
      console.error('  Received:', receivedHmac);
      console.error('  → Vérifiez votre GENUKA_CLIENT_SECRET dans .env');
    }
    
    return isValid;
  } catch (err) {
    console.error('[HMAC Validator] Comparison error:', err.message);
    return false;
  }
}

/**
 * Initiater l'authentification avec Genuka
 * C'est appelé quand l'utilisateur clique sur "Installer l'app"
 */
export const initiateGenuka = (req, res) => {
  try {
    const clientId = process.env.GENUKA_CLIENT_ID;
    const redirectUri = `${process.env.API_URL || 'http://localhost:3000'}/api/lokalink/v1/auth/genuka/callback`;
    
    // Note: Genuka gère le state côté serveur, on ne l'inclut pas dans l'URL
    const genuka_auth_url = `https://platform.genuka.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

    // Rediriger directement vers Genuka
    res.redirect(genuka_auth_url);
  } catch (error) {
    console.error('Erreur lors de l\'initiation Genuka:', error);
    ResponseApi.error(res, 'Erreur lors de l\'initiation Genuka', error.message);
  }
};

/**
 * Callback après installation de l'application dans Genuka
 * Genuka envoie: code, company_id, timestamp, hmac, redirect_to
 */
export const handleGenuka = async (req, res) => {
  try {
    const { code, company_id, timestamp, hmac, redirect_to } = req.query;

    // LOG COMPLET POUR DIAGNOSTIC
    console.info('[Genuka Callback] ════════════════════════════════════════');
    console.info('[Genuka Callback] Raw URL:', req.url);
    console.info('[Genuka Callback] Query String:', req.url.split('?')[1]);
    console.info('[Genuka Callback] Paramètres reçus (decoded by Express):', {
      code: code ? code.substring(0, 10) + '...' : 'ABSENT',
      company_id,
      timestamp,
      hmac: hmac ? hmac.substring(0, 16) + '...' : 'ABSENT',
      redirect_to: redirect_to ? redirect_to.substring(0, 30) + '...' : 'ABSENT'
    });

    // 1. VALIDATION DU HMAC (OBLIGATOIRE)
    // Important: utiliser la query string BRUTE (non décodée)
    const rawQueryString = req.url.split('?')[1] || '';
    const hmacStr = String(hmac || '');
    const timestampStr = String(timestamp || '');
    const companyIdStr = String(company_id || '');

    const isHmacValid = validateHmac({
      hmac: hmacStr,
      timestamp: timestampStr,
      companyId: companyIdStr,
      rawQueryString
    });

    if (!isHmacValid) {
      console.warn('[Genuka Callback] HMAC validation FAILED');
      console.warn('[Genuka Callback] This could mean:');
      console.warn('  1. CLIENT_SECRET in .env is WRONG');
      console.warn('  2. Genuka regenerated the secret in dashboard');
      console.warn('  3. Request from unauthorized source');
      console.warn('[Genuka Callback] Rejecting request with 401');
      
      // Logger l'échec de validation HMAC
      logHmacValidationFailure({
        company_id: company_id,
        timestamp: timestamp,
        hmac: hmac,
        ip: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent')
      });
      
      return res.status(401).json({
        error: 'HMAC invalide',
        message: 'La requête ne provient pas de Genuka. Vérifiez le CLIENT_SECRET dans le dashboard Genuka.'
      });
    }

    // 2. VÉRIFIER LES PARAMÈTRES REQUIS
    if (!code || !company_id) {
      console.error('[Genuka] Missing required parameters: code or company_id');
      return res.status(400).json({
        error: 'Paramètres manquants',
        message: 'code et company_id sont requis'
      });
    }

    // 3. ÉCHANGER LE CODE POUR UN TOKEN D'ACCÈS
    console.debug('[Genuka] Exchanging code for access token');
    const tokenResponse = await GenukaService.exchangeCodeForToken(code);

    if (!tokenResponse.success) {
      console.error('[Genuka] Token exchange failed:', tokenResponse.error);
      return res.status(500).json({
        error: 'Erreur lors de l\'échange du code',
        message: tokenResponse.error
      });
    }

    console.debug('[Genuka] Access token received successfully');

    // 4. RÉCUPÉRER LES INFORMATIONS DE L'UTILISATEUR DEPUIS GENUKA
    console.debug('[Genuka] Fetching user info from Genuka');
    const userInfoResponse = await GenukaService.getUserInfo(tokenResponse.access_token);
    
    let userEmail = null;
    let userName = null;
    
    if (userInfoResponse.success) {
      userEmail = userInfoResponse.data.email;
      userName = userInfoResponse.data.name;
      console.debug('[Genuka] User info retrieved:', { email: userEmail, name: userName });
    } else {
      console.warn('[Genuka] Failed to fetch user info, will use defaults');
    }

    // 5. CRÉER OU METTRE À JOUR LA PME
    let pme = await PME.findOne({ genuka_id: company_id });

    if (!pme) {
      console.debug('[Genuka] Creating new PME entry');
      pme = await PME.create({
        nom: userName || `PME ${company_id.substring(0, 8)}`,
        email: userEmail || `company-${company_id}@genuka.temp`,
        genuka_id: company_id,
        genuka_access_token: tokenResponse.access_token,
        genuka_refresh_token: tokenResponse.refresh_token || null,
        genuka_token_expires_at: tokenResponse.expires_in 
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : null,
        isVerified: true,
        isActive: true,
        lastLogin: new Date()
      });
      console.info('[Genuka] PME created:', pme._id, 'company_id:', company_id);
    } else {
      console.debug('[Genuka] Updating existing PME');
      pme.genuka_access_token = tokenResponse.access_token;
      if (tokenResponse.refresh_token) {
        pme.genuka_refresh_token = tokenResponse.refresh_token;
      }
      if (tokenResponse.expires_in) {
        pme.genuka_token_expires_at = new Date(Date.now() + tokenResponse.expires_in * 1000);
      }
      if (userEmail && !pme.email) {
        pme.email = userEmail;
      }
      if (userName && pme.nom.startsWith('PME ')) {
        pme.nom = userName;
      }
      pme.lastLogin = new Date();
      await pme.save();
      console.info('[Genuka] PME updated successfully, company_id:', company_id);
    }

    // Logger l'installation réussie
    logGenukaInstallation({
      company_id: company_id,
      pme_id: pme._id.toString(),
      user_email: userEmail,
      user_name: userName,
      success: true
    });

    // 6. REDIRIGER VERS GENUKA AVEC L'URL redirect_to
    // C'est IMPORTANT : on doit rediriger vers l'URL fournie par Genuka
    if (redirect_to) {
      // IMPORTANT: Le redirect_to peut être URL-encodé, il faut le décoder
      const decodedRedirectUrl = decodeURIComponent(redirect_to);
      console.debug('[Genuka] Redirecting to:', decodedRedirectUrl);
      res.redirect(decodedRedirectUrl);
    } else {
      // Fallback si redirect_to est absent
      console.warn('[Genuka] No redirect_to provided - Using fallback success response');
      res.status(200).json({
        success: true,
        message: 'Application installée avec succès',
        pmeId: pme._id,
        companyId: company_id
      });
    }

  } catch (error) {
    console.error('[Genuka] Callback processing error:', error);
    
    // Logger l'erreur
    logGenukaInstallation({
      company_id: req.query.company_id,
      pme_id: null,
      user_email: null,
      user_name: null,
      success: false,
      error: error.message
    });
    
    res.status(500).json({
      error: 'Erreur lors du traitement du callback',
      message: error.message
    });
  }
};

/**
 * Déconnecter l'utilisateur de Genuka
 */
export const logoutGenuka = (req, res) => {
  try {
    // Nettoyer les données de session liées à Genuka
    req.session = null;
    ResponseApi.success(res, 'Déconnexion réussie');
  } catch (error) {
    console.error('Erreur lors de la déconnexion Genuka:', error);
    ResponseApi.error(res, 'Erreur lors de la déconnexion', error.message);
  }
};

/**
 * Récupérer les informations de la PME depuis Genuka
 */
export const getGenukaStoreInfo = async (req, res) => {
  try {
    const { pmeId } = req.params;

    const pme = await PME.findById(pmeId).select('+genuka_access_token');
    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    // Vérifier si le token n'est pas expiré
    if (pme.genuka_token_expires_at && new Date() > pme.genuka_token_expires_at) {
      console.log('🔄 Token expiré - Rafraîchissement...');
      if (pme.genuka_refresh_token) {
        const refreshResult = await GenukaService.refreshAccessToken(pme.genuka_refresh_token);
        if (refreshResult.success) {
          pme.genuka_access_token = refreshResult.access_token;
          if (refreshResult.refresh_token) {
            pme.genuka_refresh_token = refreshResult.refresh_token;
          }
          if (refreshResult.expires_in) {
            pme.genuka_token_expires_at = new Date(Date.now() + refreshResult.expires_in * 1000);
          }
          await pme.save();
        }
      }
    }

    const storeInfo = await GenukaService.getStoreInfo(pme.genuka_access_token, pme.genuka_id);

    if (!storeInfo.success) {
      return ResponseApi.error(res, 'Erreur lors de la récupération des infos boutique', storeInfo.error);
    }

    ResponseApi.success(res, 'Informations boutique récupérées', storeInfo.data);
  } catch (error) {
    console.error('Erreur récupération infos boutique Genuka:', error);
    ResponseApi.error(res, 'Échec de la récupération des infos boutique', error.message);
  }
};

export default {
  initiateGenuka,
  handleGenuka,
  logoutGenuka,
  getGenukaStoreInfo
};
