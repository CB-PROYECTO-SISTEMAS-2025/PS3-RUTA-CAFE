// scripts/hashPassword.js
import bcrypt from "bcryptjs";

const run = async () => {
  const password = "123456"; // 👈 cámbialo por la contraseña que quieras
  const saltRounds = 10;

  const hash = await bcrypt.hash(password, saltRounds);
  console.log("🔑 Password en texto plano:", password);
  console.log("🔒 Hash bcrypt generado:", hash);
};

run();
