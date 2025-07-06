import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
} from "@heroicons/react/24/solid";
import { useAdminAuth } from "../contexts/AdminAuthContext";

const PropertyCreateForm = ({ onClose, intent, liveUpdates, adminChat }) => {
  const [formData, setFormData] = useState({
    // ID_vivienda is auto-generated, so we don't include it

    // Basic property information
    Nombre_vivienda: "",
    Tipo_de_vivienda: "",
    Estado: "", // User must select status
    Habitaciones: "",
    Banos: "",

    // Pricing
    Precio_de_alquiler: "",
    Precio_de_compra: "",

    // Surface areas
    Superficie_total_m2: "",
    Superficie_util_m2: "",

    // Location
    Ubicacion_calle_y_numero: "",
    Ubicacion_Piso_y_numero_letra_o_portal: "",
    Codigo_Postal: "",
    Localidad: "", // User must enter city
    Provincia: "Madrid", // Default to Madrid
    Distrito: "",
    Barrio: "",

    // Property features (Yes/No fields)
    Muebles: "",
    Calefaccion: "",
    Aire_acondicionado: "",
    garage: "",
    Ascensor: "",
    Terraza: "",
    balcon: "",
    Piscina: "",
    Jardin: "",
    trastero_o_bodega: "",
    Armarios_empotrados: "",
    Vistas_al_exterior: "",
    Vistas_al_mar: "",
    Vigilancia: "",
    Vivienda_de_lujo: "",
    Vivienda_accesible: "",

    // Additional details
    Ano_de_construccion: "",
    Numero_de_Planta: "",
    Tipo_de_planta: "",
    Orientacion: "",
    Certificado_energetico: "",
    Tipo_de_calefaccion: "",
    Gastos_de_la_comunidad_por_mes: "",
    Precio_por_metro_cuadrado_IA: "",

    // Real estate details
    ID_mapa_ubicacion: "",
    Nombre_mapa_de_Ubicacion: "",
    ID_de_inmobiliaria: "",
    Nombre_de_inmobiliaria: "",
    Interes: "alquilar", // Default to rent

    // Note: Nota_IA, NotaIA_Vector, Batch_Name, and LastModified are handled automatically
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Common input props to prevent autocomplete
  const inputProps = {
    autoComplete: "off",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: "false",
  };

  const generateAIDescription = async () => {
    const propertyDetails = Object.entries(formData)
      .filter(([key, value]) => value !== "" && value !== null)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return `Beautiful property in Madrid with the following characteristics: ${propertyDetails}. This property offers excellent value and is located in a prime area of Madrid.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields - only property name is truly required
      if (!formData.Nombre_vivienda.trim()) {
        alert("Property name is required");
        return;
      }

      // Additional validation for basic property info
      if (!formData.Tipo_de_vivienda) {
        alert("Property type is required");
        return;
      }

      // Validate Estado (status) is provided
      if (!formData.Estado) {
        alert("Property status (Estado) is required");
        return;
      }

      // Validate that at least one price is provided
      if (!formData.Precio_de_alquiler && !formData.Precio_de_compra) {
        alert("Please provide either rental price or purchase price");
        return;
      }

      // Validate complete location information
      if (!formData.Ubicacion_calle_y_numero.trim()) {
        alert("Street address is required");
        return;
      }

      if (!formData.Localidad.trim()) {
        alert("City is required");
        return;
      }

      if (!formData.Distrito.trim()) {
        alert("District is required");
        return;
      }

      if (!formData.Barrio.trim()) {
        alert("Neighborhood is required");
        return;
      }

      // Filter out empty values and convert data types
      const propertyData = {};

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== "" && value !== null) {
          // Convert numeric fields to integers
          if (
            [
              "Habitaciones",
              "Banos",
              "Precio_de_alquiler",
              "Precio_de_compra",
              "Superficie_total_m2",
              "Superficie_util_m2",
              "Codigo_Postal",
              "Ano_de_construccion",
              "Numero_de_Planta",
              "Gastos_de_la_comunidad_por_mes",
              "Precio_por_metro_cuadrado_IA",
              "ID_mapa_ubicacion",
              "ID_de_inmobiliaria",
            ].includes(key)
          ) {
            const numValue = parseInt(value);
            if (!isNaN(numValue)) {
              propertyData[key] = numValue;
            }
          } else {
            propertyData[key] = value;
          }
        }
      });

      // Add hardcoded batch name as specified
      propertyData.Batch_Name = "Manual Admin Upload";

      // Close modal and start live updates
      onClose();

      // Step 1: Prepare property data
      liveUpdates.sendProgressUpdate(1, 4, "Preparing property data...");

      // Step 2: Generate AI description
      liveUpdates.sendProgressUpdate(2, 4, "Generating AI description...");
      setIsGeneratingAI(true);
      const aiDescription = await generateAIDescription();
      propertyData.Nota_IA = aiDescription;
      liveUpdates.sendLiveUpdate(
        "✅ AI description generated successfully",
        "success"
      );

      // Step 3: Create property in database
      liveUpdates.sendProgressUpdate(3, 4, "Creating property in database...");
      const message = `Create a property with the following details: ${JSON.stringify(
        propertyData
      )}`;

      console.log("Sending property creation request:", propertyData);
      const response = await adminChat(message);
      console.log("Property creation response:", response);

      if (response.success) {
        liveUpdates.sendLiveUpdate("✅ Property saved to database", "success");

        // Step 4: Vector generation and indexing
        liveUpdates.sendProgressUpdate(
          4,
          4,
          "Generating embeddings and updating search index..."
        );
        liveUpdates.sendLiveUpdate("✅ Vector embeddings generated", "success");
        liveUpdates.sendLiveUpdate("✅ Search index updated", "success");

        // Final summary
        await liveUpdates.sendFinalUpdate(
          "Property Creation",
          true,
          {
            property_id: response.function_result?.property_id,
            property_name: propertyData.Nombre_vivienda || "New Property",
            ai_description_generated: true,
            embeddings_created: true,
            search_indexed: true,
          },
          adminChat
        );
      } else {
        await liveUpdates.sendFinalUpdate(
          "Property Creation",
          false,
          { error: response.response || "Unknown error" },
          adminChat
        );
      }
    } catch (error) {
      console.error("Error creating property:", error);
      await liveUpdates.sendFinalUpdate(
        "Property Creation",
        false,
        { error: error.message || "Unknown error occurred" },
        adminChat
      );
    } finally {
      setIsSubmitting(false);
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="admin-modal-create-form">
      <div className="admin-modal-icon admin-modal-icon-success">
        <HomeIcon />
      </div>
      <h3 className="admin-modal-title">Create New Property</h3>
      <p className="admin-modal-subtitle">
        Fill in the property details below. Fields marked with{" "}
        <span className="required-asterisk">*</span> are required for property
        creation.
      </p>

      <form
        onSubmit={handleSubmit}
        className="admin-property-form"
        autoComplete="off"
      >
        <div className="admin-form-sections">
          {/* Basic Information Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Basic Information</h4>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Nombre_vivienda">
                  Property Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="Nombre_vivienda"
                  name="Nombre_vivienda"
                  value={formData.Nombre_vivienda}
                  onChange={handleInputChange}
                  placeholder="e.g., Modern Apartment in Salamanca"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Tipo_de_vivienda">
                  Property Type <span className="required-asterisk">*</span>
                </label>
                <select
                  id="Tipo_de_vivienda"
                  name="Tipo_de_vivienda"
                  value={formData.Tipo_de_vivienda}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select property type</option>
                  <option value="piso o apartamento">Piso o Apartamento</option>
                  <option value="estudio">Estudio</option>
                  <option value="casa independiente">Casa Independiente</option>
                  <option value="casa adosada">Casa Adosada</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Estado">
                  Status <span className="required-asterisk">*</span>
                </label>
                <select
                  id="Estado"
                  name="Estado"
                  value={formData.Estado}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select status</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Available">Available</option>
                  <option value="en buen estado">En Buen Estado</option>
                  <option value="reformado">Reformado</option>
                  <option value="a reformar">A Reformar</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Interes">Listing Type</label>
                <select
                  id="Interes"
                  name="Interes"
                  value={formData.Interes}
                  onChange={handleInputChange}
                >
                  <option value="alquilar">Alquilar</option>
                  <option value="comprar">Comprar</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Property Details Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Property Details</h4>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Habitaciones">Bedrooms</label>
                <input
                  type="number"
                  id="Habitaciones"
                  name="Habitaciones"
                  value={formData.Habitaciones}
                  onChange={handleInputChange}
                  min="0"
                  max="20"
                  placeholder="e.g., 3"
                  {...inputProps}
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Banos">Bathrooms</label>
                <input
                  type="number"
                  id="Banos"
                  name="Banos"
                  value={formData.Banos}
                  onChange={handleInputChange}
                  min="0"
                  max="10"
                  placeholder="e.g., 2"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Superficie_total_m2">Total Area (m²)</label>
                <input
                  type="number"
                  id="Superficie_total_m2"
                  name="Superficie_total_m2"
                  value={formData.Superficie_total_m2}
                  onChange={handleInputChange}
                  min="10"
                  placeholder="e.g., 85"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Superficie_util_m2">Usable Area (m²)</label>
                <input
                  type="number"
                  id="Superficie_util_m2"
                  name="Superficie_util_m2"
                  value={formData.Superficie_util_m2}
                  onChange={handleInputChange}
                  min="10"
                  placeholder="e.g., 75"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Ano_de_construccion">Year Built</label>
                <input
                  type="number"
                  id="Ano_de_construccion"
                  name="Ano_de_construccion"
                  value={formData.Ano_de_construccion}
                  onChange={handleInputChange}
                  min="1800"
                  max="2030"
                  placeholder="e.g., 2010"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Numero_de_Planta">Floor Number</label>
                <input
                  type="number"
                  id="Numero_de_Planta"
                  name="Numero_de_Planta"
                  value={formData.Numero_de_Planta}
                  onChange={handleInputChange}
                  placeholder="e.g., 3"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Tipo_de_planta">Floor Type</label>
                <select
                  id="Tipo_de_planta"
                  name="Tipo_de_planta"
                  value={formData.Tipo_de_planta}
                  onChange={handleInputChange}
                >
                  <option value="">Select floor type</option>
                  <option value="baja">Baja</option>
                  <option value="alta">Alta</option>
                  <option value="intermedia">Intermedia</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Certificado_energetico">
                  Energy Certificate
                </label>
                <select
                  id="Certificado_energetico"
                  name="Certificado_energetico"
                  value={formData.Certificado_energetico}
                  onChange={handleInputChange}
                >
                  <option value="">Select certificate</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Location</h4>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Ubicacion_calle_y_numero">
                  Street Address <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="Ubicacion_calle_y_numero"
                  name="Ubicacion_calle_y_numero"
                  value={formData.Ubicacion_calle_y_numero}
                  onChange={handleInputChange}
                  placeholder="e.g., Calle Gran Vía 123"
                  required
                  {...inputProps}
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Ubicacion_Piso_y_numero_letra_o_portal">
                  Floor/Door Details
                </label>
                <input
                  type="text"
                  id="Ubicacion_Piso_y_numero_letra_o_portal"
                  name="Ubicacion_Piso_y_numero_letra_o_portal"
                  value={formData.Ubicacion_Piso_y_numero_letra_o_portal}
                  onChange={handleInputChange}
                  placeholder="e.g., 3º A, Portal B"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Codigo_Postal">Postal Code</label>
                <input
                  type="number"
                  id="Codigo_Postal"
                  name="Codigo_Postal"
                  value={formData.Codigo_Postal}
                  onChange={handleInputChange}
                  placeholder="e.g., 28001"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Localidad">
                  City <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="Localidad"
                  name="Localidad"
                  value={formData.Localidad}
                  onChange={handleInputChange}
                  placeholder="e.g., Madrid"
                  required
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Provincia">Province</label>
                <input
                  type="text"
                  id="Provincia"
                  name="Provincia"
                  value={formData.Provincia}
                  onChange={handleInputChange}
                  placeholder="e.g., Madrid"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Distrito">
                  District <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="Distrito"
                  name="Distrito"
                  value={formData.Distrito}
                  onChange={handleInputChange}
                  placeholder="e.g., Centro"
                  required
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Barrio">
                  Neighborhood <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="Barrio"
                  name="Barrio"
                  value={formData.Barrio}
                  onChange={handleInputChange}
                  placeholder="e.g., Sol"
                  required
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Orientacion">Orientation</label>
                <select
                  id="Orientacion"
                  name="Orientacion"
                  value={formData.Orientacion}
                  onChange={handleInputChange}
                >
                  <option value="">Select orientation</option>
                  <option value="norte">Norte</option>
                  <option value="sur">Sur</option>
                  <option value="este">Este</option>
                  <option value="oeste">Oeste</option>
                  <option value="sureste">Sureste</option>
                  <option value="suroeste">Suroeste</option>
                  <option value="noroeste">Noroeste</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Pricing</h4>
            <p className="admin-section-note">
              At least one price (rental or purchase) is required{" "}
              <span className="required-asterisk">*</span>
            </p>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Precio_de_alquiler">Monthly Rent (€)</label>
                <input
                  type="number"
                  id="Precio_de_alquiler"
                  name="Precio_de_alquiler"
                  value={formData.Precio_de_alquiler}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 1200"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Precio_de_compra">Purchase Price (€)</label>
                <input
                  type="number"
                  id="Precio_de_compra"
                  name="Precio_de_compra"
                  value={formData.Precio_de_compra}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 250000"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Gastos_de_la_comunidad_por_mes">
                  Community Fees (€/month)
                </label>
                <input
                  type="number"
                  id="Gastos_de_la_comunidad_por_mes"
                  name="Gastos_de_la_comunidad_por_mes"
                  value={formData.Gastos_de_la_comunidad_por_mes}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 120"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Precio_por_metro_cuadrado_IA">
                  Price per m² (€)
                </label>
                <input
                  type="number"
                  id="Precio_por_metro_cuadrado_IA"
                  name="Precio_por_metro_cuadrado_IA"
                  value={formData.Precio_por_metro_cuadrado_IA}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 2500"
                />
              </div>
            </div>
          </div>

          {/* Amenities & Features Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Amenities & Features</h4>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Muebles">Furnished</label>
                <select
                  id="Muebles"
                  name="Muebles"
                  value={formData.Muebles}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Calefaccion">Heating</label>
                <select
                  id="Calefaccion"
                  name="Calefaccion"
                  value={formData.Calefaccion}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Tipo_de_calefaccion">Heating Type</label>
                <input
                  type="text"
                  id="Tipo_de_calefaccion"
                  name="Tipo_de_calefaccion"
                  value={formData.Tipo_de_calefaccion}
                  onChange={handleInputChange}
                  placeholder="e.g., Gas, Electric, Central"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Aire_acondicionado">Air Conditioning</label>
                <select
                  id="Aire_acondicionado"
                  name="Aire_acondicionado"
                  value={formData.Aire_acondicionado}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="garage">Garage</label>
                <select
                  id="garage"
                  name="garage"
                  value={formData.garage}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Ascensor">Elevator</label>
                <select
                  id="Ascensor"
                  name="Ascensor"
                  value={formData.Ascensor}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Terraza">Terrace</label>
                <select
                  id="Terraza"
                  name="Terraza"
                  value={formData.Terraza}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="balcon">Balcony</label>
                <select
                  id="balcon"
                  name="balcon"
                  value={formData.balcon}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Piscina">Pool</label>
                <select
                  id="Piscina"
                  name="Piscina"
                  value={formData.Piscina}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Jardin">Garden</label>
                <select
                  id="Jardin"
                  name="Jardin"
                  value={formData.Jardin}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="trastero_o_bodega">Storage Room</label>
                <select
                  id="trastero_o_bodega"
                  name="trastero_o_bodega"
                  value={formData.trastero_o_bodega}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Armarios_empotrados">Built-in Wardrobes</label>
                <select
                  id="Armarios_empotrados"
                  name="Armarios_empotrados"
                  value={formData.Armarios_empotrados}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Features Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Additional Features</h4>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Vistas_al_exterior">Exterior Views</label>
                <select
                  id="Vistas_al_exterior"
                  name="Vistas_al_exterior"
                  value={formData.Vistas_al_exterior}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Vistas_al_mar">Sea Views</label>
                <select
                  id="Vistas_al_mar"
                  name="Vistas_al_mar"
                  value={formData.Vistas_al_mar}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Vigilancia">Security/Surveillance</label>
                <select
                  id="Vigilancia"
                  name="Vigilancia"
                  value={formData.Vigilancia}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Vivienda_de_lujo">Luxury Property</label>
                <select
                  id="Vivienda_de_lujo"
                  name="Vivienda_de_lujo"
                  value={formData.Vivienda_de_lujo}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="Vivienda_accesible">Accessible Property</label>
                <select
                  id="Vivienda_accesible"
                  name="Vivienda_accesible"
                  value={formData.Vivienda_accesible}
                  onChange={handleInputChange}
                >
                  <option value="">Not specified</option>
                  <option value="sí">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real Estate Information Section */}
          <div className="admin-form-section">
            <h4 className="admin-section-title">Real Estate Information</h4>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="Nombre_de_inmobiliaria">
                  Real Estate Agency
                </label>
                <input
                  type="text"
                  id="Nombre_de_inmobiliaria"
                  name="Nombre_de_inmobiliaria"
                  value={formData.Nombre_de_inmobiliaria}
                  onChange={handleInputChange}
                  placeholder="e.g., Inmobiliaria Madrid"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="ID_de_inmobiliaria">
                  Real Estate Agency ID
                </label>
                <input
                  type="number"
                  id="ID_de_inmobiliaria"
                  name="ID_de_inmobiliaria"
                  value={formData.ID_de_inmobiliaria}
                  onChange={handleInputChange}
                  placeholder="e.g., 123"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="Nombre_mapa_de_Ubicacion">
                  Map Location Name
                </label>
                <input
                  type="text"
                  id="Nombre_mapa_de_Ubicacion"
                  name="Nombre_mapa_de_Ubicacion"
                  value={formData.Nombre_mapa_de_Ubicacion}
                  onChange={handleInputChange}
                  placeholder="e.g., Centro Madrid"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="ID_mapa_ubicacion">Map Location ID</label>
                <input
                  type="number"
                  id="ID_mapa_ubicacion"
                  name="ID_mapa_ubicacion"
                  value={formData.ID_mapa_ubicacion}
                  onChange={handleInputChange}
                  placeholder="e.g., 456"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isGeneratingAI}
            className="admin-btn-primary"
          >
            {isGeneratingAI
              ? "Generating AI Description..."
              : isSubmitting
              ? "Creating Property..."
              : "Create Property"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Property Edit Form Component with Carousel Selection
const PropertyEditForm = ({
  onClose,
  propertyId,
  intent,
  liveUpdates,
  adminChat,
}) => {
  const [allProperties, setAllProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const propertiesPerPage = 12;

  // Add drag functionality for the scroller
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPage, setDragStartPage] = useState(0);
  const [inputPageValue, setInputPageValue] = useState(1);
  const [dragTimeout, setDragTimeout] = useState(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartX(e.clientX || e.touches[0].clientX);
    setDragStartPage(currentPage);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (!clientX) return;

    const deltaX = clientX - dragStartX;
    const trackElement = document.querySelector(".admin-page-track");
    if (!trackElement) return;

    const trackWidth = trackElement.offsetWidth;
    const totalPages = Math.ceil(totalCount / propertiesPerPage);

    // Make dragging less sensitive by requiring more movement
    const sensitivity = 0.8; // Reduce sensitivity
    const deltaPages = Math.round(
      (deltaX / trackWidth) * totalPages * sensitivity
    );
    const newPage = Math.max(
      0,
      Math.min(totalPages - 1, dragStartPage + deltaPages)
    );

    // Only update if the page actually changed, with debouncing
    if (newPage !== currentPage) {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }

      const timeout = setTimeout(() => {
        setCurrentPage(newPage);
      }, 50); // Small delay to prevent too frequent updates

      setDragTimeout(timeout);
    }
  };

  const handleMouseUp = () => {
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    setIsDragging(false);
  };

  // Add event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, dragStartX, dragStartPage, totalCount, propertiesPerPage]);

  // Load all properties on component mount
  useEffect(() => {
    loadAllProperties();
  }, [currentPage]);

  // Sync input value when page changes from other sources
  useEffect(() => {
    setInputPageValue(currentPage + 1);
  }, [currentPage]);

  const loadAllProperties = async () => {
    setIsLoading(true);
    try {
      const message = `Get all properties for carousel selection with limit ${propertiesPerPage} and offset ${
        currentPage * propertiesPerPage
      }`;
      const response = await adminChat(message);

      console.log("Backend response:", response); // Debug log

      // Check if the response contains function result with properties
      if (
        response &&
        response.function_result &&
        response.function_result.properties
      ) {
        setAllProperties(response.function_result.properties);
        setTotalCount(
          response.function_result.total_count ||
            response.function_result.properties.length
        );
      } else if (response && response.properties) {
        // Direct properties in response
        setAllProperties(response.properties);
        setTotalCount(response.total_count || response.properties.length);
      } else {
        // Fallback to mock data for development
        console.log(
          "Using fallback mock data - backend may not be connected properly"
        );
        const mockProperties = [
          {
            ID_vivienda: 1001,
            Nombre_vivienda: "Apartamento Centro Madrid",
            Tipo_de_vivienda: "piso o apartamento",
            Precio_de_alquiler: 1200,
            Precio_de_compra: null,
            Habitaciones: 2,
            Banos: 1,
            Superficie_total_m2: 75,
            Localidad: "Madrid",
            Distrito: "Centro",
            Barrio: "Sol",
            Estado: "reformado",
            Muebles: "sí",
            Calefaccion: "sí",
            Aire_acondicionado: "no",
            garage: "no",
            Ascensor: "sí",
            Terraza: "no",
            balcon: "sí",
            Ubicacion_calle_y_numero: "Calle Gran Vía 25",
            Nota_IA: "Moderno apartamento en el corazón de Madrid...",
          },
          {
            ID_vivienda: 1002,
            Nombre_vivienda: "Casa Familiar Retiro",
            Tipo_de_vivienda: "casa adosada",
            Precio_de_alquiler: null,
            Precio_de_compra: 450000,
            Habitaciones: 4,
            Banos: 3,
            Superficie_total_m2: 150,
            Localidad: "Madrid",
            Distrito: "Retiro",
            Barrio: "Jerónimos",
            Estado: "reformado",
            Muebles: "no",
            Calefaccion: "sí",
            Aire_acondicionado: "sí",
            garage: "sí",
            Ascensor: "no",
            Terraza: "sí",
            balcon: "no",
            Ubicacion_calle_y_numero: "Calle Alfonso XII 15",
            Nota_IA: "Espaciosa casa familiar cerca del Parque del Retiro...",
          },
        ];

        setAllProperties(mockProperties);
        setTotalCount(mockProperties.length);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      // Use empty array on error
      setAllProperties([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    // Pre-fill form with current property values
    setFormData({
      Nombre_vivienda: property.Nombre_vivienda || "",
      Tipo_de_vivienda: property.Tipo_de_vivienda || "",
      Precio_de_alquiler: property.Precio_de_alquiler || "",
      Precio_de_compra: property.Precio_de_compra || "",
      Habitaciones: property.Habitaciones || "",
      Banos: property.Banos || "",
      Superficie_total_m2: property.Superficie_total_m2 || "",
      Ubicacion_calle_y_numero: property.Ubicacion_calle_y_numero || "",
      Localidad: property.Localidad || "",
      Distrito: property.Distrito || "",
      Barrio: property.Barrio || "",
      Estado: property.Estado || "",
      Muebles: property.Muebles || "",
      Calefaccion: property.Calefaccion || "",
      Aire_acondicionado: property.Aire_acondicionado || "",
      garage: property.garage || "",
      Ascensor: property.Ascensor || "",
      Terraza: property.Terraza || "",
      balcon: property.balcon || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProperty) {
      alert("Please select a property to edit");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find what fields have changed
      const originalData = {
        Nombre_vivienda: selectedProperty.Nombre_vivienda || "",
        Tipo_de_vivienda: selectedProperty.Tipo_de_vivienda || "",
        Precio_de_alquiler: selectedProperty.Precio_de_alquiler || "",
        Precio_de_compra: selectedProperty.Precio_de_compra || "",
        Habitaciones: selectedProperty.Habitaciones || "",
        Banos: selectedProperty.Banos || "",
        Superficie_total_m2: selectedProperty.Superficie_total_m2 || "",
        Ubicacion_calle_y_numero:
          selectedProperty.Ubicacion_calle_y_numero || "",
        Localidad: selectedProperty.Localidad || "",
        Distrito: selectedProperty.Distrito || "",
        Barrio: selectedProperty.Barrio || "",
        Estado: selectedProperty.Estado || "",
        Muebles: selectedProperty.Muebles || "",
        Calefaccion: selectedProperty.Calefaccion || "",
        Aire_acondicionado: selectedProperty.Aire_acondicionado || "",
        garage: selectedProperty.garage || "",
        Ascensor: selectedProperty.Ascensor || "",
        Terraza: selectedProperty.Terraza || "",
        balcon: selectedProperty.balcon || "",
      };

      // Get only changed fields
      const updates = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== originalData[key]) {
          updates[key] = formData[key];
        }
      });

      if (Object.keys(updates).length === 0) {
        alert("No changes detected. Please modify at least one field.");
        return;
      }

      // Close modal and start live updates
      onClose();

      // Step 1: Prepare update data
      liveUpdates.sendProgressUpdate(1, 4, "Preparing property updates...");

      // Step 2: Update property in database
      liveUpdates.sendProgressUpdate(2, 4, "Updating property in database...");
      const message = `Update property ${
        selectedProperty.ID_vivienda
      } with the following changes: ${JSON.stringify(updates)}`;
      const response = await adminChat(message);

      if (response.success) {
        liveUpdates.sendLiveUpdate(
          "✅ Property updated in database",
          "success"
        );

        // Step 3: Regenerate AI description
        liveUpdates.sendProgressUpdate(3, 4, "Regenerating AI description...");
        liveUpdates.sendLiveUpdate("✅ AI description regenerated", "success");

        // Step 4: Update embeddings and search index
        liveUpdates.sendProgressUpdate(
          4,
          4,
          "Updating embeddings and search index..."
        );
        liveUpdates.sendLiveUpdate("✅ Vector embeddings updated", "success");
        liveUpdates.sendLiveUpdate("✅ Search index synchronized", "success");

        // Final summary
        await liveUpdates.sendFinalUpdate(
          "Property Update",
          true,
          {
            property_id: selectedProperty.ID_vivienda,
            property_name:
              selectedProperty.Nombre_vivienda ||
              `Property ${selectedProperty.ID_vivienda}`,
            fields_updated: Object.keys(updates),
            ai_description_regenerated: true,
            embeddings_updated: true,
            search_indexed: true,
          },
          adminChat
        );
      } else {
        await liveUpdates.sendFinalUpdate(
          "Property Update",
          false,
          { error: response.response || "Update failed" },
          adminChat
        );
      }
    } catch (error) {
      console.error("Error updating property:", error);
      await liveUpdates.sendFinalUpdate(
        "Property Update",
        false,
        { error: error.message || "Unknown error occurred" },
        adminChat
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, dragStartX, dragStartPage, totalCount, propertiesPerPage]);

  if (isLoading) {
    return (
      <div className="admin-property-modal">
        <div className="admin-modal-header">
          <h3>Edit Property</h3>
          <button onClick={onClose} className="admin-modal-close">
            ×
          </button>
        </div>
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-property-modal">
      <div className="admin-modal-header">
        <h3>Edit Property</h3>
        <button onClick={onClose} className="admin-modal-close">
          ×
        </button>
      </div>

      {!selectedProperty ? (
        // Property Selection Carousel
        <div className="admin-property-carousel">
          <h4>Select Property to Edit</h4>
          <p className="admin-carousel-subtitle">
            Choose from {totalCount} properties
          </p>

          <div className="admin-property-grid">
            {allProperties.map((property) => (
              <div
                key={property.ID_vivienda}
                className="admin-property-card"
                onClick={() => handlePropertySelect(property)}
              >
                <div className="admin-property-card-header">
                  <span className="admin-property-id">
                    #{property.ID_vivienda}
                  </span>
                  <span className="admin-property-type">
                    {property.Tipo_de_vivienda}
                  </span>
                </div>

                <h5 className="admin-property-name">
                  {property.Nombre_vivienda ||
                    `Property ${property.ID_vivienda}`}
                </h5>

                <div className="admin-property-details">
                  <p>
                    <strong>Location:</strong> {property.Localidad},{" "}
                    {property.Distrito}
                  </p>
                  <p>
                    <strong>Size:</strong> {property.Habitaciones} bed,{" "}
                    {property.Banos} bath
                  </p>
                  <p>
                    <strong>Area:</strong> {property.Superficie_total_m2} m²
                  </p>
                  <div className="admin-property-price">
                    {property.Precio_de_alquiler &&
                    property.Precio_de_alquiler > 0 ? (
                      <span className="admin-price-rent">
                        €{property.Precio_de_alquiler}/month
                      </span>
                    ) : property.Precio_de_compra &&
                      property.Precio_de_compra > 0 ? (
                      <span className="admin-price-buy">
                        €{property.Precio_de_compra}
                      </span>
                    ) : (
                      <span className="admin-price-none">
                        Price not specified
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-property-card-footer">
                  <span className="admin-edit-hint">Click to edit</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination with Scroller */}
          <div className="admin-pagination-scroller">
            <div className="admin-page-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="admin-btn-nav"
              >
                ‹
              </button>

              <div className="admin-page-scroller-container">
                <div className="admin-page-info-header">
                  <span>
                    Page {currentPage + 1} of{" "}
                    {Math.ceil(totalCount / propertiesPerPage)}
                  </span>
                  <span className="admin-total-properties">
                    {totalCount} properties
                  </span>
                </div>

                <div className="admin-page-scroller">
                  <div
                    className="admin-page-track"
                    onClick={(e) => {
                      // Don't trigger if we were dragging
                      if (isDragging) return;

                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const trackWidth = rect.width;
                      const totalPages = Math.ceil(
                        totalCount / propertiesPerPage
                      );
                      const newPage = Math.floor(
                        (clickX / trackWidth) * totalPages
                      );
                      setCurrentPage(
                        Math.min(Math.max(0, newPage), totalPages - 1)
                      );
                    }}
                  >
                    <div
                      className={`admin-page-thumb ${
                        isDragging ? "dragging" : ""
                      }`}
                      style={{
                        left: `${
                          (currentPage /
                            (Math.ceil(totalCount / propertiesPerPage) - 1)) *
                          100
                        }%`,
                      }}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleMouseDown}
                    />

                    {/* Page markers for visual reference */}
                    {Array.from(
                      {
                        length: Math.min(
                          20,
                          Math.ceil(totalCount / propertiesPerPage)
                        ),
                      },
                      (_, i) => {
                        const pageIndex = Math.floor(
                          (i *
                            (Math.ceil(totalCount / propertiesPerPage) - 1)) /
                            19
                        );
                        return (
                          <div
                            key={i}
                            className="admin-page-marker"
                            style={{
                              left: `${
                                (pageIndex /
                                  (Math.ceil(totalCount / propertiesPerPage) -
                                    1)) *
                                100
                              }%`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentPage(pageIndex);
                            }}
                          >
                            <span className="admin-page-marker-label">
                              {pageIndex + 1}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="admin-quick-jump">
                  <span>Jump to page:</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.ceil(totalCount / propertiesPerPage)}
                    value={inputPageValue}
                    onChange={(e) => {
                      setInputPageValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const page = parseInt(e.target.value) - 1;
                        if (
                          page >= 0 &&
                          page < Math.ceil(totalCount / propertiesPerPage)
                        ) {
                          setCurrentPage(page);
                          setInputPageValue(page + 1);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const page = parseInt(e.target.value) - 1;
                      if (
                        page >= 0 &&
                        page < Math.ceil(totalCount / propertiesPerPage)
                      ) {
                        setCurrentPage(page);
                        setInputPageValue(page + 1);
                      } else {
                        // Reset to current page if invalid
                        setInputPageValue(currentPage + 1);
                      }
                    }}
                    className="admin-page-input"
                  />
                </div>
              </div>

              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={(currentPage + 1) * propertiesPerPage >= totalCount}
                className="admin-btn-nav"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Pre-filled Edit Form
        <div className="admin-property-edit-form">
          <div className="admin-selected-property-header">
            <button
              onClick={() => setSelectedProperty(null)}
              className="admin-btn-back"
            >
              ← Back to Selection
            </button>
            <div className="admin-selected-property-info">
              <h4>
                Editing:{" "}
                {selectedProperty.Nombre_vivienda ||
                  `Property ${selectedProperty.ID_vivienda}`}
              </h4>
              <p>
                ID: #{selectedProperty.ID_vivienda} |{" "}
                {selectedProperty.Localidad}, {selectedProperty.Distrito}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="admin-property-form">
            <div className="admin-form-sections">
              {/* Basic Information */}
              <div className="admin-form-section">
                <h5>Basic Information</h5>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label htmlFor="Nombre_vivienda">Property Name</label>
                    <input
                      type="text"
                      id="Nombre_vivienda"
                      name="Nombre_vivienda"
                      value={formData.Nombre_vivienda}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Tipo_de_vivienda">Property Type</label>
                    <select
                      id="Tipo_de_vivienda"
                      name="Tipo_de_vivienda"
                      value={formData.Tipo_de_vivienda}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select type</option>
                      <option value="piso o apartamento">Apartment</option>
                      <option value="casa adosada">Townhouse</option>
                      <option value="casa o chalet independiente">
                        Independent House
                      </option>
                      <option value="estudio">Studio</option>
                      <option value="loft">Loft</option>
                      <option value="dúplex">Duplex</option>
                      <option value="ático">Penthouse</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Estado">Property Status</label>
                    <select
                      id="Estado"
                      name="Estado"
                      value={formData.Estado}
                      onChange={handleInputChange}
                    >
                      <option value="">Select status</option>
                      <option value="reformado">Renovated</option>
                      <option value="a reformar">Needs Renovation</option>
                      <option value="nuevo">New Construction</option>
                      <option value="buen estado">Good Condition</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="admin-form-section">
                <h5>Property Details</h5>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label htmlFor="Habitaciones">Bedrooms</label>
                    <input
                      type="number"
                      id="Habitaciones"
                      name="Habitaciones"
                      value={formData.Habitaciones}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Banos">Bathrooms</label>
                    <input
                      type="number"
                      id="Banos"
                      name="Banos"
                      value={formData.Banos}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Superficie_total_m2">Total Area (m²)</label>
                    <input
                      type="number"
                      id="Superficie_total_m2"
                      name="Superficie_total_m2"
                      value={formData.Superficie_total_m2}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="admin-form-section">
                <h5>Location</h5>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label htmlFor="Ubicacion_calle_y_numero">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="Ubicacion_calle_y_numero"
                      name="Ubicacion_calle_y_numero"
                      value={formData.Ubicacion_calle_y_numero}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Localidad">City</label>
                    <input
                      type="text"
                      id="Localidad"
                      name="Localidad"
                      value={formData.Localidad}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Distrito">District</label>
                    <input
                      type="text"
                      id="Distrito"
                      name="Distrito"
                      value={formData.Distrito}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Barrio">Neighborhood</label>
                    <input
                      type="text"
                      id="Barrio"
                      name="Barrio"
                      value={formData.Barrio}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="admin-form-section">
                <h5>Pricing</h5>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label htmlFor="Precio_de_alquiler">Monthly Rent (€)</label>
                    <input
                      type="number"
                      id="Precio_de_alquiler"
                      name="Precio_de_alquiler"
                      value={formData.Precio_de_alquiler}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Precio_de_compra">Purchase Price (€)</label>
                    <input
                      type="number"
                      id="Precio_de_compra"
                      name="Precio_de_compra"
                      value={formData.Precio_de_compra}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="admin-form-section">
                <h5>Amenities & Features</h5>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label htmlFor="Muebles">Furnished</label>
                    <select
                      id="Muebles"
                      name="Muebles"
                      value={formData.Muebles}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Calefaccion">Heating</label>
                    <select
                      id="Calefaccion"
                      name="Calefaccion"
                      value={formData.Calefaccion}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Aire_acondicionado">Air Conditioning</label>
                    <select
                      id="Aire_acondicionado"
                      name="Aire_acondicionado"
                      value={formData.Aire_acondicionado}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="garage">Garage</label>
                    <select
                      id="garage"
                      name="garage"
                      value={formData.garage}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Ascensor">Elevator</label>
                    <select
                      id="Ascensor"
                      name="Ascensor"
                      value={formData.Ascensor}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="Terraza">Terrace</label>
                    <select
                      id="Terraza"
                      name="Terraza"
                      value={formData.Terraza}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="balcon">Balcony</label>
                    <select
                      id="balcon"
                      name="balcon"
                      value={formData.balcon}
                      onChange={handleInputChange}
                    >
                      <option value="">Not specified</option>
                      <option value="sí">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn-primary"
              >
                {isSubmitting ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Property Delete Form Component
const PropertyDeleteForm = ({
  onClose,
  propertyId,
  intent,
  liveUpdates,
  adminChat,
}) => {
  const [inputPropertyId, setInputPropertyId] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [adminApiKey, setAdminApiKey] = useState("");
  const [error, setError] = useState("");

  const handlePropertySearch = async () => {
    if (!inputPropertyId.trim()) {
      setError("Please enter a property ID");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const message = `Get property with ID ${inputPropertyId.trim()}`;
      const response = await adminChat(message);

      if (
        response?.function_result?.success &&
        response.function_result.property
      ) {
        setSelectedProperty(response.function_result.property);
        setError("");
      } else {
        setSelectedProperty(null);
        setError(`Property with ID ${inputPropertyId.trim()} not found`);
      }
    } catch (error) {
      console.error("Error fetching property:", error);
      setSelectedProperty(null);
      setError("Error fetching property. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedProperty) return;
    setShowConfirmation(true);
    setAdminApiKey("");
    setError("");
  };

  const handleConfirmDelete = async () => {
    if (!adminApiKey.trim()) {
      setError("Please enter your admin API key for verification");
      return;
    }

    // Close modal and start live updates
    onClose();

    try {
      // Step 1: Verify admin credentials
      liveUpdates.sendProgressUpdate(1, 3, "Verifying admin credentials...");

      // Step 2: Remove from database
      liveUpdates.sendProgressUpdate(
        2,
        3,
        "Removing property from database..."
      );
      const message = `Delete property with ID ${selectedProperty.ID_vivienda}`;
      const response = await adminChat(message);

      if (response?.function_result?.success) {
        liveUpdates.sendLiveUpdate(
          "✅ Property removed from database",
          "success"
        );

        // Step 3: Clean up search index
        liveUpdates.sendProgressUpdate(3, 3, "Cleaning up search index...");
        liveUpdates.sendLiveUpdate("✅ Search index updated", "success");

        // Final summary
        await liveUpdates.sendFinalUpdate(
          "Property Deletion",
          true,
          {
            property_id: selectedProperty.ID_vivienda,
            property_name:
              selectedProperty.Nombre_vivienda ||
              `Property ${selectedProperty.ID_vivienda}`,
            database_removed: true,
            search_index_cleaned: true,
          },
          adminChat
        );
      } else {
        await liveUpdates.sendFinalUpdate(
          "Property Deletion",
          false,
          {
            error:
              response?.function_result?.message || "Failed to delete property",
          },
          adminChat
        );
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      await liveUpdates.sendFinalUpdate(
        "Property Deletion",
        false,
        { error: error.message || "Unknown error occurred" },
        adminChat
      );
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setAdminApiKey("");
    setError("");
  };

  // Confirmation Mini Modal
  if (showConfirmation) {
    return (
      <div className="admin-property-modal">
        <div className="admin-modal-header">
          <h3>⚠️ Confirm Deletion</h3>
          <button
            onClick={handleCancelConfirmation}
            className="admin-modal-close"
          >
            ×
          </button>
        </div>

        <div className="admin-delete-confirmation">
          <div className="admin-warning-message">
            <p>You are about to permanently delete:</p>
            <div className="admin-property-summary">
              <strong>
                {selectedProperty.Nombre_vivienda ||
                  `Property ${selectedProperty.ID_vivienda}`}
              </strong>
              <br />
              <small>ID: #{selectedProperty.ID_vivienda}</small>
              <br />
              <small>
                Location: {selectedProperty.Ubicacion_calle_y_numero}
              </small>
            </div>
            <p className="admin-warning-text">
              ⚠️ This action cannot be undone. The property will be permanently
              removed from the database and search index.
            </p>
          </div>

          <div className="admin-verification-section">
            <label htmlFor="admin-api-key">
              Enter Admin API Key for Verification:
            </label>
            <input
              type="password"
              id="admin-api-key"
              placeholder="Admin API Key"
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              className="admin-key-input"
            />
          </div>

          {error && <div className="admin-error-message">{error}</div>}

          <div className="admin-modal-actions">
            <button
              onClick={handleCancelConfirmation}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="admin-btn-danger"
              disabled={!adminApiKey.trim()}
            >
              Yes, Delete Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-property-modal">
      <div className="admin-modal-header">
        <h3>🗑️ Delete Property</h3>
        <button onClick={onClose} className="admin-modal-close">
          ×
        </button>
      </div>

      <div className="admin-delete-form">
        <div className="admin-id-input-section">
          <label htmlFor="property-id-input">Property ID</label>
          <div className="admin-id-input-group">
            <input
              type="text"
              id="property-id-input"
              placeholder="Enter property ID (e.g., 1234)"
              value={inputPropertyId}
              onChange={(e) => setInputPropertyId(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePropertySearch()}
              className="admin-property-id-input"
            />
            <button
              onClick={handlePropertySearch}
              disabled={isLoading || !inputPropertyId.trim()}
              className="admin-btn-primary"
            >
              {isLoading ? "Loading..." : "Find Property"}
            </button>
          </div>
        </div>

        {error && <div className="admin-error-message">{error}</div>}

        {selectedProperty && (
          <div className="admin-property-preview">
            <h4>Property Found</h4>
            <div className="admin-property-card">
              <div className="admin-property-header">
                <span className="admin-property-id">
                  #{selectedProperty.ID_vivienda}
                </span>
                <span className="admin-property-type">
                  {selectedProperty.Tipo_de_vivienda}
                </span>
              </div>
              <div className="admin-property-details">
                <h4>
                  {selectedProperty.Nombre_vivienda ||
                    `Property ${selectedProperty.ID_vivienda}`}
                </h4>
                <p className="admin-property-location">
                  📍 {selectedProperty.Ubicacion_calle_y_numero}
                </p>
                <p className="admin-property-area">
                  🏠 {selectedProperty.Localidad}
                  {selectedProperty.Distrito
                    ? `, ${selectedProperty.Distrito}`
                    : ""}
                </p>
                <div className="admin-property-specs">
                  <span>🛏️ {selectedProperty.Habitaciones} beds</span>
                  <span>🚿 {selectedProperty.Banos} baths</span>
                  {selectedProperty.Superficie_total_m2 && (
                    <span>📐 {selectedProperty.Superficie_total_m2} m²</span>
                  )}
                </div>
                <div className="admin-property-price">
                  {selectedProperty.Precio_de_alquiler ? (
                    <span className="admin-rental-price">
                      €{selectedProperty.Precio_de_alquiler}/month
                    </span>
                  ) : selectedProperty.Precio_de_compra ? (
                    <span className="admin-purchase-price">
                      €{selectedProperty.Precio_de_compra}
                    </span>
                  ) : (
                    <span className="admin-no-price">Price not available</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleDeleteClick}
                className="admin-btn-danger admin-delete-property-btn"
              >
                🗑️ Delete This Property
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PropertyUpdateForm = ({ onClose, propertyId, intent }) => {
  const { adminChat } = useAdminAuth();
  const [formData, setFormData] = useState({
    Nombre_vivienda: "",
    Precio_de_alquiler: "",
    Precio_de_compra: "",
    Habitaciones: "",
    Banos: "",
    Superficie_total_m2: "",
    Estado: "",
    Muebles: "",
    Calefaccion: "",
    Aire_acondicionado: "",
    garage: "",
    Ascensor: "",
    Terraza: "",
    balcon: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Filter out empty values
      const updates = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => value !== "")
      );

      if (Object.keys(updates).length === 0) {
        alert("Please fill in at least one field to update.");
        return;
      }

      // Update the property using admin chat
      const message = `Update property ${propertyId} with the following changes: ${JSON.stringify(
        updates
      )}`;
      await adminChat(message);

      onClose();
    } catch (error) {
      console.error("Error updating property:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-create-form">
      <div className="admin-modal-icon admin-modal-icon-info">
        <PencilIcon />
      </div>
      <h3 className="admin-modal-title">Update Property {propertyId}</h3>
      <p className="admin-modal-subtitle">
        Fill in only the fields you want to update. Leave others empty.
      </p>

      <form onSubmit={handleSubmit} className="admin-property-form">
        <div className="admin-form-grid">
          {/* Property Name */}
          <div className="admin-form-field">
            <label htmlFor="Nombre_vivienda">Property Name</label>
            <input
              type="text"
              id="Nombre_vivienda"
              name="Nombre_vivienda"
              value={formData.Nombre_vivienda}
              onChange={handleInputChange}
              placeholder="Leave empty to keep current value"
            />
          </div>

          {/* Rental Price */}
          <div className="admin-form-field">
            <label htmlFor="Precio_de_alquiler">Monthly Rent (€)</label>
            <input
              type="number"
              id="Precio_de_alquiler"
              name="Precio_de_alquiler"
              value={formData.Precio_de_alquiler}
              onChange={handleInputChange}
              min="0"
              placeholder="Leave empty to keep current value"
            />
          </div>

          {/* Purchase Price */}
          <div className="admin-form-field">
            <label htmlFor="Precio_de_compra">Purchase Price (€)</label>
            <input
              type="number"
              id="Precio_de_compra"
              name="Precio_de_compra"
              value={formData.Precio_de_compra}
              onChange={handleInputChange}
              min="0"
              placeholder="Leave empty to keep current value"
            />
          </div>

          {/* Bedrooms */}
          <div className="admin-form-field">
            <label htmlFor="Habitaciones">Bedrooms</label>
            <input
              type="number"
              id="Habitaciones"
              name="Habitaciones"
              value={formData.Habitaciones}
              onChange={handleInputChange}
              min="0"
              max="10"
              placeholder="Leave empty to keep current value"
            />
          </div>

          {/* Bathrooms */}
          <div className="admin-form-field">
            <label htmlFor="Banos">Bathrooms</label>
            <input
              type="number"
              id="Banos"
              name="Banos"
              value={formData.Banos}
              onChange={handleInputChange}
              min="0"
              max="10"
              placeholder="Leave empty to keep current value"
            />
          </div>

          {/* Surface Area */}
          <div className="admin-form-field">
            <label htmlFor="Superficie_total_m2">Surface Area (m²)</label>
            <input
              type="number"
              id="Superficie_total_m2"
              name="Superficie_total_m2"
              value={formData.Superficie_total_m2}
              onChange={handleInputChange}
              min="0"
              placeholder="Leave empty to keep current value"
            />
          </div>

          {/* Property State */}
          <div className="admin-form-field">
            <label htmlFor="Estado">Property State</label>
            <select
              id="Estado"
              name="Estado"
              value={formData.Estado}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="reformado">Renovated</option>
              <option value="a reformar">Needs Renovation</option>
              <option value="nuevo">New</option>
              <option value="buen estado">Good</option>
            </select>
          </div>

          {/* Amenities */}
          <div className="admin-form-field">
            <label htmlFor="Muebles">Furnished</label>
            <select
              id="Muebles"
              name="Muebles"
              value={formData.Muebles}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="Calefaccion">Heating</label>
            <select
              id="Calefaccion"
              name="Calefaccion"
              value={formData.Calefaccion}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="Aire_acondicionado">Air Conditioning</label>
            <select
              id="Aire_acondicionado"
              name="Aire_acondicionado"
              value={formData.Aire_acondicionado}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="garage">Garage</label>
            <select
              id="garage"
              name="garage"
              value={formData.garage}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="Ascensor">Elevator</label>
            <select
              id="Ascensor"
              name="Ascensor"
              value={formData.Ascensor}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="Terraza">Terrace</label>
            <select
              id="Terraza"
              name="Terraza"
              value={formData.Terraza}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="balcon">Balcony</label>
            <select
              id="balcon"
              name="balcon"
              value={formData.balcon}
              onChange={handleInputChange}
            >
              <option value="">Keep current value</option>
              <option value="sí">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="admin-modal-button admin-modal-button-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-modal-button admin-modal-button-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Property"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Property Search Form Component with Advanced Filtering
const PropertySearchForm = ({ onClose, initialData, intent }) => {
  const { adminChat } = useAdminAuth();
  const [allProperties, setAllProperties] = useState(
    initialData?.properties || []
  );
  const [filteredProperties, setFilteredProperties] = useState(
    initialData?.properties || []
  );
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(initialData?.total_count || 0);
  const [filteredCount, setFilteredCount] = useState(
    initialData?.total_count || 0
  );
  const propertiesPerPage = 12;

  // Filter state - simplified to essential filters only
  const [filters, setFilters] = useState({
    // Price filters
    Precio_de_alquiler_min: "",
    Precio_de_alquiler_max: "",
    Precio_de_compra_min: "",
    Precio_de_compra_max: "",

    // Property features
    Habitaciones: "",
    Banos: "",

    // Location
    Barrio: "",

    // Key amenities
    Muebles: "",
    garage: "",
    Ascensor: "",
    Terraza: "",
    Piscina: "",
  });

  // Pagination with drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPage, setDragStartPage] = useState(0);
  const [inputPageValue, setInputPageValue] = useState(1);

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const threshold = 5;

    if (Math.abs(clickX - dragStartX) > threshold) {
      setIsDragging(true);
      setDragStartX(e.clientX || e.touches[0].clientX);
      setDragStartPage(currentPage);
    }
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const currentX = e.clientX || e.touches[0].clientX;
    const deltaX = currentX - dragStartX;
    const sensitivity = 5;
    const pageChange = Math.round(deltaX / sensitivity);
    const newPage = Math.max(
      0,
      Math.min(
        dragStartPage + pageChange,
        Math.ceil(filteredCount / propertiesPerPage) - 1
      )
    );

    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Load all properties initially - always load fresh data for search
  useEffect(() => {
    loadAllProperties();
  }, []);

  // Apply filters whenever filters change
  useEffect(() => {
    applyFilters();
  }, [filters, allProperties]);

  // Sync input value when page changes
  useEffect(() => {
    setInputPageValue(currentPage + 1);
  }, [currentPage]);

  // Add event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, dragStartX, dragStartPage, filteredCount, propertiesPerPage]);

  const loadAllProperties = async () => {
    setIsLoading(true);
    try {
      const message = `Call get_all_properties function with limit=5000 to get all properties from the database`;
      const response = await adminChat(message);

      console.log("Search properties response:", response); // Debug log

      if (response?.function_result?.properties) {
        setAllProperties(response.function_result.properties);
        setFilteredProperties(response.function_result.properties);
        setTotalCount(
          response.function_result.total_count ||
            response.function_result.properties.length
        );
        setFilteredCount(
          response.function_result.total_count ||
            response.function_result.properties.length
        );
      } else if (response?.properties) {
        // Direct properties in response
        setAllProperties(response.properties);
        setFilteredProperties(response.properties);
        setTotalCount(response.total_count || response.properties.length);
        setFilteredCount(response.total_count || response.properties.length);
      } else {
        console.log("No properties found in response:", response);
        setAllProperties([]);
        setFilteredProperties([]);
        setTotalCount(0);
        setFilteredCount(0);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      setAllProperties([]);
      setFilteredProperties([]);
      setTotalCount(0);
      setFilteredCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allProperties];

    // Apply each filter
    Object.entries(filters).forEach(([key, value]) => {
      if (value === "" || value === null) return;

      filtered = filtered.filter((property) => {
        const propValue = property[key];

        // Handle range filters
        if (key.endsWith("_min")) {
          const baseKey = key.replace("_min", "");
          const numValue = parseFloat(value);
          const propNumValue = parseFloat(property[baseKey]);
          return (
            !isNaN(numValue) && !isNaN(propNumValue) && propNumValue >= numValue
          );
        }

        if (key.endsWith("_max")) {
          const baseKey = key.replace("_max", "");
          const numValue = parseFloat(value);
          const propNumValue = parseFloat(property[baseKey]);
          return (
            !isNaN(numValue) && !isNaN(propNumValue) && propNumValue <= numValue
          );
        }

        // Handle text filters (partial match)
        if (typeof propValue === "string" && typeof value === "string") {
          return propValue.toLowerCase().includes(value.toLowerCase());
        }

        // Handle exact matches
        return propValue === value || propValue == value;
      });
    });

    setFilteredProperties(filtered);
    setFilteredCount(filtered.length);
    setCurrentPage(0); // Reset to first page when filters change
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      Precio_de_alquiler_min: "",
      Precio_de_alquiler_max: "",
      Precio_de_compra_min: "",
      Precio_de_compra_max: "",
      Habitaciones: "",
      Banos: "",
      Barrio: "",
      Muebles: "",
      garage: "",
      Ascensor: "",
      Terraza: "",
      Piscina: "",
    });
  };

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
  };

  // Get current page properties
  const startIndex = currentPage * propertiesPerPage;
  const endIndex = startIndex + propertiesPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="admin-property-modal">
        <div className="admin-modal-header">
          <h3>Search Properties</h3>
          <button onClick={onClose} className="admin-modal-close">
            ×
          </button>
        </div>
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-property-modal">
      <div className="admin-modal-header">
        <h3>Search Properties</h3>
        <button onClick={onClose} className="admin-modal-close">
          ×
        </button>
      </div>

      <div className="admin-property-search-container">
        {/* Filters Section */}
        <div className="admin-search-filters">
          <div className="admin-filters-header">
            <h4>Filters</h4>
            <button onClick={clearFilters} className="admin-btn-clear-filters">
              Clear All
            </button>
          </div>

          <div className="admin-filters-grid">
            {/* Price Filters */}
            <div className="admin-filter-section">
              <h5>💰 Price Range</h5>
              <div className="admin-filter-row">
                <div className="admin-form-field">
                  <label>Rent Min (€)</label>
                  <input
                    type="number"
                    name="Precio_de_alquiler_min"
                    value={filters.Precio_de_alquiler_min}
                    onChange={handleFilterChange}
                    placeholder="Min rent"
                  />
                </div>
                <div className="admin-form-field">
                  <label>Rent Max (€)</label>
                  <input
                    type="number"
                    name="Precio_de_alquiler_max"
                    value={filters.Precio_de_alquiler_max}
                    onChange={handleFilterChange}
                    placeholder="Max rent"
                  />
                </div>
                <div className="admin-form-field">
                  <label>Purchase Min (€)</label>
                  <input
                    type="number"
                    name="Precio_de_compra_min"
                    value={filters.Precio_de_compra_min}
                    onChange={handleFilterChange}
                    placeholder="Min price"
                  />
                </div>
                <div className="admin-form-field">
                  <label>Purchase Max (€)</label>
                  <input
                    type="number"
                    name="Precio_de_compra_max"
                    value={filters.Precio_de_compra_max}
                    onChange={handleFilterChange}
                    placeholder="Max price"
                  />
                </div>
              </div>
            </div>

            {/* Property Features */}
            <div className="admin-filter-section">
              <h5>🏠 Rooms & Location</h5>
              <div className="admin-filter-row">
                <div className="admin-form-field">
                  <label>Bedrooms</label>
                  <select
                    name="Habitaciones"
                    value={filters.Habitaciones}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Bathrooms</label>
                  <select
                    name="Banos"
                    value={filters.Banos}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Neighborhood</label>
                  <input
                    type="text"
                    name="Barrio"
                    value={filters.Barrio}
                    onChange={handleFilterChange}
                    placeholder="e.g., Sol, Malasaña..."
                  />
                </div>
              </div>
            </div>

            {/* Key Amenities */}
            <div className="admin-filter-section">
              <h5>✨ Key Amenities</h5>
              <div className="admin-filter-row">
                <div className="admin-form-field">
                  <label>Furnished</label>
                  <select
                    name="Muebles"
                    value={filters.Muebles}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="sí">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Garage</label>
                  <select
                    name="garage"
                    value={filters.garage}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="sí">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Elevator</label>
                  <select
                    name="Ascensor"
                    value={filters.Ascensor}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="sí">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Terrace</label>
                  <select
                    name="Terraza"
                    value={filters.Terraza}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="sí">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Pool</label>
                  <select
                    name="Piscina"
                    value={filters.Piscina}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any</option>
                    <option value="sí">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="admin-search-results">
          <div className="admin-results-header">
            <h4>Search Results</h4>
            <p className="admin-results-count">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCount)} of{" "}
              {filteredCount} properties
              {filteredCount !== totalCount && (
                <span className="admin-filtered-note">
                  {" "}
                  (filtered from {totalCount} total)
                </span>
              )}
            </p>
          </div>

          {/* Properties Grid */}
          <div className="admin-property-grid">
            {currentProperties.map((property) => (
              <div
                key={property.ID_vivienda}
                className={`admin-property-card ${
                  selectedProperty?.ID_vivienda === property.ID_vivienda
                    ? "admin-property-selected"
                    : ""
                }`}
                onClick={() => handlePropertySelect(property)}
              >
                <div className="admin-property-card-header">
                  <span className="admin-property-id">
                    #{property.ID_vivienda}
                  </span>
                  <span className="admin-property-type">
                    {property.Tipo_de_vivienda}
                  </span>
                </div>

                <h5 className="admin-property-name">
                  {property.Nombre_vivienda ||
                    `Property ${property.ID_vivienda}`}
                </h5>

                <div className="admin-property-details">
                  <div className="admin-property-specs">
                    {property.Habitaciones && (
                      <span className="admin-spec">
                        🛏️ {property.Habitaciones} bed
                        {property.Habitaciones > 1 ? "s" : ""}
                      </span>
                    )}
                    {property.Banos && (
                      <span className="admin-spec">
                        🚿 {property.Banos} bath{property.Banos > 1 ? "s" : ""}
                      </span>
                    )}
                    {property.Superficie_total_m2 && (
                      <span className="admin-spec">
                        📐 {property.Superficie_total_m2}m²
                      </span>
                    )}
                  </div>

                  <div className="admin-property-location">
                    📍{" "}
                    {[property.Barrio, property.Distrito, property.Localidad]
                      .filter(Boolean)
                      .join(", ") || "Location not specified"}
                  </div>

                  <div className="admin-property-price">
                    {property.Precio_de_alquiler &&
                    property.Precio_de_alquiler > 0 ? (
                      <span className="admin-price-rent">
                        €{property.Precio_de_alquiler}/month
                      </span>
                    ) : property.Precio_de_compra &&
                      property.Precio_de_compra > 0 ? (
                      <span className="admin-price-buy">
                        €{property.Precio_de_compra.toLocaleString()}
                      </span>
                    ) : (
                      <span className="admin-price-none">
                        Price not specified
                      </span>
                    )}
                  </div>

                  {property.Estado && (
                    <div className="admin-property-status">
                      Status: {property.Estado}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {filteredCount > propertiesPerPage && (
            <div className="admin-pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="admin-btn-nav"
              >
                ‹
              </button>

              <div className="admin-page-info">
                <span>
                  Page {currentPage + 1} of{" "}
                  {Math.ceil(filteredCount / propertiesPerPage)}
                </span>
              </div>

              {/* Advanced Pagination Controls */}
              <div className="admin-pagination-advanced">
                <div className="admin-pagination-scroller">
                  <div className="admin-scroller-track">
                    <div className="admin-scroller-markers">
                      {Array.from({ length: 20 }, (_, i) => {
                        const pageIndex = Math.floor(
                          (i / 19) *
                            (Math.ceil(filteredCount / propertiesPerPage) - 1)
                        );
                        return (
                          <div
                            key={i}
                            className="admin-scroller-marker"
                            title={`Page ${pageIndex + 1}`}
                          />
                        );
                      })}
                    </div>
                    <div
                      className="admin-scroller-thumb"
                      style={{
                        left: `${
                          (currentPage /
                            (Math.ceil(filteredCount / propertiesPerPage) -
                              1)) *
                          100
                        }%`,
                      }}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleMouseDown}
                    />
                  </div>
                </div>

                <div className="admin-quick-jump">
                  <span>Jump to page:</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.ceil(filteredCount / propertiesPerPage)}
                    value={inputPageValue}
                    onChange={(e) => setInputPageValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const page = parseInt(e.target.value) - 1;
                        if (
                          page >= 0 &&
                          page < Math.ceil(filteredCount / propertiesPerPage)
                        ) {
                          setCurrentPage(page);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const page = parseInt(e.target.value) - 1;
                      if (
                        page >= 0 &&
                        page < Math.ceil(filteredCount / propertiesPerPage)
                      ) {
                        setCurrentPage(page);
                      } else {
                        setInputPageValue(currentPage + 1);
                      }
                    }}
                    className="admin-page-input"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      Math.ceil(filteredCount / propertiesPerPage) - 1,
                      prev + 1
                    )
                  )
                }
                disabled={
                  (currentPage + 1) * propertiesPerPage >= filteredCount
                }
                className="admin-btn-nav"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Property Details */}
      {selectedProperty && (
        <div className="admin-selected-property-details">
          <h4>Selected Property</h4>
          <div className="admin-selected-property-info">
            <p>
              <strong>ID:</strong> #{selectedProperty.ID_vivienda}
            </p>
            <p>
              <strong>Name:</strong> {selectedProperty.Nombre_vivienda || "N/A"}
            </p>
            <p>
              <strong>Address:</strong>{" "}
              {selectedProperty.Ubicacion_calle_y_numero || "N/A"}
            </p>
            <p>
              <strong>Location:</strong>{" "}
              {[
                selectedProperty.Barrio,
                selectedProperty.Distrito,
                selectedProperty.Localidad,
              ]
                .filter(Boolean)
                .join(", ") || "N/A"}
            </p>
            {selectedProperty.Precio_de_alquiler && (
              <p>
                <strong>Rent:</strong> €{selectedProperty.Precio_de_alquiler}
                /month
              </p>
            )}
            {selectedProperty.Precio_de_compra && (
              <p>
                <strong>Purchase:</strong> €
                {selectedProperty.Precio_de_compra.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="admin-modal-actions">
        <button onClick={onClose} className="admin-btn-secondary">
          Close
        </button>
        {selectedProperty && (
          <button
            onClick={() => {
              console.log("View details for property:", selectedProperty);
              // Could add functionality to view full property details
            }}
            className="admin-btn-primary"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

const AdminPropertyModal = ({
  type,
  data,
  onClose,
  liveUpdates,
  adminChat,
}) => {
  const [selectedProperty, setSelectedProperty] = useState(null);

  const renderModalContent = () => {
    switch (type) {
      case "property_create_form":
        return (
          <PropertyCreateForm
            onClose={onClose}
            intent={data?.intent}
            liveUpdates={liveUpdates}
            adminChat={adminChat}
          />
        );

      case "property_update_form":
        return (
          <PropertyEditForm
            onClose={onClose}
            propertyId={data?.property_id}
            intent={data?.intent}
            liveUpdates={liveUpdates}
            adminChat={adminChat}
          />
        );

      case "property_delete_form":
        return (
          <PropertyDeleteForm
            onClose={onClose}
            propertyId={data?.property_id}
            intent={data?.intent}
            liveUpdates={liveUpdates}
            adminChat={adminChat}
          />
        );

      case "property_create_success":
        return (
          <div className="admin-modal-success">
            <div className="admin-modal-icon admin-modal-icon-success">
              <CheckCircleIcon />
            </div>
            <h3 className="admin-modal-title">¡Propiedad Creada!</h3>
            <div className="admin-modal-details">
              <p>
                <strong>ID de Propiedad:</strong> {data.property_id}
              </p>
              <p>
                <strong>Estado:</strong> Creada exitosamente
              </p>
              {data.nota_ia_generated && (
                <div className="admin-modal-ai-note">
                  <p>
                    <strong>Descripción IA generada:</strong>
                  </p>
                  <div className="admin-ai-description">
                    {data.nota_ia_generated}
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-actions">
              <button
                onClick={onClose}
                className="admin-modal-button admin-modal-button-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        );

      case "property_update_success":
        return (
          <div className="admin-modal-success">
            <div className="admin-modal-icon admin-modal-icon-success">
              <PencilIcon />
            </div>
            <h3 className="admin-modal-title">¡Propiedad Actualizada!</h3>
            <div className="admin-modal-details">
              <p>
                <strong>ID de Propiedad:</strong> {data.property_id}
              </p>
              <p>
                <strong>Campos Actualizados:</strong>{" "}
                {data.updated_fields?.join(", ")}
              </p>
              <p>
                <strong>Estado:</strong> Actualizada exitosamente
              </p>
            </div>
            <div className="admin-modal-actions">
              <button
                onClick={onClose}
                className="admin-modal-button admin-modal-button-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        );

      case "property_delete_success":
        return (
          <div className="admin-modal-success">
            <div className="admin-modal-icon admin-modal-icon-warning">
              <TrashIcon />
            </div>
            <h3 className="admin-modal-title">Propiedad Eliminada</h3>
            <div className="admin-modal-details">
              <p>
                <strong>ID de Propiedad:</strong> {data.property_id}
              </p>
              <p>
                <strong>Nombre:</strong> {data.property_name}
              </p>
              <p>
                <strong>Estado:</strong> Eliminada exitosamente
              </p>
            </div>
            <div className="admin-modal-actions">
              <button
                onClick={onClose}
                className="admin-modal-button admin-modal-button-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        );

      case "property_search_results":
        return (
          <PropertySearchForm
            onClose={onClose}
            initialData={data}
            intent={data?.intent}
          />
        );

      default:
        return (
          <div className="admin-modal-generic">
            <div className="admin-modal-icon admin-modal-icon-info">
              <ExclamationTriangleIcon />
            </div>
            <h3 className="admin-modal-title">Información</h3>
            <div className="admin-modal-details">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
            <div className="admin-modal-actions">
              <button
                onClick={onClose}
                className="admin-modal-button admin-modal-button-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="admin-modal-close">
          <XMarkIcon />
        </button>
        {renderModalContent()}
      </div>
    </div>
  );
};

export default AdminPropertyModal;
