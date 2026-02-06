import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/controle.css";
import { db, ref, onValue, update } from "../firebase";
import { get } from "firebase/database";

export default function Controle() {
  const { projectName } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("automatique");
  const [etatSechage, setEtatSechage] = useState(false);
  const [etatResistance, setEtatResistance] = useState(false);
  const [etatGaz, setEtatGaz] = useState(false);
  const [etatAucune, setEtatAucune] = useState(false);
  const [ventilation, setVentilation] = useState(0);
  const [projectDataName, setProjectDataName] = useState("");
  
  const [statut, setStatut] = useState("planifie");
  const [progression, setProgression] = useState(0);
  const [dateDebut, setDateDebut] = useState(null);
  const [dureePrevu, setDureePrevu] = useState(0);
  const [tempsPause, setTempsPause] = useState(0);
  const [sechageActif, setSechageActif] = useState(false);
  const [sourceEnergieProjet, setSourceEnergieProjet] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [progressionAvantPause, setProgressionAvantPause] = useState(0); // ✅ NOUVEAU

  const projectId = projectName;
  const commandePath = `commandes/${projectId}`;
  const projectPath = `projets_sechage/${projectId}`;

  const normalizeStatus = (status) => {
    if (!status) return "planifie";
    const normalized = status.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "")
      .replace(/-/g, "")
      .replace(/_+/g, "");
    
    return normalized;
  };

  const checkOtherActiveProject = async () => {
    try {
      const projectsRef = ref(db, "projets_sechage");
      const snapshot = await get(projectsRef);

      if (!snapshot.exists()) {
        return { hasOtherActiveProject: false, otherProjectName: null };
      }

      const projetsData = snapshot.val();
      
      for (const [otherProjectId, project] of Object.entries(projetsData)) {
        if (otherProjectId.startsWith("_")) continue;
        if (otherProjectId === projectId) continue;
        
        const statut = project.statut || project.status;
        
        if (statut === "en_cours") {
          return {
            hasOtherActiveProject: true,
            otherProjectName: project.nom_projet || project.name || "Projet sans nom"
          };
        }
      }

      return { hasOtherActiveProject: false, otherProjectName: null };
    } catch (error) {
      console.error("Erreur vérification autre projet actif:", error);
      return { hasOtherActiveProject: false, otherProjectName: null };
    }
  };

  const writeCommand = async (updates) => {
    const timestamp = new Date().toISOString();
    
    const commandeData = {
      timestamp: timestamp,
      ...updates
    };

    try {
      const commandeRef = ref(db, commandePath);
      await update(commandeRef, commandeData);
      console.log("✅ Commande écrite:", commandeData);
    } catch (error) {
      console.error("❌ Erreur écriture commande:", error);
      console.error("Détails de l'erreur:", error.message);
      alert(`Erreur lors de l'enregistrement de la commande: ${error.message}`);
    }
  };

  const updateProject = async (updates) => {
    try {
      await update(ref(db, projectPath), updates);
      console.log("✅ Projet mis à jour:", updates);
    } catch (error) {
      console.error("❌ Erreur mise à jour projet:", error);
      alert("Erreur lors de la mise à jour du projet");
    }
  };

  const useResistance = sourceEnergieProjet.toLowerCase().includes("résistance") || 
                       sourceEnergieProjet.toLowerCase().includes("resistance") ||
                       sourceEnergieProjet.toLowerCase().includes("electrique") ||
                       sourceEnergieProjet.toLowerCase().includes("électrique");
  
  const useGaz = sourceEnergieProjet.toLowerCase().includes("gaz");
  
  const useAucune = sourceEnergieProjet.toLowerCase().includes("aucune");

  useEffect(() => {
    if (!initialLoadDone || !sourceEnergieProjet) return;

    if (useResistance && !etatResistance) {
      setEtatResistance(true);
      setEtatGaz(false);
      setEtatAucune(false);
      writeCommand({ 
        etat_resistance: true, 
        etat_gaz: false,
        etat_aucune: false
      });
      console.log("✅ Résistance activée automatiquement");
    } else if (useGaz && !etatGaz) {
      setEtatGaz(true);
      setEtatResistance(false);
      setEtatAucune(false);
      writeCommand({ 
        etat_gaz: true, 
        etat_resistance: false,
        etat_aucune: false
      });
      console.log("✅ Gaz activé automatiquement");
    } else if (useAucune && !etatAucune) {
      setEtatAucune(true);
      setEtatResistance(false);
      setEtatGaz(false);
      writeCommand({ 
        etat_aucune: true,
        etat_resistance: false, 
        etat_gaz: false
      });
      console.log("✅ Mode 'Aucune source' activé automatiquement");
    }
  }, [initialLoadDone, sourceEnergieProjet]);

  // ✅ MODIFICATION: Calcul de progression avec prise en compte de la pause
  useEffect(() => {
    const statusNormalized = normalizeStatus(statut);
    
    if (statusNormalized !== "encours" || !dateDebut || dureePrevu <= 0) return;

    const interval = setInterval(() => {
      const debut = new Date(dateDebut);
      const maintenant = new Date();
      const tempsEcoule = (maintenant - debut) / (1000 * 60 * 60);
      
      // ✅ Ajouter la progression avant pause au calcul
      const progressionCalculee = Math.min(
        progressionAvantPause + ((tempsEcoule / dureePrevu) * 100), 
        100
      );

      setProgression(progressionCalculee);

      if (progressionCalculee >= 100) {
        setStatut("termine");
        setSechageActif(false);
        updateProject({
          statut: "termine",
          progression: 100,
          date_fin: new Date().toISOString()
        });
      } else {
        updateProject({ progression: progressionCalculee });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [statut, dateDebut, dureePrevu, progressionAvantPause]);

  useEffect(() => {
    const projectRef = ref(db, projectPath);
    const commandeRef = ref(db, commandePath);

    const unsubProject = onValue(projectRef, (snap) => {
      const data = snap.val();
      if (data) {
        setProjectDataName(data.nom_projet || data.name || projectId);
        const currentStatut = data.statut || data.status || "planifie";
        setStatut(currentStatut);
        setProgression(data.progression || 0);
        setDateDebut(data.date_debut || data.startDate || null);
        setDureePrevu(data.duree_prevue || data.duration || 0);
        setTempsPause(data.temps_pause || 0);
        
        // ✅ NOUVEAU: Récupérer la progression avant pause
        setProgressionAvantPause(data.progression_avant_pause || 0);
        
        const energieSource = data.source_energie_appoint || data.energySource || "";
        setSourceEnergieProjet(energieSource);
        
        const statusNorm = normalizeStatus(currentStatut);
        setSechageActif(statusNorm === "encours");

        if (statusNorm === "termine") {
          setTimeout(() => {
            alert("✅ Ce projet est maintenant terminé. Vous allez être redirigé vers la liste des projets.");
            navigate("/projets");
          }, 2000);
        }
      }
    }, (error) => {
      console.error("❌ Erreur lecture projet:", error);
      setLoading(false);
    });

    const unsubCommande = onValue(commandeRef, (snap) => {
      const data = snap.val();
      
      if (data) {
        setMode(data.mode || "automatique");
        setEtatSechage(Boolean(data.etat_demarrage));
        setEtatResistance(Boolean(data.etat_resistance));
        setEtatGaz(Boolean(data.etat_gaz));
        setEtatAucune(Boolean(data.etat_aucune));
        setVentilation(Number(data.ventilation) || 0);
      }
      
      setLoading(false);
      setInitialLoadDone(true);
    }, (error) => {
      console.error("❌ Erreur lecture commande:", error);
      setLoading(false);
    });

    return () => {
      unsubProject();
      unsubCommande();
    };
  }, [projectId, commandePath, projectPath]);

  const toggleMode = async (newMode) => {
    const statusNormalized = normalizeStatus(statut);
    if (sechageActif && statusNormalized !== "enpause") {
      alert("⚠️ Impossible de changer de mode pendant le séchage. Mettez en pause d'abord.");
      return;
    }
    
    setMode(newMode);
    
    if (newMode === "automatique") {
      setEtatSechage(false);
      setEtatResistance(false);
      setEtatGaz(false);
      setEtatAucune(false);
      setVentilation(0);
      
      await writeCommand({
        mode: newMode,
        etat_demarrage: false,
        etat_resistance: false,
        etat_gaz: false,
        etat_aucune: false,
        ventilation: 0
      });
    } else {
      await writeCommand({ mode: newMode });
    }
  };

  const toggleField = async (field, value) => {
    if (mode === "automatique") {
      if (field !== "etat_demarrage") {
        return;
      }
    }
    
    const statusNormalized = normalizeStatus(statut);
    if (sechageActif && statusNormalized !== "enpause") return;

    let updates = {};

    if (field === "etat_resistance" && value) {
      setEtatResistance(true);
      setEtatGaz(false);
      setEtatAucune(false);
      updates = { etat_resistance: true, etat_gaz: false, etat_aucune: false };
    } else if (field === "etat_gaz" && value) {
      setEtatGaz(true);
      setEtatResistance(false);
      setEtatAucune(false);
      updates = { etat_gaz: true, etat_resistance: false, etat_aucune: false };
    } else if (field === "etat_aucune" && value) {
      setEtatAucune(true);
      setEtatResistance(false);
      setEtatGaz(false);
      updates = { etat_aucune: true, etat_resistance: false, etat_gaz: false };
    } else if (field === "etat_resistance" && !value) {
      if (!etatGaz && !etatAucune) {
        alert("⚠️ Vous devez avoir soit la Résistance, soit le Gaz, soit Aucune activé");
        return;
      }
      setEtatResistance(false);
      updates = { etat_resistance: false };
    } else if (field === "etat_gaz" && !value) {
      if (!etatResistance && !etatAucune) {
        alert("⚠️ Vous devez avoir soit la Résistance, soit le Gaz, soit Aucune activé");
        return;
      }
      setEtatGaz(false);
      updates = { etat_gaz: false };
    } else if (field === "etat_aucune" && !value) {
      if (!etatResistance && !etatGaz) {
        alert("⚠️ Vous devez avoir soit la Résistance, soit le Gaz, soit Aucune activé");
        return;
      }
      setEtatAucune(false);
      updates = { etat_aucune: false };
    } else if (field === "etat_demarrage") {
      setEtatSechage(value);
      updates = { etat_demarrage: value };
    }

    await writeCommand(updates);
  };

  const changeVentilation = async (value) => {
    const statusNormalized = normalizeStatus(statut);
    if (mode === "automatique" || (sechageActif && statusNormalized !== "enpause")) return;
    
    let v = parseInt(value, 10);
    v = Math.round(v / 5) * 5;
    v = Math.max(0, Math.min(100, v));
    
    setVentilation(v);
    await writeCommand({ ventilation: v });
  };

  const incrementVentilation = async () => {
    const statusNormalized = normalizeStatus(statut);
    if (mode === "automatique" || (sechageActif && statusNormalized !== "enpause")) return;
    const newValue = Math.min(ventilation + 5, 100);
    setVentilation(newValue);
    await writeCommand({ ventilation: newValue });
  };

  const decrementVentilation = async () => {
    const statusNormalized = normalizeStatus(statut);
    if (mode === "automatique" || (sechageActif && statusNormalized !== "enpause")) return;
    const newValue = Math.max(ventilation - 5, 0);
    setVentilation(newValue);
    await writeCommand({ ventilation: newValue });
  };

  const commencerSechage = async () => {
    const statusNormalized = normalizeStatus(statut);
    
    if (statusNormalized === "encours") {
      alert("Le séchage est déjà en cours !");
      return;
    }

    if (statusNormalized === "termine") {
      alert(
        "⚠️ Ce projet est terminé.\n\n" +
        "Les projets terminés ne peuvent plus être contrôlés.\n" +
        "Veuillez retourner à la liste des projets."
      );
      return;
    }

    const otherProjectCheck = await checkOtherActiveProject();
    if (otherProjectCheck.hasOtherActiveProject) {
      alert(
        `⚠️ Impossible de démarrer ce projet !\n\n` +
        `Un autre projet est déjà en cours : "${otherProjectCheck.otherProjectName}"\n\n` +
        `Vous devez d'abord terminer ou arrêter l'autre projet avant de démarrer celui-ci.`
      );
      return;
    }

    // ✅ SEUL LE DÉMARRAGE EST OBLIGATOIRE
    if (!etatSechage) {
      alert("⚠️ Veuillez d'abord activer le 'Démarrage du séchage'");
      return;
    }

    // ✅ TOUT LE RESTE EST FACULTATIF (résistance, gaz, ventilation)

    const dateDebutSechage = new Date().toISOString();

    setStatut("en_cours");
    setDateDebut(dateDebutSechage);
    setSechageActif(true);

    await updateProject({
      statut: "en_cours",
      date_debut: dateDebutSechage,
      startDate: dateDebutSechage,
      progression: 0,
      temps_pause: 0,
      progression_avant_pause: 0
    });

    alert("✅ Séchage démarré avec succès !");
  };

  const arreterSechage = async () => {
    const confirmation = window.confirm(
      "Voulez-vous mettre en pause le séchage ?\n\nVous pourrez modifier les paramètres et reprendre le séchage."
    );
    if (!confirmation) return;

    // ✅ MODIFICATION: Sauvegarder la progression actuelle avant la pause
    const debut = new Date(dateDebut);
    const maintenant = new Date();
    const tempsEcouleEnHeures = (maintenant - debut) / (1000 * 60 * 60);
    const nouveauTempsPause = tempsPause + tempsEcouleEnHeures;

    setStatut("en_pause");
    setSechageActif(false);

    await updateProject({
      statut: "en_pause",
      temps_pause: nouveauTempsPause,
      date_pause: new Date().toISOString(),
      progression_avant_pause: progression // ✅ NOUVEAU: Sauvegarder la progression
    });

    alert("⏸️ Séchage mis en pause. Vous pouvez maintenant modifier les paramètres.");
  };

  const reprendreSechage = async () => {
    const statusNormalized = normalizeStatus(statut);
    
    if (statusNormalized !== "enpause") {
      alert("⚠️ Le séchage n'est pas en pause");
      return;
    }

    const otherProjectCheck = await checkOtherActiveProject();
    if (otherProjectCheck.hasOtherActiveProject) {
      alert(
        `⚠️ Impossible de reprendre ce projet !\n\n` +
        `Un autre projet est déjà en cours : "${otherProjectCheck.otherProjectName}"\n\n` +
        `Vous devez d'abord terminer ou arrêter l'autre projet avant de reprendre celui-ci.`
      );
      return;
    }

    // ✅ SEUL LE DÉMARRAGE EST OBLIGATOIRE
    if (!etatSechage) {
      alert("⚠️ Veuillez d'abord activer le 'Démarrage du séchage'");
      return;
    }

    // ✅ TOUT LE RESTE EST FACULTATIF (résistance, gaz, ventilation)

    const nouvelleDateDebut = new Date().toISOString();

    setStatut("en_cours");
    setDateDebut(nouvelleDateDebut);
    setSechageActif(true);

    await updateProject({
      statut: "en_cours",
      date_debut: nouvelleDateDebut,
      startDate: nouvelleDateDebut
    });

    alert("✅ Séchage repris avec succès !");
  };

  if (loading) {
    return (
      <div className="controle-container">
        <p>Chargement...</p>
      </div>
    );
  }

  const isManual = mode === "manuel";
  const statusNormalized = normalizeStatus(statut);
  const isControlDisabled = !isManual || (sechageActif && statusNormalized !== "enpause");
  const isDemarrageDisabled = (sechageActif && statusNormalized !== "enpause");

  const getStatutStyle = () => {
    switch (statusNormalized) {
      case "encours":
        return { color: "#3b82f6", icon: "🔄", label: "En cours" };
      case "termine":
        return { color: "#10b981", icon: "✅", label: "Terminé" };
      case "enpause":
        return { color: "#f59e0b", icon: "⏸️", label: "En pause" };
      case "planifie":
        return { color: "#f59e0b", icon: "📋", label: "Planifié" };
      default:
        return { color: "#6b7280", icon: "⏸️", label: "En attente" };
    }
  };

  const statutStyle = getStatutStyle();

  return (
    <div className="controle-container">
      <header className="controle-header">
        <div className="header-left">
          <div className="header-title">
            <h1>Contrôle</h1>
            {projectDataName && <span className="project-name">{projectDataName}</span>}
          </div>
        </div>

        <div className="header-right">
          <div className="mode-switch">
            <button
              className={mode === "manuel" ? "active" : ""}
              onClick={() => toggleMode("manuel")}
              disabled={sechageActif && statusNormalized !== "enpause"}
            >
              Manuel
            </button>

            <button
              className={mode === "automatique" ? "active" : ""}
              onClick={() => toggleMode("automatique")}
              disabled={sechageActif && statusNormalized !== "enpause"}
            >
              Automatique
            </button>
          </div>

          <section className="sechage-status">
            <div className="status-header">
              <h3 style={{ color: "white" }}>
                {statutStyle.icon} Statut: {statutStyle.label}
              </h3>
              {dureePrevu > 0 && (
                <span className="duree-info">Durée prévue: {dureePrevu}h</span>
              )}
            </div>

            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ 
                  width: `${progression}%`,
                  background: statusNormalized === "termine" 
                    ? "linear-gradient(90deg, #10b981, #059669)" 
                    : "linear-gradient(90deg, #10b981, #059669)"
                }}
              >
                <span className="progress-text">{Math.round(progression)}%</span>
              </div>
            </div>

            {statusNormalized === "encours" && dateDebut && (
              <p className="time-info">
                Démarré le: {new Date(dateDebut).toLocaleString("fr-FR")}
              </p>
            )}
          </section>
        </div>
      </header>

      {!isManual && (
        <div className="alert-warning">
          ⚠️ Mode Automatique actif - Seul le bouton "Démarrage du séchage" est accessible.
        </div>
      )}

      {sechageActif && statusNormalized === "encours" && (
        <div className="alert-warning" style={{ background: "#e3f2fd", borderLeft: "4px solid #2196f3", color: "#1565c0" }}>
          🔒 Les contrôles sont désactivés pendant le séchage. Mettez en pause pour les modifier.
        </div>
      )}

      {/* ✅ MODIFICATION: Afficher le message de pause uniquement en mode manuel */}
      {statusNormalized === "enpause" && mode === "manuel" && (
        <div className="alert-warning" style={{ background: "#fff3cd", borderLeft: "4px solid #ffc107", color: "#856404" }}>
          ⏸️ Séchage en pause - Vous pouvez modifier les paramètres et reprendre le séchage.
        </div>
      )}

      <main>
        <section className={`control-card ${isDemarrageDisabled ? "disabled" : ""}`}>
          <div className="control-info">
            <h3>Démarrage du séchage</h3>
            <p className="status">
              <span className={`dot ${etatSechage ? "on" : ""}`}></span>
              Statut: {etatSechage ? "Activé" : "Désactivé"}
            </p>
          </div>

          <div
            className={`switch ${etatSechage ? "on" : ""}`}
            onClick={() => !isDemarrageDisabled && toggleField("etat_demarrage", !etatSechage)}
          >
            <div className="switch-btn">{etatSechage ? "ON" : "OFF"}</div>
          </div>
        </section>

        <section className={`control-card ${isControlDisabled ? "disabled" : ""} ${!useResistance ? "blocked" : ""}`}>
          <div className="control-info">
            <h3>Résistance chauffante</h3>
            {!useResistance && (
              <p style={{ color: "#d32f2f", fontSize: "12px", fontStyle: "italic" }}>
                ⚠️ Non configurée pour ce projet
              </p>
            )}
            <p className="status">
              <span className={`dot ${etatResistance ? "on" : ""}`}></span>
              Statut: {etatResistance ? "Activé" : "Désactivé"}
            </p>
          </div>

          <div
            className={`switch ${etatResistance ? "on" : ""} ${!isManual ? "disabled-switch" : ""}`}
            onClick={() => !isControlDisabled && isManual && toggleField("etat_resistance", !etatResistance)}
            style={{ opacity: !isManual ? 0.4 : 1, cursor: !isManual ? "not-allowed" : "pointer" }}
          >
            <div className="switch-btn">{etatResistance ? "ON" : "OFF"}</div>
          </div>
        </section>

        <section className={`control-card ${isControlDisabled ? "disabled" : ""} ${!useGaz ? "blocked" : ""}`}>
          <div className="control-info">
            <h3>Gaz</h3>
            {!useGaz && (
              <p style={{ color: "#d32f2f", fontSize: "12px", fontStyle: "italic" }}>
                ⚠️ Non configuré pour ce projet
              </p>
            )}
            <p className="status">
              <span className={`dot ${etatGaz ? "on" : ""}`}></span>
              Statut: {etatGaz ? "Activé" : "Désactivé"}
            </p>
          </div>

          <div
            className={`switch ${etatGaz ? "on" : ""} ${!isManual ? "disabled-switch" : ""}`}
            onClick={() => !isControlDisabled && isManual && toggleField("etat_gaz", !etatGaz)}
            style={{ opacity: !isManual ? 0.4 : 1, cursor: !isManual ? "not-allowed" : "pointer" }}
          >
            <div className="switch-btn">{etatGaz ? "ON" : "OFF"}</div>
          </div>
        </section>

        <section className={`control-card ${isControlDisabled ? "disabled" : ""} ${!useAucune ? "blocked" : ""}`}>
          <div className="control-info">
            <h3>Aucune source d'énergie</h3>
            {!useAucune && (
              <p style={{ color: "#d32f2f", fontSize: "12px", fontStyle: "italic" }}>
                ⚠️ Non configurée pour ce projet
              </p>
            )}
            <p className="status">
              <span className={`dot ${etatAucune ? "on" : ""}`}></span>
              Statut: {etatAucune ? "Activé" : "Désactivé"}
            </p>
          </div>

          <div
            className={`switch ${etatAucune ? "on" : ""} ${!isManual ? "disabled-switch" : ""}`}
            onClick={() => !isControlDisabled && isManual && toggleField("etat_aucune", !etatAucune)}
            style={{ opacity: !isManual ? 0.4 : 1, cursor: !isManual ? "not-allowed" : "pointer" }}
          >
            <div className="switch-btn">{etatAucune ? "ON" : "OFF"}</div>
          </div>
        </section>

        <section className={`control-card ventilation-card ${isControlDisabled ? "disabled" : ""}`}>
          <div className="control-info">
            <h3>Ventilation</h3>
            <p className="status">
              <span className="dot on"></span>
              Puissance: {ventilation}%
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
            <button
              onClick={decrementVentilation}
              disabled={isControlDisabled || ventilation === 0}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #4caf50',
                background: isControlDisabled || ventilation === 0 ? '#e0e0e0' : '#4caf50',
                color: 'white',
                fontSize: '20px',
                cursor: isControlDisabled || ventilation === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
            >
              −
            </button>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              className="range-slider"
              disabled={isControlDisabled}
              value={ventilation}
              onChange={(e) => changeVentilation(e.target.value)}
              style={{ flex: 1 }}
            />

            <button
              onClick={incrementVentilation}
              disabled={isControlDisabled || ventilation === 100}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #4caf50',
                background: isControlDisabled || ventilation === 100 ? '#e0e0e0' : '#4caf50',
                color: 'white',
                fontSize: '20px',
                cursor: isControlDisabled || ventilation === 100 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
            >
              +
            </button>
          </div>
        </section>
      </main>

      <footer className="controle-footer">
        <button className="btn-back" onClick={() => navigate("/projets")}>
          ← Retour aux projets
        </button>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {statusNormalized !== "termine" ? (
            <>
              {statusNormalized === "encours" ? (
                <button className="btn-stop" onClick={arreterSechage}>
                  ⏸️ Mettre en pause
                </button>
              ) : statusNormalized === "enpause" ? (
                <button className="btn-start" onClick={reprendreSechage}>
                  ▶️ Reprendre le séchage
                </button>
              ) : (
                <button className="btn-start" onClick={commencerSechage}>
                  ▶️ Commencer le séchage
                </button>
              )}
            </>
          ) : (
            <div style={{ padding: '10px 20px', background: '#10b981', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>
              ✅ Projet terminé - Contrôle désactivé
            </div>
          )}
        </div>
      </footer>

      <div className="debug-panel">
        <h4>🔍 État Firebase en temps réel</h4>
        <div className="debug-content">
          <div className="debug-row">
            <span className="debug-label">Mode:</span>
            <span className="debug-value">{mode}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Statut séchage:</span>
            <span className="debug-value" style={{ color: statutStyle.color }}>
              {statut} ({statutStyle.label})
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Séchage actif:</span>
            <span className={`debug-value ${sechageActif ? "active" : "inactive"}`}>
              {sechageActif ? "✅ OUI" : "❌ NON"}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Progression:</span>
            <span className="debug-value">{Math.round(progression)}%</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Progression avant pause:</span>
            <span className="debug-value">{Math.round(progressionAvantPause)}%</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Temps pause:</span>
            <span className="debug-value">{tempsPause.toFixed(2)}h</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Durée prévue:</span>
            <span className="debug-value">{dureePrevu}h</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Source énergie projet:</span>
            <span className="debug-value">{sourceEnergieProjet || "Non définie"}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Résistance disponible:</span>
            <span className={`debug-value ${useResistance ? "active" : "inactive"}`}>
              {useResistance ? "✅ OUI" : "❌ NON"}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Gaz disponible:</span>
            <span className={`debug-value ${useGaz ? "active" : "inactive"}`}>
              {useGaz ? "✅ OUI" : "❌ NON"}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Démarrage séchage:</span>
            <span className={`debug-value ${etatSechage ? "active" : "inactive"}`}>
              {etatSechage ? "✅ ON" : "❌ OFF"}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Résistance:</span>
            <span className={`debug-value ${etatResistance ? "active" : "inactive"}`}>
              {etatResistance ? "✅ ON" : "❌ OFF"}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Gaz:</span>
            <span className={`debug-value ${etatGaz ? "active" : "inactive"}`}>
              {etatGaz ? "✅ ON" : "❌ OFF"}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Ventilation:</span>
            <span className="debug-value">{ventilation}%</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Chemin Firebase:</span>
            <span className="debug-value debug-path">{projectPath}</span>
          </div>
        </div>
      </div>
    </div>
  );
}