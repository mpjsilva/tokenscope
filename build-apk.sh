#!/usr/bin/env bash
# Recompila o APK no servidor Macaco e traz o resultado para esta pasta.
# Uso: ./build-apk.sh
set -euo pipefail

LOCAL="$(cd "$(dirname "$0")" && pwd)"
REMOTE_HOST="jamerson@192.168.1.254"
REMOTE_DIR="/home/jamerson/tokenscope"

echo "==> Gerando dist/"
cd "$LOCAL"
bash build-web.sh > /dev/null

echo "==> Sincronizando fontes com o macaco"
ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" "mkdir -p $REMOTE_DIR"
scp -o StrictHostKeyChecking=no -r \
  "$LOCAL/index.html" "$LOCAL/capacitor.config.json" "$LOCAL/package.json" \
  "$LOCAL/dist" "$LOCAL/src" "$LOCAL/native" \
  "$REMOTE_HOST:$REMOTE_DIR/"

echo "==> Compilando no macaco"
ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" "bash -s" <<'REMOTE'
set -euo pipefail
export ANDROID_HOME=/home/jamerson/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export JAVA_HOME=/home/jamerson/tools/jdk21
export PATH="$JAVA_HOME/bin:$HOME/.nvm/versions/node/v24.22.2/bin:$PATH"
cd /home/jamerson/tokenscope
npm install --no-audit --no-fund > /dev/null
npx cap sync android > /dev/null
# Mesmo applicationId e mesma chave debug => atualizar por cima preserva dados.
# versionCode maior identifica a instalacao como atualizacao.
sed -i 's/versionCode [0-9]*/versionCode 8/' android/app/build.gradle
sed -i 's/versionName "[^"]*"/versionName "1.7"/' android/app/build.gradle
# Novo icone (fundo removido) em todo o projeto: launcher + adaptive icon.
cp -r native/launcher/mipmap-* android/app/src/main/res/
sed -i 's/#FFFFFF/#000000/' android/app/src/main/res/values/ic_launcher_background.xml
cp native/TokenBridgePlugin.java android/app/src/main/java/com/tokenscope/app/TokenBridgePlugin.java
cat > android/app/src/main/java/com/tokenscope/app/MainActivity.java <<'EOF'
package com.tokenscope.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Capacitor 8 constroi o Bridge dentro de super.onCreate():
        // registre o plugin ANTES disso.
        registerPlugin(TokenBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
EOF
cd android
./gradlew assembleDebug --no-daemon
REMOTE

echo "==> Baixando APK"
scp -o StrictHostKeyChecking=no \
  "$REMOTE_HOST:$REMOTE_DIR/android/app/build/outputs/apk/debug/app-debug.apk" \
  "$LOCAL/TokenScope-debug.apk"
ls -lh "$LOCAL/TokenScope-debug.apk"
echo "PRONTO: $LOCAL/TokenScope-debug.apk"
