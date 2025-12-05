import env from '../config/env.js';

const IS_STAGING = true;

const GENUKA_API_BASE = IS_STAGING 
  ? 'https://api-staging.genuka.com/2023-11' 
  : 'https://api.genuka.com/2023-11';

const GENUKA_OAUTH_TOKEN_URL = IS_STAGING
  ? 'https://api-staging.genuka.com/oauth/token'
  : 'https://api.genuka.com/oauth/token';

const GENUKA_OAUTH_USERINFO_URL = IS_STAGING
  ? 'https://api-staging.genuka.com/oauth/userinfo'
  : 'https://api.genuka.com/oauth/userinfo';

class GenukaService {
  static async exchangeCodeForToken(code) {
    try {
      const clientId = env.genuka.clientId;
      const clientSecret = env.genuka.clientSecret;
      const redirectUri = env.genuka.callbackUrl;

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      });

      const response = await fetch(GENUKA_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Received non-JSON response:', text.substring(0, 200));
        throw new Error(`Expected JSON but received: ${contentType || 'unknown'}`);
      }

      if (!response.ok) {
        console.error('HTTP error:', response.status, data);
        throw new Error(`Erreur HTTP: ${response.status} - ${data.error || JSON.stringify(data)}`);
      }

      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        expires_in: data.expires_in,
        token_type: data.token_type || 'Bearer'
      };
    } catch (error) {
      console.error('Token exchange error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getUserInfo(accessToken) {
    try {
      const response = await fetch(GENUKA_OAUTH_USERINFO_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          id: data.sub,
          sub: data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture
        }
      };
    } catch (error) {
      console.error('Failed to fetch user information:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const clientId = process.env.GENUKA_CLIENT_ID;
      const clientSecret = process.env.GENUKA_CLIENT_SECRET;

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      });

      const response = await fetch(GENUKA_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.debug('[GenukaService] Token refreshed successfully');
      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in
      };
    } catch (error) {
      console.error('[GenukaService] Token refresh error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Effectue une requête API Genuka authentifiée
   */
  static async makeAuthenticatedRequest(endpoint, accessToken, options = {}) {
    try {
      const url = `${GENUKA_API_BASE}${endpoint}`;
      console.debug('[GenukaService] Making API request:', url);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-company': options.companyId || '',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[GenukaService] HTTP error:', response.status, errorData);
        throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.debug('[GenukaService] API response received');
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`[GenukaService] API error [${endpoint}]:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupère les informations de la boutique Genuka
   */
  static async getStoreInfo(accessToken, companyId) {
    console.debug('[GenukaService] Fetching store information');
    return this.makeAuthenticatedRequest('/shop', accessToken, { companyId });
  }

  /**
   * Récupère la liste des produits/services
   */
  static async getProducts(accessToken, companyId, filters = {}) {
    console.debug('[GenukaService] Fetching products');
    const params = new URLSearchParams(filters);
    return this.makeAuthenticatedRequest(`/products?${params}`, accessToken, { companyId });
  }

  /**
   * Crée un webhook dans Genuka
   */
  static async createWebhook(accessToken, companyId, events, url) {
    try {
      console.debug('[GenukaService] Creating webhook');
      
      const response = await fetch(`${GENUKA_API_BASE}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-company': companyId
        },
        body: JSON.stringify({
          events,
          url
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.debug('[GenukaService] Webhook created successfully');
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('[GenukaService] Webhook creation error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupère les commandes de la boutique
   */
  static async getOrders(accessToken, companyId, filters = {}) {
    console.log('📋 Récupération des commandes...');
    const params = new URLSearchParams(filters);
    return this.makeAuthenticatedRequest(`/orders?${params}`, accessToken, { companyId });
  }

  /**
   * Met à jour le statut d'une commande
   */
  static async updateOrderStatus(accessToken, companyId, orderId, status) {
    try {
      console.log(`📝 Mise à jour statut commande: ${orderId} -> ${status}`);
      
      const response = await fetch(`${GENUKA_API_BASE}/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-company': companyId
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.log('✅ Statut mis à jour');
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ Erreur mise à jour statut commande:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GenukaService;
