#!/usr/bin/env node
// Usage:
//   node scripts/license-admin/generate-license.js --device MX-DV-84K2-91LM --plan pro
//   node scripts/license-admin/generate-license.js --device MX-DV-84K2-91LM --plan pro --expires-months 6
//   node scripts/license-admin/generate-license.js --mark-used <license-code>
//   node scripts/license-admin/generate-license.js --list
//
// Plans: basic, plus, pro, business, unlimited
// --expires-months <N>: optional, omit for a permanent license (default, unchanged behavior).

const fs = require('fs');
const path = require('path');
const nacl = require('tweetnacl');
const licenseCore = require('../../lib/license/licenseCore');

const keysPath = path.join(__dirname, 'keys', 'private-key.json');
const ledgerPath = path.join(__dirname, 'licenses.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function loadLedger() {
  if (!fs.existsSync(ledgerPath)) return [];
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
}

function saveLedger(ledger) {
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
}

function printUsage() {
  console.error('Usage:');
  console.error('  generate-license.js --device MX-DV-XXXX-XXXX --plan <basic|plus|pro|business|unlimited>');
  console.error('  generate-license.js --mark-used <license-code>');
  console.error('  generate-license.js --list');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    const ledger = loadLedger();
    if (ledger.length === 0) {
      console.log('No licenses issued yet.');
      return;
    }
    for (const e of ledger) {
      console.log(`[${e.status}] ${e.plan.padEnd(10)} ${e.deviceId}  ${e.licenseCode}`);
      console.log(`         created: ${e.createdAt}  activated: ${e.activatedAt ?? '-'}  expires: ${e.expiresAt ?? 'never'}`);
    }
    return;
  }

  if (args['mark-used']) {
    const ledger = loadLedger();
    const entry = ledger.find((e) => e.licenseCode === args['mark-used']);
    if (!entry) {
      console.error('No ledger entry found for that license code.');
      process.exit(1);
    }
    entry.status = 'activated';
    entry.activatedAt = new Date().toISOString();
    saveLedger(ledger);
    console.log('Marked as activated:', entry.licenseCode);
    return;
  }

  const deviceId = args.device;
  const plan = args.plan;
  if (!deviceId || !plan) {
    printUsage();
    process.exit(1);
  }
  if (!/^MX-DV-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(deviceId)) {
    console.error('Device ID does not match expected shape MX-DV-XXXX-XXXX.');
    process.exit(1);
  }
  const limitToken = licenseCore.LIMIT_TOKENS[plan];
  if (!limitToken) {
    console.error(`Unknown plan "${plan}". Valid plans: ${Object.keys(licenseCore.LIMIT_TOKENS).join(', ')}`);
    process.exit(1);
  }

  let expiryToken = licenseCore.NO_EXPIRY;
  if (args['expires-months']) {
    const months = Number(args['expires-months']);
    if (!Number.isFinite(months) || months <= 0) {
      console.error('--expires-months must be a positive number.');
      process.exit(1);
    }
    const expiryDate = new Date();
    expiryDate.setUTCMonth(expiryDate.getUTCMonth() + months);
    expiryToken = licenseCore.formatExpiryToken(expiryDate);
  }

  const deviceIdNormalized = deviceId.toUpperCase();
  const ledger = loadLedger();
  const dupe = ledger.find(
    (e) => e.deviceId === deviceIdNormalized && e.plan === plan && e.status !== 'activated'
  );
  if (dupe) {
    console.error('An unused license for this device + plan already exists:');
    console.error(' ', dupe.licenseCode);
    console.error('Reuse that one, or run with --mark-used <code> first if it actually was already used.');
    process.exit(1);
  }

  if (!fs.existsSync(keysPath)) {
    console.error('No private key found. Run generate-keypair.js first.');
    process.exit(1);
  }
  const { secretKeyBase64 } = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  const secretKey = licenseCore.base64ToBytes(secretKeyBase64);

  const message = licenseCore.buildMessage(deviceIdNormalized, limitToken, expiryToken);
  const signature = nacl.sign.detached(licenseCore.asciiToBytes(message), secretKey);
  const licenseCode = licenseCore.formatLicenseCode(deviceIdNormalized, limitToken, expiryToken, signature);
  const expiresAt = licenseCore.expiryTokenToIso(expiryToken);

  ledger.push({
    deviceId: deviceIdNormalized,
    licenseCode,
    plan,
    createdAt: new Date().toISOString(),
    activatedAt: null,
    expiresAt,
    status: 'issued',
  });
  saveLedger(ledger);

  console.log('License code (give this to the customer to paste into Settings -> Plan & Limits):');
  console.log('');
  console.log(licenseCode);
  console.log('');
  console.log(expiresAt ? `Expires: ${expiresAt}` : 'Expires: never (permanent)');
}

main();
