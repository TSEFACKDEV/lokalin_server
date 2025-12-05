import express from 'express';
import ResponseApi from '../helpers/response.js';
import NotificationService from '../services/NotificationService.js';

const webhookRouter = express.Router();

/**
 * Webhooks pour recevoir les notifications d'événements
 * URL de base: /api/lokalink/v1/webhooks
 */

/**
 * POST /webhooks/order
 * Reçoit les notifications de commandes
 */
webhookRouter.post('/order', (req, res) => {
  try {
    const { orderId, userId, amount, status, items } = req.body;

    if (!orderId || !userId) {
      return ResponseApi.error(res, 'Données manquantes', { orderId, userId }, 400);
    }

    // Utiliser le NotificationService
    NotificationService.notifyOrderCreated(orderId, userId, amount, status, items);

    console.log(`📦 Webhook: Commande ${orderId} reçue`);

    ResponseApi.success(res, 'Notification de commande reçue', { orderId, status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook commande:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * POST /webhooks/payment
 * Reçoit les notifications de paiements
 */
webhookRouter.post('/payment', (req, res) => {
  try {
    const { paymentId, userId, amount, status, method, orderId } = req.body;

    if (!paymentId || !userId) {
      return ResponseApi.error(res, 'Données manquantes', { paymentId, userId }, 400);
    }

    // Utiliser le NotificationService
    NotificationService.notifyPaymentCompleted(paymentId, userId, orderId, amount, status, method);

    console.log(`💳 Webhook: Paiement ${paymentId} reçu - ${status}`);

    ResponseApi.success(res, 'Notification de paiement reçue', { paymentId, status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook paiement:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * POST /webhooks/product
 * Reçoit les notifications de nouveaux produits
 */
webhookRouter.post('/product', (req, res) => {
  try {
    const { productId, name, description, category, price, image } = req.body;

    if (!productId || !name) {
      return ResponseApi.error(res, 'Données manquantes', { productId, name }, 400);
    }

    // Utiliser le NotificationService
    NotificationService.notifyProductCreated(productId, name, category, price, description, image);

    console.debug(`[Webhook] Product created: ${productId} - ${name}`);

    ResponseApi.success(res, 'Notification de produit reçue', { productId, status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook produit:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * POST /webhooks/reservation
 * Reçoit les notifications de réservations
 */
webhookRouter.post('/reservation', (req, res) => {
  try {
    const { reservationId, userId, startDate, endDate, totalPrice, status, PMEId } = req.body;

    if (!reservationId || !userId) {
      return ResponseApi.error(res, 'Données manquantes', { reservationId, userId }, 400);
    }

    // Utiliser le NotificationService
    NotificationService.notifyReservationCreated(reservationId, userId, startDate, endDate, totalPrice, PMEId, status);

    console.log(`📅 Webhook: Réservation ${reservationId} reçue`);

    ResponseApi.success(res, 'Notification de réservation reçue', { reservationId, status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook réservation:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * POST /webhooks/review
 * Reçoit les notifications d'avis/commentaires
 */
webhookRouter.post('/review', (req, res) => {
  try {
    const { reviewId, productId, userId, rating, comment, PMEId } = req.body;

    if (!reviewId || !productId) {
      return ResponseApi.error(res, 'Données manquantes', { reviewId, productId }, 400);
    }

    // Utiliser le NotificationService
    NotificationService.notifyReviewCreated(reviewId, productId, userId, rating, comment, PMEId);

    console.log(`⭐ Webhook: Avis ${reviewId} reçu - ${rating} étoiles`);

    ResponseApi.success(res, 'Notification d\'avis reçue', { reviewId, status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook avis:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * POST /webhooks/status
 * Reçoit les notifications de changement de statut
 */
webhookRouter.post('/status', (req, res) => {
  try {
    const { entityType, entityId, oldStatus, newStatus, details } = req.body;

    if (!entityType || !entityId) {
      return ResponseApi.error(res, 'Données manquantes', { entityType, entityId }, 400);
    }

    // Utiliser le NotificationService
    NotificationService.notifyStatusChanged(entityType, entityId, oldStatus, newStatus, details);

    console.log(`🔄 Webhook: Statut ${entityType} ${entityId} changé: ${oldStatus} → ${newStatus}`);

    ResponseApi.success(res, 'Notification de statut reçue', { entityId, status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook statut:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * POST /webhooks/notification
 * Reçoit les notifications personnalisées
 */
webhookRouter.post('/notification', (req, res) => {
  try {
    const { userId, title, message, type, actionUrl, recipientIds } = req.body;

    if (!title || !message) {
      return ResponseApi.error(res, 'Données manquantes', { title, message }, 400);
    }

    // Si destinataires spécifiés
    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      NotificationService.notifyUsers(recipientIds, title, message, type, actionUrl);
      console.log(`📬 Webhook: Notifications envoyées à ${recipientIds.length} destinataire(s)`);
    } else {
      // Sinon, broadcast à tous
      NotificationService.broadcastNotification(title, message, type, actionUrl);
      console.log(`📢 Webhook: Notification broadcast envoyée`);
    }

    ResponseApi.success(res, 'Notification envoyée', { status: 'processed' }, 200);
  } catch (error) {
    console.error('Erreur webhook notification:', error);
    ResponseApi.error(res, 'Erreur lors du traitement du webhook', error.message);
  }
});

/**
 * GET /webhooks/status
 * Vérifie le statut des webhooks
 */
webhookRouter.get('/status', (req, res) => {
  try {
    const connectedUsers = NotificationService.getConnectedUsers();

    ResponseApi.success(res, 'Webhooks actifs', {
      webhooksActive: NotificationService.isReady(),
      connectedUsers: connectedUsers.length,
      timestamp: new Date(),
      availableEndpoints: [
        '/api/lokalink/v1/webhooks/order',
        '/api/lokalink/v1/webhooks/payment',
        '/api/lokalink/v1/webhooks/product',
        '/api/lokalink/v1/webhooks/reservation',
        '/api/lokalink/v1/webhooks/review',
        '/api/lokalink/v1/webhooks/status',
        '/api/lokalink/v1/webhooks/notification',
      ],
    }, 200);
  } catch (error) {
    console.error('Erreur statut webhooks:', error);
    ResponseApi.error(res, 'Erreur lors de la vérification', error.message);
  }
});

export default webhookRouter;
