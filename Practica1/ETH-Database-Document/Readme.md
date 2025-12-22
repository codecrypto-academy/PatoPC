🛡️ ETH Document Registry (dApp)

Una aplicación descentralizada completa para notariar, firmar y verificar documentos utilizando la Blockchain de Ethereum. Este proyecto permite a los usuarios subir archivos, generar una "huella digital" única (Hash), firmarla criptográficamente y almacenar esa prueba de existencia de forma inmutable.

🚀 Características Principales

Firma Digital: Usa criptografía de curva elíptica (ECDSA) para firmar documentos sin revelar su contenido.

Inmutabilidad: Los registros se almacenan en un Smart Contract en Ethereum.

Verificación Pública: Cualquiera puede validar la autenticidad de un archivo y quién lo firmó.

Historial Transparente: Visualización completa de todos los documentos registrados.

Interfaz Moderna y Responsiva:

Drag & Drop: Carga de archivos intuitiva arrastrando y soltando.

Dark Mode: Soporte completo para temas claro y oscuro.

Exportación de Datos: Descarga tu historial de registros en formato CSV.

📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

Node.js (v18+): Descargar aquí

Foundry (Forge & Anvil): Herramientas para desarrollo de Smart Contracts.

curl -L [https://foundry.paradigm.xyz](https://foundry.paradigm.xyz) | bash
foundryup


Git: Para control de versiones.

(Opcional pero recomendado en Windows): WSL2 (Ubuntu).

🛠️ Instalación y Configuración

1. Clonar el Repositorio

# Crea la carpeta del proyecto si no existe
mkdir ETH-Database-Document
cd ETH-Database-Document


2. Configurar Smart Contracts (sc/)

cd sc
forge init --force  # Inicializa proyecto Foundry
forge build         # Compila el contrato
forge test          # Ejecuta los tests para verificar que todo está verde


3. Configurar Frontend (dapp/)

cd ../dapp
npm install         # Instala dependencias (React, Ethers, Bootstrap)


▶️ Ejecución Paso a Paso (IMPORTANTE)

Para correr la aplicación necesitas 3 terminales abiertas simultáneamente. Sigue este orden estricto cada vez que inicies el proyecto:

Terminal 1: Blockchain Local (Anvil)

Inicia tu nodo local de Ethereum. No cierres esta terminal, si la cierras, se borran todos los datos.

anvil


Verás una lista de claves privadas y direcciones. Tu blockchain está viva en localhost:8545.

Terminal 2: Despliegue del Contrato

Desde la carpeta sc/, despliega el contrato a tu red local recién iniciada.

Ejecuta el comando de despliegue:

cd sc
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944baxxxxxxx


👀 Puntos Críticos del Despliegue:

Revisa el output en la terminal. Busca la línea que dice Contract Address: 0x....

Copia esa dirección.

Terminal 3: Configuración y Frontend (Web)

Antes de iniciar la web, debemos conectarla con el contrato que acabas de desplegar.

ACTUALIZA EL .env.local:

Ve a la carpeta dapp/ y abre el archivo .env.local.

Busca la variable NEXT_PUBLIC_CONTRACT_ADDRESS.

Pega la NUEVA dirección que copiaste en el paso anterior.

Nota: Cada vez que reinicies Anvil, el contrato desaparece y debes desplegarlo de nuevo, y a veces la dirección cambia. ¡Asegúrate de que coincidan!

NEXT_PUBLIC_CONTRACT_ADDRESS=0xTuDireccionCopiadaAqui...
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_MNEMONIC="test test test test test test test test test test test junk"


Inicia el Servidor Web:

cd dapp
npm run dev


📖 Guía de Uso

Abre tu navegador en http://localhost:3000.

1. Conectar Wallet

Usa el selector en la barra superior para elegir una de las cuentas de prueba (Wallet 0 - Wallet 9).

Verás el indicador "Conectado" en verde.

2. Firmar Documento (Pestaña "Firmar Documento")

Haz clic en "Seleccionar Archivo" o simplemente Arrastra y suelta (Drag & Drop) tu documento en la zona designada.

Verás el Hash calculado automáticamente y el nombre del archivo en verde.

Haz clic en "Firmar Digitalmente".

Crucial: Haz clic en "Almacenar en Blockchain" y espera el mensaje de confirmación verde. Si no haces esto, el documento no se guardará.

3. Verificar (Pestaña "Verificar Autenticidad")

Sube el mismo archivo que firmaste (arrastrar y soltar también funciona aquí).

El campo de dirección se llenará automáticamente con tu wallet actual, pero puedes cambiarlo si quieres verificar la firma de otro usuario.

Haz clic en "Verificar Ahora".

4. Historial (Pestaña "Historial")

Consulta la tabla con todos los documentos registrados.

Exportar Datos: Utiliza el botón "Exportar CSV" para descargar una copia local de todos los registros mostrados en la tabla.

Refrescar: Usa el botón de refrescar para actualizar la lista si has realizado cambios recientes.

5. Personalización (Modo Oscuro)

Usa el icono de Sol/Luna en la barra de navegación superior para alternar entre el tema claro y el tema oscuro según tu preferencia o iluminación ambiental.

🔧 Solución de Problemas Comunes

Historial vacío o error de validación: Seguramente reiniciaste Anvil. Debes volver a desplegar el contrato (Terminal 2) y actualizar la dirección en .env.local.

Error "Nonce too low": Reinicia Anvil (Ctrl+C y anvil de nuevo) y despliega otra vez.

Error de conexión: Asegúrate de que Anvil esté corriendo en el puerto 8545 y que tu .env.local tenga la URL correcta.