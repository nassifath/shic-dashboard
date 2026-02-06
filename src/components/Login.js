// src/components/Login.js
import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/Capture.PNG";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Erreur connexion:", err);
      
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Email ou mot de passe incorrect");
      } else if (err.code === "auth/user-not-found") {
        setError("Aucun compte trouvé avec cet email");
      } else if (err.code === "auth/user-disabled") {
        setError("Ce compte a été désactivé");
      } else if (err.code === "auth/too-many-requests") {
        setError("Trop de tentatives. Veuillez réessayer plus tard");
      } else {
        setError("Erreur de connexion : " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

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
      maxWidth: '480px'
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '2.5rem'
    },
    logo: {
      width: '200px',
      height: 'auto',
      margin: '0 auto',
      display: 'block'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#374151',
      textAlign: 'center',
      marginBottom: '2.5rem'
    },
    error: {
      backgroundColor: '#fee2e2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '0.75rem 1rem',
      borderRadius: '0.5rem',
      marginBottom: '1.5rem',
      fontSize: '0.875rem'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '0.95rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.875rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.2s',
      backgroundColor: 'white'
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
      transition: 'all 0.2s',
      marginTop: '0.5rem'
    },
    forgotPassword: {
      textAlign: 'center',
      marginTop: '1.5rem'
    },
    forgotPasswordLink: {
      color: '#374151',
      fontSize: '0.95rem',
      textDecoration: 'none',
      transition: 'color 0.2s'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        input:focus {
          border-color: #1e5128 !important;
          box-shadow: 0 0 0 3px rgba(30, 81, 40, 0.1) !important;
        }
        button:hover:not(:disabled) {
          background-color: #164019 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        a:hover {
          color: #1e5128 !important;
        }
      `}</style>

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img src={logo} alt="Takaz Engineering" style={styles.logo} />
        </div>

        {/* Titre */}
        <h2 style={styles.title}>Connexion à 2SHIC</h2>

        {/* Message d'erreur */}
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {/* Mot de passe */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Mot de passe oublié */}
        <div style={styles.forgotPassword}>
          <a href="#" style={styles.forgotPasswordLink}>
            Mot de passe oublié ?
          </a>
        </div>

        {/* Lien S'inscrire */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            Pas encore de compte ?{' '}
            <a href="/signup" style={{ color: '#1e5128', fontWeight: '600', textDecoration: 'none' }}>
              S'inscrire
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}