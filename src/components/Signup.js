// src/components/Signup.js
import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/Capture.PNG";

export default function Signup() {
  const navigate = useNavigate();

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '1rem'
    },
    card: {
      backgroundColor: 'white',
      padding: '3rem 2.5rem',
      borderRadius: '1rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
      width: '100%',
      maxWidth: '480px',
      textAlign: 'center'
    },
    logoContainer: {
      marginBottom: '2rem'
    },
    logo: {
      width: '180px',
      height: 'auto',
      margin: '0 auto',
      display: 'block'
    },
    iconContainer: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      backgroundColor: '#fee2e2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
      fontSize: '2.5rem'
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '1rem'
    },
    description: {
      color: '#6b7280',
      fontSize: '1rem',
      lineHeight: '1.6',
      marginBottom: '2rem'
    },
    button: {
      width: '100%',
      backgroundColor: '#1e5128',
      color: 'white',
      padding: '0.875rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    infoBox: {
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '2rem',
      textAlign: 'left'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        button:hover {
          background-color: #164019 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img src={logo} alt="Takaz Engineering" style={styles.logo} />
        </div>

        {/* Icône */}
        <div style={styles.iconContainer}>
          🔒
        </div>

        {/* Titre */}
        <h2 style={styles.title}>Inscription Désactivée</h2>

        {/* Description */}
        <p style={styles.description}>
          Les inscriptions publiques ne sont plus autorisées pour des raisons de sécurité. 
          Seuls les administrateurs peuvent créer des comptes utilisateurs.
        </p>

        {/* Boîte d'information */}
        <div style={styles.infoBox}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#0369a1' }}>
                Comment obtenir un compte ?
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#075985', lineHeight: '1.5' }}>
                Contactez votre administrateur système pour qu'il crée un compte à votre nom. 
                Vous recevrez ensuite vos identifiants de connexion.
              </p>
            </div>
          </div>
        </div>

        {/* Bouton retour connexion */}
        <button onClick={() => navigate("/login")} style={styles.button}>
          ← Retour à la connexion
        </button>

        {/* Contact admin */}
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
            Besoin d'aide ? Contactez un administrateur
          </p>
        </div>
      </div>
    </div>
  );
}