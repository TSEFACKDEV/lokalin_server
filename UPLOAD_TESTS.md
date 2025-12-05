# 🧪 Tests du Système d'Upload d'Images

## Test avec le Frontend (Recommandé)

### 1. Démarrer le serveur
```bash
cd server
npm run dev
```

### 2. Démarrer le client
```bash
cd client
npm run dev
```

### 3. Tester l'upload d'un équipement
1. Aller sur `http://localhost:5173/add-product`
2. **Étape 1** : Remplir le nom et la catégorie
3. **Étape 2** : Entrer le prix et l'adresse
4. **Étape 3** : Cliquer sur "Sélectionner des fichiers" et choisir 1-5 images
5. **Étape 4** : Vérifier le récapitulatif et cliquer sur "Publier"

### ✅ Résultat attendu
- Les images sont uploadées dans `server/src/uploads/equipements/`
- Les URLs sont sauvegardées dans la base de données
- L'équipement est créé avec succès
- Redirection vers la page des équipements

---

## Test avec Postman

### Test 1 : Créer un équipement avec images

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/lokalink/v1/equipements`  
**Type :** `form-data`

**Body :**
```
nom: Caméra Sony A7III
description: Caméra professionnelle en excellent état
categorie: [ID de la catégorie]
prixParJour: 50000
caution: 100000
proprietaire: 6932d2c311a92a28b6e96b6c
localisation: {"ville":"Yaoundé","pays":"Cameroun"}
equipements: [Sélectionner fichier image 1]
equipements: [Sélectionner fichier image 2]
equipements: [Sélectionner fichier image 3]
```

**Réponse attendue :**
```json
{
  "success": true,
  "meta": {
    "message": "Équipement créé avec succès"
  },
  "data": {
    "_id": "...",
    "nom": "Caméra Sony A7III",
    "images": [
      "http://localhost:3000/uploads/equipements/camera-sony-1234567890.jpg",
      "http://localhost:3000/uploads/equipements/camera-sony-1234567891.jpg",
      "http://localhost:3000/uploads/equipements/camera-sony-1234567892.jpg"
    ],
    ...
  }
}
```

### Test 2 : Mettre à jour un équipement (ajouter des images)

**Méthode :** `PUT`  
**URL :** `http://localhost:3000/api/lokalink/v1/equipements/[ID]`  
**Type :** `form-data`

**Body :**
```
description: Description mise à jour
prixParJour: 55000
equipements: [Nouvelle image]
```

**Réponse attendue :**
Les nouvelles images sont ajoutées aux anciennes (max 5 total)

### Test 3 : Mettre à jour le logo d'une PME

**Méthode :** `PUT`  
**URL :** `http://localhost:3000/api/lokalink/v1/pmes/[ID]`  
**Type :** `form-data`

**Body :**
```
nom: Entreprise Test
description: Description mise à jour
pmes: [Fichier logo.png]
```

**Réponse attendue :**
```json
{
  "success": true,
  "meta": {
    "message": "PME mise à jour avec succès"
  },
  "data": {
    "_id": "...",
    "nom": "Entreprise Test",
    "logo": "http://localhost:3000/uploads/pmes/logo-1234567890.jpg",
    ...
  }
}
```

---

## Test avec cURL

### Créer un équipement avec 2 images
```bash
curl -X POST http://localhost:3000/api/lokalink/v1/equipements \
  -F "nom=Projecteur 4K" \
  -F "description=Projecteur haute définition" \
  -F "categorie=674a5b8e9f1234567890abcd" \
  -F "prixParJour=30000" \
  -F "caution=50000" \
  -F "proprietaire=6932d2c311a92a28b6e96b6c" \
  -F "localisation={\"ville\":\"Douala\",\"pays\":\"Cameroun\"}" \
  -F "equipements=@./test-images/projecteur1.jpg" \
  -F "equipements=@./test-images/projecteur2.jpg"
```

### Mettre à jour le logo d'une PME
```bash
curl -X PUT http://localhost:3000/api/lokalink/v1/pmes/[ID] \
  -F "nom=Ma Super Entreprise" \
  -F "description=Description de mon entreprise" \
  -F "pmes=@./test-images/logo.png"
```

---

## Validation des erreurs

### Test 1 : Fichier trop volumineux (> 5MB)
**Résultat attendu :**
```json
{
  "success": false,
  "message": "Le fichier est trop volumineux (max 5 MB)"
}
```

### Test 2 : Plus de 5 images
**Résultat attendu :**
```json
{
  "success": false,
  "message": "Trop de fichiers (maximum 5 images)"
}
```

### Test 3 : Type de fichier non autorisé (PDF, TXT, etc.)
**Résultat attendu :**
```json
{
  "success": false,
  "message": "Seules les images (JPEG, PNG, GIF, WebP) sont autorisées"
}
```

### Test 4 : Aucune image fournie
Le formulaire frontend bloque à l'étape 3 si aucune image n'est sélectionnée.

---

## Vérification des fichiers

### 1. Vérifier que les dossiers sont créés
```bash
ls server/src/uploads/
# Résultat attendu :
# equipements/
# pmes/
```

### 2. Vérifier les images uploadées
```bash
ls server/src/uploads/equipements/
# Résultat attendu :
# camera-sony-1701234567890-123456789.jpg
# projecteur-4k-1701234567891-987654321.jpg
# ...
```

### 3. Vérifier l'optimisation
Les images doivent être :
- ✅ Redimensionnées (max 1200x1200)
- ✅ En format JPEG
- ✅ Compressées (qualité 85%)

### 4. Accéder aux images via URL
Ouvrir dans le navigateur :
```
http://localhost:3000/uploads/equipements/[nom-du-fichier].jpg
```

---

## Tests fonctionnels complets

### Scénario 1 : Ajouter un équipement complet
1. ✅ Remplir tous les champs du formulaire
2. ✅ Ajouter 5 images
3. ✅ Soumettre le formulaire
4. ✅ Vérifier la création dans la base de données
5. ✅ Vérifier que les images sont accessibles via URL
6. ✅ Vérifier que l'équipement apparaît sur la page des équipements

### Scénario 2 : Modifier un équipement existant
1. ✅ Ouvrir un équipement existant
2. ✅ Modifier la description et le prix
3. ✅ Ajouter 2 nouvelles images (si < 5 images actuelles)
4. ✅ Soumettre
5. ✅ Vérifier que les anciennes images sont conservées
6. ✅ Vérifier que les nouvelles images sont ajoutées

### Scénario 3 : Mettre à jour le logo PME
1. ✅ Aller sur le profil de la PME
2. ✅ Cliquer sur "Modifier"
3. ✅ Uploader un nouveau logo
4. ✅ Soumettre
5. ✅ Vérifier que le logo est mis à jour
6. ✅ Vérifier que l'ancien logo est remplacé

---

## Débogage

### Les images ne s'affichent pas
1. Vérifier que le serveur Express sert les fichiers statiques :
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

2. Vérifier les permissions du dossier `uploads/`

3. Vérifier les URLs dans la base de données

### Les images ne sont pas optimisées
1. Vérifier que Sharp est installé :
```bash
npm list sharp
```

2. Vérifier les logs du serveur pour les erreurs d'optimisation

### L'upload échoue
1. Vérifier les logs du serveur
2. Vérifier la taille du fichier (< 5MB)
3. Vérifier le type de fichier (image/jpeg, image/png, etc.)
4. Vérifier que Multer est bien configuré

---

## Checklist de validation ✅

- [ ] Le serveur démarre sans erreur
- [ ] Les dossiers `uploads/equipements` et `uploads/pmes` sont créés
- [ ] Le formulaire multi-step s'affiche correctement
- [ ] On peut naviguer entre les étapes
- [ ] On peut sélectionner des images (max 5)
- [ ] Les aperçus d'images s'affichent
- [ ] On peut supprimer une image de la liste
- [ ] La validation bloque si aucune image n'est sélectionnée
- [ ] L'upload fonctionne avec 1 image
- [ ] L'upload fonctionne avec 5 images
- [ ] L'upload échoue avec 6 images (erreur affichée)
- [ ] L'upload échoue avec fichier > 5MB (erreur affichée)
- [ ] L'upload échoue avec fichier non-image (erreur affichée)
- [ ] Les images sont optimisées automatiquement
- [ ] Les URLs des images sont correctes dans la BDD
- [ ] On peut accéder aux images via URL
- [ ] Les images s'affichent sur la page des équipements
- [ ] Le logo PME s'affiche correctement
- [ ] La mise à jour d'équipement ajoute de nouvelles images
- [ ] Le total d'images ne dépasse jamais 5

---

## Logs utiles

### Activer les logs détaillés
Dans `uploadFiles.js`, vous pouvez ajouter des logs :
```javascript
console.log('[Upload] Fichier reçu:', file.originalname);
console.log('[Upload] Taille:', file.size);
console.log('[Upload] Type:', file.mimetype);
console.log('[Upload] Sauvegardé dans:', file.path);
```

### Monitorer les uploads en temps réel
```bash
# Terminal 1 : Serveur
cd server && npm run dev

# Terminal 2 : Watcher du dossier uploads
watch -n 1 'ls -lh server/src/uploads/equipements/'
```

---

## Support & Documentation

- Documentation complète : `UPLOAD_SYSTEM.md`
- Code source : `server/src/utils/uploadFiles.js`
- Exemples : `server/src/controllers/Equipement.controller.js`
