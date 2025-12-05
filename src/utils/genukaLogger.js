/**
 * Utilitaires pour logger les événements Genuka
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '../../logs');
const GENUKA_LOG_FILE = path.join(LOGS_DIR, 'genuka-installations.log');

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Logger une installation Genuka
 */
export function logGenukaInstallation(data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: 'INSTALLATION',
    company_id: data.company_id,
    pme_id: data.pme_id,
    user_email: data.user_email,
    user_name: data.user_name,
    success: data.success,
    error: data.error || null
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFile(GENUKA_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du log:', err);
    }
  });

  return logEntry;
}

/**
 * Logger une synchronisation Genuka
 */
export function logGenukaSynchronization(data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: 'SYNCHRONIZATION',
    company_id: data.company_id,
    pme_id: data.pme_id,
    fields_updated: data.fields_updated,
    success: data.success,
    error: data.error || null
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFile(GENUKA_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du log:', err);
    }
  });

  return logEntry;
}

/**
 * Logger une erreur HMAC
 */
export function logHmacValidationFailure(data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: 'HMAC_VALIDATION_FAILED',
    company_id: data.company_id,
    timestamp_received: data.timestamp,
    hmac_received: data.hmac ? data.hmac.substring(0, 16) + '...' : null,
    ip: data.ip,
    user_agent: data.user_agent
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFile(GENUKA_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du log:', err);
    }
  });

  return logEntry;
}

/**
 * Logger un rafraîchissement de token
 */
export function logTokenRefresh(data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: 'TOKEN_REFRESH',
    company_id: data.company_id,
    pme_id: data.pme_id,
    success: data.success,
    error: data.error || null
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFile(GENUKA_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du log:', err);
    }
  });

  return logEntry;
}

/**
 * Lire les derniers logs
 */
export function getRecentLogs(limit = 50) {
  try {
    if (!fs.existsSync(GENUKA_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(GENUKA_LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    
    const logs = lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          return null;
        }
      })
      .filter(log => log !== null)
      .reverse();

    return logs;
  } catch (error) {
    console.error('Erreur lors de la lecture des logs:', error);
    return [];
  }
}

export default {
  logGenukaInstallation,
  logGenukaSynchronization,
  logHmacValidationFailure,
  logTokenRefresh,
  getRecentLogs
};
