// components/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  // ✅ Attendre le chargement de l'authentification
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
          <p style={{ color: '#6b7280', fontSize: '18px' }}>Chargement...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ✅ Si pas authentifié, rediriger vers login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Si authentifié, afficher le contenu
  return children;
}