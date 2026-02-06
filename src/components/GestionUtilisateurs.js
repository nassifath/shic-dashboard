// src/pages/GestionUtilisateurs.jsx
import React, { useState, useEffect } from "react";
import API_BASE_URL from '../config/api';
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue, update, remove } from "firebase/database";
import { UserPlus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function GestionUtilisateurs() {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    nom_user: "",
    email_user: "",
    telephone: "",
    entreprise: "Takaz Engineering",
    poste: "",
    role: "utilisateur",
    password: ""
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const usersRef = ref(db, "utilisateurs");
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const usersList = Object.entries(data).map(([id, user]) => ({
            id,
            ...user
          }));
          setUsers(usersList);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("❌ Erreur chargement utilisateurs:", err);
        setError("Erreur lors du chargement des utilisateurs");
      } finally {
        setLoading(false);
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

  const resetForm = () => {
    setFormData({
      nom_user: "",
      email_user: "",
      telephone: "",
      entreprise: "Takaz Engineering",
      poste: "",
      role: "utilisateur",
      password: ""
    });
    setEditingUser(null);
    setError("");
  };

  // ✅ FONCTION CORRIGÉE - Appel au backend pour créer l'utilisateur SANS déconnecter l'admin
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFormLoading(true);

    try {
      // Validation
      if (!formData.nom_user || !formData.email_user || !formData.password) {
        setError("Le nom, l'email et le mot de passe sont obligatoires");
        setFormLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères");
        setFormLoading(false);
        return;
      }

      // Vérifier si l'email existe déjà
      const emailExists = users.some(u => u.email_user === formData.email_user);
      if (emailExists) {
        setError("❌ Cet email est déjà utilisé");
        setFormLoading(false);
        return;
      }

      console.log("🚀 Appel au backend pour créer l'utilisateur");

      // ✅ APPEL AU BACKEND (l'admin ne sera PAS déconnecté)
      const  response = await fetch(`${API_BASE_URL}/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email_user,
          password: formData.password,
          nom: formData.nom_user,
          telephone: formData.telephone,
          role: formData.role
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      console.log("✅ Utilisateur créé avec succès:", data);

      setSuccess(
        `✅ Utilisateur ${formData.nom_user} créé avec succès !\n\n` +
        `📧 Email: ${formData.email_user}\n` +
        `🔑 Mot de passe: ${formData.password}\n\n` +
        `🎉 Vous êtes resté connecté ! L'utilisateur peut maintenant se connecter.`
      );
      
      setShowModal(false);
      resetForm();
      
      setTimeout(() => setSuccess(""), 8000);

    } catch (err) {
      console.error("❌ Erreur création utilisateur:", err);
      
      // Messages d'erreur plus clairs
      if (err.message.includes("Failed to fetch")) {
        setError("❌ Impossible de contacter le serveur backend. Vérifiez que le serveur tourne sur http://localhost:5000");
      } else {
        setError("❌ " + err.message);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async (userId) => {
    setError("");
    setSuccess("");

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userRef = ref(db, `utilisateurs/${userId}`);
      await update(userRef, {
        nom_user: formData.nom_user || user.nom_user,
        telephone: formData.telephone || user.telephone,
        entreprise: formData.entreprise || user.entreprise,
        poste: formData.poste || user.poste,
        role: formData.role || user.role,
        date_modification: new Date().toISOString()
      });

      setSuccess(`✅ Utilisateur ${user.nom_user} mis à jour !`);
      setShowModal(false);
      resetForm();
      
      setTimeout(() => setSuccess(""), 3000);

    } catch (err) {
      console.error("❌ Erreur mise à jour utilisateur:", err);
      setError("❌ Erreur lors de la mise à jour: " + err.message);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    setError("");
    setSuccess("");
    
    try {
      await update(ref(db, `utilisateurs/${userId}`), {
        actif: !currentStatus,
        date_modification: new Date().toISOString()
      });

      setSuccess(`✅ Statut modifié avec succès !`);
      setTimeout(() => setSuccess(""), 2000);

    } catch (err) {
      console.error("❌ Erreur changement statut:", err);
      setError("❌ Erreur lors du changement de statut");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    
    if (!user) return;

    if (user.id === userProfile?.id || user.id === userProfile?.uid) {
      setError("❌ Vous ne pouvez pas supprimer votre propre compte");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${user.nom_user} ?\n\nATTENTION : Cette action est irréversible.`)) {
      return;
    }

    try {
      const userRef = ref(db, `utilisateurs/${userId}`);
      await remove(userRef);
      
      setSuccess(`✅ Utilisateur ${user.nom_user} supprimé de la base de données`);
      setTimeout(() => setSuccess(""), 3000);

    } catch (err) {
      console.error("❌ Erreur suppression utilisateur:", err);
      setError("❌ Erreur lors de la suppression: " + err.message);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      nom_user: user.nom_user,
      email_user: user.email_user,
      telephone: user.telephone || "",
      entreprise: user.entreprise || "Takaz Engineering",
      poste: user.poste || "",
      role: user.role,
      password: ""
    });
    setShowModal(true);
  };

  const getRoleBadge = (role) => {
    const styles = {
      administrateur: { bg: "#fef3c7", color: "#92400e", text: "Admin" },
      operateur: { bg: "#dbeafe", color: "#1e40af", text: "Opérateur" },
      utilisateur: { bg: "#e0e7ff", color: "#3730a3", text: "Utilisateur" }
    };

    const style = styles[role] || styles.utilisateur;

    return (
      <span style={{
        padding: "0.25rem 0.75rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "600",
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ 
      padding: "2rem", 
      backgroundColor: "#f5f5f5", 
      minHeight: "100vh",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* En-tête */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem"
      }}>
        <h1 style={{ 
          fontSize: "1.75rem", 
          fontWeight: "600", 
          color: "#2d3748", 
          margin: 0 
        }}>
          Gestion des Utilisateurs
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-create-user"
        >
          <UserPlus size={18} />
          Créer un utilisateur
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: "0.875rem 1rem",
          borderRadius: "4px",
          marginBottom: "1rem",
          backgroundColor: "#fee2e2",
          border: "1px solid #fecaca",
          color: "#991b1b",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          fontSize: "0.875rem"
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div style={{
          padding: "0.875rem 1rem",
          borderRadius: "4px",
          marginBottom: "1rem",
          backgroundColor: "#d1fae5",
          border: "1px solid #a7f3d0",
          color: "#065f46",
          fontSize: "0.875rem",
          whiteSpace: "pre-line"
        }}>
          {success}
        </div>
      )}

      {/* Info Box Backend */}
      <div style={{
        padding: "1rem",
        backgroundColor: "#dbeafe",
        border: "1px solid #93c5fd",
        borderRadius: "4px",
        marginBottom: "1.5rem",
        fontSize: "0.875rem",
        color: "#1e40af"
      }}>
        <strong>ℹ️ Nouveau système avec backend :</strong> Vous créez des comptes Firebase complets SANS vous déconnecter ! Les utilisateurs peuvent se connecter immédiatement.
      </div>

      {/* Tableau des utilisateurs */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        overflow: "hidden",
        border: "1px solid #e5e7eb"
      }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{
              width: "3rem",
              height: "3rem",
              border: "3px solid #e5e7eb",
              borderTopColor: "#1e5128",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto"
            }}></div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#fafafa" }}>
              <tr>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Téléphone</th>
                <th style={thStyle}>Rôle</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Date création</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr 
                  key={user.id} 
                  style={{ 
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: index % 2 === 0 ? "white" : "#fafafa"
                  }}
                >
                  <td style={tdStyle}>
                    <div>
                      <div style={{ fontWeight: "500", color: "#2d3748" }}>
                        {user.nom_user}
                      </div>
                      {user.poste && (
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                          {user.poste}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                      {user.email_user}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {user.telephone || "-"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {getRoleBadge(user.role)}
                  </td>
                  <td style={tdStyle}>
                    {user.actif !== false ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        color: "#059669",
                        fontSize: "0.875rem",
                        fontWeight: "500"
                      }}>
                        <CheckCircle size={16} />
                        Actif
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        color: "#dc2626",
                        fontSize: "0.875rem",
                        fontWeight: "500"
                      }}>
                        <XCircle size={16} />
                        Inactif
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {user.date_creation
                        ? new Date(user.date_creation).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })
                        : "-"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start" }}>
                      <button
                        onClick={() => openEditModal(user)}
                        className="btn-edit"
                        title="Modifier"
                      >
                        Modifier
                      </button>
                      
                      <button
                        onClick={() => handleToggleStatus(user.id, user.actif !== false)}
                        className="btn-toggle-status"
                        data-active={user.actif !== false}
                        title={user.actif !== false ? "Désactiver" : "Activer"}
                      >
                        {user.actif !== false ? "Désactiver" : "Activer"}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === userProfile?.id || user.id === userProfile?.uid}
                        className={user.id === userProfile?.id || user.id === userProfile?.uid ? "btn-delete-disabled" : "btn-delete"}
                        title="Supprimer"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Créer/Modifier */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "2rem",
            width: "90%",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
          }}>
            <h2 style={{ 
              marginBottom: "1.5rem", 
              fontSize: "1.5rem", 
              fontWeight: "600",
              color: "#2d3748"
            }}>
              {editingUser ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            </h2>

            <form onSubmit={editingUser ? (e) => { e.preventDefault(); handleUpdateUser(editingUser.id); } : handleCreateUser}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Nom complet *</label>
                  <input
                    type="text"
                    name="nom_user"
                    value={formData.nom_user}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    type="email"
                    name="email_user"
                    value={formData.email_user}
                    onChange={handleChange}
                    required
                    disabled={!!editingUser}
                    style={{
                      ...inputStyle,
                      backgroundColor: editingUser ? "#f9fafb" : "white",
                      cursor: editingUser ? "not-allowed" : "text"
                    }}
                    placeholder="email@example.com"
                  />
                  {editingUser && (
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      L'email ne peut pas être modifié
                    </p>
                  )}
                </div>

                {!editingUser && (
                  <div>
                    <label style={labelStyle}>Mot de passe *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                      placeholder="Minimum 6 caractères"
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="+229 XX XX XX XX"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Entreprise</label>
                  <input
                    type="text"
                    name="entreprise"
                    value={formData.entreprise}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Takaz Engineering"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Poste</label>
                  <input
                    type="text"
                    name="poste"
                    value={formData.poste}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Ex: Opérateur, Développeur"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Rôle *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  >
                    <option value="utilisateur">Utilisateur</option>
                    <option value="administrateur">Administrateur</option>
                  </select>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
                    ℹ️ Les utilisateurs n'ont pas accès au Contrôle et à la Gestion des utilisateurs
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-submit"
                >
                  {formLoading ? "⏳ Traitement..." : (editingUser ? "💾 Enregistrer" : "✅ Créer")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={formLoading}
                  className="btn-cancel"
                >
                  ❌ Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .btn-create-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background-color: #1e5128;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .btn-create-user:hover {
          background-color: #163d1f;
        }
        
        .btn-edit {
          padding: 0.5rem 0.875rem;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .btn-edit:hover {
          background-color: #059669;
        }
        
        .btn-toggle-status {
          padding: 0.5rem 0.875rem;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .btn-toggle-status[data-active="true"] {
          background-color: #f59e0b;
        }
        
        .btn-toggle-status[data-active="true"]:hover {
          background-color: #d97706;
        }
        
        .btn-toggle-status[data-active="false"] {
          background-color: #10b981;
        }
        
        .btn-toggle-status[data-active="false"]:hover {
          background-color: #059669;
        }
        
        .btn-delete {
          padding: 0.5rem 0.875rem;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .btn-delete:hover {
          background-color: #dc2626;
        }
        
        .btn-delete-disabled {
          padding: 0.5rem 0.875rem;
          background-color: #e5e7eb;
          color: #9ca3af;
          border: none;
          border-radius: 4px;
          cursor: not-allowed;
          font-size: 0.8rem;
          font-weight: 500;
          opacity: 0.6;
        }
        
        .btn-submit {
          flex: 1;
          padding: 0.75rem;
          background-color: #1e5128;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .btn-submit:hover:not(:disabled) {
          background-color: #163d1f;
        }
        
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-cancel {
          flex: 1;
          padding: 0.75rem;
          background-color: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .btn-cancel:hover:not(:disabled) {
          background-color: #d1d5db;
        }
        
        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

const thStyle = {
  padding: "0.875rem 1rem",
  textAlign: "left",
  fontSize: "0.75rem",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "2px solid #e5e7eb"
};

const tdStyle = {
  padding: "0.875rem 1rem",
  fontSize: "0.875rem"
};

const labelStyle = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "0.5rem"
};

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: "4px",  
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s"
}; 