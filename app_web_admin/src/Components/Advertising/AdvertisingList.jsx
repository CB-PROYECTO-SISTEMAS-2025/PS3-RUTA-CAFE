// src/Components/Advertising/AdvertisingList.jsx
import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL;
const getAdminToken = () =>
  localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken") || "";

const initialForm = {
  title: "",
  description: "",
  enlace_url: "",
  status: "activo",
  start_date: "",
  end_date: "",
  image_url: "",
};

// helpers cliente
const normalizeSpaces = (s = "") => s.replace(/\s+/g, " ").trim();
const noLeadingOrDoubleSpaces = (s = "") => /^[^\s](?!.*\s{2,}).*$/.test(s);

const toLocalDTValue = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};
const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const AdvertisingList = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // archivo local + preview
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  // MODALES
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const [confirmModal, setConfirmModal] = useState({ open: false, ad: null });

  const authHeadersForm = useMemo(
    () => ({
      Authorization: `Bearer ${getAdminToken()}`,
    }),
    []
  );

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/advertising`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const data = await res.json();
      setAds(data || []);
    } catch (e) {
      console.error("❌ loadAds:", e);
      setError(e.message || "Error cargando publicidades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  // min dinámicos de fechas
  const minStart = toLocalDTValue(startOfTodayLocal());
  const minEndFromStart = form.start_date
    ? toLocalDTValue(addDays(new Date(form.start_date), 1))
    : toLocalDTValue(addDays(startOfTodayLocal(), 1));

  const onChange = (e) => {
    const { name, value } = e.target;

    if (name === "title" || name === "description") {
      // Evitar que empiece con espacio
      if (value.startsWith(" ")) return;
      // Evitar dobles espacios
      const normalized = value.replace(/\s{2,}/g, " ");
      setForm((f) => ({ ...f, [name]: normalized }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const validateForm = () => {
    const errs = {};
    const title = normalizeSpaces(form.title);
    const description = normalizeSpaces(form.description);

    if (!title) errs.title = "El título es obligatorio";
    else if (!noLeadingOrDoubleSpaces(title))
      errs.title = "El título no debe iniciar con espacios ni contener dobles espacios";

    if (!description) errs.description = "La descripción es obligatoria";
    else if (!noLeadingOrDoubleSpaces(description))
      errs.description = "La descripción no debe iniciar con espacios ni contener dobles espacios";

    if (!form.status) errs.status = "El estado es obligatorio";

    if (!form.start_date) errs.start_date = "La fecha de inicio es obligatoria";
    if (!form.end_date) errs.end_date = "La fecha fin es obligatoria";

    // imagen obligatoria: archivo o image_url existente
    if (!imageFile && !form.image_url) {
      errs.image = "La imagen es obligatoria";
    }

    // reglas de fechas
    if (form.start_date) {
      const start = new Date(form.start_date);
      const today0 = startOfTodayLocal();
      if (start < today0) errs.start_date = "La fecha de inicio debe ser hoy o posterior";

      if (form.end_date) {
        const end = new Date(form.end_date);
        const minEnd = addDays(new Date(start.getFullYear(), start.getMonth(), start.getDate()), 1);
        if (end < minEnd)
          errs.end_date = "La fecha fin debe ser al menos un día después de la fecha inicio";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setOpenForm(false);
    setError("");
    setFieldErrors({});
    setImageFile(null);
    setImagePreview("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const fd = new FormData();
      fd.append("title", normalizeSpaces(form.title));
      fd.append("description", normalizeSpaces(form.description));
      fd.append("enlace_url", form.enlace_url || "");
      fd.append("status", form.status || "activo");
      fd.append("start_date", form.start_date);
      fd.append("end_date", form.end_date);

      if (imageFile) {
        fd.append("image", imageFile);
      } else {
        fd.append("image_url", form.image_url || "");
      }

      const url = editingId ? `${API}/advertising/${editingId}` : `${API}/advertising`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeadersForm,
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || `Error HTTP: ${res.status}`);

      await loadAds();

      // Modal de éxito según acción
      if (editingId) {
        setSuccessModal({ open: true, message: "¡Publicidad actualizada correctamente!" });
      } else {
        setSuccessModal({ open: true, message: "¡Publicidad registrada correctamente!" });
      }

      resetForm();
    } catch (e) {
      console.error("❌ onSubmit:", e);
      setError(e.message || "Error guardando publicidad");
    }
  };

  const onEdit = (ad) => {
    setEditingId(ad.id);
    const relative = ad.image_url?.replace(/^https?:\/\/[^/]+/, "") || "";
    setForm({
      title: ad.title || "",
      description: ad.description || "",
      enlace_url: ad.enlace_url || "",
      status: ad.status || "activo",
      start_date: ad.start_date ? ad.start_date.slice(0, 16) : "",
      end_date: ad.end_date ? ad.end_date.slice(0, 16) : "",
      image_url: relative,
    });
    setImageFile(null);
    setImagePreview(ad.image_url || "");
    setFieldErrors({});
    setOpenForm(true);
  };

  const requestDelete = (ad) => {
    setConfirmModal({ open: true, ad });
  };

  const confirmDelete = async () => {
    const ad = confirmModal.ad;
    if (!ad) return;
    try {
      const res = await fetch(`${API}/advertising/${ad.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Error HTTP: ${res.status}`);

      setConfirmModal({ open: false, ad: null });
      await loadAds();

      // Modal de éxito de eliminación
      setSuccessModal({ open: true, message: "Publicidad eliminada correctamente." });
    } catch (e) {
      console.error("❌ onDelete:", e);
      setError(e.message || "Error eliminando publicidad");
      setConfirmModal({ open: false, ad: null });
    }
  };

  const filteredAds = ads.filter((ad) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      ad.title?.toLowerCase().includes(t) ||
      ad.description?.toLowerCase().includes(t) ||
      ad.enlace_url?.toLowerCase().includes(t) ||
      ad.status?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Publicidades</h1>
          <p className="text-gray-500">Sube imágenes desde tu computadora. Se guardan en el servidor.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAds}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
          <button
            onClick={() => {
              setOpenForm(true);
              setEditingId(null);
              setForm(initialForm);
              setImageFile(null);
              setImagePreview("");
              setFieldErrors({});
            }}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            + Nueva
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar por título, descripción, enlace o estado..."
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error general */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Cargando...</div>
          ) : filteredAds.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No hay publicidades</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Imagen</th>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Inicio</th>
                  <th className="px-4 py-3 text-left">Fin</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAds.map((ad) => (
                  <tr key={ad.id} className="border-t">
                    <td className="px-4 py-3">
                      {ad.image_url ? (
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{ad.title}</div>
                      <div className="text-gray-500 line-clamp-1 max-w-sm">{ad.description}</div>
                      {ad.enlace_url && (
                        <a
                          href={ad.enlace_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {ad.enlace_url}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          ad.status === "activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ad.start_date ? new Date(ad.start_date).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ad.end_date ? new Date(ad.end_date).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => onEdit(ad)}
                        className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => requestDelete(ad)}
                        className="px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                      {ad.enlace_url && (
                        <a
                          className="px-3 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 inline-block"
                          href={ad.enlace_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ir
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal/Form */}
      {openForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingId ? "Editar Publicidad" : "Nueva Publicidad"}
              </h3>
              <button onClick={resetForm} className="px-3 py-1 rounded hover:bg-gray-100">
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Título *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${
                    fieldErrors.title ? "border-red-400" : ""
                  }`}
                  required
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="text-sm text-gray-600">Descripción *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${
                    fieldErrors.description ? "border-red-400" : ""
                  }`}
                  rows={3}
                  required
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Estado *</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${
                    fieldErrors.status ? "border-red-400" : ""
                  }`}
                  required
                >
                  <option value="activo">activo</option>
                  <option value="inactivo">inactivo</option>
                </select>
                {fieldErrors.status && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.status}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Enlace (opcional)</label>
                <input
                  name="enlace_url"
                  value={form.enlace_url}
                  onChange={onChange}
                  placeholder="https://tusitio.com/promo"
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Inicio *</label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={form.start_date}
                  onChange={onChange}
                  min={minStart}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${
                    fieldErrors.start_date ? "border-red-400" : ""
                  }`}
                  required
                />
                {fieldErrors.start_date && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.start_date}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Fin *</label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={form.end_date}
                  onChange={onChange}
                  min={minEndFromStart}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${
                    fieldErrors.end_date ? "border-red-400" : ""
                  }`}
                  required
                />
                {fieldErrors.end_date && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.end_date}</p>
                )}
              </div>

              {/* Imagen (obligatoria) */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Imagen *</label>
                <div className="flex items-center gap-3 mt-1">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ) : form.image_url ? (
                    <img
                      src={`${API.replace(/\/api\/?$/, "")}${form.image_url}`}
                      alt="actual"
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ) : (
                    <div
                      className={`w-20 h-20 rounded border ${
                        fieldErrors.image ? "border-red-400" : "border-dashed"
                      } flex items-center justify-center text-gray-400`}
                    >
                      —
                    </div>
                  )}

                  <label className="px-3 py-2 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    Elegir archivo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                  </label>

                  {(imageFile || form.image_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        setForm((f) => ({ ...f, image_url: "" }));
                      }}
                      className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-red-600 border-red-200"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {fieldErrors.image && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.image}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Se guarda la imagen en <code>/uploads/ads</code> y la ruta en la base de datos.
                </p>
              </div>

              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg"
                >
                  {editingId ? "Guardar cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de eliminación */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¿Eliminar publicidad?
              </h3>
              <p className="text-gray-600">
                Esta acción no se puede deshacer. Se eliminará la publicidad{" "}
                <span className="font-semibold">
                  “{confirmModal.ad?.title ?? "Sin título"}”
                </span>
                .
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmModal({ open: false, ad: null })}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Éxito (crear / actualizar / eliminar) */}
      {successModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ¡Operación exitosa!
              </h3>
              <p className="text-gray-600">{successModal.message}</p>
              <div className="mt-6">
                <button
                  onClick={() => setSuccessModal({ open: false, message: "" })}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertisingList;
