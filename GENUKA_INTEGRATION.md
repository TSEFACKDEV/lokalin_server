# Intégration Genuka - Documentation

## Vue d'ensemble

Lokalink s'intègre avec Genuka pour permettre aux PME utilisant Genuka de gérer leurs équipements via notre plateforme.

## Flux d'authentification OAuth

### 1. Installation de l'application

Quand une PME clique sur "Installer l'application" dans le App Store Genuka :

```
GET /api/lokalink/v1/auth/genuka/authorize
```

Cette route redirige vers :
```
https://platform.genuka.com/oauth/authorize?client_id={GENUKA_CLIENT_ID}&redirect_uri={CALLBACK_URL}&response_type=code
```

### 2. Callback après installation

Genuka redirige vers notre callback avec les paramètres suivants :

```
GET /api/lokalink/v1/auth/genuka/callback?code={CODE}&company_id={COMPANY_ID}&timestamp={TIMESTAMP}&hmac={HMAC}&redirect_to={REDIRECT_URL}
```

**Paramètres reçus :**
- `code` : Code d'autorisation temporaire à échanger contre un token
- `company_id` : **ID de l'entreprise Genuka (IMPORTANT)**
- `timestamp` : Timestamp Unix de la requête
- `hmac` : Signature HMAC SHA-256 pour valider l'authenticité
- `redirect_to` : URL vers laquelle rediriger après le traitement

### 3. Validation HMAC (OBLIGATOIRE)

**IMPORTANT :** Avant tout traitement, nous devons valider le HMAC pour s'assurer que la requête provient bien de Genuka.

```javascript
// String à hasher (selon la doc Genuka)
const stringToHash = `company_id=${company_id}&timestamp=${timestamp}`;

// Calculer le HMAC avec le CLIENT_SECRET
const computedHmac = crypto
  .createHmac('sha256', GENUKA_CLIENT_SECRET)
  .update(stringToHash)
  .digest('hex');

// Comparer avec le HMAC reçu (comparaison en temps constant)
const isValid = crypto.timingSafeEqual(
  Buffer.from(computedHmac, 'hex'),
  Buffer.from(receivedHmac, 'hex')
);
```

**Si le HMAC est invalide :** Rejeter la requête avec un code 401.

### 4. Échange du code pour un token

Une fois le HMAC validé, nous échangeons le `code` contre un `access_token` :

```javascript
POST https://api.genuka.com/oauth/2023-11/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
code={CODE}
client_id={GENUKA_CLIENT_ID}
client_secret={GENUKA_CLIENT_SECRET}
redirect_uri={GENUKA_CALLBACK_URL}
```

**Réponse :**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 5. Récupération des informations utilisateur

Avec le token, nous récupérons les informations de l'utilisateur :

```javascript
GET https://platform.genuka.com/oauth/userinfo
Authorization: Bearer {ACCESS_TOKEN}
```

**Réponse :**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "name": "Nom de l'utilisateur",
  "picture": "https://..."
}
```

### 6. Sauvegarde de la PME

Nous créons ou mettons à jour la PME dans notre base de données :

```javascript
const pme = await PME.create({
  nom: userName || `PME ${company_id.substring(0, 8)}`,
  email: userEmail || `company-${company_id}@genuka.temp`,
  genuka_id: company_id, // COMPANY_ID est sauvegardé ici
  genuka_access_token: access_token,
  genuka_refresh_token: refresh_token,
  genuka_token_expires_at: new Date(Date.now() + expires_in * 1000),
  isVerified: true,
  isActive: true,
  lastLogin: new Date()
});
```

### 7. Redirection finale

Nous redirigeons vers l'URL fournie par Genuka (`redirect_to`) pour finaliser l'installation.

## Structure du modèle PME

```javascript
{
  nom: String,              // Nom de la PME
  email: String,            // Email (optionnel si genuka_id présent)
  password: String,         // Password (optionnel si genuka_id présent)
  genuka_id: String,        // COMPANY_ID de Genuka (unique)
  genuka_access_token: String,
  genuka_refresh_token: String,
  genuka_token_expires_at: Date,
  isVerified: Boolean,
  isActive: Boolean,
  lastLogin: Date
}
```

## Utilisation de l'API Genuka

### Rafraîchissement du token

Quand le token expire, nous utilisons le `refresh_token` :

```javascript
POST https://api.genuka.com/oauth/2023-11/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token={REFRESH_TOKEN}
client_id={GENUKA_CLIENT_ID}
client_secret={GENUKA_CLIENT_SECRET}
```

### Requêtes API authentifiées

Toutes les requêtes à l'API Genuka nécessitent :

```javascript
GET https://api-staging.genuka.com/2023-11/{endpoint}
Authorization: Bearer {ACCESS_TOKEN}
x-company: {COMPANY_ID}
Content-Type: application/json
```

**Note importante :** Le header `x-company` doit contenir le `company_id` de la PME.

## Synchronisation des données

### Endpoint de synchronisation

```
POST /api/lokalink/v1/pmes/:id/sync-genuka
```

Cette route permet de synchroniser les données de la boutique Genuka avec notre PME :
- Nom de la boutique
- Description
- Email
- Téléphone
- Site web
- Adresse
- Logo

## Variables d'environnement requises

```env
# Genuka OAuth
GENUKA_CLIENT_ID=your_client_id
GENUKA_CLIENT_SECRET=your_client_secret
GENUKA_CALLBACK_URL=http://localhost:3000/api/lokalink/v1/auth/genuka/callback
GENUKA_REDIRECT_URL=http://localhost:5173/

# API URLs
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173
```

## Points importants

1. **Le `company_id` est crucial** : C'est l'identifiant unique de l'entreprise dans Genuka
2. **La validation HMAC est obligatoire** : Sans elle, l'app ne sera pas validée par Genuka
3. **Le token expire** : Toujours vérifier et rafraîchir si nécessaire
4. **Email et password sont optionnels** : Pour les PME Genuka, nous utilisons le `genuka_id`
5. **OAuth centralisé sur production** : Même en staging, OAuth utilise `api.genuka.com`

## Ressources

- [Documentation Genuka](https://docs.genuka.com/)
- [Authentication Guide](https://docs.genuka.com/getting-started/authentication)
- [HMAC Verification](https://docs.genuka.com/getting-started/hmac-verification)
