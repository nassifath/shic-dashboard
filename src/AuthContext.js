// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  auth, 
  db,
  ref,
  get,
  set,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from "./firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fonction pour charger le profil utilisateur depuis Firebase
  async function loadUserProfile(user) {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      console.log("🔍 Chargement du profil pour:", user.email, "| UID:", user.uid);
      
      const userRef = ref(db, `utilisateurs/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log("✅ Profil trouvé dans Firebase:", userData);
        
        // Vérifier si le compte est actif
        if (userData.actif === false) {
          throw new Error("Votre compte a été désactivé. Contactez un administrateur.");
        }
        
        const profile = {
          id: user.uid,
          uid: user.uid,
          user_id: user.uid,
          firebaseKey: user.uid,
          firebase_uid: userData.firebase_uid || user.uid,
          nom_user: userData.nom_user || user.email.split('@')[0],
          email: userData.email_user || user.email,
          email_user: userData.email_user || user.email,
          telephone: userData.telephone || "",
          entreprise: userData.entreprise || "Takaz Engineering",
          poste: userData.poste || "Utilisateur",
          role: userData.role || "utilisateur",
          actif: userData.actif !== false,
          date_creation: userData.date_creation,
          derniere_connexion: userData.derniere_connexion
        };
        
        // Mettre à jour la dernière connexion
        await set(ref(db, `utilisateurs/${user.uid}/derniere_connexion`), 
          new Date().toISOString()
        );
        
        setUserProfile(profile);
        console.log("👤 Profil chargé - Rôle:", profile.role, "- Actif:", profile.actif);
        
      } else {
        console.warn("⚠️ Aucun profil trouvé pour UID:", user.uid);
        console.log("💡 Création d'un profil par défaut...");
        
        // Créer un profil par défaut
        const defaultProfile = {
          actif: true,
          firebase_uid: user.uid,
          nom_user: user.email.split('@')[0],
          email_user: user.email,
          telephone: "",
          entreprise: "Takaz Engineering",
          poste: "Utilisateur",
          role: "utilisateur",
          date_creation: new Date().toISOString(),
          derniere_connexion: new Date().toISOString()
        };
        
        await set(userRef, defaultProfile);
        console.log("✅ Profil par défaut créé avec rôle 'utilisateur'");
        
        setUserProfile({
          id: user.uid,
          uid: user.uid,
          user_id: user.uid,
          firebaseKey: user.uid,
          ...defaultProfile,
          email: user.email
        });
      }
    } catch (error) {
      console.error("❌ Erreur chargement profil:", error);
      throw error;
    }
  }

  // ✅ Fonction de connexion
  async function login(email, password) {
    try {
      console.log("🔐 Tentative de connexion pour:", email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Authentification Firebase réussie");
      
      await loadUserProfile(userCredential.user);
      
      console.log("✅ Connexion réussie pour:", email);
      return userCredential;
      
    } catch (error) {
      console.error("❌ Erreur connexion:", error);
      
      if (error.message.includes("désactivé")) {
        throw error;
      } else if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        throw new Error("Email ou mot de passe incorrect");
      } else if (error.code === "auth/user-not-found") {
        throw new Error("Aucun compte associé à cet email");
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("Trop de tentatives. Réessayez plus tard");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Format d'email invalide");
      } else {
        throw new Error(error.message || "Erreur de connexion");
      }
    }
  }

  // ✅ FONCTION CORRIGÉE - Créer un utilisateur avec ré-authentification
  async function createUserByAdmin(email, password, nom, telephone, role, adminPassword) {
    try {
      console.log("👤 Création utilisateur par admin:", email);
      
      // 1. Sauvegarder les infos de l'admin
      const adminUser = auth.currentUser;
      const adminEmail = adminUser?.email;
      
      if (!adminUser || !adminEmail) {
        throw new Error("Vous devez être connecté en tant qu'administrateur");
      }

      if (!adminPassword) {
        throw new Error("Le mot de passe administrateur est requis");
      }

      console.log("📧 Admin actuel:", adminEmail);

      // 2. Créer le nouveau compte (va déconnecter l'admin temporairement)
      console.log("🔨 Création du compte Firebase...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      console.log("✅ Compte Firebase créé avec UID:", newUser.uid);
      
      // 3. Créer le profil dans la base de données
      console.log("💾 Création du profil utilisateur...");
      const userRef = ref(db, `utilisateurs/${newUser.uid}`);
      const userData = {
        firebase_uid: newUser.uid,
        user_id: newUser.uid,
        nom_user: nom,
        email_user: email,
        telephone: telephone,
        role: role,
        actif: true,
        entreprise: "Takaz Engineering",
        poste: role === "administrateur" ? "Administrateur" : "Utilisateur",
        date_creation: new Date().toISOString(),
        date_modification: new Date().toISOString(),
        derniere_connexion: null
      };
      
      await set(userRef, userData);
      console.log("✅ Profil utilisateur créé dans la base de données");
      
      // 4. Déconnecter le nouvel utilisateur
      console.log("🔓 Déconnexion du nouvel utilisateur...");
      await signOut(auth);
      
      // 5. Reconnecter l'admin avec son mot de passe
      console.log("🔐 Reconnexion de l'admin...");
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log("✅ Admin reconnecté avec succès - Vous êtes resté connecté !");
      
      return {
        success: true,
        uid: newUser.uid,
        email: email,
        nom: nom
      };
      
    } catch (error) {
      console.error("❌ Erreur création utilisateur:", error);
      
      // Messages d'erreur personnalisés
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error("Mot de passe administrateur incorrect");
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error("Cet email est déjà utilisé");
      } else if (error.code === 'auth/weak-password') {
        throw new Error("Le mot de passe est trop faible (minimum 6 caractères)");
      } else if (error.code === 'auth/invalid-email') {
        throw new Error("Format d'email invalide");
      } else {
        throw error;
      }
    }
  }

  // ✅ Fonction de déconnexion
  async function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  // ✅ Fonction pour mettre à jour le profil
  async function updateUserProfile(updates) {
    if (!currentUser) return;
    
    try {
      const userRef = ref(db, `utilisateurs/${currentUser.uid}`);
      const snapshot = await get(userRef);
      const currentData = snapshot.val() || {};
      
      const updatedData = {
        ...currentData,
        ...updates,
        firebase_uid: currentUser.uid,
        date_modification: new Date().toISOString()
      };
      
      await set(userRef, updatedData);
      
      setUserProfile({
        ...userProfile,
        ...updates
      });
      
      console.log("✅ Profil mis à jour:", updates);
    } catch (error) {
      console.error("❌ Erreur mise à jour profil:", error);
      throw error;
    }
  }

  // ✅ Surveiller l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔐 État auth changé:", user ? user.email : "Déconnecté");
      setCurrentUser(user);
      
      if (user) {
        try {
          await loadUserProfile(user);
        } catch (error) {
          console.error("❌ Erreur chargement profil:", error);
          if (error.message.includes("désactivé")) {
            await signOut(auth);
          }
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    createUserByAdmin,
    updateUserProfile,
    isAdmin: userProfile?.role === "administrateur"
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}