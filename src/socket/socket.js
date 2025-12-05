import { Server } from 'socket.io';

/**
 * Initialise Socket.IO pour gérer les notifications en temps réel
 */
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Stockage des utilisateurs connectés
  const connectedUsers = new Map();

  /**
   * Événements Socket.IO
   */
  io.on('connection', (socket) => {
    console.debug(`[Socket] New user connected: ${socket.id}`);

    /**
     * Événement: Utilisateur se connecte
     * Le client doit envoyer son userId lors de la connexion
     */
    socket.on('user:connect', (data) => {
      const { userId, userEmail, userName } = data;
      
      if (userId) {
        connectedUsers.set(userId, {
          socketId: socket.id,
          email: userEmail,
          name: userName,
          connectedAt: new Date(),
        });

        console.debug(`[Socket] User authenticated: ${userId} (${userEmail})`);
        
        // Informer les autres utilisateurs
        io.emit('user:online', {
          userId,
          email: userEmail,
          name: userName,
          totalOnline: connectedUsers.size,
        });
      }
    });

    /**
     * Événement: Notification de commande
     */
    socket.on('order:created', (data) => {
      const { userId, orderId, amount, status } = data;
      
      io.emit('notification:order', {
        type: 'order_created',
        orderId,
        amount,
        status,
        timestamp: new Date(),
        message: `Nouvelle commande #${orderId} - ${amount}€`,
      });

      console.debug(`[Socket] New order: ${orderId}`);
    });

    /**
     * Événement: Notification de paiement
     */
    socket.on('payment:completed', (data) => {
      const { userId, paymentId, amount, status } = data;
      
      io.emit('notification:payment', {
        type: 'payment_completed',
        paymentId,
        amount,
        status,
        timestamp: new Date(),
        message: `Paiement de ${amount}€ effectué - ${status}`,
      });

      console.debug(`[Socket] Payment completed: ${paymentId}`);
    });

    /**
     * Événement: Notification de produit
     */
    socket.on('product:created', (data) => {
      const { productId, name, category, price } = data;
      
      io.emit('notification:product', {
        type: 'product_created',
        productId,
        name,
        category,
        price,
        timestamp: new Date(),
        message: `Nouveau produit: ${name}`,
      });

      console.debug(`[Socket] New product: ${productId}`);
    });

    /**
     * Événement: Notification de réservation
     */
    socket.on('reservation:created', (data) => {
      const { reservationId, userId: customerId, startDate, endDate, totalPrice } = data;
      
      io.emit('notification:reservation', {
        type: 'reservation_created',
        reservationId,
        customerId,
        startDate,
        endDate,
        totalPrice,
        timestamp: new Date(),
        message: `Nouvelle réservation #${reservationId}`,
      });

      console.debug(`[Socket] New reservation: ${reservationId}`);
    });

    /**
     * Événement: Notification d'avis/commentaire
     */
    socket.on('review:created', (data) => {
      const { reviewId, productId, userId: reviewerId, rating, comment } = data;
      
      io.emit('notification:review', {
        type: 'review_created',
        reviewId,
        productId,
        reviewerId,
        rating,
        comment: comment.substring(0, 100),
        timestamp: new Date(),
        message: `Nouvel avis sur un produit - ${rating} stars`,
      });

      console.debug(`[Socket] New review: ${reviewId}`);
    });

    /**
     * Événement: Notification personnalisée pour un utilisateur
     */
    socket.on('notification:send', (data) => {
      const { recipientId, title, message, type, actionUrl } = data;
      
      const recipient = connectedUsers.get(recipientId);
      
      if (recipient) {
        io.to(recipient.socketId).emit('notification:receive', {
          title,
          message,
          type,
          actionUrl,
          timestamp: new Date(),
        });

        console.debug(`[Socket] Notification sent to user: ${recipientId}`);
      } else {
        console.warn(`[Socket] User not connected: ${recipientId}`);
      }
    });

    /**
     * Événement: Mise à jour du statut
     */
    socket.on('status:update', (data) => {
      const { entityType, entityId, oldStatus, newStatus } = data;
      
      io.emit('notification:status', {
        entityType,
        entityId,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        message: `${entityType} #${entityId}: ${oldStatus} to ${newStatus}`,
      });

      console.debug(`[Socket] Status updated: ${entityType} ${entityId}`);
    });

    /**
     * Événement: Utilisateur se déconnecte
     */
    socket.on('disconnect', () => {
      // Trouver et supprimer l'utilisateur
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.info(`[Socket] User offline: ${userId}`);
          
          io.emit('user:offline', {
            userId,
            totalOnline: connectedUsers.size,
          });
          break;
        }
      }
    });

    /**
     * Événement: Erreur
     */
    socket.on('error', (err) => {
      console.error('[Socket] Error occurred:', err);
    });
  });

  // Fonction pour obtenir les utilisateurs connectés
  io.getConnectedUsers = () => {
    return Array.from(connectedUsers.values());
  };

  // Fonction pour envoyer une notification à un utilisateur spécifique
  io.sendNotificationToUser = (userId, notification) => {
    const user = connectedUsers.get(userId);
    if (user) {
      io.to(user.socketId).emit('notification:custom', notification);
    }
  };

  // Fonction pour envoyer une notification à plusieurs utilisateurs
  io.sendNotificationToUsers = (userIds, notification) => {
    userIds.forEach((userId) => {
      io.sendNotificationToUser(userId, notification);
    });
  };

  // Fonction pour envoyer une notification broadcast
  io.broadcastNotification = (notification) => {
    io.emit('notification:broadcast', notification);
  };

  return io;
};

export default initializeSocket;
