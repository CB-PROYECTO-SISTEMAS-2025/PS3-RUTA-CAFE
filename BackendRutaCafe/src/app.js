import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor BackendRutaCafe funcionando 🚀");
});

// Rutas de autenticación
app.use("/api/auth", authRoutes);

export default app;