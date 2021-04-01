import { Router } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/dbPool.js";
import config from "../config/config.json";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/api/login", async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.status(400).json({
        errors: error.array(),
        message: "Некорректные данные при входе",
      });
    }

    const { email, password } = req.body;

    console.log(email, password);

    const user = await pool.query("select * from Users where mail = $1", [
      email,
    ]);

    if (user.rowCount === 0) {
      return res
        .status(400)
        .json({ message: "Пользователь не найден", error: true });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Некорректный логин или пароль", error: true });
    }

    const token = jwt.sign(
      {
        userId: user.rows[0].id,
        email: user.rows[0].mail,
        id_struct: user.rows[0].id_struct,
      },
      config.jwtSecret,
      { expiresIn: "24h" }
    );

    res.json({
      error: false,
      token,
      userId: user.rows[0].id,
      email: user.rows[0].mail,
      fio: user.rows[0].fio,
      id_struct: user.rows[0].id_struct,
      have_task: user.rows[0].havetask,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/api/check-auth", authMiddleware, async (req, res) => {
  const token = jwt.sign(
    {
      userId: req.user.userId,
      email: req.user.email,
      id_struct: req.user.id_struct,
    },
    config.jwtSecret,
    { expiresIn: "24h" }
  );

  return res.json({ token });
});

export default router;
