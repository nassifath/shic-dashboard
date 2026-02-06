import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Folder, Settings, Clock, User, Users, Menu, X } from "lucide-react";
import logo from "../assets/images/Capture.PNG";
import { useAuth } from "../AuthContext";
import "../styles/dashboard.css";
import "../styles/sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Vérifier si l'utilisateur est administrateur
  const isAdmin = userProfile?.role === "administrateur";

  console.log("🎭 Sidebar - Role:", userProfile?.role, "| Est Admin:", isAdmin);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const isActive = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") {
      return "menu-item active no-underline";
    }

    if (path === "/projets" && (
      location.pathname === "/projets" ||
      location.pathname.startsWith("/projets/add") ||
      location.pathname.startsWith("/projets/edit")
    )) {
      return "menu-item active no-underline";
    }

    if (path === "/controle" && location.pathname.startsWith("/controle")) {
      return "menu-item active no-underline";
    }

    if (path === "/historique" && location.pathname.startsWith("/historique")) {
      return "menu-item active no-underline";
    }

    if (path === "/profil" && location.pathname.startsWith("/profil")) {
      return "menu-item active no-underline";
    }

    if (path === "/gestion-utilisateurs" && location.pathname.startsWith("/gestion-utilisateurs")) {
      return "menu-item active no-underline";
    }

    return "menu-item no-underline";
  };

  const handleControleClick = (e) => {
    e.preventDefault();
    closeSidebar();
    alert("⚠️ Accédez au contrôle depuis la page d'un projet en cours.\n\nAllez dans 'Projets' → Sélectionnez un projet → Cliquez sur 'Contrôler'");
  };

  return (
    <>
      {/* Bouton Hamburger pour Mobile */}
      <button className="hamburger-btn" onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay pour fermer en cliquant à l'extérieur */}
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="logo">
          <img src={logo} alt="Takaz" className="logo-img" />
        </div>

        {/* ==========================================
            MENU ACCESSIBLE À TOUS LES UTILISATEURS
            ========================================== */}
        
        <Link to="/dashboard" className={isActive("/dashboard")} onClick={closeSidebar}>
          <Home size={20} /> <span>Tableau de bord</span>
        </Link>

        <Link to="/projets" className={isActive("/projets")} onClick={closeSidebar}>
          <Folder size={20} /> <span>Projets</span>
        </Link>

        {/* ==========================================
            MENU RÉSERVÉ AUX ADMINISTRATEURS UNIQUEMENT
            ========================================== */}
        
        {/* 🔒 CONTRÔLE - Visible uniquement pour ADMIN */}
        {isAdmin && (
          <div 
            className={isActive("/controle")}
            onClick={handleControleClick}
            style={{ 
              cursor: "pointer",
              opacity: 0.8
            }}
            title="Accédez au contrôle depuis un projet en cours"
          >
            <Settings size={20} /> 
            <span>Contrôle</span>
          </div>
        )}

        {/* ==========================================
            MENU ACCESSIBLE À TOUS LES UTILISATEURS
            ========================================== */}

        <Link to="/historique" className={isActive("/historique")} onClick={closeSidebar}>
          <Clock size={20} /> <span>Historique</span>
        </Link>

        {/* 🔒 GESTION UTILISATEURS - Visible uniquement pour ADMIN */}
        {isAdmin && (
          <Link to="/gestion-utilisateurs" className={isActive("/gestion-utilisateurs")} onClick={closeSidebar}>
            <Users size={20} /> 
            <span>Utilisateurs</span>
          </Link>
        )}

        <Link to="/profil" className={isActive("/profil")} onClick={closeSidebar}>
          <User size={20} /> <span>Profil</span>
        </Link>

        {/* ==========================================
            BADGE DE RÔLE EN BAS DU MENU
            ========================================== */}
        <div style={{
          marginTop: "auto",
          padding: "1rem",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center"
        }}>
        </div>
      </aside>
    </>
  );
}