import React from 'react'
import { useAuth } from '../context/AuthContext'
import Login from '../Components/Login'
import Home from '../Components/Home'

const AppRouter = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return user ? <Home /> : <Login />
}

export default AppRouter