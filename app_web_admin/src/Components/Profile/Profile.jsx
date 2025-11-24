// src/Components/Admin/AdminProfile.jsx
import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL;
const getAdminToken = () =>
  localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken") || "";

// --- Helpers ---
const normalizeSpaces = (s = "") => s.replace(/\s+/g, " ").trim();
const noLeadingOrDoubleSpaces = (s = "") => /^[^\s](?!.*\s{2,}).*$/.test(s);

// Solo letras (con tildes/ñ) y espacios
const ALPHA_REGEX = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]+$/;
const sanitizeAlpha = (s = "") =>
  s.replace(/[^A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]/g, ""); // quita números/caracteres especiales

// Prohíbe espacios
const stripSpaces = (s = "") => s.replace(/\s+/g, "");

// Teléfono Bolivia
const PHONE_PREFIX = "+591";
const digitsOnly = (s = "") => s.replace(/\D+/g, "");

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [cities, setCities] = useState([]);

  const [form, setForm] = useState({
    name: "",
    lastName: "",
    secondLastName: "",
    phone: "",          // se guarda concatenado (+591 + phoneSuffix)
    City_id: "",
  });

  // Parte editable del teléfono (solo 8 dígitos)
  const [phoneSuffix, setPhoneSuffix] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  // Foto
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Password (sin espacios)
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  // Modales
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

  const authHeadersJSON = useMemo(
    () => ({
      Authorization: `Bearer ${getAdminToken()}`,
      "Content-Type": "application/json",
    }),
    []
  );
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${getAdminToken()}`,
    }),
    []
  );

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res1 = await fetch(`${API}/users/profile`, { headers: authHeaders });
      const data1 = await res1.json();
      if (!res1.ok) throw new Error(data1?.message || `HTTP ${res1.status}`);
      if (data1?.user?.role !== 1) throw new Error("Acceso denegado: no eres administrador.");

      // Derivar suffix del teléfono
      const rawPhone = data1.user?.phone || "";
      const suffix = rawPhone.startsWith(PHONE_PREFIX)
        ? rawPhone.slice(PHONE_PREFIX.length)
        : rawPhone;
      const cleanedSuffix = digitsOnly(suffix).slice(0, 8);

      setForm({
        name: data1.user?.name || "",
        lastName: data1.user?.lastName || "",
        secondLastName: data1.user?.secondLastName || "",
        phone: rawPhone || "",
        City_id: data1.user?.City_id || "",
      });
      setPhoneSuffix(cleanedSuffix);
      // setImagePreview(data1.user?.photo || "");
      // Construcción correcta al cargar perfil
      const base = API.includes("/api") ? API.replace("/api", "") : API;

      const fullPhotoUrl = data1.user?.photo
        ? `${base}/uploads/users/${data1.user.photo}`
        : "";

      setImagePreview(fullPhotoUrl);
      setUser({ ...data1.user, photo: fullPhotoUrl });


      // Ciudades (admin)
      const res2 = await fetch(`${API}/users/cities`, { headers: authHeaders });
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2?.message || `HTTP ${res2.status}`);
      setCities(data2?.cities || []);
    } catch (e) {
      console.error("loadProfile:", e);
      setError(e.message || "Error cargando perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejo de inputs de nombre/apellidos (solo letras y espacios)
  const onChangeAlpha = (e) => {
    const { name, value } = e.target;
    // quita números y caracteres especiales, controla espacios
    const sanitized = sanitizeAlpha(value).replace(/\s{2,}/g, " ");
    if (sanitized.startsWith(" ")) return; // sin espacio inicial
    setForm((f) => ({ ...f, [name]: sanitized }));
  };

  // Resto de inputs (select ciudad)
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Teléfono (solo dígitos, máx 8). Prefijo +591 NO editable.
  const onChangePhoneSuffix = (e) => {
    const digits = digitsOnly(e.target.value).slice(0, 8);
    setPhoneSuffix(digits);
  };

  // Passwords sin espacios (también bloquea espacios al pegar)
  const onPwdChange = (key) => (e) => {
    const val = stripSpaces(e.target.value);
    setPwd((p) => ({ ...p, [key]: val }));
  };

  const validateForm = () => {
    const errs = {};

    const name = normalizeSpaces(form.name);
    const lastName = normalizeSpaces(form.lastName);
    const secondLastName = normalizeSpaces(form.secondLastName || "");

    if (!name) errs.name = "El nombre es obligatorio";
    else if (!noLeadingOrDoubleSpaces(name) || !ALPHA_REGEX.test(name))
      errs.name = "Solo letras y un espacio entre palabras";

    if (!lastName) errs.lastName = "El apellido paterno es obligatorio";
    else if (!noLeadingOrDoubleSpaces(lastName) || !ALPHA_REGEX.test(lastName))
      errs.lastName = "Solo letras y un espacio entre palabras";

    if (secondLastName && (!noLeadingOrDoubleSpaces(secondLastName) || !ALPHA_REGEX.test(secondLastName)))
      errs.secondLastName = "Solo letras y un espacio entre palabras";

    // Teléfono: si editan, debe tener 8 dígitos. (Si quieres que sea obligatorio, descomenta la 1ª línea)
    // if (phoneSuffix.length !== 8) errs.phone = "Debe tener 8 dígitos";
    if (phoneSuffix && phoneSuffix.length !== 8) errs.phone = "Debe tener 8 dígitos";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        name: normalizeSpaces(form.name),
        lastName: normalizeSpaces(form.lastName),
        secondLastName: normalizeSpaces(form.secondLastName || "") || null,
        // Ensamblar teléfono con prefijo fijo
        phone: phoneSuffix ? `${PHONE_PREFIX}${phoneSuffix}` : "",
        City_id: form.City_id || null,
      };

      const res = await fetch(`${API}/users/profile`, {
        method: "PUT",
        headers: authHeadersJSON,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      await loadProfile();
      setSuccessModal({ open: true, message: "¡Perfil actualizado correctamente!" });
    } catch (e) {
      console.error("onSaveProfile:", e);
      setError(e.message || "Error al actualizar perfil");
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setImageFile(f);
    setImagePreview(f ? URL.createObjectURL(f) : user?.photo || "");
  };

  const uploadPhotoAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSavePhoto = async () => {
    if (!imageFile) return;

    try {
      const dataURL = await uploadPhotoAsBase64(imageFile);

      const res = await fetch(`${API}/users/profile/photo`, {
        method: "PUT",
        headers: authHeadersJSON,
        body: JSON.stringify({ photo: dataURL }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      // Construcción CORRECTA de URL de imagen
      const base = API.includes("/api") ? API.replace("/api", "") : API;
      const fullUrl = `${base}/uploads/users/${data.photoUrl}`;

      // Actualizar preview inmediatamente
      setImagePreview(fullUrl);
      setUser((u) => ({ ...u, photo: fullUrl }));
      setImageFile(null);

      setSuccessModal({
        open: true,
        message: "¡Foto actualizada correctamente!",
      });

    } catch (e) {
      console.error("onSavePhoto:", e);
      setError(e.message || "Error al actualizar foto");
    }
  };

  const onRemovePhoto = async () => {
    try {
      const res = await fetch(`${API}/users/profile/photo`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      // ⚠️ Foto eliminada → dejamos preview vacío
      setImagePreview("");
      setUser((u) => ({ ...u, photo: "" }));

      setConfirmRemovePhoto(false);

      await loadProfile();

      setSuccessModal({
        open: true,
        message: "Foto eliminada correctamente.",
      });

    } catch (e) {
      console.error("onRemovePhoto:", e);
      setError(e.message || "Error al eliminar foto");
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (!pwd.currentPassword || !pwd.newPassword) return setError("Completa las contraseñas");
    if (pwd.newPassword.length < 6) return setError("La nueva contraseña debe tener 6+ caracteres");
    if (pwd.newPassword !== pwd.confirm) return setError("La confirmación no coincide");

    try {
      const res = await fetch(`${API}/users/profile/password`, {
        method: "PUT",
        headers: authHeadersJSON,
        body: JSON.stringify({
          currentPassword: pwd.currentPassword,
          newPassword: pwd.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
      setSuccessModal({ open: true, message: "¡Contraseña actualizada!" });
    } catch (e) {
      console.error("onChangePassword:", e);
      setError(e.message || "Error al cambiar contraseña");
    }
  };

  if (loading && !user) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mi Perfil (Administrador)</h1>
          <p className="text-gray-500">Edita tus datos, foto y contraseña.</p>
        </div>
        <button
          onClick={loadProfile}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>

      {/* Error general */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      )}

      {/* Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Card Avatar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col items-center">
            {imagePreview || user?.photo ? (
              <img
                src={imagePreview || user?.photo}
                alt="avatar"
                className="w-24 h-24 rounded-full object-cover border"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(user?.name?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </div>
            )}

            <p className="mt-3 text-gray-800 font-semibold">
              {user?.name} {user?.lastName}
            </p>
            <p className="text-gray-600 text-sm">{user?.email}</p>
            <span className="mt-1 inline-flex items-center text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Administrador
            </span>

            <div className="mt-4 space-y-2 w-full">
              <label className="block">
                <span className="text-sm text-gray-700">Cambiar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="mt-1 block w-full text-sm"
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={onSavePhoto}
                  disabled={!imageFile}
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50"
                >
                  Guardar foto
                </button>
                {(user?.photo || imagePreview) && (
                  <button
                    type="button"
                    onClick={() => setConfirmRemovePhoto(true)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Eliminar foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card Form Perfil */}
        <form
          onSubmit={onSaveProfile}
          className="md:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Datos personales</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="text-sm text-gray-600">Nombre *</label>
              <input
                name="name"
                value={form.name}
                onChange={onChangeAlpha}
                className={`mt-1 w-full border rounded-lg px-3 py-2 ${fieldErrors.name ? "border-red-400" : ""
                  }`}
                required
                inputMode="text"
              />
              {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
            </div>

            {/* Apellido paterno */}
            <div>
              <label className="text-sm text-gray-600">Apellido paterno *</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={onChangeAlpha}
                className={`mt-1 w-full border rounded-lg px-3 py-2 ${fieldErrors.lastName ? "border-red-400" : ""
                  }`}
                required
                inputMode="text"
              />
              {fieldErrors.lastName && (
                <p className="text-xs text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>

            {/* Apellido materno */}
            <div>
              <label className="text-sm text-gray-600">Apellido materno</label>
              <input
                name="secondLastName"
                value={form.secondLastName}
                onChange={onChangeAlpha}
                className={`mt-1 w-full border rounded-lg px-3 py-2 ${fieldErrors.secondLastName ? "border-red-400" : ""
                  }`}
                inputMode="text"
              />
              {fieldErrors.secondLastName && (
                <p className="text-xs text-red-600">{fieldErrors.secondLastName}</p>
              )}
            </div>

            {/* Teléfono con prefijo fijo +591 */}
            <div>
              <label className="text-sm text-gray-600">Teléfono</label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 bg-gray-50 text-gray-700">
                  {PHONE_PREFIX}
                </span>
                <input
                  type="text"
                  value={phoneSuffix}
                  onChange={onChangePhoneSuffix}
                  className={`w-full border rounded-r-lg px-3 py-2 ${fieldErrors.phone ? "border-red-400" : ""
                    }`}
                  placeholder="7xxxxxxx"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                />
              </div>
              {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
              <p className="text-xs text-gray-500 mt-1">Formato: +591 y 8 dígitos.</p>
            </div>

            {/* Ciudad */}
            <div>
              <label className="text-sm text-gray-600">Ciudad</label>
              <select
                name="City_id"
                value={form.City_id || ""}
                onChange={onChange}
                className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">— Seleccionar —</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* Cambio de contraseña (sin espacios) */}
      <form
        onSubmit={onChangePassword}
        className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cambiar contraseña</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Contraseña actual</label>
            <input
              type="password"
              value={pwd.currentPassword}
              onChange={onPwdChange("currentPassword")}
              onPaste={(e) => {
                e.preventDefault();
                setPwd((p) => ({ ...p, currentPassword: stripSpaces(e.clipboardData.getData("text")) }));
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
              pattern="\S+"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Nueva contraseña</label>
            <input
              type="password"
              value={pwd.newPassword}
              onChange={onPwdChange("newPassword")}
              onPaste={(e) => {
                e.preventDefault();
                setPwd((p) => ({ ...p, newPassword: stripSpaces(e.clipboardData.getData("text")) }));
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
              minLength={6}
              pattern="\S+"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Confirmar</label>
            <input
              type="password"
              value={pwd.confirm}
              onChange={onPwdChange("confirm")}
              onPaste={(e) => {
                e.preventDefault();
                setPwd((p) => ({ ...p, confirm: stripSpaces(e.clipboardData.getData("text")) }));
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
              minLength={6}
              pattern="\S+"
            />
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className="px-4 py-2 rounded-lg border hover:bg-gray-50">
            Actualizar contraseña
          </button>
        </div>
      </form>

      {/* Modal confirmar eliminar foto */}
      {confirmRemovePhoto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">¿Eliminar foto?</h3>
              <p className="text-gray-600">Esta acción no se puede deshacer.</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRemovePhoto(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onRemovePhoto}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal éxito */}
      {successModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">¡Operación exitosa!</h3>
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

export default Profile;
