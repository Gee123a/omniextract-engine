import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { homedir } from 'os';
import { join } from 'path';
import { chmodSync } from 'fs';

const walletFile = join(homedir(), '.micro-api-wallet.json');

// Check if wallet already exists
let account;
let privateKey;

const file = Bun.file(walletFile);
if (await file.exists()) {
  const data = await file.json();
  privateKey = data.private_key;
  account = privateKeyToAccount(privateKey);
  console.log('[Wallet] Found existing wallet:', account.address);
} else {
  privateKey = generatePrivateKey();
  account = privateKeyToAccount(privateKey);
  
  const walletData = {
    network: "Base / Ethereum (EVM)",
    address: account.address,
    private_key: privateKey,
    created_at: new Date().toISOString(),
    import_guide: "Import this private_key into MetaMask, Coinbase Wallet, or Rainbow to view balance and withdraw to bank."
  };

  await Bun.write(walletFile, JSON.stringify(walletData, null, 2) + "\n");
  chmodSync(walletFile, 0o600); // Only current user can read/write
  console.log('[Wallet] Generated new secure wallet:', account.address);
  console.log('[Wallet] Saved credentials to ~/.micro-api-wallet.json (chmod 600)');
}

// Output public address for server insertion
console.log(`WALLET_ADDRESS=${account.address}`);
