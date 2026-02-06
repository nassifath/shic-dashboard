// src/utils/adminUtils.js
// Utilitaires pour gérer les rôles administrateurs

import { auth, db, ref, set, get } from "../firebase";

/**
 * Transformer l'utilisateur actuel en administrateur
 */
export async function makeCurrentUserAdmin() {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error("Aucun utilisateur connecté");
  }

  console.log("🔧 Transformation en administrateur...");
  console.log("📧 Email:", currentUser.email);
  console.log("🆔 UID:", currentUser.uid);

  try {
    const userRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    
    let userData = {};
    
    if (snapshot.exists()) {
      userData = snapshot.val();
      console.log("✅ Profil existant trouvé:", userData);
    } else {
      console.log("ℹ️ Création d'un nouveau profil...");
    }

    // Créer/Mettre à jour avec le rôle administrateur
    const adminData = {
      nom_user: userData.nom_user || currentUser.email.split('@')[0],
      email: currentUser.email,
      telephone: userData.telephone || "",
      role: "administrateur",
      date_creation: userData.date_creation || new Date().toISOString(),
      date_modification: new Date().toISOString()
    };

    await set(userRef, adminData);
    
    console.log("✅ ✅ ✅ SUCCÈS ! ✅ ✅ ✅");
    console.log("👑 Vous êtes maintenant ADMINISTRATEUR");
    console.log("📋 Nouvelles données:", adminData);
    
    return adminData;
  } catch (error) {
    console.error("❌ Erreur lors de la transformation:", error);
    throw error;
  }
}

/**
 * Transformer un utilisateur spécifique en administrateur (par UID)
 */
export async function makeUserAdmin(uid) {
  if (!uid) {
    throw new Error("UID requis");
  }

  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error("Utilisateur non trouvé");
    }

    const userData = snapshot.val();
    const adminData = {
      ...userData,
      role: "administrateur",
      date_modification: new Date().toISOString()
    };

    await set(userRef, adminData);
    
    console.log("✅ Utilisateur transformé en administrateur");
    return adminData;
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  }
}

/**
 * Transformer un utilisateur en utilisateur normal
 */
export async function makeUserRegular(uid) {
  if (!uid) {
    throw new Error("UID requis");
  }

  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error("Utilisateur non trouvé");
    }

    const userData = snapshot.val();
    const regularData = {
      ...userData,
      role: "utilisateur",
      date_modification: new Date().toISOString()
    };

    await set(userRef, regularData);
    
    console.log("✅ Utilisateur transformé en utilisateur normal");
    return regularData;
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  }
}

/**
 * Vérifier si l'utilisateur actuel est administrateur
 */
export async function checkIfCurrentUserIsAdmin() {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    return false;
  }

  try {
    const userRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      return userData.role === "administrateur";
    }
    
    return false;
  } catch (error) {
    console.error("❌ Erreur:", error);
    return false;
  }
}

/**
 * Obtenir le rôle de l'utilisateur actuel
 */
export async function getCurrentUserRole() {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    return null;
  }

  try {
    const userRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      return userData.role || "utilisateur";
    }
    
    return "utilisateur";
  } catch (error) {
    console.error("❌ Erreur:", error);
    return null;
  }
}