# Admin Setup Instructions

This folder contains scripts to set up admin users for the dashboard.

## Prerequisites

1. Node.js installed
2. Firebase Admin SDK service account key

## Steps to Create Admin User

### 1. Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/bus-tracker-1c0bb/settings/serviceaccounts/adminsdk)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the JSON file as `serviceAccountKey.json` in this `scripts` folder

⚠️ **IMPORTANT**: Never commit `serviceAccountKey.json` to version control!

### 2. Install Dependencies

```bash
npm install firebase-admin
```

### 3. Edit the Script

Open `setAdmin.js` and change this line:

```javascript
const adminEmail = "admin@example.com"; // CHANGE THIS!
```

Replace with your actual admin email (must be an existing Firebase user).

### 4. Run the Script

```bash
node setAdmin.js
```

You should see:

```
✅ Admin claim set for user: admin@example.com (uid...)
User must log out and log back in for changes to take effect.
```

### 5. Update Firestore Rules

In Firebase Console, update your Firestore rules to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /drivers/{driverId} {
      allow create: if request.auth != null
        && request.auth.uid == driverId
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.email == request.auth.token.email;

      allow read, update, delete: if request.auth != null
        && request.auth.uid == driverId;
    }

    match /trips/{tripId} {
      allow create: if request.auth != null
        && request.resource.data.driverId == request.auth.uid
        && request.resource.data.startTime is number
        && request.resource.data.routePoints is list;

      // Only admin users can read all trips
      allow read: if request.auth != null
        && request.auth.token.admin == true;

      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 6. Log Out and Back In

The admin user must log out of the dashboard and log back in for the custom claim to take effect.

## Creating Additional Admin Users

Repeat steps 3-4 with different email addresses.

## Removing Admin Access

To remove admin access from a user:

```javascript
await admin.auth().setCustomUserClaims(user.uid, { admin: false });
```

## Security Notes

- Keep `serviceAccountKey.json` secure and never share it
- Only run this script on trusted machines
- Consider using Firebase Functions for production setups
