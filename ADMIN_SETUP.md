# Admin-Only Dashboard Setup Guide

This guide will help you set up admin-only access to the Bus Tracker Dashboard.

## Overview

The dashboard uses Firebase Custom Claims to identify admin users. Only users with the `admin` custom claim can access the dashboard and view all trips.

---

## Step-by-Step Setup

### Step 1: Create Admin User in Firebase

First, create a user account that will be the admin:

1. Go to [Firebase Console](https://console.firebase.google.com/project/bus-tracker-1c0bb/authentication/users)
2. Click **Authentication** → **Users**
3. Click **Add user**
4. Enter admin email and password (e.g., `admin@bustracker.com`)
5. Click **Add user**

### Step 2: Download Firebase Service Account Key

1. Go to [Firebase Console → Project Settings](https://console.firebase.google.com/project/bus-tracker-1c0bb/settings/serviceaccounts/adminsdk)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the downloaded JSON file as `serviceAccountKey.json` in the `Dashboard/scripts/` folder

⚠️ **Security Warning**: This file grants full access to your Firebase project. Never commit it to git or share it publicly!

### Step 3: Install Firebase Admin SDK

In the Dashboard folder, run:

```bash
npm install firebase-admin
```

### Step 4: Set Admin Custom Claim

1. Open `Dashboard/scripts/setAdmin.js`
2. Change this line to your admin user's email:

   ```javascript
   const adminEmail = "admin@bustracker.com"; // Replace with your admin email
   ```

3. Run the script:

   ```bash
   cd Dashboard/scripts
   node setAdmin.js
   ```

4. You should see:
   ```
   ✅ Admin claim set for user: admin@bustracker.com (uid...)
   User must log out and log back in for changes to take effect.
   ```

### Step 5: Update Firestore Security Rules

1. Go to [Firebase Console → Firestore Database → Rules](https://console.firebase.google.com/project/bus-tracker-1c0bb/firestore/rules)

2. Replace your rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Drivers collection: only the authenticated user may access their own doc
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

    // Trips: drivers can create their own trips, only admins can read all trips
    match /trips/{tripId} {
      allow create: if request.auth != null
        && request.resource.data.driverId == request.auth.uid
        && request.resource.data.startTime is number
        && request.resource.data.routePoints is list;

      // ONLY users with admin custom claim can read trips
      allow read: if request.auth != null
        && request.auth.token.admin == true;

      allow update, delete: if false;
    }

    // Default: deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**
4. Wait 10-30 seconds for changes to propagate

### Step 6: Test Admin Access

1. Start the dashboard:

   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Log in with your admin credentials

4. You should see all trips in the dashboard

5. **Test non-admin access**: Try logging in with a regular driver account (non-admin). You should see an "Access Denied" message.

---

## Adding More Admin Users

To grant admin access to additional users:

1. Make sure the user exists in Firebase Authentication
2. Edit `scripts/setAdmin.js` and change the email
3. Run `node setAdmin.js` again
4. The user must log out and log back in

---

## Removing Admin Access

To revoke admin access:

1. Edit `scripts/setAdmin.js`
2. Change the `setCustomUserClaims` call:
   ```javascript
   await admin.auth().setCustomUserClaims(user.uid, { admin: false });
   ```
3. Run the script
4. User must log out for changes to take effect

---

## Troubleshooting

### "Access Denied" for Admin User

**Problem**: Admin user sees "Access Denied" message.

**Solution**:

1. Verify the admin claim was set: Check Firebase Console logs
2. User must **log out completely** and log back in
3. Clear browser cache and cookies
4. Check Firestore rules are published correctly

### "Missing or Insufficient Permissions"

**Problem**: Dashboard shows permission error.

**Solution**:

1. Verify Firestore rules include: `request.auth.token.admin == true`
2. Verify the rules are published
3. Verify user has admin claim set
4. Check Firebase Console → Firestore → Rules for any errors

### Script Error: "Cannot find module 'firebase-admin'"

**Problem**: `setAdmin.js` fails to run.

**Solution**:

```bash
npm install firebase-admin
```

### Script Error: "Cannot find module './serviceAccountKey.json'"

**Problem**: Service account key not found.

**Solution**:

1. Download service account key from Firebase Console
2. Save as `serviceAccountKey.json` in `Dashboard/scripts/` folder
3. Make sure the file is in the correct location

---

## Security Best Practices

1. ✅ **Never commit `serviceAccountKey.json`** - Already in `.gitignore`
2. ✅ **Use strong passwords** for admin accounts
3. ✅ **Limit admin access** to trusted users only
4. ✅ **Regularly audit** admin users
5. ✅ **Use 2FA** on admin Firebase accounts (in Firebase Console settings)

---

## Architecture

```
┌─────────────────┐
│  Admin Login    │
│  (Dashboard)    │
└────────┬────────┘
         │
         ├─ Authenticates with Firebase Auth
         │
         ├─ Gets ID Token with Custom Claims { admin: true }
         │
         ├─ Firestore checks: request.auth.token.admin == true
         │
         └─ ✅ Grants access to all trips
```

Regular drivers using the Android app don't have the `admin` claim, so they can only create trips but cannot view them through the dashboard.

---

## Quick Reference

| Action               | Command                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Install dependencies | `npm install firebase-admin`                                                                       |
| Set admin claim      | `node scripts/setAdmin.js`                                                                         |
| Start dashboard      | `npm run dev`                                                                                      |
| View Firebase rules  | [Console Link](https://console.firebase.google.com/project/bus-tracker-1c0bb/firestore/rules)      |
| View users           | [Console Link](https://console.firebase.google.com/project/bus-tracker-1c0bb/authentication/users) |

---

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review Firebase Console for error messages
3. Check browser console (F12) for detailed errors
4. Verify all steps were completed in order
