import crypto from 'crypto';
import env from '../config/env.js';
import ResponseApi from '../helpers/response.js';
import PME from '../models/PME.model.js';
import GenukaService from '../services/GenukaService.js';

const MAX_AGE_SECONDS = 600;

function validateHmac({ hmac: receivedHmac, timestamp, companyId, rawQueryString }) {
  if (!receivedHmac || !timestamp || !companyId) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const ageDiff = Math.abs(now - parseInt(timestamp));
  
  if (ageDiff > MAX_AGE_SECONDS) {
    return false;
  }

  const secret = env.genuka.clientSecret || '';
  
  if (!secret) {
    console.error('CLIENT_SECRET not found');
    return false;
  }

  const queryParts = rawQueryString.split('&').filter(part => !part.startsWith('hmac='));
  const stringToHash = queryParts.join('&');

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
    console.error('HMAC comparison error:', err.message);
    return false;
  }
}

export const initiateGenuka = (req, res) => {
  try {
    const clientId = process.env.GENUKA_CLIENT_ID;
    const redirectUri = `${process.env.API_URL || 'http://localhost:3000'}/api/lokalink/v1/auth/genuka/callback`;
    const genuka_auth_url = `https://platform.genuka.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    res.redirect(genuka_auth_url);
  } catch (error) {
    console.error('Erreur initiation Genuka:', error);
    ResponseApi.error(res, 'Erreur lors de l\'initiation Genuka', error.message);
  }
};

export const handleGenuka = async (req, res) => {
  try {
    const { code, company_id, timestamp, hmac, redirect_to } = req.query;

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
      return res.status(401).json({
        error: 'HMAC invalide',
        message: 'La requête ne provient pas de Genuka'
      });
    }

    if (!code || !company_id) {
      return res.status(400).json({
        error: 'Paramètres manquants',
        message: 'code et company_id sont requis'
      });
    }

    const tokenResponse = await GenukaService.exchangeCodeForToken(code);

    if (!tokenResponse.success) {
      return res.status(500).json({
        error: 'Erreur lors de l\'échange du code',
        message: tokenResponse.error
      });
    }

    const userInfoResponse = await GenukaService.getUserInfo(tokenResponse.access_token);
    
    let userEmail = null;
    let userName = null;
    
    if (userInfoResponse.success) {
      userEmail = userInfoResponse.data.email;
      userName = userInfoResponse.data.name;
    }

    let pme = await PME.findOne({ genuka_id: company_id });

    if (!pme) {
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
    } else {
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
    }

    if (redirect_to) {
      const decodedRedirectUrl = decodeURIComponent(redirect_to);
      res.redirect(decodedRedirectUrl);
    } else {
      res.status(200).json({
        success: true,
        message: 'Application installée avec succès',
        pmeId: pme._id,
        companyId: company_id
      });
    }

  } catch (error) {
    console.error('Erreur callback Genuka:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement du callback',
      message: error.message
    });
  }
};

export const logoutGenuka = (req, res) => {
  try {
    req.session = null;
    ResponseApi.success(res, 'Déconnexion réussie');
  } catch (error) {
    console.error('Erreur déconnexion Genuka:', error);
    ResponseApi.error(res, 'Erreur lors de la déconnexion', error.message);
  }
};

export const getGenukaStoreInfo = async (req, res) => {
  try {
    const { pmeId } = req.params;

    const pme = await PME.findById(pmeId).select('+genuka_access_token');
    if (!pme) {
      return ResponseApi.notFound(res, 'PME non trouvée');
    }

    if (pme.genuka_token_expires_at && new Date() > pme.genuka_token_expires_at) {
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
