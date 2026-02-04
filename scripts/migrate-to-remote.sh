#!/bin/bash

# Configuration - Default values (override with env vars or arguments)
LOCAL_CONTAINER="aspel_pg_db"
LOCAL_DB="aspel_dashboard"
LOCAL_USER="postgres"

echo "🚀 Migrador de Base de Datos (Local -> Remote Dokploy)"
echo "======================================================"
echo ""

# Check local container
if ! docker ps | grep -q $LOCAL_CONTAINER; then
    echo "❌ Error: Tu base de datos local ($LOCAL_CONTAINER) no está corriendo."
    exit 1
fi

# Request Remote Details
read -p "🌐 IP del VPS Dokploy: " REMOTE_HOST
read -p "👤 Usuario Postgres Remoto (ej. postgres): " REMOTE_USER
read -s -p "🔑 Contraseña Postgres Remoto: " REMOTE_PASS
echo ""
read -p "🗄️  Nombre de la NUEVA DB a crear (ej. aspel_prod): " REMOTE_DB_NAME
echo ""

# Export password for non-interactive psql
export PGPASSWORD=$REMOTE_PASS

echo "🔌 Probando conexión..."
psql -h $REMOTE_HOST -U $REMOTE_USER -d postgres -c '\l' > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Error de conexión. Verifica IP, Puerto (5432 abierto?) y Credenciales."
    exit 1
fi

echo "✅ Conexión exitosa."
echo ""
echo "🔨 Creando base de datos remota '$REMOTE_DB_NAME'..."
psql -h $REMOTE_HOST -U $REMOTE_USER -d postgres -c "CREATE DATABASE $REMOTE_DB_NAME;" 2>/dev/null || echo "   (La DB ya existía o hubo un warning)"

echo ""
echo "📦 Migrando datos (Schema + Data)..."
echo "   Este proceso puede tardar dependiendo del tamaño."

# PIPE: Docker Exec pg_dump -> Local Pipe -> Remote Psql
docker exec $LOCAL_CONTAINER pg_dump -U $LOCAL_USER $LOCAL_DB --clean --if-exists | psql -h $REMOTE_HOST -U $REMOTE_USER -d $REMOTE_DB_NAME

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 ¡MIGRACIÓN COMPLETADA!"
    echo "======================================================"
    echo "Para conectar tu App:"
    echo ""
    echo "1. EN DOKPLOY (Producción - Red Interna):"
    echo "   DATABASE_URL=postgresql://$REMOTE_USER:$REMOTE_PASS@[NOMBRE_SERVICIO_POSTGRES]:5432/$REMOTE_DB_NAME"
    echo ""
    echo "2. EN LOCAL (.env - Red Externa):"
    echo "   DATABASE_URL=postgresql://$REMOTE_USER:$REMOTE_PASS@$REMOTE_HOST:5432/$REMOTE_DB_NAME"
    echo ""
else
    echo ""
    echo "❌ Hubo un error durante la transferencia de datos."
fi
