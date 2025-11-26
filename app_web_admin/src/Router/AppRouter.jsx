import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

import Login from "../Components/Login";
import Home from "../Components/Home";

import AdminForgotPassword from "../Components/AdminForgotPassword";
import AdminResetPassword from "../Components/AdminResetPassword";

const AppRouter = () => {
  const { user, loading } = useAuth();

  const [screen, setScreen] = useState("login");  
  const [resetToken, setResetToken] = useState(null);

  // Detectar token en la URL automáticamente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("resetToken");

    if (token) {
      console.log("🔐 Token detectado en la URL:", token);
      setResetToken(token);
      setScreen("reset");

      // Opcional: limpiar URL para no dejar ?resetToken visible
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si ya está logueado → Home
  if (user) return <Home />;

  // PANTALLAS PÚBLICAS SIN RUTAS
  switch (screen) {
    case "login":
      return <Login goToForgot={() => setScreen("forgot")} />;

    case "forgot":
      return <AdminForgotPassword goToLogin={() => setScreen("login")} />;

    case "reset":
      return (
        <AdminResetPassword
          token={resetToken}
          goToLogin={() => setScreen("login")}
        />
      );

    default:
      return <Login goToForgot={() => setScreen("forgot")} />;
  }
};

export default AppRouter;
