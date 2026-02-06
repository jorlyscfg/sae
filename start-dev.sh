#!/bin/bash

# Script para iniciar el entorno de desarrollo de VapesWay Next-Gen
# Next.js App en puerto 3005

echo "🚀 Iniciando entorno de desarrollo VapesWay..."
echo "📍 App: http://localhost:3005"
echo ""

# Función para matar procesos al salir (limpieza completa)
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios y eliminando procesos huérfanos..."

    # Terminar cloudflared si existe
    if [ ! -z "${CLOUDFLARED_PID:-}" ]; then
        echo "   ☁️ Deteniendo túnel de Cloudflare..."
        kill -9 $CLOUDFLARED_PID 2>/dev/null || true
    fi

    # Terminar el proceso tee si existe
    if [ ! -z "${TEE_PID:-}" ]; then
        kill -9 $TEE_PID 2>/dev/null || true
    fi

    # Limpieza específica solo de procesos del proyecto
    echo "   🎯 Eliminando procesos Next.js del proyecto..."

    # Limpieza segura del puerto 3005
    kill_port_3005 || echo "   ⚠️  Algunos procesos en 3005 no se pudieron matar (protegidos)."

    # Esperar terminación completa
    sleep 2

    echo "✅ Todos los servicios y procesos huérfanos eliminados"
    exit 0
}

# Función simplificada: SOLO matar procesos de la app por nombre Y directorio
# Función simplificada: SOLO matar procesos de la app por nombre Y directorio
kill_app_processes() {
    echo "   🧹 Deteniendo procesos de la aplicación Next.js (Local)..."
    CURRENT_DIR=$(pwd)
    
    # 1. Matar procesos 'next' solo de este directorio
    pgrep -f "next" | while read pid; do
        if [ -d "/proc/$pid" ]; then
            PWD_DIR=$(pwdx $pid 2>/dev/null | awk '{print $2}')
            # Normalizar paths (quitar slash final si existe)
            N_PWD=${PWD_DIR%/}
            N_CUR=${CURRENT_DIR%/}
            
            if [[ "$N_PWD" == *"$N_CUR"* ]]; then
                 PNAME=$(ps -p $pid -o comm= 2>/dev/null)
                 # Doble verificación: que no sea un proceso crítico
                 if [[ "$PNAME" != "sshd" && "$PNAME" != "code-server" && "$PNAME" != "ssh" ]]; then
                    kill -9 $pid 2>/dev/null || true
                 fi
            fi
        fi
    done
    
    # 2. Matar procesos npm del directorio actual
    pgrep -f "npm.*run.*dev" | while read pid; do
        if [ -d "/proc/$pid" ]; then
            PWD_DIR=$(pwdx $pid 2>/dev/null | awk '{print $2}')
             if [[ "$PWD_DIR" == *"$CURRENT_DIR"* ]]; then
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    done

    # 3. Matar cloudflared explícitamente
    pkill -f "cloudflared.*3005" 2>/dev/null || true
}


# Función para obtener el comando correcto de Docker Compose
get_docker_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
        return 0
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
        return 0
    elif [ -f "/tmp/docker-compose" ]; then
        echo "/tmp/docker-compose"
        return 0
    else
        echo "   ⚠️  No se encontró docker compose ni docker-compose." >&2
        echo "   📥 Descargando docker-compose standalone (latest)..." >&2
        curl -sL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /tmp/docker-compose
        chmod +x /tmp/docker-compose
        echo "/tmp/docker-compose"
        return 0
    fi
}

# Configurar trap para cleanup
trap cleanup SIGINT SIGTERM

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar y arrancar servicios Docker
if [ -f "../docker-compose.yml" ]; then
    echo "🐳 Verificando servicios Docker..."
    
    # Obtener el comando correcto de docker compose
    DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
    
    if ! $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
        echo "   🚀 Iniciando base de datos y servicios..."
        $DOCKER_COMPOSE_CMD up -d
    else
        echo "   ✅ Servicios Docker activos"
    fi
    echo ""
fi

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Advertencia: No se encontró archivo .env"
    echo "   Asegúrate de tener configuradas las variables de entorno de Supabase"
fi

# Limpiar procesos existentes y liberar puerto 3005
# Limpiar procesos existentes y liberar puerto 3005
echo "🧹 Limpiando procesos existentes y eliminando huérfanos..."
kill_app_processes

echo "🔍 Liberando puerto 3005..."
MAX_ATTEMPTS=10
attempt=1

# Función para verificar si el puerto está ocupado
puerto_ocupado() {
    # Verificar con lsof
    if lsof -i:3005 >/dev/null 2>&1; then
        return 0
    fi
    # Verificar con ss (más confiable)
    if ss -tulpn 2>/dev/null | grep -q ":3005 "; then
        return 0
    fi
    return 1
}

# Verificar si el puerto sigue ocupado (solo informativo)
puerto_ocupado() {
    if lsof -i:3005 >/dev/null 2>&1 || ss -tulpn 2>/dev/null | grep -q ":3005 "; then
        return 0
    fi
    return 1
}

if puerto_ocupado; then
    echo "⚠️  Nota: El puerto 3005 está ocupado. Asumiremos que es tu túnel SSH/VSCode."
    echo "    La aplicación intentará iniciarse; si falla, verifica que no haya otro servicio real corriendo."
fi



echo "✅ Puerto 3005 verificado y libre."

# Limpiar log anterior
rm -f /tmp/vapesway-dev.log

# Iniciar Next.js INMEDIATAMENTE sin más esperas
echo "🔧 Iniciando servidor Next.js..."
echo ""

# Usar tee para mostrar logs en terminal Y guardarlos en archivo
PORT=3005 NODE_ENV=development npm run dev 2>&1 | tee /tmp/vapesway-dev.log &
TEE_PID=$!

# Esperar un poco para que npm inicie
sleep 2

# Buscar el PID real de npm/node
NPM_PID=$(pgrep -f "npm.*run.*dev" | head -1)

# Esperar y verificar que la app inicie correctamente
echo ""
echo "🔍 Verificando Next.js..."
RETRIES=20
FOUND=false

for i in $(seq 1 $RETRIES); do
    sleep 2

    # Verificar si el puerto está siendo usado (con lsof o ss)
    if lsof -i:3005 >/dev/null 2>&1 || ss -tulpn 2>/dev/null | grep -q ":3005 "; then
        echo "✅ Next.js corriendo en puerto 3005"
        FOUND=true
        break
    fi

    # Verificar si tee sigue vivo (si murió, npm también murió)
    if ! kill -0 $TEE_PID 2>/dev/null; then
        echo "❌ Error: El proceso de Next.js murió prematuramente"
        echo "📋 Últimas líneas del log:"
        tail -20 /tmp/vapesway-dev.log 2>/dev/null || echo "No se pudo leer el log"
        exit 1
    fi

    echo "   ⏳ Esperando a que Next.js inicie... ($i/$RETRIES)"
done

if [ "$FOUND" = false ]; then
    echo "❌ Error: Next.js no responde en puerto 3005 después de $((RETRIES * 2)) segundos"
    echo "📋 Últimas líneas del log:"
    tail -30 /tmp/vapesway-dev.log 2>/dev/null || echo "No se pudo leer el log"
    kill $TEE_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Entorno de desarrollo iniciado correctamente!"
echo ""

# Iniciar túnel de Cloudflare para acceso HTTPS desde cualquier dispositivo
echo "☁️  Iniciando túnel de Cloudflare (HTTPS)..."

# Verificar si existe túnel con nombre configurado
if [ -f ".cloudflared-tunnel-name" ] && [ -f "$HOME/.cloudflared/config.yml" ]; then
    TUNNEL_NAME=$(cat .cloudflared-tunnel-name)
    echo "   ✅ Usando túnel permanente: $TUNNEL_NAME"

    # Usar cloudflared instalado globalmente si existe, sino usar el de /tmp
    if [ -f "/usr/local/bin/cloudflared" ]; then
        CLOUDFLARED_BIN="/usr/local/bin/cloudflared"
    else
        CLOUDFLARED_BIN="/tmp/cloudflared"
        if [ ! -f "$CLOUDFLARED_BIN" ]; then
            echo "   📥 Descargando cloudflared..."
            curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared 2>/dev/null
            chmod +x /tmp/cloudflared
        fi
    fi

    # Iniciar túnel con nombre (URL fija)
    $CLOUDFLARED_BIN tunnel run $TUNNEL_NAME > /tmp/cloudflare-tunnel.log 2>&1 &
    CLOUDFLARED_PID=$!

    # URL fija conocida
    HTTPS_URL="https://$TUNNEL_NAME.cfargotunnel.com"
    sleep 3

else
    # No hay túnel configurado, usar túnel temporal (URL aleatoria)
    echo "   💡 Usando túnel temporal (URL aleatoria)"
    echo "   ℹ️  Para URL fija, ejecuta: ./setup-cloudflare-tunnel.sh"

    # Descargar cloudflared si no existe
    if [ ! -f "/tmp/cloudflared" ]; then
        echo "   📥 Descargando cloudflared..."
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared 2>/dev/null
        chmod +x /tmp/cloudflared
    fi

    # Iniciar cloudflared en background
    /tmp/cloudflared tunnel --url http://localhost:3005 > /tmp/cloudflare-tunnel.log 2>&1 &
    CLOUDFLARED_PID=$!

    # Esperar a que el túnel se establezca y obtener la URL
    echo "   ⏳ Esperando URL del túnel..."
    HTTPS_URL=""
    for i in {1..15}; do
        sleep 2
        HTTPS_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflare-tunnel.log 2>/dev/null | head -1)
        if [ ! -z "$HTTPS_URL" ]; then
            break
        fi
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Servidor listo para probar desde cualquier dispositivo:"
echo ""
echo "   🌐 Local:       http://localhost:3005"
if [ ! -z "$HTTPS_URL" ]; then
    echo "   🔒 HTTPS:       $HTTPS_URL"
    echo ""
    echo "   📱 Usa la URL HTTPS para:"
    echo "      - Probar desde móviles y tablets"
    echo "      - Funciones que requieren HTTPS (cámara, geolocalización, etc.)"
    echo "      - Compartir con el equipo de desarrollo"
else
    echo "   ⚠️  No se pudo obtener la URL HTTPS del túnel"
    echo "      Verifica /tmp/cloudflare-tunnel.log para más detalles"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Logs visibles en esta terminal y guardados en: /tmp/vapesway-dev.log"
echo "💡 Para detener el servicio, presiona Ctrl+C"
echo ""

# Esperar a que tee termine (cuando el usuario presione Ctrl+C)
wait $TEE_PID