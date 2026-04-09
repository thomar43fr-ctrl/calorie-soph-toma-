// ============================================================
//  FIREBASE CONFIGURATION
//  Remplace les valeurs ci-dessous par ta propre config Firebase
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCuWtpP2yIF7azUMfRFxi5Cp5uwcKS8m7M",
  authDomain: "poids-soph-toma.firebaseapp.com",
  projectId: "poids-soph-toma",
  storageBucket: "poids-soph-toma.firebasestorage.app",
  messagingSenderId: "748159655159",
  appId: "1:748159655159:web:e1ca8d33d0e7f10fe447f2"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Storage supprimé — pas besoin pour cette version

// ============================================================
//  INSTRUCTIONS POUR CONFIGURER FIREBASE
// ============================================================
//
//  ÉTAPE 1 — Créer un compte et un projet
//  ----------------------------------------
//  1. Va sur https://firebase.google.com
//  2. Clique sur "Commencer" et connecte-toi avec ton compte Google
//  3. Clique sur "Ajouter un projet"
//  4. Donne un nom (ex: "calories-toma-soph")
//  5. Désactive Google Analytics si tu veux (optionnel)
//  6. Clique sur "Créer le projet"
//
//  ÉTAPE 2 — Activer Firestore (base de données)
//  -----------------------------------------------
//  1. Dans le menu gauche, clique sur "Firestore Database"
//  2. Clique sur "Créer une base de données"
//  3. Choisis "Commencer en mode test" (valable 30 jours, suffisant pour commencer)
//  4. Choisis la région "europe-west3 (Frankfurt)" ou "eur3"
//  5. Clique sur "Activer"
//
//  ÉTAPE 3 — Récupérer ta configuration
//  ---------------------------------------
//  1. Clique sur l'icône engrenage ⚙️ en haut à gauche > "Paramètres du projet"
//  2. Fais défiler jusqu'à "Vos applications"
//  3. Clique sur l'icône </> (Web)
//  4. Donne un surnom à l'app (ex: "calorie-tracker")
//  5. NE coche PAS Firebase Hosting
//  6. Clique sur "Enregistrer l'application"
//  7. Copie les valeurs du bloc "firebaseConfig" qui apparaît
//  8. Colle-les dans ce fichier en remplaçant les valeurs "REMPLACE_PAR_..."
//
//  ÉTAPE 4 — Modifier les règles de sécurité Firestore
//  -----------------------------------------------------
//  1. Dans Firestore > onglet "Règles"
//  2. Remplace le contenu par :
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /{document=**} {
//           allow read, write: if true;
//         }
//       }
//     }
//
//  3. Clique sur "Publier"
//
// ============================================================
