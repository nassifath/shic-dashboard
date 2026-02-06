const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// ✅ Initialiser Firebase Admin
admin.initializeApp();
const db = admin.database();

// ✅ Créer l'application Express
const app = express();

// ✅ Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Log des requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ✅ Route de test
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ API Cloud Functions fonctionnelle',
    timestamp: new Date().toISOString()
  });
});

// ✅ Route de création d'utilisateur
app.post('/create-user', async (req, res) => {
  console.log("🔵 Début création utilisateur");
  
  try {
    const { email, password, nom, telephone, role } = req.body;

    // Validation
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

    // Créer le compte Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nom
    });

    console.log(`✅ Compte Firebase Auth créé avec UID: ${userRecord.uid}`);

    // Créer le profil dans la base de données
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

    // Retourner le succès
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

    // Gestion des erreurs Firebase
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cet email est déjà utilisé' 
      });
    } 
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ 
        success: false, 
        error: 'Format d\'email invalide' 
      });
    } 
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ 
        success: false, 
        error: 'Le mot de passe est trop faible' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erreur serveur inconnue' 
    });
  }
});

// ✅ Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route non trouvée' 
  });
});

// ✅ Export de la Cloud Function
exports.api = functions.https.onRequest(app);