/**
 * Service centralisé pour toutes les notifications
 * Gère l'envoi de notifications via Socket.IO et webhooks
 */

class NotificationService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialise le service avec l'instance Socket.IO
   */
  initialize(io) {
    this.io = io;
    console.debug('[NotificationService] Initialized');
  }

  /**
   * Vérifie que le service est initialisé
   */
  _ensureInitialized() {
    if (!this.io) {
      throw new Error('NotificationService non initialisé. Appelez initialize(io) d\'abord.');
    }
  }

  /**
   * Envoie une notification d'événement (commande, paiement, etc)
   * @param {string} eventType - Type d'événement (order, payment, product, etc)
   * @param {object} data - Données de l'événement
   */
  emitEvent(eventType, data) {
    this._ensureInitialized();

    const notification = {
      type: eventType,
      ...data,
      timestamp: new Date(),
    };

    this.io.emit(`notification:${eventType}`, notification);
    console.debug(`[NotificationService] Event emitted: ${eventType}`);

    return notification;
  }

  /**
   * Envoie une notification de commande
   */
  notifyOrderCreated(orderId, userId, amount, status, items = []) {
    return this.emitEvent('order', {
      orderId,
      userId,
      amount,
      status,
      items,
      message: `Nouvelle commande #${orderId} - ${amount}€`,
    });
  }

  /**
   * Envoie une notification de paiement
   */
  notifyPaymentCompleted(paymentId, userId, orderId, amount, status, method = 'card') {
    return this.emitEvent('payment', {
      paymentId,
      userId,
      orderId,
      amount,
      status,
      method,
      message: `Paiement de ${amount}€ effectué - ${status}`,
    });
  }

  /**
   * Envoie une notification de nouveau produit
   */
  notifyProductCreated(productId, name, category, price, description = '', image = '') {
    return this.emitEvent('product', {
      productId,
      name,
      category,
      price,
      description,
      image,
      message: `Nouveau produit: ${name}`,
    });
  }

  /**
   * Envoie une notification de réservation
   */
  notifyReservationCreated(reservationId, userId, startDate, endDate, totalPrice, PMEId = '', status = 'pending') {
    return this.emitEvent('reservation', {
      reservationId,
      userId,
      PMEId,
      startDate,
      endDate,
      totalPrice,
      status,
      message: `Nouvelle réservation #${reservationId}`,
    });
  }

  /**
   * Envoie une notification d'avis/commentaire
   */
  notifyReviewCreated(reviewId, productId, userId, rating, comment, PMEId = '') {
    return this.emitEvent('review', {
      reviewId,
      productId,
      userId,
      PMEId,
      rating,
      comment: comment.substring(0, 200),
      message: `Nouvel avis sur un produit - ${rating}⭐`,
    });
  }

  /**
   * Envoie une notification de changement de statut
   */
  notifyStatusChanged(entityType, entityId, oldStatus, newStatus, details = {}) {
    return this.emitEvent('status', {
      entityType,
      entityId,
      oldStatus,
      newStatus,
      details,
      message: `${entityType} #${entityId}: ${oldStatus} → ${newStatus}`,
    });
  }

  /**
   * Envoie une notification personnalisée à un utilisateur spécifique
   */
  notifyUser(userId, title, message, type = 'info', actionUrl = '') {
    this._ensureInitialized();

    const notification = {
      userId,
      title,
      message,
      type,
      actionUrl,
      timestamp: new Date(),
    };

    // Check if the method exists on Socket.IO instance
    if (typeof this.io.sendNotificationToUser === 'function') {
      this.io.sendNotificationToUser(userId, notification);
    } else if (typeof this.io.to === 'function') {
      // Fallback to direct emit via socket rooms (user:userId)
      this.io.to(`user:${userId}`).emit('notification:custom', notification);
    } else {
      console.warn('[NotificationService] Cannot send notification - no valid Socket.IO method');
    }

    console.debug(`[NotificationService] Notification sent to user: ${userId}`);
    return notification;
  }

  /**
   * Envoie une notification personnalisée à plusieurs utilisateurs
   */
  notifyUsers(userIds, title, message, type = 'info', actionUrl = '') {
    this._ensureInitialized();

    const notification = {
      title,
      message,
      type,
      actionUrl,
      timestamp: new Date(),
    };

    // Check if the method exists on Socket.IO instance
    if (typeof this.io.sendNotificationToUsers === 'function') {
      this.io.sendNotificationToUsers(userIds, notification);
    } else if (typeof this.io.to === 'function') {
      // Fallback: send to each user
      userIds.forEach(userId => {
        this.io.to(`user:${userId}`).emit('notification:custom', notification);
      });
    } else {
      console.warn('[NotificationService] Cannot send notifications - no valid Socket.IO method');
    }

    console.debug(`[NotificationService] Notifications sent to ${userIds.length} users`);
    return notification;
  }

  /**
   * Envoie une notification de broadcast (à tous les utilisateurs)
   */
  broadcastNotification(title, message, type = 'info', actionUrl = '') {
    this._ensureInitialized();

    const notification = {
      title,
      message,
      type,
      actionUrl,
      timestamp: new Date(),
    };

    // Check if the method exists on Socket.IO instance
    if (typeof this.io.broadcastNotification === 'function') {
      this.io.broadcastNotification(notification);
    } else if (typeof this.io.emit === 'function') {
      // Fallback to direct emit for broadcast
      this.io.emit('notification:broadcast', notification);
    } else {
      console.warn('[NotificationService] Cannot broadcast notification - no valid Socket.IO method');
    }

    console.debug('[NotificationService] Broadcast notification sent');
    return notification;
  }

  /**
   * Envoie une notification de succès
   */
  notifySuccess(userId, title, message, actionUrl = '') {
    return this.notifyUser(userId, title, message, 'success', actionUrl);
  }

  /**
   * Envoie une notification d'erreur
   */
  notifyError(userId, title, message, actionUrl = '') {
    return this.notifyUser(userId, title, message, 'error', actionUrl);
  }

  /**
   * Envoie une notification d'avertissement
   */
  notifyWarning(userId, title, message, actionUrl = '') {
    return this.notifyUser(userId, title, message, 'warning', actionUrl);
  }

  /**
   * Envoie une notification d'information
   */
  notifyInfo(userId, title, message, actionUrl = '') {
    return this.notifyUser(userId, title, message, 'info', actionUrl);
  }

  /**
   * Récupère les utilisateurs connectés
   */
  getConnectedUsers() {
    this._ensureInitialized();
    return this.io.getConnectedUsers?.() || [];
  }

  /**
   * Vérifie si le service est prêt
   */
  isReady() {
    return this.io !== null;
  }
}

// Exporter une instance singleton
export default new NotificationService();
