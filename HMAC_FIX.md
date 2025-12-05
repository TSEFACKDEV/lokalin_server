# 🔒 Correction HMAC Genuka - Solution

## ❌ Problème initial

L'erreur HMAC `"HMAC invalide"` se produisait lors de l'installation de l'application Genuka.

```
Computed HMAC: 28f2d574e263bfa4d87bb9568d6a172b82f14fb8a52775ef3a17dde8ee3e5595
Received HMAC: adb2ada080ada782c1c62381547e3583c99ce40b34a7982ca5249f57ad46050b
Match: ❌ NO
```

## 🔍 Cause du problème

La **documentation officielle Genuka est simplifiée**. Elle montre :

```javascript
const stringToHash = `company_id=${companyId}&timestamp=${timestamp}`;
```

Mais en réalité, Genuka calcule le HMAC avec **TOUS les paramètres de la query string** (sauf `hmac`), dans leur ordre original :

```javascript
const stringToHash = `code=${code}&company_id=${companyId}&redirect_to=${redirect_to}&timestamp=${timestamp}`;
```

## ✅ Solution appliquée

### Avant (❌ Incorrect)
```javascript
// Seulement company_id et timestamp
const stringToHash = `company_id=${companyId}&timestamp=${timestamp}`;
```

### Après (✅ Correct)
```javascript
// TOUS les paramètres sauf hmac, dans l'ordre de l'URL
const queryParts = rawQueryString.split('&').filter(part => !part.startsWith('hmac='));
const stringToHash = queryParts.join('&');
```

## 🧪 Validation

Testé avec les données réelles de Genuka :

```bash
npm run test:hmac
```

**Résultats :**
- ✅ MÉTHODE 2 (tous params ordre URL) : **SUCCÈS**
- ✅ MÉTHODE 4 (query brute) : **SUCCÈS**

## 📁 Fichiers modifiés

### 1. `src/controllers/Genuka.controller.js`
- Fonction `validateHmac()` mise à jour pour utiliser tous les paramètres

### 2. `src/tests/genuka-integration.test.js`
- Fonction `validateHmac()` synchronisée avec le controller

### 3. `src/tests/test-hmac-real.js` (nouveau)
- Script de diagnostic HMAC avec données réelles
- Teste 4 méthodes différentes de calcul HMAC

## 🚀 Utilisation

### Tester l'intégration complète
```bash
npm run test:genuka
```

### Diagnostiquer un problème HMAC
```bash
npm run test:hmac
```

Mettez vos données réelles dans `src/tests/test-hmac-real.js` :
```javascript
const REAL_DATA = {
  company_id: 'votre_company_id',
  timestamp: 'votre_timestamp',
  hmac: 'votre_hmac',
  rawQueryString: 'votre_query_string_complete'
};
```

## 🔐 Points clés

1. **Ordre des paramètres** : Genuka préserve l'ordre de l'URL
2. **Tous les paramètres** : code, company_id, redirect_to, timestamp (sauf hmac)
3. **Query string brute** : Ne pas décoder les valeurs URL-encodées
4. **CLIENT_SECRET** : Doit être exactement celui du dashboard Genuka

## 📚 Références

- Documentation officielle : https://docs.genuka.com/getting-started/hmac-verification
- Issue identifiée : La doc simplifie l'exemple avec seulement `company_id` et `timestamp`
- Réalité : Genuka utilise TOUS les paramètres dans l'ordre de l'URL

## ✨ Résultat

L'installation de l'application Genuka fonctionne maintenant correctement ! 🎉

```
[HMAC Validator] Configuration:
  String to hash: code=6Q1KloKeweqpYlpELXJ2rEZFq4jD75sE3eGqKoUf&company_id=01kbne8v1ym2apxgqr8331dzpz&redirect_to=https%3A%2F%2Fstaging.genuka.com%2Fapps-installed%2F01kbq6dpd1kxgpsddb7pkkxz1v&timestamp=1764936309
  Computed HMAC: adb2ada080ada782c1c62381547e3583c99ce40b34a7982ca5249f57ad46050b
  Received HMAC: adb2ada080ada782c1c62381547e3583c99ce40b34a7982ca5249f57ad46050b
  Match: ✅ YES
```
