import type { Request, Response, NextFunction } from 'express';
import { auth } from './firebaseAdmin';

export interface AuthedRequest extends Request {
  uid?: string;
  email?: string;
}

// uid/email always come from here — the verified, decoded ID token — never from
// the request body. A client can never claim to be a different uid or email.
export async function verifyFirebaseToken(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!idToken) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    if (!decoded.email) {
      res.status(400).json({ error: 'no_email_on_account' });
      return;
    }
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (e) {
    // Never log the token itself — only that verification failed.
    console.error('verifyFirebaseToken: verification failed', e instanceof Error ? e.message : String(e));
    res.status(401).json({ error: 'invalid_token' });
  }
}
