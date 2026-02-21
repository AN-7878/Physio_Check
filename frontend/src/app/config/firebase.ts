/**
 * Firebase configuration for Firestore
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjPl0TJCxEARFfZofcRLtCAHdeMnGtNyU",
  authDomain: "techfiesta-930e3.firebaseapp.com",
  projectId: "techfiesta-930e3",
  storageBucket: "techfiesta-930e3.firebasestorage.app",
  messagingSenderId: "193734385970",
  appId: "1:193734385970:web:125eb6fb0072d82bee772b",
  measurementId: "G-TK28WHW0BR"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}