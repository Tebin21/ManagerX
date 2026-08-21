import fs from 'fs';
import path from 'path';

// Config sources, in priority order: process.env.X (Render injects these) >
// config.local.json (gitignored, non-secret-in-example-form local override) >
// these defaults. Unlike online-store/server's config, every secret here defaults
// to '' with no usable production fallback — firebaseAdmin.ts and email.ts refuse
// to operate (loudly, not silently) if their required secret is empty.
const CONFIG_PATH = path.join(__dirname, '../config.local.json');

export interface LocalConfig {
  port: number;
  firebaseProjectId: string;
  // Full JSON contents of a Firebase service-account key (Console > Project
  // Settings > Service Accounts > Generate new private key), as a string.
  firebaseServiceAccountJson: string;
  resendApiKey: string;
  resendFromAddress: string;
  // Server-only secret mixed into every OTP hash so a Firestore-only data leak
  // (without also leaking this env var) can't be used to precompute/rainbow-table
  // the 6-digit code space offline.
  otpHashPepper: string;
  // Server-only secret for the password-reset OTP flow (see passwordResetCrypto.ts
  // / passwordResetStore.ts). Deliberately separate from otpHashPepper so the two
  // flows' secrets can be rotated independently — a leak of one never compromises
  // the other.
  passwordResetHashPepper: string;
}

const DEFAULTS: LocalConfig = {
  port: 4200,
  firebaseProjectId: 'managerx-bac3a',
  firebaseServiceAccountJson: '',
  resendApiKey: '',
  resendFromAddress: 'support@froshiar.store',
  otpHashPepper: '',
  passwordResetHashPepper: '',
};

function loadConfig(): LocalConfig {
  let fileConfig: Partial<LocalConfig> = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {
      console.error(`Could not parse config.local.json — using defaults. (${e instanceof Error ? e.message : e})`);
    }
  }

  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;

  return {
    ...DEFAULTS,
    ...fileConfig,
    port: envPort ?? fileConfig.port ?? DEFAULTS.port,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? fileConfig.firebaseProjectId ?? DEFAULTS.firebaseProjectId,
    firebaseServiceAccountJson:
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? fileConfig.firebaseServiceAccountJson ?? DEFAULTS.firebaseServiceAccountJson,
    resendApiKey: process.env.RESEND_API_KEY ?? fileConfig.resendApiKey ?? DEFAULTS.resendApiKey,
    resendFromAddress: process.env.RESEND_FROM_ADDRESS ?? fileConfig.resendFromAddress ?? DEFAULTS.resendFromAddress,
    otpHashPepper: process.env.OTP_HASH_PEPPER ?? fileConfig.otpHashPepper ?? DEFAULTS.otpHashPepper,
    passwordResetHashPepper:
      process.env.PASSWORD_RESET_HASH_PEPPER ?? fileConfig.passwordResetHashPepper ?? DEFAULTS.passwordResetHashPepper,
  };
}

export const config: LocalConfig = loadConfig();

// Fail loudly at boot, not silently at request time. Without this, a deploy
// missing RESEND_API_KEY or OTP_HASH_PEPPER would start up "successfully" and
// only reveal the problem when the first real user hits /api/otp/request (a
// 502 from email.ts) or gets OTPs hashed with an empty pepper (otpCrypto.ts) —
// both silent-degradation failure modes this project's own design explicitly
// wants to avoid (see the comment above LocalConfig). Mirrors
// firebaseAdmin.ts's existing throw-on-missing-secret pattern for its own key.
function validateRequiredSecrets(cfg: LocalConfig): void {
  const missing: string[] = [];
  if (!cfg.resendApiKey) missing.push('RESEND_API_KEY');
  if (!cfg.otpHashPepper) missing.push('OTP_HASH_PEPPER');
  if (!cfg.passwordResetHashPepper) missing.push('PASSWORD_RESET_HASH_PEPPER');
  if (missing.length > 0) {
    throw new Error(
      `Missing required config: ${missing.join(', ')}. Set as environment variables in ` +
        'production, or in the matching field of config.local.json for local dev — see ' +
        'auth-server/.env.example / config.local.json.example.'
    );
  }
}

validateRequiredSecrets(config);
