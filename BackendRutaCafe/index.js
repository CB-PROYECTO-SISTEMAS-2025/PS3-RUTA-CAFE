import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import routeRoutes from "./src/routes/routeRoutes.js";
import placeRoutes from "./src/routes/placeRoutes.js";
import commentRoutes from "./src/routes/commentRoutes.js";
import likeRoutes from "./src/routes/likeRoutes.js";
import favoriteRoutes from "./src/routes/favoriteRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 👉 servir archivos subidos
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.send("Servidor BackendRutaCafe funcionando 🚀");
});

// Log simple para cada request y si trae Authorization
app.use((req, _res, next) => {
  console.log(
    `[REQ] ${req.method} ${req.path}  auth=${req.headers.authorization ? 'YES' : 'NO'}`
  );
  next();
});

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/favorites", favoriteRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
