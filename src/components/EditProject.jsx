import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, ref, onValue, update } from "../firebase";
import "../styles/addProject.css";

export default function EditProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    productType: "",
    quantity: "",
    tempMin: "",
    tempMax: "",
    humidityStop: "",
    duration: "",
    energySource: "",
    operatorName: "",
    phone: "",
    notes: "",
    status: "planifie",
    startDate: "",
  });

  // 🟢 Charger le projet existant
  useEffect(() => {
    const projectRef = ref(db, `projets_sechage/${projectId}`);

    onValue(projectRef, (snap) => {
      if (!snap.exists()) {
        alert("Projet introuvable");
        navigate("/projects");
        return;
      }

      const data = snap.val();
      setProject(data);

      console.table(data);

      // 🟢 Harmonisation (comme dans les autres pages)
      setFormData({
        name: data.nom_projet || data.name || "",
        productType: data.type_produit || data.productType || "",
        quantity: data.quantite_produit || data.quantity || "",
        tempMin: data.temperature_min || data.tempMin || "",
        tempMax: data.temperature_max || data.tempMax || "",
        humidityStop: data.humidite_finale_cible || data.humidityStop || "",
        duration: data.duree_prevue || data.duration || "",
        energySource: data.source_energie_appoint || data.energySource || "Gaz",
        operatorName: data.operatorName || data.nom_operateur || "",
        phone: data.telephone_operateur || data.phone || "",
        notes: data.notes || "",
        status: data.statut || data.status || "planifie",
        startDate: data.date_debut || data.startDate || new Date().toISOString(),
      });

      setLoading(false);
    });
  }, [projectId, navigate]);

  // 🟢 Mise à jour des champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🟢 VALIDER LA MODIFICATION
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // On met à jour toutes les versions (compatibilité totale)
      const updateData = {
        nom_projet: formData.name,
        name: formData.name,

        type_produit: formData.productType,
        productType: formData.productType,

        quantite_produit: formData.quantity,
        quantity: formData.quantity,

        temperature_min: formData.tempMin,
        tempMin: formData.tempMin,

        temperature_max: formData.tempMax,
        tempMax: formData.tempMax,

        humidite_finale_cible: formData.humidityStop,
        humidityStop: formData.humidityStop,

        duree_prevue: formData.duration,
        duration: formData.duration,

        source_energie_appoint: formData.energySource,
        energySource: formData.energySource,

        nom_operateur: formData.operatorName,
        operatorName: formData.operatorName,

        telephone_operateur: formData.phone,
        phone: formData.phone,

        notes: formData.notes || "",

        statut: formData.status,
        status: formData.status,

        date_debut: formData.startDate,
        startDate: formData.startDate,
      };

      await update(ref(db, `projets_sechage/${projectId}`), updateData);

      alert("✅ Projet modifié avec succès !");
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      alert("❌ Erreur mise à jour !");
    }
  };

  if (loading)
    return <div className="loading-spinner">Chargement…</div>;

  return (
    <div className="add-project-container">
      <h1 className="page-title">Modifier le Projet</h1>

      <form className="project-form" onSubmit={handleSubmit}>
        {/* === INFOS PROJET === */}
        <section className="form-section">
          <h2>Informations du Projet</h2>

          <div className="form-grid">
            <div>
              <label>Nom du projet *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Type de produit *</label>
              <select
                name="productType"
                value={formData.productType}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner</option>
                <option value="Ananas">Ananas</option>
                <option value="Mangue">Mangue</option>
                <option value="Tomate">Tomate</option>
              </select>
            </div>

            <div>
              <label>Quantité *</label>
              <div className="input-unit">
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
                <span>kg</span>
              </div>
            </div>
          </div>
        </section>

        {/* === PARAMÈTRES DE SÉCHAGE === */}
        <section className="form-section">
          <h2>Paramètres de Séchage</h2>

          <div className="form-grid">
            <div>
              <label>Température min *</label>
              <div className="input-unit">
                <input
                  type="number"
                  name="tempMin"
                  value={formData.tempMin}
                  onChange={handleChange}
                  required
                />
                <span>°C</span>
              </div>
            </div>

            <div>
              <label>Température max *</label>
              <div className="input-unit">
                <input
                  type="number"
                  name="tempMax"
                  value={formData.tempMax}
                  onChange={handleChange}
                  required
                />
                <span>°C</span>
              </div>
            </div>

            <div>
              <label>Humidité d'arrêt *</label>
              <div className="input-unit">
                <input
                  type="number"
                  name="humidityStop"
                  value={formData.humidityStop}
                  onChange={handleChange}
                  required
                />
                <span>%</span>
              </div>
            </div>

            <div>
              <label>Durée *</label>
              <div className="input-unit">
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                />
                <span>heures</span>
              </div>
            </div>
          </div>
        </section>

        {/* === SOURCE ÉNERGIE === */}
        <section className="form-section">
          <h2>Source d’Énergie</h2>

          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="energySource"
                value="Gaz"
                checked={formData.energySource === "Gaz"}
                onChange={handleChange}
              />{" "}
              Gaz
            </label>

            <label>
              <input
                type="radio"
                name="energySource"
                value="Résistance électrique"
                checked={formData.energySource === "Résistance électrique"}
                onChange={handleChange}
              />{" "}
              Résistance électrique
            </label>
          </div>
        </section>

        {/* === CONTACT === */}
        <section className="form-section">
          <h2>Contact Opérateur</h2>

          <div className="form-grid">
            <div>
              <label>Nom de l'opérateur *</label>
              <input
                type="text"
                name="operatorName"
                value={formData.operatorName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Téléphone *</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </section>

        {/* === ACTIONS === */}
        <div className="form-buttons">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            ✖ Annuler
          </button>

          <button type="submit" className="submit-btn">
            ✔ Modifier le projet
          </button>
        </div>
      </form>
    </div>
  );
}
