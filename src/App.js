import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import RequireAuth from "./components/RequireAuth";

import Dashboard from "./components/dashboard";
import Projects from "./components/Projects";
import AddProject from "./components/AddProject";
import Sidebar from "./components/Sidebar";
import ProjectDetails from "./components/ProjectDetails";
import EditProject from "./components/EditProject";
import Controle from "./components/controle";
import Historique from "./components/Historique";
import Profil from "./components/Profil";
import GestionUtilisateurs from "./components/GestionUtilisateurs";

import Login from "./components/Login";
import Signup from "./components/Signup";

// ✅ Composant pour protéger les routes Admin uniquement
function RequireAdmin({ children }) {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Vérification stricte du rôle administrateur
  if (userProfile.role !== "administrateur") {
    console.warn("⚠️ Accès refusé - Rôle requis: administrateur, Rôle actuel:", userProfile.role);
    return <Navigate to="/dashboard" replace />;
  }

  console.log("✅ Accès Admin autorisé pour:", userProfile.nom_user);
  return children;
}

// ✅ Layout avec Sidebar pour éviter la répétition
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Redirection de la racine vers login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* ========================================
              ROUTES ACCESSIBLES À TOUS (authentifiés)
              ======================================== */}
          
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </RequireAuth>
            }
          />

          <Route
            path="/projets"
            element={
              <RequireAuth>
                <AppLayout>
                  <Projects />
                </AppLayout>
              </RequireAuth>
            }
          />

          <Route
            path="/projets/add"
            element={
              <RequireAuth>
                <AppLayout>
                  <AddProject />
                </AppLayout>
              </RequireAuth>
            }
          />

          <Route
            path="/projets/:projectId"
            element={
              <RequireAuth>
                <AppLayout>
                  <ProjectDetails />
                </AppLayout>
              </RequireAuth>
            }
          />

          <Route
            path="/projets/edit/:projectId"
            element={
              <RequireAuth>
                <AppLayout>
                  <EditProject />
                </AppLayout>
              </RequireAuth>
            }
          />

          <Route
            path="/historique"
            element={
              <RequireAuth>
                <AppLayout>
                  <Historique />
                </AppLayout>
              </RequireAuth>
            }
          />

          <Route
            path="/profil"
            element={
              <RequireAuth>
                <AppLayout>
                  <Profil />
                </AppLayout>
              </RequireAuth>
            }
          />

          {/* ========================================
              ROUTES ADMIN UNIQUEMENT
              ======================================== */}
          
          {/* ✅ Contrôle - Admin seulement */}
          <Route
            path="/controle/:projectName"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppLayout>
                    <Controle />
                  </AppLayout>
                </RequireAdmin>
              </RequireAuth>
            }
          />

          {/* ✅ Gestion utilisateurs - Admin seulement */}
          <Route
            path="/gestion-utilisateurs"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppLayout>
                    <GestionUtilisateurs />
                  </AppLayout>
                </RequireAdmin>
              </RequireAuth>
            }
          />

          {/* Route 404 - Redirection vers login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}