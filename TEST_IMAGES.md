# 🖼️ Guide de Test des Images

## Problèmes Corrigés

### 1. **Génération d'URL incorrecte** ✅
- **Avant** : Les URLs étaient mal formées avec des chemins incorrects
- **Après** : URLs correctes générées : `http://localhost:3000/uploads/equipements/image.jpg`

### 2. **Configuration des fichiers statiques** ✅
- **Avant** : Chemin statique mal configuré
- **Après** : Headers CORS ajoutés et chemin correct

### 3. **Gestion d'erreur côté client** ✅
- **Avant** : Pas de feedback si l'image ne charge pas
- **Après** : Logs d'erreur et fallback visuel

## Tests à effectuer

### 1. Vérifier le dossier uploads
```bash
cd c:\Users\KleinDev\Desktop\lokalink\server\src
ls -la uploads/equipements/
```

### 2. Tester la route de santé des uploads
```bash
curl http://localhost:3000/api/v1/test-uploads
```

### 3. Tester l'accès direct à une image
Si vous avez une image `test.jpg` dans `server/src/uploads/equipements/`:
```bash
curl -I http://localhost:3000/uploads/equipements/test.jpg
```

### 4. Créer un équipement avec images
1. Redémarrer le serveur : `cd server && npm start`
2. Dans l'interface client, aller sur "Ajouter un équipement"
3. Uploader 1-5 images
4. Vérifier dans la console du serveur les logs :
   ```
   📸 Image URL générée: http://localhost:3000/uploads/equipements/xxx.jpg
   ```

### 5. Vérifier l'affichage
1. Aller sur la page des équipements
2. Les images doivent s'afficher dans les cartes
3. Cliquer sur un équipement pour voir la page détail
4. Les images doivent s'afficher en grand

## Logs à surveiller

### Côté Serveur (Terminal)
```
📁 Chemin des uploads: C:\Users\KleinDev\Desktop\lokalink\server\src\uploads
[Equipement Creation] Fichiers uploadés: 3
[Equipement Creation] 📸 Détails des images:
   1. http://localhost:3000/uploads/equipements/image1.jpg
   2. http://localhost:3000/uploads/equipements/image2.jpg
   3. http://localhost:3000/uploads/equipements/image3.jpg
```

### Côté Client (Console du navigateur)
```
📤 Request: GET /equipements
📥 Response: 200 /equipements
```

Si erreur :
```
❌ Erreur chargement image: http://localhost:3000/uploads/equipements/xxx.jpg
🔍 Images disponibles: [...]
```

## Structure des dossiers attendue

```
server/
└── src/
    └── uploads/
        ├── equipements/     ← Images des équipements
        │   └── .gitkeep
        └── pmes/           ← Logos des PME
            └── .gitkeep
```

## Commandes de Debug

### Lister les images uploadées
```bash
# Windows (PowerShell)
Get-ChildItem -Path "c:\Users\KleinDev\Desktop\lokalink\server\src\uploads\equipements" -Recurse

# Bash
find c:/Users/KleinDev/Desktop/lokalink/server/src/uploads/equipements -type f
```

### Tester avec cURL
```bash
# Santé du serveur
curl http://localhost:3000/api/v1/health

# Liste des uploads
curl http://localhost:3000/api/v1/test-uploads

# Récupérer tous les équipements
curl http://localhost:3000/api/lokalink/v1/equipements

# Image spécifique (remplacer IMAGE_NAME)
curl -I http://localhost:3000/uploads/equipements/IMAGE_NAME.jpg
```

## Si les images ne s'affichent toujours pas

1. **Vérifier que le serveur est démarré**
   ```bash
   cd server
   npm start
   ```

2. **Vérifier les permissions du dossier**
   ```bash
   # Windows
   icacls "c:\Users\KleinDev\Desktop\lokalink\server\src\uploads"
   ```

3. **Vérifier que les images existent**
   ```bash
   ls -la c:/Users/KleinDev/Desktop/lokalink/server/src/uploads/equipements/
   ```

4. **Tester l'URL directement dans le navigateur**
   - Ouvrir : `http://localhost:3000/api/v1/test-uploads`
   - Copier une URL d'image et la tester dans un nouvel onglet

5. **Vérifier les logs de la console**
   - F12 dans le navigateur
   - Onglet "Console" pour les erreurs
   - Onglet "Network" pour voir les requêtes d'images

## Notes importantes

- Les images sont stockées dans `server/src/uploads/`
- Les URLs générées sont relatives : `/uploads/equipements/xxx.jpg`
- Le serveur doit tourner sur `http://localhost:3000`
- Le client doit tourner sur `http://localhost:5173`
- Les images sont optimisées automatiquement avec Sharp
