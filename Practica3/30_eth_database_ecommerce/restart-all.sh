#!/usr/bin/env bash
set -euo pipefail

# 1. Stop previous apps (best-effort)
killall -q node || true
pkill -f anvil || true

# 2. Start Anvil
nohup anvil > /tmp/anvil.log 2>&1 &
sleep 2

# 3. Deploy EuroToken
cd stablecoin/sc
forge build
export PRIVATE_KEY=${PRIVATE_KEY:-0x59c6995e998f97a5a0044966f0945389dc9e86dae5b3d3a3b6d6dfec6a5b2fdf} # Anvil default[0]
export INITIAL_MINT_TO=${INITIAL_MINT_TO:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}
forge script script/DeployEuroToken.s.sol --rpc-url http://localhost:8545 --broadcast

# 4. Deploy Ecommerce (mock deploy)
cd ../../sc-ecommerce
forge build
# Optional: add deploy script here if needed

cd ../..

# 5. Update env (manual step): set NEXT_PUBLIC_* addresses in .env files

# 6. Start apps
cd stablecoin/compra-stableboin && npm install && nohup npm run dev > /tmp/app6001.log 2>&1 &
cd ../pasarela-de-pago && npm install && nohup npm run dev > /tmp/app6002.log 2>&1 &
cd ../../web-admin && npm install && nohup npm run dev > /tmp/app6003.log 2>&1 &
cd ../web-customer && npm install && nohup npm run dev > /tmp/app6004.log 2>&1 &

cd ..
echo "Anvil:        http://localhost:8545"
echo "Compra EURT:  http://localhost:6001"
echo "Pasarela:     http://localhost:6002"
echo "Web Admin:    http://localhost:6003"
echo "Web Customer: http://localhost:6004"
