#!/bin/bash
# scripts/keep-tunnel-alive.sh

REMOTE_USER="root"
REMOTE_HOST="185.230.64.19"
REMOTE_PORT=5432
LOCAL_PORT=5432

echo "🔌 Iniciando túnel persistente hacia $REMOTE_HOST..."
echo "📊 Mapeando localhost:$LOCAL_PORT -> remoto:localhost:$REMOTE_PORT"
echo "PRESS CTRL+C TO STOP"

while true; do
    # -N: No ejecutar comandos remotos (solo forward)
    # -o ServerAliveInterval=60: Enviar ping cada 60s para evitar timeout
    # -o ExitOnForwardFailure=yes: Salir si no se puede bindear el puerto
    ssh -N \
        -L ${LOCAL_PORT}:10.0.1.6:${REMOTE_PORT} \
        ${REMOTE_USER}@${REMOTE_HOST} \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes

    echo "⚠️  El túnel se cerró. Reintentando en 5 segundos..."
    sleep 5
done
