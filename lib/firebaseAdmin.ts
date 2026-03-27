import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;

function normalizePrivateKey(value?: string) {
  if (!value) return value;

  return value
    .trim()
    .replace(/,$/, '')
    .replace(/^"/, '')
    .replace(/"$/, '')
    .replace(/\\n/g, '\n')
    .trim();
}

const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

function createAdminApp(): App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  if (getApps().length > 0) {
    cachedAdminApp = getApps()[0]!;
    return cachedAdminApp;
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  cachedAdminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return cachedAdminApp;
}

export function getAdminDb(): Firestore {
  if (cachedAdminDb) {
    return cachedAdminDb;
  }

  cachedAdminDb = getFirestore(createAdminApp());
  return cachedAdminDb;
}
