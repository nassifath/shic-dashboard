import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db, ref, onValue, update } from "../firebase";
import "../styles/dashboard.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("Connexion en cours...");
  const [projectData, setProjectData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState("off");
  const [mode, setMode] = useState("manuel");
  const [systemStatus, setSystemStatus] = useState({
    ventilation: "inactive",
    resistance: "inactive",
    gaz: "inactive",
    mode: "manuel",
    sechage: "off",
  });
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [mesuresTempsReel, setMesuresTempsReel] = useState(null);
  const [sourceEnergie, setSourceEnergie] = useState("");
  const [hasActiveProject, setHasActiveProject] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ✅ VÉRIFICATION DU PROFIL AU CHARGEMENT
  useEffect(() => {
    if (userProfile) {
      console.log("✅ Dashboard - Profil chargé:", userProfile.nom_user);
      setUserData({
        nom_user: userProfile.nom_user,
        telephone: userProfile.telephone,
        role: userProfile.role
      });
    }
  }, [userProfile]);

  // Timer pour mise à jour en temps réel de la progression
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ NOUVELLE FONCTION: Vérifier et mettre à jour automatiquement le statut "terminé"
  const checkAndUpdateProjectCompletion = async (projetId, projet) => {
    const statut = projet.statut || projet.status;
    const dateDebut = projet.date_debut || projet.startDate;
    const duree = projet.duree_prevue || projet.duration;

    if (statut === "termine") return;

    if (statut === "en_cours" && dateDebut && duree) {
      const debut = new Date(dateDebut).getTime();
      const maintenant = Date.now();
      const dureeMs = duree * 60 * 60 * 1000;
      const tempsEcoule = maintenant - debut;

      if (tempsEcoule >= dureeMs) {
        console.log("⏱️ Projet terminé détecté automatiquement:", projetId);
        
        try {
          const projectRef = ref(db, `projets_sechage/${projetId}`);
          await update(projectRef, {
            statut: "termine",
            progression: 100,
            date_fin: new Date().toISOString()
          });
          console.log("✅ Statut 'terminé' mis à jour automatiquement dans Firebase");
        } catch (error) {
          console.error("❌ Erreur mise à jour statut terminé:", error);
        }
      }
    }
  };

  useEffect(() => {
    const dbRef = ref(db, "/");

    const unsubscribe = onValue(
      dbRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          setConnectionMessage("⚠️ Base de données vide !");
          setIsConnected(false);
          setHasActiveProject(false);
          return;
        }

        try {
          const allData = snapshot.val();
          console.log("✅ Données Firebase reçues :", allData);

          const projets = allData?.projets_sechage;
          if (!projets) {
            setConnectionMessage("⚠️ Aucun projet trouvé dans la base");
            setIsConnected(false);
            setHasActiveProject(false);
            return;
          }

          const projetIds = Object.keys(projets).filter(key => !key.startsWith('_'));
          
          console.log("🔍 IDs de projets trouvés:", projetIds);
          
          if (projetIds.length === 0) {
            setConnectionMessage("⚠️ Aucun projet actif. Créez un projet via le formulaire.");
            setIsConnected(false);
            setHasActiveProject(false);
            return;
          }

          let projetEnCours = null;
          let projetId = null;
          let hasActivePrj = false;

          for (const id of projetIds) {
            const projet = projets[id];
            
            console.log(`🔍 Projet ${id}:`, {
              statut: projet.statut || projet.status,
              archived: projet.archived,
              date_debut: projet.date_debut || projet.startDate,
              duree: projet.duree_prevue || projet.duration,
              progression: projet.progression
            });
            
            await checkAndUpdateProjectCompletion(id, projet);
            
            const statutNormalized = (projet.statut || projet.status || "").toLowerCase();
            
            if (statutNormalized === "en_cours" && !projet.archived) {
              projetEnCours = projet;
              projetId = id;
              hasActivePrj = true;
              console.log("✅ Projet EN COURS trouvé:", id);
              break;
            }
          }

          setHasActiveProject(hasActivePrj);

          if (!projetEnCours) {
            setConnectionMessage("✅ Connecté - Aucun projet en cours");
            setIsConnected(true);
            setProjectData(null);
            if (!userProfile) {
              setUserData(null);
            }
            setStatus("off");
            setMode("aucun");
            setSystemStatus({
              ventilation: "inactive",
              resistance: "inactive",
              gaz: "inactive",
              mode: "aucun",
              sechage: "off",
            });
            setSourceEnergie("");
            return;
          }

          setCurrentProjectId(projetId);

          const energieChoisie = projetEnCours.energySource || projetEnCours.source_energie_appoint || "";
          setSourceEnergie(energieChoisie);

          const nomOperateur = projetEnCours.operatorName || projetEnCours.nom_operateur || "Opérateur";
          const telephoneOperateur = projetEnCours.phone || projetEnCours.telephone_operateur || "";
          
          if (!userProfile) {
            const userInfo = {
              nom_user: nomOperateur,
              telephone: telephoneOperateur,
              role: "operateur"
            };
            setUserData(userInfo);
          }

          const mesuresTR = allData?.mesures_temps_reel;
          setMesuresTempsReel(mesuresTR);

          const commandes = allData?.commandes;
          let derniereCommande = null;

          if (commandes) {
            const commandesIds = Object.keys(commandes).filter(key => !key.startsWith('_'));
            if (commandesIds.length > 0) {
              derniereCommande = commandesIds
                .map(id => ({ id, ...commandes[id] }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            }
          }

          let modeChoisi = "manuel";
          
          if (derniereCommande?.mode) {
            modeChoisi = derniereCommande.mode;
          } else if (projetEnCours.commande?.mode) {
            modeChoisi = projetEnCours.commande.mode;
          } else if (projetEnCours.mode) {
            modeChoisi = projetEnCours.mode;
          } else if (projetEnCours.mode_fonctionnement) {
            modeChoisi = projetEnCours.mode_fonctionnement;
          }
          
          setMode(modeChoisi);

          setStatus(projetEnCours.statut === "en_cours" ? "on" : "off");

          const ventilationActive = derniereCommande?.etat_demarrage || 
                                    projetEnCours.commande?.etat_sechage || 
                                    false;
          
          const resistanceActive = derniereCommande?.etat_resistance || 
                                   projetEnCours.commande?.etat_resistance || 
                                   false;
          
          const gazActive = derniereCommande?.etat_gaz || 
                           projetEnCours.commande?.etat_gaz || 
                           false;

          setSystemStatus({
            ventilation: ventilationActive ? "active" : "inactive",
            resistance: resistanceActive ? "active" : "inactive",
            gaz: gazActive ? "active" : "inactive",
            mode: modeChoisi,
            sechage: projetEnCours.statut === "en_cours" ? "on" : "off",
          });

          const historiqueTout = allData?.historique_mesures;
          const historique = historiqueTout?.[projetId];
          
          if (historique) {
            const historiqueIds = Object.keys(historique).filter(key => !key.startsWith('_'));
            
            if (historiqueIds.length > 0) {
              const mesures_chambre = {};
              const mesures_capteur = {};
              const mesures_energie = {};

              historiqueIds.forEach(id => {
                const mesure = historique[id];
                if (mesure.chambre) mesures_chambre[id] = mesure.chambre;
                if (mesure.capteur) mesures_capteur[id] = mesure.capteur;
                if (mesure.energie) mesures_energie[id] = mesure.energie;
              });

              setProjectData({
                ...projetEnCours,
                id: projetId,
                mesures_chambre,
                mesures_capteur,
                mesures_energie,
              });
            } else {
              setProjectData({
                ...projetEnCours,
                id: projetId,
              });
            }
          } else {
            setProjectData({
              ...projetEnCours,
              id: projetId,
            });
          }

          setIsConnected(true);
          setConnectionMessage("✅ Données chargées avec succès !");

        } catch (error) {
          console.error("❌ Erreur lors du traitement des données :", error);
          setConnectionMessage(`❌ Erreur: ${error.message}`);
          setIsConnected(false);
          setHasActiveProject(false);
        }
      },
      (error) => {
        console.error("❌ Erreur Firebase :", error);
        setConnectionMessage("❌ Erreur de lecture Firebase !");
        setIsConnected(false);
        setHasActiveProject(false);
      }
    );

    return () => unsubscribe();
  }, [currentTime, userProfile]);

  const temperatureData = projectData?.mesures_chambre && projectData?.mesures_capteur
    ? Object.keys(projectData.mesures_chambre).slice(-20).map((key, i) => {
        const chambre = projectData.mesures_chambre[key] || {};
        const capteurKeys = Object.keys(projectData.mesures_capteur);
        const capteur = projectData.mesures_capteur[capteurKeys[i]] || {};
        
        return {
          name: `M${i + 1}`,
          chambreE: chambre.temperature_entree ?? 0,
          chambreS: chambre.temperature_sortie ?? 0,
          capteurE: capteur.temperature_entree ?? 0,
          capteurS: capteur.temperature_sortie ?? 0,
        };
      })
    : [];

  const humidityData = projectData?.mesures_chambre && projectData?.mesures_capteur
    ? Object.keys(projectData.mesures_chambre).slice(-20).map((key, i) => {
        const chambre = projectData.mesures_chambre[key] || {};
        const capteurKeys = Object.keys(projectData.mesures_capteur);
        const capteur = projectData.mesures_capteur[capteurKeys[i]] || {};
        
        return {
          name: `M${i + 1}`,
          chambreE: chambre.humidite_entree ?? 0,
          chambreS: chambre.humidite_sortie ?? 0,
          capteurE: capteur.humidite_entree ?? 0,
          capteurS: capteur.humidite_sortie ?? 0,
        };
      })
    : [];

  const electricData = projectData?.mesures_energie
    ? Object.values(projectData.mesures_energie).slice(-20).map((m, i) => ({
        name: `M${i + 1}`,
        conso: m?.consommation_instantanee ?? m?.consommation ?? 0,
      }))
    : [];

  const calculerDureeRestante = () => {
    if (!hasActiveProject || !projectData) return "--";
    
    if (!projectData?.duree_prevue && !projectData?.duration) {
      return "--";
    }
    
    if (!projectData?.date_debut && !projectData?.startDate) {
      return "--";
    }

    const debut = new Date(projectData.date_debut || projectData.startDate);
    const maintenant = new Date();
    
    const minutesPassees = (maintenant - debut) / (1000 * 60);
    const tempsPause = (projectData.temps_pause || 0) * 60;
    const minutesReelles = minutesPassees - tempsPause;
    const dureePrevueEnMinutes = parseFloat(projectData.duree_prevue || projectData.duration) * 60;
    const minutesRestantes = Math.max(dureePrevueEnMinutes - minutesReelles, 0);
    
    const heuresRestantes = Math.floor(minutesRestantes / 60);
    const minutesRestantesAffichage = Math.round(minutesRestantes % 60);
    
    if (heuresRestantes > 0) {
      return `${heuresRestantes}h ${minutesRestantesAffichage}min`;
    } else {
      return `${minutesRestantesAffichage}min`;
    }
  };

  const calculerProgression = () => {
    if (!hasActiveProject || !projectData) {
      return "0";
    }

    const statut = projectData.statut || projectData.status;
    const dateDebut = projectData.date_debut || projectData.startDate;
    const duree = projectData.duree_prevue || projectData.duration;

    if (statut === "termine") return "100";
    if (statut !== "en_cours" || !dateDebut || !duree) {
      return "0";
    }

    const start = new Date(dateDebut).getTime();
    const now = currentTime;
    const total = duree * 60 * 60 * 1000;
    const elapsed = now - start;

    const progress = Math.min((elapsed / total) * 100, 100);
    
    return progress.toFixed(1);
  };

  const getDernieresMesuresChambre = () => {
    if (projectData?.mesures_chambre && Object.keys(projectData.mesures_chambre).length > 0) {
      const dernier = Object.values(projectData.mesures_chambre).slice(-1)[0];
      return dernier;
    }
    return null;
  };

  const getDernieresMesuresCapteur = () => {
    if (projectData?.mesures_capteur && Object.keys(projectData.mesures_capteur).length > 0) {
      const dernier = Object.values(projectData.mesures_capteur).slice(-1)[0];
      return dernier;
    }
    return null;
  };

  const mesuresChambre = getDernieresMesuresChambre();
  const mesuresCapteur = getDernieresMesuresCapteur();

  const getInitials = (nom) => {
    if (!nom) return "??";
    const parts = nom.split(" ");
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  };

  // ✅ VÉRIFICATIONS DE CHARGEMENT (après tous les hooks)
  if (!currentUser) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement de votre profil...</p>
          <p className="text-gray-500 text-sm mt-2">Email: {currentUser.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <main className="main">
        <div
          style={{
            backgroundColor: isConnected ? "#e8f5e9" : "#ffebee",
            color: isConnected ? "#2e7d32" : "#c62828",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "10px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          {connectionMessage}
        </div>

        <div className="header">
          <h1>Dashboard - Séchoir Solaire Hybride</h1>
          <div className="user-profile">
            <div className="avatar">{userData ? getInitials(userData.nom_user) : "?"}</div>
            <div>
              <strong>{userData?.nom_user || "Aucun opérateur"}</strong>
              <div style={{ fontSize: "12px", color: "#6f8a76" }}>
                {userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid3">
          <div className="card">
            <h4>Statut du séchoir</h4>
            <div className={`status-toggle ${status === "on" ? "on" : "off"}`}>
              <div className="circle"></div>
              <span>{status === "on" ? "Allumé" : "Éteint"}</span>
            </div>
          </div>

          <div className="card">
            <h4>Mode de fonctionnement</h4>
            <div className="mode-badge">
              {hasActiveProject ? (
                <>
                  <span className={`led-pulse ${mode === "automatique" ? "on-led" : "off-led"}`}></span>
                  <span>{mode === "manuel" ? "Manuel (Actif)" : "Automatique"}</span>
                </>
              ) : (
                <span style={{ color: "#9e9e9e", fontStyle: "italic" }}>Aucun mode (Pas de projet en cours)</span>
              )}
            </div>
          </div>

          <div className="card project-card">
            <h4>Projet en cours</h4>
            <select className="select-projet" disabled={!hasActiveProject}>
              <option value={projectData?.id || ""}>
                {hasActiveProject 
                  ? (projectData?.name || projectData?.nom_projet || "Projet en cours")
                  : "Aucun projet en cours"}
              </option>
            </select>

            <div className="project-details-horizontal">
              <div className="detail-row">
                <div className="label">Durée restante</div>
                <div className="label">Température cible</div>
              </div>
              
              <div className="detail-row">
                <div className="value blue">
                  {hasActiveProject ? calculerDureeRestante() : "--"}
                </div>
                <div className="value red">
                  {hasActiveProject && (projectData?.tempMin || projectData?.temperature_min)
                    ? `${projectData.tempMin || projectData.temperature_min}° – ${projectData.tempMax || projectData.temperature_max}°`
                    : "--"}
                </div>
              </div>

              <div className="detail-row">
                <div className="label">Produit</div>
                <div className="label">Quantité</div>
              </div>

              <div className="detail-row">
                <div className="value" style={{ color: "#f9a825" }}>
                  {hasActiveProject 
                    ? (projectData?.productType || projectData?.type_produit || "--")
                    : "--"}
                </div>
                <div className="value" style={{ color: "#00796b" }}>
                  {hasActiveProject 
                    ? `${projectData?.quantity || projectData?.quantite_produit || "--"} kg`
                    : "-- kg"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid2">
          <div className="card sensor-card">
            <div className="sensor-header">
              <div className="sensor-icon">🏠</div>
              <h4>Chambre de séchage</h4>
            </div>

            <div className="metric-section">
              <h5>🌡️ Température (°C)</h5>
              <div className="metric-values">
                <div className="metric-box">
                  <span>Entrée</span>
                  <b>{mesuresChambre?.temperature_entree?.toFixed(1) ?? "--"}°</b>
                </div>
                <div className="metric-arrow">→</div>
                <div className="metric-box">
                  <span>Sortie</span>
                  <b>{mesuresChambre?.temperature_sortie?.toFixed(1) ?? "--"}°</b>
                </div>
              </div>
            </div>

            <div className="metric-section">
              <h5>💧 Humidité (%)</h5>
              <div className="metric-values">
                <div className="metric-box">
                  <span>Entrée</span>
                  <b>{mesuresChambre?.humidite_entree?.toFixed(1) ?? "--"}%</b>
                </div>
                <div className="metric-arrow">→</div>
                <div className="metric-box">
                  <span>Sortie</span>
                  <b>{mesuresChambre?.humidite_sortie?.toFixed(1) ?? "--"}%</b>
                </div>
              </div>
            </div>
          </div>

          <div className="card sensor-card">
            <div className="sensor-header">
              <div className="sensor-icon">☀️</div>
              <h4>Capteur solaire</h4>
            </div>

            <div className="metric-section">
              <h5>🌡️ Température (°C)</h5>
              <div className="metric-values">
                <div className="metric-box">
                  <span>Entrée</span>
                  <b>{mesuresCapteur?.temperature_entree?.toFixed(1) ?? "--"}°</b>
                </div>
                <div className="metric-arrow">→</div>
                <div className="metric-box">
                  <span>Sortie</span>
                  <b>{mesuresCapteur?.temperature_sortie?.toFixed(1) ?? "--"}°</b>
                </div>
              </div>
            </div>

            <div className="metric-section">
              <h5>💧 Humidité (%)</h5>
              <div className="metric-values">
                <div className="metric-box">
                  <span>Entrée</span>
                  <b>{mesuresCapteur?.humidite_entree?.toFixed(1) ?? "--"}%</b>
                </div>
                <div className="metric-arrow">→</div>
                <div className="metric-box">
                  <span>Sortie</span>
                  <b>{mesuresCapteur?.humidite_sortie?.toFixed(1) ?? "--"}%</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h4>Graphique Température (°C)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="chambreE" stroke="#2e7d32" name="Chambre Entrée" />
                <Line dataKey="chambreS" stroke="#66bb6a" name="Chambre Sortie" />
                <Line dataKey="capteurE" stroke="#ff9800" name="Capteur Entrée" />
                <Line dataKey="capteurS" stroke="#ffcc80" name="Capteur Sortie" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h4>Graphique Humidité (%)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={humidityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="chambreE" stroke="#1565c0" name="Chambre Entrée" />
                <Line dataKey="chambreS" stroke="#64b5f6" name="Chambre Sortie" />
                <Line dataKey="capteurE" stroke="#00796b" name="Capteur Entrée" />
                <Line dataKey="capteurS" stroke="#4db6ac" name="Capteur Sortie" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid2">
          <div className="chart-card large">
            <h4>Électricité consommée (kWh)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={electricData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="conso" stroke="#f9a825" fill="#fff8e1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card system-status">
            <h4>Statut Système</h4>
            
            {hasActiveProject ? (
              <>
                <div className="status-item">
                  <span>💨 Ventilation</span>
                  <span className={`status-badge ${systemStatus.ventilation === "active" ? "active" : "inactive"}`}>
                    {systemStatus.ventilation === "active" ? "Actif" : "Inactif"}
                  </span>
                </div>

                <div className="status-item">
                  <span>🔥 Appoint chaleur</span>
                  <span className={`status-badge ${
                    (sourceEnergie.toLowerCase().includes("gaz") && systemStatus.gaz === "active") ||
                    ((sourceEnergie.toLowerCase().includes("résistance") || sourceEnergie.toLowerCase().includes("resistance")) && systemStatus.resistance === "active")
                      ? "active" 
                      : "inactive"
                  }`}>
                    {sourceEnergie.toLowerCase().includes("gaz") 
                      ? "Gaz" 
                      : sourceEnergie.toLowerCase().includes("résistance") || sourceEnergie.toLowerCase().includes("resistance")
                      ? "Résistance chauffante"
                      : "Non défini"}
                  </span>
                </div>

                <div className="status-item">
                  <span>⚙️ Mode</span>
                  <span className={`status-badge ${systemStatus.mode === "automatique" ? "active" : "inactive"}`}>
                    {systemStatus.mode === "automatique" ? "Automatique" : "Manuel"}
                  </span>
                </div>
                
                <div className="status-item">
                  <span>⏱️ Séchage</span>
                  <span className={`status-badge ${systemStatus.sechage === "on" ? "active" : "inactive"}`}>
                    {systemStatus.sechage === "on" ? "En cours" : "Arrêté"}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ 
                padding: "20px", 
                textAlign: "center", 
                color: "#9e9e9e", 
                fontStyle: "italic" 
              }}>
                Aucun projet en cours
              </div>
            )}
          </div>
        </div>

        <div className="resume-card">
          <h4>Résumé du projet actuel</h4>
          <p>
            {hasActiveProject ? (
              <>
                Projet : <b>{projectData?.name || projectData?.nom_projet || "N/A"}</b> | 
                Durée prévue : <b>{projectData?.duration || projectData?.duree_prevue || "--"} h</b> | 
                Progression : <b>{calculerProgression()}%</b> | 
                Source d'énergie : <b>{sourceEnergie || "N/A"}</b>
              </>
            ) : (
              <span style={{ color: "#9e9e9e", fontStyle: "italic" }}>
                Aucun projet en cours - Créez un nouveau projet pour commencer
              </span>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}