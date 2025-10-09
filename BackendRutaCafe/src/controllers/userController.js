import { findUserById, updateUser, deleteUser, findUsersByCityId, findUserWithCity, updateUserRoleModel, getAllCities, findAllUsers, findUsersBySpecificCity, updateUserPhoto, removeUserPhoto, createUser } from "../models/userModel.js";

export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    await updateUser(req.user.id, updates);
    res.json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
};

export const updateProfilePhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ message: "URL de foto es requerida" });
    }

    const result = await updateUserPhoto(req.user.id, photoUrl);
    
    if (result.success) {
      res.json({ 
        message: "Foto de perfil actualizada correctamente",
        photoUrl 
      });
    } else {
      res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar foto de perfil" });
  }
};

export const removeProfilePhoto = async (req, res) => {
  try {
    const result = await removeUserPhoto(req.user.id);
    
    if (result.success) {
      res.json({ message: "Foto de perfil eliminada correctamente" });
    } else {
      res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar foto de perfil" });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    await deleteUser(req.user.id);
    res.json({ message: "Cuenta eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar cuenta" });
  }
};

export const getUsersByAdminCity = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const admin = await findUserWithCity(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Administrador no encontrado" });
    }

    if (!admin.City_id) {
      return res.status(400).json({ message: "El administrador no tiene ciudad asignada" });
    }

    const users = await findUsersByCityId(admin.City_id);

    res.json({
      message: "Usuarios obtenidos correctamente",
      users,
      adminCity: {
        id: admin.City_id,
        name: admin.cityName || 'Ciudad no especificada'
      }
    });

  } catch (error) {
    console.error("Error en getUsersByAdminCity:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const  userId  = req.params.userId;
    const { newRole } = req.body;

    console.log("🔄 Actualizando rol:", { userId, newRole });

    if (!newRole || ![1, 2, 3].includes(parseInt(newRole))) {
      return res.status(400).json({ 
        message: "Rol inválido. Debe ser 1 (Admin), 2 (Técnico) o 3 (Usuario)" 
      });
    }

    if (parseInt(userId) === req.user.id && parseInt(newRole) !== 1) {
      return res.status(400).json({ 
        message: "No puedes cambiar tu propio rol de administrador" 
      });
    }

    const result = await updateUserRoleModel(userId, parseInt(newRole));

    res.json({
      message: "Rol actualizado correctamente",
      userId,
      newRole,
      result
    });

  } catch (error) {
    console.error("Error en updateUserRole:", error);
    res.status(500).json({ 
      message: "Error al actualizar el rol",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    console.log("👥 Obteniendo todos los usuarios...");
    
    const users = await findAllUsers();
    const cities = await getAllCities();

    console.log("👥 Usuarios encontrados:", users.length);

    res.json({
      message: "Todos los usuarios obtenidos correctamente",
      users,
      cities,
      filter: 'all'
    });

  } catch (error) {
    console.error("Error en getAllUsers:", error);
    res.status(500).json({ 
      message: "Error en el servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUsersBySpecificCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    
    console.log("🏙️ Obteniendo usuarios de ciudad:", cityId);
    
    if (!cityId) {
      return res.status(400).json({ message: "ID de ciudad no proporcionado" });
    }

    const users = await findUsersBySpecificCity(cityId);
    const cities = await getAllCities();
    const selectedCity = cities.find(city => city.id == cityId);

    console.log("👥 Usuarios encontrados en ciudad:", users.length);

    res.json({
      message: `Usuarios de ${selectedCity?.name || 'ciudad seleccionada'} obtenidos correctamente`,
      users,
      cities,
      selectedCity: selectedCity || { id: cityId, name: 'Ciudad no encontrada' },
      filter: 'city'
    });

  } catch (error) {
    console.error("Error en getUsersBySpecificCity:", error);
    res.status(500).json({ 
      message: "Error en el servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getCities = async (req, res) => {
  try {
    const cities = await getAllCities();
    
    res.json({
      message: "Ciudades obtenidas correctamente",
      cities
    });

  } catch (error) {
    console.error("Error en getCities:", error);
    res.status(500).json({ 
      message: "Error al obtener ciudades",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};