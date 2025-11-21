import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { networkInterfaces } from "os";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ RUTA ABSOLUTA CORRECTA PARA UPLOADS
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');

console.log('🚀 Configurando servidor...');
console.log('📍 Directorio del proyecto:', projectRoot);
console.log('📍 Directorio de uploads:', uploadsDir);

// ✅ VERIFICAR QUE LA CARPETA UPLOADS EXISTE
const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Carpeta uploads creada:', uploadsDir);
  } else {
    console.log('📁 Carpeta uploads ya existe:', uploadsDir);
    
    // Listar contenido para debug
    try {
      const items = fs.readdirSync(uploadsDir);
      console.log(`📂 Contenido de uploads: ${items.length} items`);
      items.forEach(item => {
        const itemPath = path.join(uploadsDir, item);
        const isDir = fs.statSync(itemPath).isDirectory();
        console.log(`   ${isDir ? '📁' : '📄'} ${item}`);
      });
    } catch (error) {
      console.log('❌ Error leyendo directorio uploads:', error.message);
    }
  }
};

ensureUploadsDir();

// ✅ CONFIGURACIÓN CORS
app.use(cors());

// ✅ LÍMITES PARA FOTOS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ SERVIR ARCHIVOS ESTÁTICOS DESDE LA RUTA CORRECTA
app.use("/uploads", express.static(uploadsDir, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// ✅ RUTA ESPECÍFICA PARA VERIFICAR IMÁGENES DE USUARIOS
app.get("/uploads/users/:filename", (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, "uploads", "users", filename);
  
  console.log(`🔍 Solicitando imagen de usuario: ${filename}`);
  console.log(`📁 Ruta: ${imagePath}`);
  
  // Verificar que el archivo existe
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ Imagen no encontrada: ${filename}`);
    return res.status(404).json({ 
      error: "Imagen no encontrada",
      message: `La imagen ${filename} no existe en el servidor`,
      path: imagePath
    });
  }
  
  // Verificar que es una imagen
  const ext = path.extname(filename).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExtensions.includes(ext)) {
    console.log(`❌ Extensión no permitida: ${ext}`);
    return res.status(400).json({ 
      error: "Tipo de archivo no permitido",
      message: "Solo se permiten archivos de imagen"
    });
  }
  
  // Enviar la imagen
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.log(`❌ Error enviando imagen: ${err.message}`);
      res.status(500).json({ 
        error: "Error al servir la imagen",
        message: err.message 
      });
    } else {
      console.log(`✅ Imagen enviada correctamente: ${filename}`);
    }
  });
});

// Middleware para log de requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Ruta de salud
app.get("/", (_req, res) => {
  res.json({ 
    message: "Servidor BackendRutaCafe funcionando 🚀",
    uploadsPath: path.join(__dirname, "uploads"),
    timestamp: new Date().toISOString()
  });
});

// ✅ Ruta para verificar el estado de las imágenes (compatible con Express 5)
app.get(["/api/debug/images", "/api/debug/images/:filename"], async (req, res) => {
  try {
    const usersDir = path.join(__dirname, "uploads", "users");
    
    if (req.params.filename) {
      // Verificar una imagen específica
      const filename = req.params.filename;
      const imagePath = path.join(usersDir, filename);
      const exists = fs.existsSync(imagePath);
      
      const info = exists ? {
        exists: true,
        path: imagePath,
        size: fs.statSync(imagePath).size,
        created: fs.statSync(imagePath).birthtime
      } : {
        exists: false,
        path: imagePath
      };
      
      return res.json({
        image: filename,
        ...info,
        allImages: fs.readdirSync(usersDir)
      });
    } else {
      // Listar todas las imágenes
      const images = fs.readdirSync(usersDir);
      return res.json({
        totalImages: images.length,
        images: images,
        uploadsPath: usersDir
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Error al leer directorio",
      message: error.message
    });
  }
});


// Importar y usar rutas (tus rutas existentes)
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import routeRoutes from "./src/routes/routeRoutes.js";
import placeRoutes from "./src/routes/placeRoutes.js";
import commentRoutes from "./src/routes/commentRoutes.js";
import likeRoutes from "./src/routes/likeRoutes.js";
import favoriteRoutes from "./src/routes/favoriteRoutes.js";
import advertisingRoutes from "./src/routes/advertisingRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/advertising", advertisingRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor BackendRutaCafe iniciado:`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📁 Archivos estáticos: ${path.join(__dirname, "uploads")}`);
  
  // Mostrar IPs locales
  const nets = networkInterfaces();
  console.log('\n📡 IPs de red disponibles:');
  Object.keys(nets).forEach(name => {
    nets[name].forEach(net => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   → http://${net.address}:${PORT}`);
      }
    });
  });
  
  console.log('\n🔍 Rutas de diagnóstico:');
  console.log(`   → http://localhost:${PORT}/api/debug/images`);
  console.log(`   → http://localhost:${PORT}/uploads/users/user_40_1762976760387.jpg`);
  console.log('\n');
});