// Script to remove unbalanced items from all users' inventories
// Usage: node remove_unbalanced_items.js

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.VITE_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

// IDs of the unbalanced items to remove
const UNBALANCED_ITEMS = ['speed_demon_24h', 'time_lord_29h'];

async function removeUnbalancedItems() {
  try {
    console.log('Starting removal of unbalanced items from user inventories...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    let updatedUsers = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      let updated = false;
      
      // Check if user has inventory
      if (userData.inventory && userData.inventory.temporaryAchievements) {
        // Filter out unbalanced items
        const filteredAchievements = userData.inventory.temporaryAchievements.filter(
          achievement => !UNBALANCED_ITEMS.includes(achievement.id)
        );
        
        // If items were removed, update the user
        if (filteredAchievements.length !== userData.inventory.temporaryAchievements.length) {
          await db.collection('users').doc(userDoc.id).update({
            'inventory.temporaryAchievements': filteredAchievements
          });
          updated = true;
          console.log(`Updated user ${userDoc.id}: removed unbalanced temporary achievements`);
        }
      }
      
      if (updated) {
        updatedUsers++;
      }
    }
    
    console.log(`Successfully updated ${updatedUsers} users`);
    console.log('Removal of unbalanced items completed.');
  } catch (error) {
    console.error('Error removing unbalanced items:', error);
  }
}

// Run the script
removeUnbalancedItems();