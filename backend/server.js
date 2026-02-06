// backend/server.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CORS plus permissif pour le développement
app.use(cors({
  origin: '*', // En production, remplacez par votre domaine exact
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// ✅ Log de toutes les requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ✅ Initialiser Firebase Admin SDK
try {
  const serviceAccount = require('./serviceAccountKey.json');

  // ⚠️ IMPORTANT : Remplacez par votre vraie URL Firebase Database
  // Format attendu : https://VOTRE-PROJET-12345-default-rtdb.firebaseio.com
  // Vous pouvez la trouver dans Firebase Console > Realtime Database
  
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://shic-app-96d3e-default-rtdb.firebaseio.com";
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL
  });

  console.log(`✅ Firebase Admin initialisé avec: ${databaseURL}`);

  console.log("✅ Firebase Admin initialisé");
} catch (error) {
  console.error("❌ Erreur initialisation Firebase Admin:", error.message);
  process.exit(1);
}

const db = admin.database();

// ✅ Route de test pour vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Serveur backend fonctionnel',
    timestamp: new Date().toISOString()
  });
});

// ✅ ROUTE POUR CRÉER UN UTILISATEUR
app.post('/api/create-user', async (req, res) => {
  console.log("🔵 Début création utilisateur");
  console.log("📋 Données reçues:", { ...req.body, password: '***' });

  try {
    const { email, password, nom, telephone, role } = req.body;

    // ✅ Validation détaillée
    if (!email || !password || !nom) {
      console.log("❌ Validation échouée: champs manquants");
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password et nom sont requis' 
      });
    }

    if (password.length < 6) {
      console.log("❌ Validation échouée: mot de passe trop court");
      return res.status(400).json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    console.log(`🔄 Création compte Firebase Auth pour: ${email}`);

    // ✅ Créer le compte Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nom
    });

    console.log(`✅ Compte Firebase Auth créé avec UID: ${userRecord.uid}`);

    // ✅ Créer le profil dans la base de données
    const userData = {
      firebase_uid: userRecord.uid,
      user_id: userRecord.uid,
      nom_user: nom,
      email_user: email,
      telephone: telephone || "",
      role: role || "utilisateur",
      actif: true,
      entreprise: "Takaz Engineering",
      poste: role === "administrateur" ? "Administrateur" : "Utilisateur",
      date_creation: new Date().toISOString(),
      date_modification: new Date().toISOString(),
      derniere_connexion: null
    };

    console.log("🔄 Écriture du profil dans la base de données...");
    await db.ref(`utilisateurs/${userRecord.uid}`).set(userData);
    console.log("✅ Profil créé dans la base de données");

    // ✅ Retourner le succès
    const response = {
      success: true,
      uid: userRecord.uid,
      email: email,
      nom: nom,
      message: "Utilisateur créé avec succès"
    };

    console.log("✅ Réponse envoyée:", response);
    res.json(response);

  } catch (error) {
    console.error("❌ ERREUR lors de la création:", error);

    // ✅ Gestion détaillée des erreurs Firebase
    if (error.code === 'auth/email-already-exists') {
      console.log("❌ Email déjà utilisé");
      return res.status(400).json({ 
        success: false, 
        error: 'Cet email est déjà utilisé' 
      });
    } 
    
    if (error.code === 'auth/invalid-email') {
      console.log("❌ Format d'email invalide");
      return res.status(400).json({ 
        success: false, 
        error: 'Format d\'email invalide' 
      });
    } 
    
    if (error.code === 'auth/weak-password') {
      console.log("❌ Mot de passe trop faible");
      return res.status(400).json({ 
        success: false, 
        error: 'Le mot de passe est trop faible' 
      });
    }

    // ✅ Erreur générique
    console.log("❌ Erreur générique:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erreur serveur inconnue' 
    });
  }
});

// ✅ Gestion des erreurs 404
app.use((req, res) => {
  console.log(`❌ Route non trouvée: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    error: 'Route non trouvée' 
  });
});

// ✅ Gestion des erreurs générales
app.use((error, req, res, next) => {
  console.error("❌ Erreur serveur:", error);
  res.status(500).json({ 
    success: false, 
    error: 'Erreur serveur interne' 
  });
});

// ✅ Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 Serveur Backend démarré avec succès   ║
║  📡 Port: ${PORT}                            ║
║  🌍 URL: http://localhost:${PORT}           ║
║  ✅ Health check: /api/health              ║
╚════════════════════════════════════════════╝
  `);
});