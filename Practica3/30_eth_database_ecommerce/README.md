# Proyecto E-Commerce con Blockchain y Stablecoins

Este monorepo contiene:
- EuroToken (stablecoin ERC20) con Foundry
- Apps Next.js para compra de tokens, pasarela de pago, panel admin y tienda
- Contratos E-commerce (gestión de empresas, productos, carritos e invoices)

## Requisitos
- Node.js 18+
- pnpm o npm
- Foundry (forge, anvil) → https://book.getfoundry.sh/getting-started/installation
- MetaMask
- Stripe (cuenta de pruebas)

## Estructura
```
30_eth_database_ecommerce/
├── stablecoin/
│   ├── sc/
│   ├── compra-stableboin/
│   └── pasarela-de-pago/
├── sc-ecommerce/
├── web-admin/
├── web-customer/
└── restart-all.sh
```

## Pasos iniciales
1. Instalar dependencias de contratos
```bash
cd stablecoin/sc
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
cd ../../sc-ecommerce
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
```
2. Compilar y testear EuroToken
```bash
cd stablecoin/sc
forge build
forge test -vvv
```
3. Iniciar Anvil y deploy EuroToken
```bash
anvil
# en otra terminal
cd stablecoin/sc
export PRIVATE_KEY=0x...     # clave de una cuenta de Anvil
export INITIAL_MINT_TO=0x... # wallet receptora
forge script script/DeployEuroToken.s.sol --rpc-url http://localhost:8545 --broadcast
```
4. Apps web (cada una)
```bash
# ejemplo compra-stableboin
cd stablecoin/compra-stableboin
npm install
npm run dev
```

## Variables de entorno
Ver archivos `.env.example` dentro de cada app.

## Notas
- `restart-all.sh` necesita Bash (WSL/Git Bash en Windows).
- Los contratos usan 6 decimales para representar centavos de euro.
