// src/pages/Profil.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, update, get, onValue } from "firebase/database";

export default function Profil() {
  const { userProfile, logout, currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    nom_user: "",
    entreprise: "",
    telephone: "",
    poste: ""
  });

  // ✅ États pour les statistiques
  const [projectsCount, setProjectsCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // ✅ Initialiser le formulaire avec les données du profil
  useEffect(() => {
    if (userProfile) {
      setFormData({
        nom_user: userProfile.nom_user || "",
        entreprise: userProfile.entreprise || "Takaz Engineering",
        telephone: userProfile.telephone || "",
        poste: userProfile.poste || ""
      });
    }
  }, [userProfile]);

  // ✅ Charger les statistiques des projets
  useEffect(() => {
    const projectsRef = ref(db, "projets_sechage");
    
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        
        if (data) {
          const validProjects = Object.entries(data)
            .filter(([key]) => !key.startsWith("_"))
            .map(([id, project]) => ({ id, ...project }));

          setProjectsCount(validProjects.length);

          let totalHeures = 0;
          validProjects.forEach(project => {
            const duree = project.duree_prevue || project.duration || project.duree || 0;
            totalHeures += parseFloat(duree) || 0;
          });

          setTotalHours(Math.round(totalHeures));
        } else {
          setProjectsCount(0);
          setTotalHours(0);
        }
      } catch (err) {
        console.error("❌ Erreur chargement statistiques:", err);
        setProjectsCount(0);
        setTotalHours(0);
      } finally {
        setStatsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  async function handleSave() {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      if (!formData.nom_user || !formData.telephone) {
        setError("Le nom et le téléphone sont obligatoires");
        setLoading(false);
        return;
      }

      // ✅ Utiliser l'UID Firebase comme clé
      const userRef = ref(db, `utilisateurs/${currentUser.uid}`);
      
      await update(userRef, {
        nom_user: formData.nom_user,
        entreprise: formData.entreprise,
        telephone: formData.telephone,
        poste: formData.poste,
        date_modification: new Date().toISOString()
      });

      setSuccess("✅ Profil mis à jour avec succès!");
      setIsEditing(false);
      
      setTimeout(() => setSuccess(""), 3000);

    } catch (err) {
      console.error("❌ Erreur mise à jour profil:", err);
      setError("❌ Erreur lors de la mise à jour: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setFormData({
      nom_user: userProfile?.nom_user || "",
      entreprise: userProfile?.entreprise || "Takaz Engineering",
      telephone: userProfile?.telephone || "",
      poste: userProfile?.poste || ""
    });
    setIsEditing(false);
    setError("");
  }

  async function handleLogout() {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      try {
        await logout();
        navigate("/login");
      } catch (error) {
        console.error("Erreur déconnexion:", error);
      }
    }
  }

  function getInitials(name) {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  function getRoleDisplay(role) {
    switch (role) {
      case "administrateur":
        return "👑 Administrateur";
      case "operateur":
        return "⚙️ Opérateur";
      case "utilisateur":
        return "👤 Utilisateur";
      default:
        return role;
    }
  }

  if (!userProfile) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '3px solid #e5e7eb',
          borderTopColor: '#1e5128',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .profil-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .profil-grid {
            grid-template-columns: 350px 1fr;
          }
        }
      `}</style>

      <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '2rem' }}>
        Profil
      </h1>

      {error && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem', 
          backgroundColor: '#fee2e2', 
          border: '1px solid #fecaca', 
          color: '#991b1b' 
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem', 
          backgroundColor: '#d1fae5', 
          border: '1px solid #a7f3d0', 
          color: '#065f46' 
        }}>
          {success}
        </div>
      )}

      <div className="profil-grid">
        {/* ========== CARTE UTILISATEUR ========== */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
          {/* Avatar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e5128 0%, #2d6a3e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 12px rgba(30, 81, 40, 0.3)'
            }}>
              {getInitials(userProfile.nom_user)}
            </div>

            <h2 style={{ 
              fontSize: '1.75rem', 
              fontWeight: '700', 
              color: '#1f2937', 
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              {userProfile.nom_user}
            </h2>

            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              backgroundColor: '#e8f5e9',
              color: '#1e5128',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              {getRoleDisplay(userProfile.role)}
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            padding: '1.5rem 0',
            borderTop: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            margin: '1.5rem 0'
          }}>
            <div style={{ textAlign: 'center' }}>
              {statsLoading ? (
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid #e5e7eb',
                  borderTopColor: '#1e5128',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 0.5rem'
                }}></div>
              ) : (
                <div style={{ 
                  fontSize: '2.25rem', 
                  fontWeight: '700', 
                  color: '#1e5128' 
                }}>
                  {projectsCount}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Projets
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              {statsLoading ? (
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid #e5e7eb',
                  borderTopColor: '#1e5128',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 0.5rem'
                }}></div>
              ) : (
                <div style={{ 
                  fontSize: '2.25rem', 
                  fontWeight: '700', 
                  color: '#1e5128' 
                }}>
                  {totalHours}h
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Séchage
              </div>
            </div>
          </div>

          {/* Bouton modifier */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-edit-profile"
            >
              ✏️ Modifier le profil
            </button>
          )}
        </div>

        {/* ========== INFORMATIONS PERSONNELLES ========== */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📧</span>
            Informations personnelles
          </h3>

          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Nom complet */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem'
              }}>
                Nom complet
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="nom_user"
                  value={formData.nom_user}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderLeft: '4px solid #1e5128',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Entrez votre nom complet"
                />
              ) : (
                <div style={{
                  padding: '1rem 1rem 1rem 1.25rem',
                  borderLeft: '4px solid #1e5128',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  color: '#1f2937'
                }}>
                  {userProfile.nom_user}
                </div>
              )}
            </div>

            {/* Entreprise */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem'
              }}>
                Nom de l'entreprise
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="entreprise"
                  value={formData.entreprise}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderLeft: '4px solid #1e5128',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Nom de l'entreprise"
                />
              ) : (
                <div style={{
                  padding: '1rem 1rem 1rem 1.25rem',
                  borderLeft: '4px solid #1e5128',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  color: '#1f2937'
                }}>
                  {userProfile.entreprise || "Takaz Engineering"}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem'
              }}>
                Email
              </label>
              <div style={{
                padding: '1rem 1rem 1rem 1.25rem',
                borderLeft: '4px solid #9ca3af',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                backgroundColor: '#f9fafb',
                fontSize: '1rem',
                color: '#6b7280'
              }}>
                {userProfile.email || userProfile.email_user}
              </div>
              {isEditing && (
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#9ca3af', 
                  marginTop: '0.5rem' 
                }}>
                  ⓘ L'email ne peut pas être modifié
                </p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem'
              }}>
                Téléphone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderLeft: '4px solid #1e5128',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="+229 XX XX XX XX"
                />
              ) : (
                <div style={{
                  padding: '1rem 1rem 1rem 1.25rem',
                  borderLeft: '4px solid #1e5128',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  color: '#1f2937'
                }}>
                  {userProfile.telephone || "Non renseigné"}
                </div>
              )}
            </div>

            {/* Poste */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem'
              }}>
                Poste
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="poste"
                  value={formData.poste}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderLeft: '4px solid #1e5128',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Ex: Administrateur système"
                />
              ) : (
                <div style={{
                  padding: '1rem 1rem 1rem 1.25rem',
                  borderLeft: '4px solid #1e5128',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  color: '#1f2937'
                }}>
                  {userProfile.poste || "Non renseigné"}
                </div>
              )}
            </div>
          </div>

          {/* Boutons en mode édition */}
          {isEditing && (
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '2rem' 
            }}>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-save"
                style={{
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? "⏳ Enregistrement..." : "💾 Enregistrer"}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-cancel-edit"
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                ❌ Annuler
              </button>
            </div>
          )}

          {/* Bouton déconnexion */}
          <div style={{ 
            marginTop: '2rem', 
            paddingTop: '2rem', 
            borderTop: '1px solid #e5e7eb' 
          }}>
            <button
              onClick={handleLogout}
              className="btn-logout"
            >
              🚪 Se déconnecter
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .btn-edit-profile {
          width: 100%;
          padding: 0.875rem;
          background-color: #1e5128;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background-color 0.2s;
        }
        
        .btn-edit-profile:hover {
          background-color: #2d6a3e;
        }
        
        .btn-save {
          flex: 1;
          padding: 0.875rem;
          background-color: #1e5128;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        
        .btn-save:hover:not(:disabled) {
          background-color: #2d6a3e;
        }
        
        .btn-cancel-edit {
          flex: 1;
          padding: 0.875rem;
          background-color: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        
        .btn-cancel-edit:hover:not(:disabled) {
          background-color: #d1d5db;
        }
        
        .btn-logout {
          width: 100%;
          padding: 0.875rem;
          background-color: #1e5128;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background-color 0.2s;
        }
        
        .btn-logout:hover {
          background-color: #163d1f;
        }
      `}</style>
    </div>
  );
}