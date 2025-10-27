#!/usr/bin/env node

// Script to deploy Firestore security rules for the chat database
// Run this script after installing Firebase CLI: npm install -g firebase-tools

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if Firebase CLI is installed
exec('firebase --version', (error, stdout, stderr) => {
  if (error) {
    console.error('Firebase CLI is not installed. Please install it first:');
    console.error('npm install -g firebase-tools');
    return;
  }
  
  console.log('Firebase CLI version:', stdout);
  
  // Check if the rules file exists
  const rulesFile = path.join(__dirname, 'firestore.chat.rules');
  if (!fs.existsSync(rulesFile)) {
    console.error('Firestore rules file not found:', rulesFile);
    return;
  }
  
  // Deploy the rules
  console.log('Deploying Firestore rules for chat database...');
  
  // Note: You'll need to be logged in to Firebase CLI
  // Run: firebase login
  exec(`firebase deploy --only firestore:rules --project okul-sohbet-gecici`, {
    cwd: __dirname
  }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error deploying rules:', error);
      console.error('stderr:', stderr);
      return;
    }
    
    console.log('Rules deployed successfully!');
    console.log(stdout);
  });
});