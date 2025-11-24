// src/middlewares/maybeAuth.js
import jwt from "jsonwebtoken";

export const maybeAuth = (req, _res, next) => {
  console.log("[maybeAuth] GET", req.method, req.path);
  const h = req.headers?.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;

  if (!token) {
    req.user = { id: null, role: 0 };
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
  } catch {
    req.user = { id: null, role: 0 };
  }
  next();
};
