import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, ref, onValue, set } from "../firebase";
import "../styles/historique.css";

export default function Historique() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadingProjectId, setUploadingProjectId] = useState(null);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const navigate = useNavigate();

  // Normalisation statuts
  const stdStatus = (txt) => {
    if (!txt) return "";
    return txt
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "")
      .replace(/-/g, "")
      .replace(/_+/g, "");
  };

  // Charger tous les projets terminés
  useEffect(() => {
    const projectsRef = ref(db, "projets_sechage");

    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .filter(([key]) => !key.startsWith("_"))
          .map(([id, val]) => ({ id, ...val }))
          .filter((p) => {
            const statut = stdStatus(p.statut || p.status);
            return statut === "termine";
          })
          .sort((a, b) => {
            const dateA = new Date(a.date_fin || a.date_debut || 0);
            const dateB = new Date(b.date_fin || b.date_debut || 0);
            return dateB - dateA;
          });

        setProjects(list);
        setFilteredProjects(list);
      } else {
        setProjects([]);
        setFilteredProjects([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filtrage automatique
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter((p) => {
      const projectDate = new Date(p.date_fin || p.date_debut);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return projectDate >= start && projectDate <= end;
      } else if (start) {
        return projectDate >= start;
      } else if (end) {
        return projectDate <= end;
      }
      return true;
    });

    setFilteredProjects(filtered);
  }, [startDate, endDate, projects]);

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
  };

  // 🔥 NOUVELLE VERSION: Sauvegarde dans Realtime Database (GRATUIT)
  const saveToDatabase = async (htmlContent, fileName, metadata = {}) => {
    try {
      console.log("💾 Sauvegarde dans Database:", fileName);
      setUploadStatus("⏳ Sauvegarde du rapport...");

      // Encoder le contenu HTML en base64 pour éviter les problèmes de caractères
      const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));

      const timestamp = Date.now();
      const rapportRef = ref(db, `rapports_excel/${timestamp}`);
      
      await set(rapportRef, {
        fileName,
        contentBase64: base64Content,
        dateCreation: new Date().toISOString(),
        taille: htmlContent.length,
        ...metadata
      });

      console.log("✅ Rapport sauvegardé avec succès");
      setUploadStatus("✅ Rapport sauvegardé dans la base de données!");
      setTimeout(() => setUploadStatus(""), 3000);

      return true;
    } catch (error) {
      console.error("❌ Erreur sauvegarde:", error);
      setUploadStatus(`❌ Erreur: ${error.message}`);
      setTimeout(() => setUploadStatus(""), 5000);
      return false;
    }
  };

  // Export Excel global
  const handleExportExcel = async () => {
    if (filteredProjects.length === 0) {
      alert("⚠️ Aucun projet à exporter");
      return;
    }

    setIsUploadingGlobal(true);

    try {
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
          }
          
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          
          .header p {
            margin: 10px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
          }
          
          thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          th {
            padding: 18px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            font-size: 14px;
            color: #495057;
          }
          
          tbody tr:hover {
            background-color: #f8f9fa;
          }
          
          tbody tr:nth-child(even) {
            background-color: #fafbfc;
          }
          
          .footer {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-size: 12px;
            border-top: 2px solid #e9ecef;
            margin-top: 30px;
          }
          
          .highlight {
            background: #fff3cd;
            padding: 2px 6px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 RAPPORT D'HISTORIQUE DES PROJETS DE SÉCHAGE</h1>
          <p>Généré le ${new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })} à ${new Date().toLocaleTimeString("fr-FR")}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">N°</th>
              <th>Nom du Projet</th>
              <th>Produit</th>
              <th>Quantité (kg)</th>
              <th>Température (°C)</th>
              <th>Humidité Finale (%)</th>
              <th>Durée Prévue (h)</th>
              <th>Énergie Appoint</th>
              <th>Date Début</th>
              <th>Date Fin</th>
              <th>Électricité (kWh)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProjects
              .map(
                (p, index) => `
              <tr>
                <td style="text-align: center;"><strong>${index + 1}</strong></td>
                <td><strong>${p.nom_projet || p.name || "—"}</strong></td>
                <td>${p.type_produit || p.productType || "—"}</td>
                <td style="text-align: right;">${p.quantite_produit || p.quantity || "—"}</td>
                <td style="text-align: center;">${p.temperature_min || p.tempMin || "—"} - ${
                  p.temperature_max || p.tempMax || "—"
                }</td>
                <td style="text-align: center;">${p.humidite_finale || p.finalHumidity || "—"}</td>
                <td style="text-align: center;">${p.duree_prevue || p.duration || "—"}</td>
                <td>${p.source_energie_appoint || p.energySource || "—"}</td>
                <td>${
                  p.date_debut ? new Date(p.date_debut).toLocaleDateString("fr-FR") : "—"
                }</td>
                <td>${p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "—"}</td>
                <td style="text-align: right;"><span class="highlight">${
                  p.energie_consommee || p.energyConsumed || "—"
                }</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div style="text-align: right; margin-bottom: 30px;">
          <div style="display: inline-block; background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; text-align: left;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">Résumé Statistique</h3>
            <table style="border-collapse: collapse;">
              <tr>
                <td align="center" style="text-align: center; border: none; padding: 15px;">
                  <p align="center" style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">TOTAL PROJETS</p>
                  <p align="center" style="font-size: 24px; font-weight: 700; color: #667eea; margin: 0;">${filteredProjects.length}</p>
                </td>
                <td align="center" style="text-align: center; border: none; padding: 15px;">
                  <p align="center" style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">QUANTITÉ TOTALE</p>
                  <p align="center" style="font-size: 24px; font-weight: 700; color: #667eea; margin: 0;">${filteredProjects.reduce(
                (sum, p) => sum + (parseFloat(p.quantite_produit || p.quantity) || 0),
                0
              ).toFixed(0)} kg</p>
                </td>
                <td align="center" style="text-align: center; border: none; padding: 15px;">
                  <p align="center" style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">ÉNERGIE TOTALE</p>
                  <p align="center" style="font-size: 24px; font-weight: 700; color: #667eea; margin: 0;">${filteredProjects.reduce(
                (sum, p) => sum + (parseFloat(p.energie_consommee || p.energyConsumed) || 0),
                0
              ).toFixed(0)} kWh</p>
                </td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>🌱 Système de Gestion de Séchage Solaire</strong></p>
          <p>Ce rapport contient ${
            filteredProjects.length
          } projet(s) terminé(s) ${
      startDate || endDate
        ? `entre le ${startDate || "début"} et le ${endDate || "aujourd'hui"}`
        : ""
    }</p>
        </div>
      </body>
      </html>
    `;

      const fileName = `Rapport_Historique_${new Date().toISOString().split("T")[0]}.xls`;
      const blob = new Blob([htmlContent], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });

      // 1️⃣ Téléchargement local
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2️⃣ Sauvegarde dans Database
      await saveToDatabase(htmlContent, fileName, {
        type: "historique_global",
        nombreProjets: filteredProjects.length,
        periode: { debut: startDate || "début", fin: endDate || "aujourd'hui" }
      });

    } catch (error) {
      console.error("❌ Erreur export global:", error);
      setUploadStatus(`❌ Erreur: ${error.message}`);
      setTimeout(() => setUploadStatus(""), 4000);
    } finally {
      setIsUploadingGlobal(false);
    }
  };

  // Export Excel pour un projet individuel
  const handleExportProject = async (p) => {
    setUploadingProjectId(p.id);

    try {
      const nom = p.nom_projet || p.name;
      const produit = p.type_produit || p.productType || "—";
      const quantite = p.quantite_produit || p.quantity || "—";
      const tempMin = p.temperature_min || p.tempMin || "—";
      const tempMax = p.temperature_max || p.tempMax || "—";
      const energieConsommee = p.energie_consommee || p.energyConsumed || "—";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; margin-bottom: 25px; border-radius: 8px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 8px 0 0 0; font-size: 13px; opacity: 0.9; }
            table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            th { background: #667eea; color: white; padding: 15px; text-align: left; font-weight: 600; }
            td { padding: 12px 15px; border-bottom: 1px solid #e9ecef; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            .label { font-weight: 600; color: #495057; }
            .value { color: #212529; }
            .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #e9ecef; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 ${nom}</h1>
            <p>Rapport détaillé du projet - Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
          </div>
          <table>
            <tr><td class="label">Nom du Projet</td><td class="value">${nom}</td></tr>
            <tr><td class="label">Type de Produit</td><td class="value">${produit}</td></tr>
            <tr><td class="label">Quantité</td><td class="value">${quantite} kg</td></tr>
            <tr><td class="label">Température Min</td><td class="value">${tempMin}°C</td></tr>
            <tr><td class="label">Température Max</td><td class="value">${tempMax}°C</td></tr>
            <tr><td class="label">Humidité Finale</td><td class="value">${p.humidite_finale || p.finalHumidity || "—"}%</td></tr>
            <tr><td class="label">Durée Prévue</td><td class="value">${p.duree_prevue || p.duration || "—"} heures</td></tr>
            <tr><td class="label">Source Énergie Appoint</td><td class="value">${p.source_energie_appoint || p.energySource || "—"}</td></tr>
            <tr><td class="label">Date de Début</td><td class="value">${p.date_debut ? new Date(p.date_debut).toLocaleDateString("fr-FR") : "—"}</td></tr>
            <tr><td class="label">Date de Fin</td><td class="value">${p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "—"}</td></tr>
            <tr><td class="label">Électricité Consommée</td><td class="value"><strong>${energieConsommee} kWh</strong></td></tr>
          </table>
          <div class="footer">
            <p><strong>🌱 Système de Gestion de Séchage Solaire</strong></p>
          </div>
        </body>
        </html>
      `;

      const fileName = `Rapport_${nom.replace(/ /g, "_")}.xls`;
      const blob = new Blob([htmlContent], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });

      // Téléchargement local
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Sauvegarde dans Database
      await saveToDatabase(htmlContent, fileName, {
        type: "rapport_projet_individuel",
        projetId: p.id,
        nomProjet: nom
      });

    } catch (error) {
      console.error("❌ Erreur export projet:", error);
      setUploadStatus(`❌ Erreur: ${error.message}`);
      setTimeout(() => setUploadStatus(""), 4000);
    } finally {
      setUploadingProjectId(null);
    }
  };

  return (
    <div className="historique-container">
      {uploadStatus && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: uploadStatus.includes("❌") ? "#ffebee" : "#e8f5e9",
          color: uploadStatus.includes("❌") ? "#c62828" : "#2e7d32",
          padding: "15px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          fontWeight: "600",
          maxWidth: "400px"
        }}>
          {uploadStatus}
        </div>
      )}

      <div className="historique-header">
        <h1 className="historique-title">Historique</h1>
      </div>

      <div className="historique-filters-section">
        <h2 className="section-title">Historique</h2>

        <div className="filters-row">
          <div className="filter-group">
            <label>Filtrer les projets menés entre:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
              <span className="date-separator">et</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn-reset" onClick={handleReset}>
              Réinitialiser
            </button>
            <button 
              className="btn-export" 
              onClick={handleExportExcel}
              disabled={isUploadingGlobal}
              style={{ opacity: isUploadingGlobal ? 0.6 : 1 }}
            >
              {isUploadingGlobal ? "⏳ Export..." : "📊 Export Excel"}
            </button>
          </div>
        </div>
      </div>

      <div className="historique-projects-list">
        {filteredProjects.length === 0 ? (
          <div className="no-projects">
            <p>Aucun projet terminé trouvé</p>
            {(startDate || endDate) && (
              <button className="btn-reset-inline" onClick={handleReset}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map((p) => {
            const nom = p.nom_projet || p.name;
            const produit = p.type_produit || p.productType || "—";
            const quantite = p.quantite_produit || p.quantity || "—";
            const tempMin = p.temperature_min || p.tempMin || "—";
            const tempMax = p.temperature_max || p.tempMax || "—";
            const energieConsommee = p.energie_consommee || p.energyConsumed || "—";

            return (
              <div key={p.id} className="historique-project-card">
                <div className="project-card-header">
                  <h3>{nom}</h3>
                  <span className="status-badge done">Terminé</span>
                </div>

                <p className="project-date">
                  Démarré le{" "}
                  {p.date_debut
                    ? new Date(p.date_debut).toLocaleDateString("fr-FR")
                    : "—"}
                </p>

                <div className="project-details">
                  <div className="detail-row">
                    <span className="detail-label">Produit</span>
                    <span className="detail-value">{produit}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Quantité</span>
                    <span className="detail-value">{quantite} kg</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Température</span>
                    <span className="detail-value">
                      {tempMin !== "—" && tempMax !== "—"
                        ? `${tempMin}-${tempMax}°C`
                        : "—"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Électricité consommée</span>
                    <span className="detail-value">{energieConsommee} kWh</span>
                  </div>
                </div>

                <div className="project-actions">
                  <button
                    className="btn-view-historique"
                    onClick={() => navigate(`/projets/${p.id}`)}
                  >
                    ✏️ Voir
                  </button>
                  <button
                    className="btn-export-project"
                    disabled={uploadingProjectId === p.id}
                    onClick={() => handleExportProject(p)}
                    style={{ opacity: uploadingProjectId === p.id ? 0.6 : 1 }}
                  >
                    {uploadingProjectId === p.id ? "⏳..." : "📊 Export Excel"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}