/**
 * Validations pour les équipements
 */

export const validateEquipement = (data) => {
  const errors = {};

  if (!data.nom || data.nom.trim().length < 2) {
    errors.nom = 'Le nom doit contenir au moins 2 caractères';
  }

  if (!data.categorie) {
    errors.categorie = 'La catégorie est requise';
  }

  if (!data.prixParJour || parseFloat(data.prixParJour) < 0) {
    errors.prixParJour = 'Le prix par jour doit être un nombre positif';
  }

  if (!data.proprietaire) {
    errors.proprietaire = 'Le propriétaire est requis';
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
};

/**
 * Validations pour les réservations
 */
export const validateReservation = (data) => {
  const errors = {};

  if (!data.equipement) {
    errors.equipement = 'L\'équipement est requis';
  }

  if (!data.locataire) {
    errors.locataire = 'Le locataire est requis';
  }

  if (!data.dateDebut || new Date(data.dateDebut) <= new Date()) {
    errors.dateDebut = 'La date de début doit être dans le futur';
  }

  if (!data.dateFin || new Date(data.dateFin) <= new Date(data.dateDebut)) {
    errors.dateFin = 'La date de fin doit être après la date de début';
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
};

/**
 * Validations pour les avis
 */
export const validateAvis = (data) => {
  const errors = {};

  if (!data.note || data.note < 1 || data.note > 5) {
    errors.note = 'La note doit être entre 1 et 5';
  }

  if (data.commentaire && data.commentaire.length > 1000) {
    errors.commentaire = 'Le commentaire ne peut pas dépasser 1000 caractères';
  }

  if (!data.auteur) {
    errors.auteur = 'L\'auteur est requis';
  }

  if (!data.equipement) {
    errors.equipement = 'L\'équipement est requis';
  }

  if (!data.reservation) {
    errors.reservation = 'La réservation est requise';
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
};

/**
 * Validations pour les PME
 */
export const validatePME = (data) => {
  const errors = {};

  if (!data.nom || data.nom.trim().length < 2) {
    errors.nom = 'Le nom doit contenir au moins 2 caractères';
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = 'Email invalide';
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
};

/**
 * Validation email
 */
function isValidEmail(email) {
  const re = /^\S+@\S+\.\S+$/;
  return re.test(email);
}

export default {
  validateEquipement,
  validateReservation,
  validateAvis,
  validatePME
};
