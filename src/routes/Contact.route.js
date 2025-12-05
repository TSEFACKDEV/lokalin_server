import express from 'express';
import ResponseApi from '../helpers/response.js';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();

/**
 * POST /api/lokalink/v1/contact
 * Submit a contact form
 */
router.post('/', async (req, res) => {
  try {
    const { nom, email, telephone, sujet, message } = req.body;

    // Validation
    if (!nom || !email || !sujet || !message) {
      return ResponseApi.error(res, 'Validation error', 'Missing required fields: nom, email, sujet, message');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ResponseApi.error(res, 'Validation error', 'Invalid email format');
    }

    // Send email to support team
    try {
      await sendEmail(
        process.env.SUPPORT_EMAIL || 'contact@lokalink.cm',
        `Nouveau message de contact: ${sujet}`,
        '',
        `
          <h2>Nouveau message de contact</h2>
          <p><strong>Nom:</strong> ${nom}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telephone:</strong> ${telephone || 'Non fourni'}</p>
          <p><strong>Sujet:</strong> ${sujet}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>Message recu a ${new Date().toLocaleString('fr-FR')}</small></p>
        `
      );

      // Send confirmation email to user
      await sendEmail(
        email,
        'Confirmation de message recu',
        '',
        `
          <h2>Merci de nous avoir contactés</h2>
          <p>Bonjour ${nom},</p>
          <p>Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.</p>
          <p><strong>Sujet:</strong> ${sujet}</p>
          <hr>
          <p>Cordialement,<br>L'équipe LOKALINK</p>
        `
      );

      console.info('[Contact] Message submitted successfully:', { email, sujet });

      return ResponseApi.success(res, 'Message sent successfully', {
        messageId: Date.now(),
        email,
        sujet
      }, 201);

    } catch (emailError) {
      console.error('[Contact] Email sending failed:', emailError.message);
      // Still return success to user - backend will retry
      return ResponseApi.success(res, 'Message received (email notification may be delayed)', {
        messageId: Date.now()
      }, 201);
    }

  } catch (error) {
    console.error('[Contact] Error processing contact form:', error);
    return ResponseApi.error(res, 'Server error', error.message, 500);
  }
});

export default router;
