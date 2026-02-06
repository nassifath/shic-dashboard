// src/components/RequireAuth.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function RequireAuth({ children }) {
  const { currentUser, userProfile, loading } = useAuth();

  console.log("🔒 RequireAuth - currentUser:", currentUser?.email);
  console.log("🔒 RequireAuth - userProfile:", userProfile?.nom_user);
  console.log("🔒 RequireAuth - loading:", loading);

  // ✅ ÉTAPE 1 : Attendre la fin du chargement
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #1e5128',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: '600' }}>
            Vérification de votre session...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ✅ ÉTAPE 2 : Si pas d'utilisateur connecté, rediriger vers login
  if (!currentUser) {
    console.log("❌ RequireAuth - Pas d'utilisateur, redirection vers /login");
    return <Navigate to="/login" replace />;
  }

  // ✅ ÉTAPE 3 : Utilisateur connecté mais profil pas encore chargé
  if (!userProfile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #1e5128',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: '600' }}>
            Chargement de votre profil...
          </p>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
            {currentUser.email}
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ✅ ÉTAPE 4 : Tout est OK, afficher la page
  console.log("✅ RequireAuth - Utilisateur authentifié, accès autorisé");
  return children;
}