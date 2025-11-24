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
  const [previewImageModal, setPreviewImageModal] = useState("");

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
      if (value.startsWith(" ")) return;
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

    if (!imageFile && !form.image_url) {
      errs.image = "La imagen es obligatoria";
    }

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

        <div className="flex items-center gap-3">
          <button
            onClick={loadAds}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 disabled:opacity-60 transition"
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
            className="px-4 py-2 bg-gray-800 text-white rounded-xl shadow hover:bg-gray-900 transition"
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
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-800 transition"
        />
      </div>

      {/* Error general */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-sm">
          {error}
        </div>
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
                          className="w-16 h-16 object-cover rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewImageModal(ad.image_url)}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-xl border flex items-center justify-center text-gray-400">
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
                        className={`px-2 py-1 rounded text-xs ${ad.status === "activo"
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
                        className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm transition"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => requestDelete(ad)}
                        className="px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 shadow-sm transition"
                      >
                        Eliminar
                      </button>

                      {ad.enlace_url && (
                        <a
                          className="px-3 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 shadow-sm inline-block transition"
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

      {/* ===========================
            MODAL FORMULARIO
      =========================== */}
      {openForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col">

            {/* HEADER */}
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between shadow-sm">
              <h3 className="text-lg font-semibold">
                {editingId ? "Editar Publicidad" : "Nueva Publicidad"}
              </h3>

              <button
                onClick={resetForm}
                className="p-2 rounded-full hover:bg-gray-200 transition text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* FORMULARIO (AHORA SCROLLEABLE) */}
            <form
              onSubmit={onSubmit}
              className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto"
              style={{ maxHeight: "72vh" }}
            >
              {/* Título */}
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Título *</label>

                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  className={`w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 focus:border-gray-800 transition ${fieldErrors.title ? "border-red-400" : ""
                    }`}
                />

                {fieldErrors.title && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Descripción *</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={3}
                  className={`w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 focus:border-gray-800 transition ${fieldErrors.description ? "border-red-400" : ""
                    }`}
                />

                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
                )}
              </div>

              {/* Estado */}
              <div>
                <label className="text-sm text-gray-600">Estado *</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className={`w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 transition ${fieldErrors.status ? "border-red-400" : ""
                    }`}
                >
                  <option value="activo">activo</option>
                  <option value="inactivo">inactivo</option>
                </select>

                {fieldErrors.status && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.status}</p>
                )}
              </div>

              {/* Enlace */}
              <div>
                <label className="text-sm text-gray-600">Enlace (opcional)</label>

                <input
                  name="enlace_url"
                  value={form.enlace_url}
                  onChange={onChange}
                  placeholder="https://tusitio.com/promo"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 transition"
                />
              </div>

              {/* Fecha inicio */}
              <div>
                <label className="text-sm text-gray-600">Inicio *</label>

                <input
                  type="datetime-local"
                  name="start_date"
                  value={form.start_date}
                  onChange={onChange}
                  min={minStart}
                  className={`w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 transition ${fieldErrors.start_date ? "border-red-400" : ""
                    }`}
                />

                {fieldErrors.start_date && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.start_date}</p>
                )}
              </div>

              {/* Fecha fin */}
              <div>
                <label className="text-sm text-gray-600">Fin *</label>

                <input
                  type="datetime-local"
                  name="end_date"
                  value={form.end_date}
                  onChange={onChange}
                  min={minEndFromStart}
                  className={`w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 transition ${fieldErrors.end_date ? "border-red-400" : ""
                    }`}
                />

                {fieldErrors.end_date && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.end_date}</p>
                )}
              </div>

              {/* Subida de imagen */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Imagen *</label>

                <div className="flex items-center gap-4 mt-1">
                  <div
                    className="w-24 h-24 rounded-xl overflow-hidden border bg-gray-100 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 transition"
                    onClick={() => {
                      const full =
                        imagePreview ||
                        (form.image_url ? `${API.replace(/\/api\/?$/, "")}${form.image_url}` : null);

                      if (full) setPreviewImageModal(full);
                    }}
                  >
                    {imagePreview || form.image_url ? (
                      <img
                        src={
                          imagePreview ||
                          `${API.replace(/\/api\/?$/, "")}${form.image_url}`
                        }
                        className="w-full h-full object-cover"
                        alt="preview"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">Sin imagen</span>
                    )}
                  </div>


                  <div className="flex flex-col gap-2">
                    <label className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer shadow-sm text-sm transition">
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
                        className="px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm hover:bg-red-100 shadow-sm transition"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>

                {fieldErrors.image && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.image}</p>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  Se guarda la imagen en <code>/uploads/ads</code>.
                </p>
              </div>

              {/* FOOTER STICKY */}
              <div className="col-span-2 flex justify-end gap-3 pt-4 border-t bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 shadow transition"
                >
                  {editingId ? "Guardar cambios" : "Crear"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===========================
            MODAL DE CONFIRMACIÓN
      =========================== */}
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
                  "{confirmModal.ad?.title ?? "Sin título"}"
                </span>.
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmModal({ open: false, ad: null })}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow transition"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewImageModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[999]"
          onClick={() => setPreviewImageModal("")}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImageModal("")}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              ✕
            </button>

            <img
              src={previewImageModal}
              className="w-full max-h-[80vh] object-contain rounded-xl"
              alt="preview"
            />
          </div>
        </div>
      )}

      {/* ===========================
            MODAL DE ÉXITO
      =========================== */}
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
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 shadow transition"
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
