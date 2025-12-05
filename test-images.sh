#!/bin/bash

# 🧪 Script de test du système d'upload d'images

echo "🧪 Test du système d'upload d'images Lokalink"
echo "=============================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
SERVER_URL="http://localhost:3000"
API_BASE="${SERVER_URL}/api/lokalink/v1"

echo "📡 Test 1: Vérification de la santé du serveur"
response=$(curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/v1/health")
if [ "$response" -eq 200 ]; then
    echo -e "${GREEN}✅ Serveur accessible${NC}"
else
    echo -e "${RED}❌ Serveur non accessible (Code: $response)${NC}"
    echo "   Assurez-vous que le serveur tourne sur le port 3000"
    exit 1
fi
echo ""

echo "📁 Test 2: Vérification de la route test-uploads"
response=$(curl -s "${SERVER_URL}/api/v1/test-uploads")
echo "$response" | head -n 10
echo ""

echo "📂 Test 3: Vérification du dossier uploads"
UPLOADS_PATH="c:/Users/KleinDev/Desktop/lokalink/server/src/uploads"
if [ -d "$UPLOADS_PATH/equipements" ]; then
    echo -e "${GREEN}✅ Dossier equipements existe${NC}"
    file_count=$(find "$UPLOADS_PATH/equipements" -type f | wc -l)
    echo "   Nombre de fichiers: $file_count"
else
    echo -e "${RED}❌ Dossier equipements n'existe pas${NC}"
fi

if [ -d "$UPLOADS_PATH/pmes" ]; then
    echo -e "${GREEN}✅ Dossier pmes existe${NC}"
else
    echo -e "${YELLOW}⚠️  Dossier pmes n'existe pas${NC}"
fi
echo ""

echo "🔍 Test 4: Liste des fichiers dans uploads/equipements"
if [ -d "$UPLOADS_PATH/equipements" ]; then
    files=$(ls -lh "$UPLOADS_PATH/equipements" 2>/dev/null)
    if [ -z "$files" ] || [ "$(echo "$files" | wc -l)" -eq 1 ]; then
        echo -e "${YELLOW}   Aucun fichier uploadé pour le moment${NC}"
    else
        echo "$files"
    fi
fi
echo ""

echo "📊 Test 5: Récupération des équipements"
equipements=$(curl -s "${API_BASE}/equipements?limit=5")
echo "$equipements" | head -n 20
echo ""

echo "🎯 Test 6: Vérification des catégories"
categories=$(curl -s "${API_BASE}/categories")
echo "$categories" | head -n 20
echo ""

echo "🏢 Test 7: Vérification des PME"
pmes=$(curl -s "${API_BASE}/pme")
echo "$pmes" | head -n 20
echo ""

echo "=============================================="
echo "✨ Tests terminés!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Assurez-vous que le serveur tourne: cd server && npm start"
echo "   2. Assurez-vous que le client tourne: cd client && npm run dev"
echo "   3. Créez un équipement avec des images via l'interface"
echo "   4. Vérifiez que les images s'affichent correctement"
echo ""
echo "🔗 URLs utiles:"
echo "   - Client: http://localhost:5173"
echo "   - API Health: ${SERVER_URL}/api/v1/health"
echo "   - API Test Uploads: ${SERVER_URL}/api/v1/test-uploads"
echo "   - Équipements: ${API_BASE}/equipements"
