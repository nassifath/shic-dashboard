import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, ref, onValue, update } from "../firebase"; // === AJOUT IMPORTANT ===
import "../styles/projectDetails.css";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [mesuresTempsReel, setMesuresTempsReel] = useState(null);

  // Charger projet + mesures temps réel
  useEffect(() => {
    if (!projectId) return;

    const projectRef = ref(db, `projets_sechage/${projectId}`);
    const unsubProject = onValue(projectRef, (snap) => {
      if (!snap.exists()) {
        navigate("/projets");
        return;
      }
      setProject(snap.val());
    });

    const mesuresRef = ref(db, "mesures_temps_reel");
    const unsubMesures = onValue(mesuresRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const cleaned = Object.fromEntries(
          Object.entries(data).filter(([k]) => !k.startsWith("_"))
        );
        setMesuresTempsReel(cleaned);
      }
      setLoading(false);
    });

    return () => {
      unsubProject();
      unsubMesures();
    };
  }, [projectId, navigate]);

  // Mise à jour du temps toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Helper récupération
  const get = (dbField, formField) =>
    project?.[dbField] ?? project?.[formField] ?? null;

  const nomProjet = get("nom_projet", "name");
  const typeProduit = get("type_produit", "productType");
  const quantite = get("quantite_produit", "quantity");
  const tempMin = get("temperature_min", "tempMin");
  const tempMax = get("temperature_max", "tempMax");
  const humiditeStop = get("humidite_finale_cible", "humidityStop");
  const duree = get("duree_prevue", "duration");
  const energie = get("source_energie_appoint", "energySource");
  const statut = get("statut", "status") || "planifie";
  const telephone = get("telephone_operateur", "phone");
  const dateDebut = get("date_debut", "startDate");

  // === FONCTION ARCHIVER ===
  const archiverProjet = () => {
    if (!projectId) return;

    update(ref(db, `projets_sechage/${projectId}`), {
      statut: "archivé",
      date_archive: new Date().toISOString()
    })
      .then(() => {
        alert("Projet archivé avec succès !");
        navigate("/projets");
      })
      .catch((err) => {
        console.error("Erreur archivage :", err);
        alert("Une erreur est survenue.");
      });
  };

  // Progression du séchage
  const calculateProgress = () => {
    if (!dateDebut || !duree) return 0;
    if (statut === "termine") return 100;
    if (statut !== "en_cours") return 0;

    const start = new Date(dateDebut).getTime();
    const now = currentTime;
    const total = duree * 3600000;

    return Math.min(((now - start) / total) * 100, 100);
  };

  const progress = calculateProgress();

  // Mesures temps réel
  const tempActuelle =
    mesuresTempsReel?.temperature_sortie ??
    mesuresTempsReel?.chambre_sechage?.temperature_sortie ??
    "--";

  const humiditeActuelle =
    mesuresTempsReel?.humidite_sortie ??
    mesuresTempsReel?.chambre_sechage?.humidite_sortie ??
    "--";

  const energieActuelle =
    mesuresTempsReel?.consommation_totale ??
    mesuresTempsReel?.energie?.consommation_totale ??
    0;

  if (loading)
    return (
      <div className="project-details-container">
        <div className="loading-spinner">Chargement…</div>
      </div>
    );

  if (!project)
    return (
      <div className="project-details-container">
        <div className="error-message">Projet introuvable</div>
      </div>
    );

  return (
    <div className="project-details-container">
      {/* HEADER */}
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate("/projets")}>
          ← Retour
        </button>

        <h1>{nomProjet}</h1>

        <span
          className={`status-badge ${
            statut === "en_cours"
              ? "badge-encours"
              : statut === "termine"
              ? "badge-termine"
              : statut === "archivé"
              ? "badge-archive"
              : "badge-planifie"
          }`}
        >
          {statut === "en_cours"
            ? "En cours"
            : statut === "termine"
            ? "Terminé"
            : statut === "archivé"
            ? "Archivé"
            : "Planifié"}
        </span>
      </div>

      {/* DATE */}
      <p className="start-date">
        📅 Démarré le{" "}
        {dateDebut
          ? new Date(dateDebut).toLocaleDateString("fr-FR")
          : "Non démarré"}
      </p>

      {/* PROGRESSION */}
      <div className="card progression-card">
        <div className="progression-header">
          <h3>Progression du Séchage</h3>
          <span className="progress-percentage">{Math.round(progress)}%</span>
        </div>

        <div className="progress-bar-large">
          <div
            className="progress-fill-large"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* METRIQUES TEMPS RÉEL */}
      <div className="metrics-grid">
        <div className="metric-card temp">
          🌡️ <h4>Température actuelle</h4>
          <div className="metric-value">{tempActuelle}°C</div>
          <p className="metric-range">Plage : {tempMin}°C – {tempMax}°C</p>
        </div>

        <div className="metric-card humidity">
          💧 <h4>Humidité actuelle</h4>
          <div className="metric-value">{humiditeActuelle}%</div>
          <p className="metric-range">Arrêt automatique : {humiditeStop}%</p>
        </div>

        <div className="metric-card energy">
          ⚡ <h4>Énergie consommée</h4>
          <div className="metric-value">{energieActuelle} kW</div>
          <p className="metric-range">Source : {energie}</p>
        </div>

        <div className="metric-card duration">
          ⏰ <h4>Durée prévue</h4>
          <div className="metric-value">{duree} h</div>
        </div>
      </div>

      {/* INFO PROJET */}
      <div className="card info-card">
        <h3>📋 Informations du Projet</h3>

        <div className="info-grid">
          <div className="info-item">
            <label>Produit</label>
            <div className="info-value">{typeProduit}</div>
          </div>

          <div className="info-item">
            <label>Quantité</label>
            <div className="info-value">{quantite} kg</div>
          </div>

          <div className="info-item">
            <label>Température min</label>
            <div className="info-value">{tempMin}°C</div>
          </div>

          <div className="info-item">
            <label>Température max</label>
            <div className="info-value">{tempMax}°C</div>
          </div>

          <div className="info-item">
            <label>Humidité d'arrêt</label>
            <div className="info-value">{humiditeStop}%</div>
          </div>

          <div className="info-item">
            <label>Durée prévue</label>
            <div className="info-value">{duree} heures</div>
          </div>

          <div className="info-item">
            <label>Source d'énergie</label>
            <div className="info-value">{energie}</div>
          </div>

          <div className="info-item large">
            <label>Notes</label>
            <div className="info-value">{project.notes || "Aucune note"}</div>
          </div>
        </div>
      </div>

      {/* CONTACT */}
      <div className="card contact-card">
        <h3>👤 Contact Opérateur</h3>

        <div className="contact-grid">
          <div className="contact-item">
            <label>Nom</label>
            <div className="contact-value">
              {project.operatorName || "Non renseigné"}
            </div>
          </div>

          <div className="contact-item">
            <label>Téléphone</label>
            <div className="contact-value">📱 {telephone}</div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="actions-footer">
        <button
          className="btn-modify"
          onClick={() => navigate(`/projets/edit/${projectId}`)}
        >
          ✏️ Modifier
        </button>

        <button className="btn-archive" onClick={archiverProjet}>
          🗑️ Archiver
        </button>
      </div>
    </div>
  );
}
