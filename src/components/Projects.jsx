import React, { useEffect, useState } from "react";
import "../styles/projects.css";
import { useNavigate } from "react-router-dom";
import { db, ref, onValue, update } from "../firebase";
import { useAuth } from "../AuthContext"; // ✅ Import du contexte d'authentification

export default function Projects() {
  const { userProfile } = useAuth(); // ✅ Récupérer l'utilisateur connecté
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState({});
  const [filter, setFilter] = useState("tous");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const navigate = useNavigate();

  // Normalisation statuts
  const normalize = (txt) =>
    txt
      ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : "";

  const stdStatus = (txt) => {
    if (!txt) return "";
    return normalize(txt)
      .replace(/ /g, "")
      .replace(/-/g, "")
      .replace(/_+/g, "");
  };

  // VÉRIFIER S'IL Y A UN PROJET EN COURS
  const checkActiveProject = async () => {
    try {
      // Utiliser les projets déjà chargés dans le state
      for (const project of projects) {
        if (project.id.startsWith("_")) continue;
        
        const statut = project.statut || project.status;
        
        if (statut === "en_cours") {
          return {
            hasActiveProject: true,
            activeProjectId: project.id,
            activeProjectName: project.nom_projet || project.name || "Projet sans nom"
          };
        }
      }

      return { hasActiveProject: false, activeProjectId: null, activeProjectName: null };
    } catch (error) {
      console.error("Erreur vérification projet actif:", error);
      return { hasActiveProject: false, activeProjectId: null, activeProjectName: null };
    }
  };

  // ARCHIVER avec validation
  const archiveProject = async (projectId, projectStatut) => {
    // Empêcher l'archivage d'un projet en cours
    if (stdStatus(projectStatut) === "encours") {
      alert("⚠️ Impossible d'archiver un projet en cours.\n\nVeuillez d'abord arrêter le projet avant de l'archiver.");
      return;
    }

    const confirmation = window.confirm(
      "Êtes-vous sûr de vouloir archiver ce projet ?\n\nIl sera déplacé dans la section 'Archivés'."
    );

    if (confirmation) {
      try {
        console.log("🔍 Début archivage:", projectId, projectStatut);
        
        const projectRef = ref(db, `projets_sechage/${projectId}`);
        
        const updates = {
          archived: true,
          statut_avant_archivage: projectStatut,
          date_archivage: new Date().toISOString(),
        };
        
        await update(projectRef, updates);
        console.log("✅ Archivage réussi");
        alert("✅ Projet archivé avec succès !");
      } catch (err) {
        console.error("❌ Erreur complète archivage :", err);
        alert(`❌ Une erreur est survenue lors de l'archivage: ${err.message}`);
      }
    }
  };

  // RESTAURER
  const restoreProject = async (projectId) => {
    const confirmation = window.confirm(
      "Voulez-vous restaurer ce projet ?\n\nIl redeviendra actif dans la liste des projets."
    );

    if (confirmation) {
      try {
        console.log("🔍 Début restauration:", projectId);
        
        const project = projects.find(p => p.id === projectId);
        
        if (project) {
          const statutOriginal = project.statut_avant_archivage || project.statut || "planifie";
          
          const projectRef = ref(db, `projets_sechage/${projectId}`);
          const updates = {
            archived: false,
            statut: statutOriginal,
            statut_avant_archivage: null,
          };
          
          await update(projectRef, updates);
          console.log("✅ Restauration réussie");
          alert("✅ Projet restauré avec succès !");
        } else {
          console.error("❌ Projet introuvable dans le state");
          alert("❌ Projet introuvable.");
        }
      } catch (err) {
        console.error("❌ Erreur complète restauration :", err);
        alert(`❌ Une erreur est survenue lors de la restauration: ${err.message}`);
      }
    }
  };

  // MODIFIER avec validation - Bloquer si en cours OU terminé
  const handleEditProject = async (e, projectId, projectStatut) => {
    e.stopPropagation();

    const statutNorm = stdStatus(projectStatut);

    // Bloquer la modification si le projet est en cours
    if (statutNorm === "encours") {
      alert(
        "⚠️ Impossible de modifier un projet en cours.\n\n" +
        "Veuillez d'abord arrêter ou mettre en pause le projet depuis la page de contrôle avant de le modifier."
      );
      return;
    }

    // Bloquer la modification si le projet est terminé
    if (statutNorm === "termine") {
      alert(
        "⚠️ Impossible de modifier un projet terminé.\n\n" +
        "Les projets terminés ne peuvent plus être modifiés pour préserver l'historique."
      );
      return;
    }

    navigate(`/projets/edit/${projectId}`);
  };

  // ACCÉDER À LA PAGE DE CONTRÔLE avec validation
  const handleAccessControl = async (projectId, projectStatut) => {
    const statutNorm = stdStatus(projectStatut);
    
    // Bloquer l'accès aux projets terminés
    if (statutNorm === "termine") {
      alert(
        "⚠️ Impossible d'accéder au contrôle d'un projet terminé.\n\n" +
        "Les projets terminés ne peuvent plus être contrôlés.\n" +
        "Utilisez le bouton 'Voir' pour consulter les détails du projet."
      );
      return;
    }

    // Si le projet est déjà en cours, on peut y accéder
    if (statutNorm === "encours") {
      navigate(`/controle/${projectId}`);
      return;
    }

    // Vérifier s'il y a un autre projet en cours
    const activeCheck = await checkActiveProject();
    
    if (activeCheck.hasActiveProject && activeCheck.activeProjectId !== projectId) {
      alert(
        `⚠️ Un autre projet est déjà en cours !\n\n` +
        `Projet actif : "${activeCheck.activeProjectName}"\n\n` +
        `Vous devez terminer ou arrêter ce projet avant d'en contrôler un autre.`
      );
      return;
    }

    // Autoriser l'accès
    navigate(`/controle/${projectId}`);
  };

  // Chargers utilisateurs + projets
  useEffect(() => {
    const usersRef = ref(db, "utilisateurs");
    const projectsRef = ref(db, "projets_sechage");

    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const filteredUsers = Object.fromEntries(
          Object.entries(data).filter(([key]) => !key.startsWith("_"))
        );
        setUsers(filteredUsers);
      }
    });

    onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .filter(([key]) => !key.startsWith("_"))
          .map(([id, val]) => ({ id, ...val }));

        setProjects(list);
      } else setProjects([]);
    });
  }, []);

  // Timer progression - vérifier toutes les secondes
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateProgress = (p) => {
    const statut = p.statut || p.status;
    const dateDebut = p.date_debut || p.startDate;
    const duree = p.duree_prevue || p.duration;

    if (p.archived) return 0;
    if (statut === "termine") return 100;
    if (statut !== "en_cours" || !dateDebut || !duree) return 0;

    const start = new Date(dateDebut).getTime();
    const now = currentTime;
    const total = duree * 60 * 60 * 1000;
    const elapsed = now - start;

    const progress = Math.min((elapsed / total) * 100, 100);
    
    // Si la progression atteint 100%, mettre à jour le statut à "terminé"
    if (progress >= 100 && statut === "en_cours") {
      updateProject(p.id, {
        statut: "termine",
        progression: 100,
        date_fin: new Date().toISOString()
      });
      return 100;
    }

    return progress.toFixed(1);
  };

  // Fonction pour mettre à jour un projet
  const updateProject = async (projectId, updates) => {
    try {
      await update(ref(db, `projets_sechage/${projectId}`), updates);
      console.log("✅ Projet mis à jour automatiquement:", updates);
    } catch (error) {
      console.error("❌ Erreur mise à jour automatique:", error);
    }
  };

  // Filtrage
  const filteredProjects = projects.filter((p) => {
    const statut = stdStatus(p.statut || p.status);

    if (filter === "tous") return !p.archived;
    if (filter === "archive") return p.archived;

    return statut === stdStatus(filter) && !p.archived;
  });

  const handleAddProject = async () => {
    // Vérifier s'il y a déjà un projet en cours
    const activeCheck = await checkActiveProject();
    
    if (activeCheck.hasActiveProject) {
      alert(
        `⚠️ Un projet est déjà en cours !\n\n` +
        `Projet actif : "${activeCheck.activeProjectName}"\n\n` +
        `Vous devez terminer ou arrêter ce projet avant d'en créer un nouveau.`
      );
      return;
    }

    navigate("/projets/add");
  };

  // ✅ Fonction pour obtenir les initiales
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // -------------------------------------
  // AFFICHAGE
  // -------------------------------------
  return (
    <div className="projects-container">
      {/* HEADER */}
      <div className="projects-header">
        <h1 className="projects-title">Projets de Séchage</h1>

        {/* ✅ Affichage de l'utilisateur connecté */}
        <div className="projects-user-section">
          <div className="user-box">
            <div className="avatar">
              {userProfile ? getInitials(userProfile.nom_user) : "?"}
            </div>
            <div className="user-info">
              <strong>{userProfile ? userProfile.nom_user : "Chargement..."}</strong>
              <p>{userProfile ? (userProfile.role === "administrateur" ? "Administrateur" : "Utilisateur") : "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="projects-tabs-line">
        <div className="projects-tabs">
          <button className={filter === "tous" ? "active" : ""} onClick={() => setFilter("tous")}>
            Tous ({projects.filter((p) => !p.archived).length})
          </button>

          <button className={filter === "en_cours" ? "active" : ""} onClick={() => setFilter("en_cours")}>
            En cours ({projects.filter(
              (p) => stdStatus(p.statut || p.status) === "encours" && !p.archived
            ).length})
          </button>

          <button className={filter === "termine" ? "active" : ""} onClick={() => setFilter("termine")}>
            Terminés ({projects.filter(
              (p) => stdStatus(p.statut || p.status) === "termine" && !p.archived
            ).length})
          </button>

          <button className={filter === "planifie" ? "active" : ""} onClick={() => setFilter("planifie")}>
            Planifiés ({projects.filter(
              (p) => stdStatus(p.statut || p.status) === "planifie" && !p.archived
            ).length})
          </button>

          <button className={filter === "archive" ? "active" : ""} onClick={() => setFilter("archive")}>
            Archivés ({projects.filter((p) => p.archived).length})
          </button>
        </div>

        <button className="btn-new-inline" onClick={handleAddProject}>
          Créer un nouveau projet
        </button>
      </div>

      {/* LISTE DES PROJETS */}
      <div className="projects-list">
        {filteredProjects.length === 0 ? (
          <div className="no-projects">
            <p>Aucun projet trouvé pour ce filtre</p>
          </div>
        ) : (
          filteredProjects.map((p) => {
            const nom = p.nom_projet || p.name;
            const produit = p.type_produit || p.productType || "—";
            const quantite = p.quantite_produit || p.quantity || "—";
            const tempMin = p.temperature_min || p.tempMin || "—";
            const tempMax = p.temperature_max || p.tempMax || "—";
            const energie = p.source_energie_appoint || p.energySource || "—";
            const statut = p.statut || p.status;
            const statutNorm = stdStatus(statut);
            const dateDebut = p.date_debut || p.startDate;
            const progress = calculateProgress(p);

            const isEnCours = statutNorm === "encours";
            const isTermine = statutNorm === "termine";
            const isEditDisabled = isEnCours || isTermine;

            return (
              <div
                key={p.id}
                className="project-card"
                onClick={() => handleAccessControl(p.id, statut)}
                style={{ cursor: "pointer" }}
              >
                <div className="project-card-header">
                  <h3>{nom}</h3>

                  <span
                    className={`status-badge ${
                      p.archived
                        ? "archived"
                        : statutNorm === "encours"
                        ? "in-progress"
                        : statutNorm === "termine"
                        ? "done"
                        : "planned"
                    }`}
                  >
                    {p.archived
                      ? "Archivé"
                      : statutNorm === "encours"
                      ? "En cours"
                      : statutNorm === "termine"
                      ? "Terminé"
                      : "Planifié"}
                  </span>
                </div>

                <p className="start-date">
                  Démarré le{" "}
                  {dateDebut
                    ? new Date(dateDebut).toLocaleDateString("fr-FR")
                    : "--"}
                </p>

                <div className="project-info">
                  <p><strong>Produit :</strong> {produit}</p>
                  <p><strong>Quantité :</strong> {quantite} kg</p>
                  <p>
                    <strong>Température :</strong>{" "}
                    {tempMin !== "—" && tempMax !== "—"
                      ? `${tempMin}–${tempMax}°C`
                      : "—"}
                  </p>
                  <p><strong>Énergie appoint :</strong> {energie}</p>
                </div>

                {!p.archived && (
                  <div className="progress-section">
                    <div className="progress-header">
                      <span>Progression</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                          background:
                            statutNorm === "termine" ? "#2e7d32" : "#2196f3",
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="project-actions">
                  {!p.archived && (
                    <>
                      <button
                        className="btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projets/${p.id}`);
                        }}
                      >
                        👁️ Voir
                      </button>

                      <button
                        className={`btn-edit ${isEditDisabled ? "btn-disabled" : ""}`}
                        onClick={(e) => handleEditProject(e, p.id, statut)}
                        disabled={isEditDisabled}
                        title={
                          isEnCours
                            ? "Impossible de modifier un projet en cours"
                            : isTermine
                            ? "Impossible de modifier un projet terminé"
                            : "Modifier le projet"
                        }
                      >
                        ✏️ Modifier
                      </button>

                      <button
                        className={`btn-delete ${isEnCours ? "btn-disabled" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveProject(p.id, statut);
                        }}
                        disabled={isEnCours}
                        title={
                          isEnCours
                            ? "Impossible d'archiver un projet en cours"
                            : "Archiver le projet"
                        }
                      >
                        🗄️ Archiver
                      </button>
                    </>
                  )}

                  {p.archived && (
                    <button
                      className="btn-restore"
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreProject(p.id);
                      }}
                    >
                      ♻️ Restaurer
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}