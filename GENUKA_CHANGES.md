# 🎉 Modifications de l'intégration Genuka - Résumé

## ✅ Problèmes résolus

### 1. **Company ID correctement récupéré et sauvegardé**
Le `company_id` est maintenant correctement extrait du callback Genuka et sauvegardé dans le modèle PME avec le champ `genuka_id`.

### 2. **Modèle PME adapté pour Genuka**
- Le champ `password` est maintenant **optionnel** pour les PME Genuka
- Le champ `email` est **optionnel** si `genuka_id` est présent
- Validation conditionnelle selon le type de PME (Genuka vs locale)

### 3. **Validation HMAC conforme à la documentation**
La validation HMAC utilise maintenant la bonne formule selon la doc officielle :
```javascript
stringToHash = `company_id=${companyId}&timestamp=${timestamp}`
```

### 4. **Récupération des informations utilisateur**
L'application récupère maintenant les informations de l'utilisateur Genuka (nom, email) pour enrichir le profil PME.

## 📁 Fichiers modifiés

### 1. `src/models/PME.model.js`
- ✅ `email` et `password` sont optionnels si `genuka_id` est présent
- ✅ Middleware `pre('save')` corrigé pour gérer l'absence de password
- ✅ Email peut être `sparse` (permet plusieurs valeurs null)

### 2. `src/controllers/Genuka.controller.js`
- ✅ Validation HMAC corrigée selon la documentation officielle
- ✅ Récupération des informations utilisateur via `GenukaService.getUserInfo()`
- ✅ Sauvegarde du `company_id` dans le champ `genuka_id`
- ✅ Utilisation du nom et email de l'utilisateur Genuka
- ✅ Logs détaillés pour le débogage

### 3. `src/controllers/PME.controller.js`
- ✅ `createPME()` adapté pour gérer les PME Genuka et locales
- ✅ Nouvelle fonction `syncGenukaData()` pour synchroniser les données boutique
- ✅ Validation différenciée selon le type de PME

### 4. `src/routes/PME.route.js`
- ✅ Nouvelle route `POST /:id/sync-genuka` pour synchroniser les données

## 🆕 Nouveaux fichiers

### 1. `GENUKA_INTEGRATION.md`
Documentation complète de l'intégration Genuka :
- Flux OAuth détaillé
- Validation HMAC
- Échange de tokens
- Structure du modèle PME
- Exemples de code

### 2. `src/tests/genuka-integration.test.js`
Tests automatisés pour valider :
- La validation HMAC
- La création de PME Genuka sans password
- La validation des PME locales avec password obligatoire
- La sauvegarde du company_id

## 🚀 Utilisation

### Installation d'une PME Genuka

1. L'utilisateur installe l'app depuis le App Store Genuka
2. Genuka redirige vers : `/api/lokalink/v1/auth/genuka/callback`
3. Le système valide le HMAC (sécurité)
4. Le code est échangé contre un access token
5. Les infos utilisateur sont récupérées
6. La PME est créée/mise à jour avec :
   - `nom` : Nom de l'utilisateur ou boutique
   - `email` : Email de l'utilisateur
   - `genuka_id` : **Company ID de Genuka** ✅
   - `genuka_access_token` : Token d'accès
   - `genuka_refresh_token` : Token de rafraîchissement
   - `genuka_token_expires_at` : Date d'expiration

### Synchronisation des données boutique

```bash
POST /api/lokalink/v1/pmes/:id/sync-genuka
```

Cette route met à jour la PME avec les données de la boutique Genuka :
- Nom de la boutique
- Description
- Email
- Téléphone
- Site web
- Adresse complète
- Logo

## 🧪 Tests

Exécuter les tests d'intégration :

```bash
npm run test:genuka
```

Le test vérifie :
- ✅ Validation HMAC
- ✅ Création PME Genuka sans password
- ✅ Validation PME locale avec password obligatoire
- ✅ Sauvegarde du company_id

## 📊 Structure de la PME dans la base de données

```javascript
{
  "_id": "ObjectId(...)",
  "nom": "Ma Boutique Genuka",
  "email": "contact@boutique.com",
  "genuka_id": "company_abc123",           // ← COMPANY_ID sauvegardé ici
  "genuka_access_token": "...",
  "genuka_refresh_token": "...",
  "genuka_token_expires_at": "2024-12-06T10:00:00.000Z",
  "isVerified": true,
  "isActive": true,
  "lastLogin": "2024-12-05T10:00:00.000Z",
  "createdAt": "2024-12-05T10:00:00.000Z",
  "updatedAt": "2024-12-05T10:00:00.000Z"
}
```

## ⚙️ Variables d'environnement requises

```env
GENUKA_CLIENT_ID=your_client_id
GENUKA_CLIENT_SECRET=your_client_secret
GENUKA_CALLBACK_URL=http://localhost:3000/api/lokalink/v1/auth/genuka/callback
```

## 🔐 Sécurité

1. **Validation HMAC obligatoire** : Toutes les requêtes callback sont validées
2. **Comparaison en temps constant** : Prévient les attaques par timing
3. **Validation du timestamp** : Prévient les attaques par rejeu (max 10 min)
4. **Tokens sécurisés** : Stockés avec `select: false` dans le modèle

## 📚 Ressources

- [Documentation Genuka](https://docs.genuka.com/)
- [Guide d'authentification](https://docs.genuka.com/getting-started/authentication)
- [Vérification HMAC](https://docs.genuka.com/getting-started/hmac-verification)

## ✨ Résultat

L'intégration Genuka fonctionne maintenant correctement :
- ✅ Le `company_id` est récupéré du callback
- ✅ Le `company_id` est sauvegardé dans `genuka_id`
- ✅ Les PME Genuka peuvent être créées sans password
- ✅ Les informations utilisateur sont récupérées automatiquement
- ✅ La validation HMAC est conforme à la documentation
- ✅ Tests automatisés passent avec succès

🎉 **Votre application Lokalink est prête pour l'intégration Genuka !**
