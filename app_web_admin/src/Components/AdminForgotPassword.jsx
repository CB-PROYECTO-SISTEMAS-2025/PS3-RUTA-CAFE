// src/pages/AdminForgotPassword.jsx
import React, { useState } from "react";

const AdminForgotPassword = ({ goToLogin }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/admin/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al enviar el correo");
      }

      setMessage(data.message || "Revisa tu correo para continuar.");
    } catch (err) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden p-4">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(#e5e5e5 1px, transparent 1px),
                             linear-gradient(90deg, #e5e5e5 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-4 bg-gray-200 rounded-2xl blur-xl opacity-50"></div>

        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0m8 0a4 4 0 01-8 0m8 0v1a4 4 0 01-8 0v-1m8 0V9a4 4 0 00-8 0v3"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Recuperar contraseña
            </h1>
            <p className="text-gray-600 text-sm">
              Ingresa el correo de administrador registrado
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
            <div className="group">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Correo de administrador
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all"
                placeholder="admin@empresa.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          {/* 🔙 BOTÓN VOLVER AL LOGIN */}
          <div className="mt-6 text-center">
            <button
              onClick={goToLogin}
              className="text-sm text-gray-600 hover:text-gray-800 hover:underline transition-all"
            >
              ← Volver al inicio de sesión
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
