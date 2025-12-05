import dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config();

const env = {
    // Server
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    apiVersion: process.env.API_VERSION || 'v1',

    // Database
    mongodbUri: process.env.NODE_ENV === 'production' ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI,

    // JWT
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',

    // Email (SMTP)
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: process.env.SMTP_PORT || 587,
    smtpUser: process.env.SMTP_USER || 'lokalink71@gmail.com',
    smtpPass: process.env.SMTP_PASS || 'pzzf peup cikk ygoy',

    // Genuka OAuth
    genuka: {
        clientId: process.env.GENUKA_CLIENT_ID,
        clientSecret: process.env.GENUKA_CLIENT_SECRET,
        scope: process.env.GENUKA_SCOPE || 'openid profile email',
        redirectUrl: process.env.GENUKA_REDIRECT_URL || 'http://localhost:5173/',
        callbackUrl: process.env.GENUKA_CALLBACK_URL || 'http://localhost:3000/api/lokalink/v1/auth/genuka/callback',
        webhookUrl: process.env.GENUKA_WEBHOOK_URL || 'http://localhost:3000/api/lokalink/v1/webhooks/reservation',
        supportEmail: process.env.GENUKA_SUPPORT_EMAIL || 'lokalink71@gmail.com',
    },

    // Legal Pages
    legalPages: {
        termsOfService: process.env.TERMS_OF_SERVICE_URL || 'http://localhost:5173/terms-of-service',
        privacyPolicy: process.env.PRIVACY_POLICY_URL || 'http://localhost:5173/privacy-policy',
        contact: process.env.CONTACT_URL || 'http://localhost:5173/contact',
    },
};

export default env;