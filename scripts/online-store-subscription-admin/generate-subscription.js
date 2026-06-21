#!/usr/bin/env node
// Usage:
//   node scripts/online-store-subscription-admin/generate-subscription.js --device MX-DV-84K2-91LM --plan 3m
//   node scripts/online-store-subscription-admin/generate-subscription.js --device MX-DV-84K2-91LM --plan lifetime
//   node scripts/online-store-subscription-admin/generate-subscription.js --mark-used <subscription-code>
//   node scripts/online-store-subscription-admin/generate-subscription.js --list
//
// Plans: 1m, 3m, 6m, 12m, lifetime

const fs = require('fs');
const path = require('path');
const nacl = require('tweetnacl');
const subscriptionCore = require('../../lib/onlineStoreSubscription/subscriptionCore');

const keysPath = path.join(__dirname, 'keys', 'private-key.json');
const ledgerPath = path.join(__dirname, 'subscriptions.json');

const PLAN_MONTHS = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };

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
  console.error('  generate-subscription.js --device MX-DV-XXXX-XXXX --plan <1m|3m|6m|12m|lifetime>');
  console.error('  generate-subscription.js --mark-used <subscription-code>');
  console.error('  generate-subscription.js --list');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    const ledger = loadLedger();
    if (ledger.length === 0) {
      console.log('No subscriptions issued yet.');
      return;
    }
    for (const e of ledger) {
      console.log(`[${e.status}] ${e.plan.padEnd(10)} ${e.deviceId}  ${e.subscriptionCode}`);
      console.log(`         created: ${e.createdAt}  activated: ${e.activatedAt ?? '-'}  expires: ${e.expiresAt ?? 'never'}`);
    }
    return;
  }

  if (args['mark-used']) {
    const ledger = loadLedger();
    const entry = ledger.find((e) => e.subscriptionCode === args['mark-used']);
    if (!entry) {
      console.error('No ledger entry found for that subscription code.');
      process.exit(1);
    }
    entry.status = 'activated';
    entry.activatedAt = new Date().toISOString();
    saveLedger(ledger);
    console.log('Marked as activated:', entry.subscriptionCode);
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
  const planToken = subscriptionCore.PLAN_TOKENS[plan];
  if (!planToken) {
    console.error(`Unknown plan "${plan}". Valid plans: ${Object.keys(subscriptionCore.PLAN_TOKENS).join(', ')}`);
    process.exit(1);
  }

  let expiryToken = subscriptionCore.NO_EXPIRY;
  if (plan !== 'lifetime') {
    const months = PLAN_MONTHS[plan];
    const expiryDate = new Date();
    expiryDate.setUTCMonth(expiryDate.getUTCMonth() + months);
    expiryToken = subscriptionCore.formatExpiryToken(expiryDate);
  }

  const deviceIdNormalized = deviceId.toUpperCase();
  const ledger = loadLedger();
  const dupe = ledger.find(
    (e) => e.deviceId === deviceIdNormalized && e.plan === plan && e.status !== 'activated'
  );
  if (dupe) {
    console.error('An unused subscription for this device + plan already exists:');
    console.error(' ', dupe.subscriptionCode);
    console.error('Reuse that one, or run with --mark-used <code> first if it actually was already used.');
    process.exit(1);
  }

  if (!fs.existsSync(keysPath)) {
    console.error('No private key found. Run generate-keypair.js first.');
    process.exit(1);
  }
  const { secretKeyBase64 } = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  const secretKey = subscriptionCore.base64ToBytes(secretKeyBase64);

  const message = subscriptionCore.buildMessage(deviceIdNormalized, planToken, expiryToken);
  const signature = nacl.sign.detached(subscriptionCore.asciiToBytes(message), secretKey);
  const subscriptionCode = subscriptionCore.formatSubscriptionCode(deviceIdNormalized, planToken, expiryToken, signature);
  const expiresAt = subscriptionCore.expiryTokenToIso(expiryToken);

  ledger.push({
    deviceId: deviceIdNormalized,
    subscriptionCode,
    plan,
    createdAt: new Date().toISOString(),
    activatedAt: null,
    expiresAt,
    status: 'issued',
  });
  saveLedger(ledger);

  console.log('Subscription code (give this to the customer to paste into Settings -> Online Store Subscription):');
  console.log('');
  console.log(subscriptionCode);
  console.log('');
  console.log(expiresAt ? `Expires: ${expiresAt}` : 'Expires: never (Lifetime)');
}

main();
