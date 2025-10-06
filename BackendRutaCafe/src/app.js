// app.js
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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.send("Servidor BackendRutaCafe funcionando 🚀");
});

// 🔓 públicas + opcional con maybeAuth adentro
app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/places", placeRoutes);

// 🔐 requieren login (estas sí con verifyToken dentro de sus routers)
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/favorites", favoriteRoutes);

export default app;
