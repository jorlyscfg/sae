#!/bin/bash

# Configuration
CONTAINER_NAME="aspel_pg_db"
DB_USER="postgres"
DB_NAME="aspel_dashboard"
OUTPUT_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

echo "📦 Iniciando respaldo de la base de datos de desarrollo..."
echo "   Contenedor: $CONTAINER_NAME"
echo "   Base de datos: $DB_NAME"
echo ""

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Error: El contenedor '$CONTAINER_NAME' no está corriendo."
    echo "   Asegúrate de iniciar el entorno de desarrollo primero."
    exit 1
fi

# Execute dump
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $OUTPUT_FILE

if [ $? -eq 0 ]; then
    echo "✅ Respaldo exitoso!"
    echo "   Archivo: $OUTPUT_FILE"
    echo ""
    echo "📋 Instrucciones para restaurar en Dokploy:"
    echo "   1. Sube este archivo a tu servidor Dokploy"
    echo "   2. O copia el contenido en una herramienta de administración SQL conectada a tu Dokploy DB"
    echo "   3. O usa el comando: cat $OUTPUT_FILE | docker exec -i [DOCKER_CONTAINER_ID] psql -U postgres -d sae_db"
else
    echo "❌ Error al generar el respaldo."
fi
