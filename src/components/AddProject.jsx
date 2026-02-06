import React, { useState } from "react";
import { db, ref, push, set } from "../firebase"; // ✅ import complet
import "../styles/addProject.css";

export default function AddProject({ onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    productType: "",
    quantity: "",
    tempMin: "",
    tempMax: "",
    humidityStop: "",
    duration: "",
    energySource: "Gaz",
    operatorName: "",
    phone: "",
    notes: "",
    status: "planifie", // ✅ par défaut, projet planifié
    startDate: new Date().toISOString(),
  });

  // 🧩 gestion du changement de champ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🧠 envoi du projet dans Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const projectRef = push(ref(db, "projets_sechage")); // ✅ ton noeud Firebase
      await set(projectRef, formData);
      alert("✅ Projet ajouté avec succès dans Firebase !");
      setFormData({
        name: "",
        productType: "",
        quantity: "",
        tempMin: "",
        tempMax: "",
        humidityStop: "",
        duration: "",
        energySource: "Gaz",
        operatorName: "",
        phone: "",
        notes: "",
        status: "planifie",
        startDate: new Date().toISOString(),
      });
      if (onCancel) onCancel(); // ferme le formulaire si parent fourni une action
    } catch (error) {
      console.error("❌ Erreur d'envoi Firebase :", error);
      alert("Erreur lors de l'enregistrement du projet !");
    }
  };

  return (
    <div className="add-project-container">
      <h1 className="page-title">Nouveau Projet de Séchage</h1>

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
                placeholder="Ex: Séchage Ananas Bio"
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
                <option value="">Sélectionner un produit</option>
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
              <label>Température minimale *</label>
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
              <label>Température maximale *</label>
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
              <label>Humidité relative d'arrêt</label>
              <div className="input-unit">
                <input
                  type="number"
                  name="humidityStop"
                  value={formData.humidityStop}
                  onChange={handleChange}
                />
                <span>%</span>
              </div>
            </div>

            <div>
              <label>Durée de séchage *</label>
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

        {/* === SOURCE D'ÉNERGIE === */}
        <section className="form-section">
          <h2>Source d'Énergie</h2>
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
            <label>
              <input
                type="radio"
                name="energySource"
                value="Aucune"
                checked={formData.energySource === "Aucune"}
                onChange={handleChange}
              />{" "}
              Aucune
            </label>
          </div>
        </section>

        {/* === CONTACT OPÉRATEUR === */}
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
              <label>Numéro de téléphone *</label>
              <input
                type="text"
                name="phone"
                placeholder="+229 XX XX XX XX"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <label>Notes / Observations</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ajoutez des notes ou observations..."
          ></textarea>
        </section>

        {/* === BOUTONS === */}
        <div className="form-buttons">
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel || (() => window.history.back())}
          >
            ✖ Annuler
          </button>
          <button type="submit" className="submit-btn">
            ✔ Créer le projet
          </button>
        </div>
      </form>
    </div>
  );
}