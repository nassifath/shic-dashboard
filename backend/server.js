// backend/server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Initialiser Firebase Admin avec les variables d'environnement
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Route de test
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ API Backend fonctionnelle',
    timestamp: new Date().toISOString()
  });
});

// Route pour créer un utilisateur
app.post('/create-user', async (req, res) => {
  console.log("🔵 Début création utilisateur");
  
  try {
    const { email, password, nom, telephone, role } = req.body;

    if (!email || !password || !nom) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password et nom sont requis' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    console.log(`🔄 Création compte Firebase Auth pour: ${email}`);

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nom
    });

    console.log(`✅ Compte Firebase Auth créé avec UID: ${userRecord.uid}`);

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

    await db.ref(`utilisateurs/${userRecord.uid}`).set(userData);
    console.log("✅ Profil créé dans la base de données");

    res.json({
      success: true,
      uid: userRecord.uid,
      email: email,
      nom: nom,
      message: "Utilisateur créé avec succès"
    });

  } catch (error) {
    console.error("❌ ERREUR lors de la création:", error);

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

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur le port ${PORT}`);
});