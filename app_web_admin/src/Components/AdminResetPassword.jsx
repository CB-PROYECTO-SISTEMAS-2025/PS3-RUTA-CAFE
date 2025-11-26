import React, { useState, useMemo } from "react";

const AdminResetPassword = ({ token, goToLogin }) => {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Lista de símbolos aceptados
  const allowedSymbols = "@$!%*?&.";

  // VALIDACIÓN DINÁMICA
  const validation = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: new RegExp(`[${allowedSymbols.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password)
  }), [password]);

  const allValid = Object.values(validation).every(Boolean);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-xl p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Enlace inválido</h2>
          <p className="text-gray-600 text-sm">
            El enlace de recuperación no es válido o expiró.
          </p>
          <button
            onClick={goToLogin}
            className="mt-4 text-sm underline text-gray-700"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!allValid) {
      setError("La contraseña no cumple con los requisitos.");
      return;
    }

    if (password !== password2) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/admin/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setMessage("Contraseña actualizada correctamente ✔");

      setTimeout(() => goToLogin(), 2000);

    } catch (err) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  // Helper para marcar cada regla
  const Rule = ({ ok, text }) => (
    <p className={`text-sm ${ok ? "text-green-600" : "text-red-600"}`}>
      {ok ? "✔" : "✖"} {text}
    </p>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-4 bg-gray-200 rounded-2xl blur-xl opacity-50"></div>

        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Restablecer contraseña
            </h1>
            <p className="text-gray-600 text-sm">
              Ingresa tu nueva contraseña
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva contraseña
              </label>

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg pr-10"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-gray-600"
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>

              {/* VALIDACIÓN */}
              <div className="mt-3 space-y-1">
                <Rule ok={validation.length} text="Mínimo 8 caracteres" />
                <Rule ok={validation.upper} text="Al menos 1 letra mayúscula" />
                <Rule ok={validation.lower} text="Al menos 1 letra minúscula" />
                <Rule ok={validation.number} text="Al menos 1 número" />
                <Rule
                  ok={validation.symbol}
                  text={`Al menos 1 símbolo (${allowedSymbols})`}
                />
              </div>
            </div>

            {/* CONFIRMAR PASSWORD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar contraseña
              </label>

              <div className="relative">
                <input
                  type={showPass2 ? "text" : "password"}
                  value={password2}
                  required
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg pr-10"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPass2(!showPass2)}
                  className="absolute right-3 top-3 text-gray-600"
                >
                  {showPass2 ? "🙈" : "👁️"}
                </button>
              </div>

              {password2.length > 0 && password !== password2 && (
                <p className="text-red-600 text-sm mt-2">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
};

export default AdminResetPassword;
