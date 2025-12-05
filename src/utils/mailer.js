import nodemailer from 'nodemailer';
import env from '../config/env.js';


const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: parseInt(env.smtpPort),
  secure: false, // true pour le port 465, false pour les autres ports
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

export const sendEmail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: `"${env.fromName}" <${env.fromEmail}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(`Email envoyé à: ${to}`);
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
};