import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';


const Login = ({ goToForgot }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en el servidor');
      }

      // ✅ Login exitoso
      console.log('Login exitoso:', data);

      // ✅ Usar la función login del contexto
      login(data.user, data.token, rememberMe);
      // Mostrar mensaje de éxito
      alert(`✅ ${data.message}`);


      // Ejemplo: navigate('/dashboard');

    } catch (error) {
      console.error('Error en login:', error);
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden p-4">
      {/* Efectos de fondo sutiles */}
      <div className="absolute inset-0">
        {/* Líneas de grid sutiles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#e5e5e5 1px, transparent 1px),
                             linear-gradient(90deg, #e5e5e5 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* Partículas sutiles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gray-300 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Tarjeta de Login */}
      <div className="relative w-full max-w-md">
        {/* Efecto de sombra animada */}
        <div className="absolute -inset-4 bg-gray-200 rounded-2xl blur-xl opacity-50 animate-pulse"></div>

        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 transform hover:scale-[1.02] transition-all duration-500">

          {/* Header elegante */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel Admin</h1>
            <p className="text-gray-600 text-sm">Acceso al sistema de administración</p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Formulario minimalista */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="group">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300 group-focus-within:text-gray-900">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 group-hover:border-gray-400"
                  placeholder="admin@empresa.com"
                />
                <div className="absolute inset-0 rounded-lg border-2 border-transparent group-focus-within:border-gray-400 -z-10 transition-all duration-300"></div>
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300 group-focus-within:text-gray-900"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 group-hover:border-gray-400 pr-12"
                  placeholder="••••••••"
                />

                {/* OJITO ELEGANTE */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {showPassword ? (
                    // 👁 Ojo Abierto
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    // 👁 Ojo Cerrado
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.363-4.568M6.18 6.18A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.965 9.965 0 01-4.132 5.225M3 3l18 18"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>


            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-300 ${rememberMe
                    ? 'bg-gray-800 border-gray-800'
                    : 'border-gray-400 bg-white group-hover:border-gray-600'
                    }`}>
                    {rememberMe && (
                      <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-gray-600 group-hover:text-gray-800 transition-colors text-sm">Recordar sesión</span>
              </label>

              <button
                type="button"
                onClick={goToForgot}
                className="text-sm text-gray-600 hover:text-gray-800 transition-all duration-300 hover:underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>

            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold shadow-lg transform hover:scale-105 focus:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

              {isLoading ? (
                <div className="flex items-center justify-center relative z-10">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verificando...
                </div>
              ) : (
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Acceder al Sistema
                </span>
              )}
            </button>
          </form>

          {/* Footer discreto */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Sistema Administrativo v2.1</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Sistema activo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;