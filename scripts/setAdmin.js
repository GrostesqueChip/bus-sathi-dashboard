const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Download your service account key from Firebase Console:
// Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Set admin custom claim for a user
 * Replace 'USER_EMAIL_HERE' with the actual email of the admin user
 */
async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`✅ Admin claim set for user: ${email} (${user.uid})`);
    console.log('User must log out and log back in for changes to take effect.');
  } catch (error) {
    console.error('❌ Error setting admin claim:', error);
  }
}

// Replace with your admin user's email
const adminEmail = 'admin@gmail.com'; // CHANGE THIS!

setAdminClaim(adminEmail).then(() => {
  process.exit(0);
});
