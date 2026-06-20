#!/usr/bin/env node
// One-time setup. Run manually:
//   node scripts/license-admin/generate-keypair.js
//
// Generates the Ed25519 keypair used to sign/verify ManagerX license codes.
// The PRIVATE key never leaves this machine and is never committed to git
// (see .gitignore). The PUBLIC key gets pasted into lib/license/licenseCore.js,
// which ships inside the app — it can verify signatures but cannot create new ones.

const fs = require('fs');
const path = require('path');
const nacl = require('tweetnacl');
const { bytesToBase64 } = require('../../lib/license/licenseCore');

const keysDir = path.join(__dirname, 'keys');
const privateKeyPath = path.join(keysDir, 'private-key.json');

if (fs.existsSync(privateKeyPath)) {
  console.error(`Refusing to overwrite existing key at ${privateKeyPath}.`);
  console.error('Delete it manually first if you really want to rotate keys —');
  console.error('rotating keys invalidates every previously issued license code.');
  process.exit(1);
}

const keyPair = nacl.sign.keyPair();
fs.mkdirSync(keysDir, { recursive: true });
fs.writeFileSync(
  privateKeyPath,
  JSON.stringify(
    {
      publicKeyBase64: bytesToBase64(keyPair.publicKey),
      secretKeyBase64: bytesToBase64(keyPair.secretKey),
      createdAt: new Date().toISOString(),
    },
    null,
    2
  )
);

console.log('Keypair generated.');
console.log('Private key written to:', privateKeyPath, '(gitignored — back this up securely, e.g. a password manager)');
console.log('');
console.log('Now paste this into lib/license/licenseCore.js as PUBLIC_KEY_BASE64:');
console.log(bytesToBase64(keyPair.publicKey));
