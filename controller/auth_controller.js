import { Router } from "express";
import { validationResult } from "express-validator";
import pool from "../config/dbPool.js";
import bcrypt from "bcryptjs";
import config from "../config/config.json";
import jwt from "jsonwebtoken";

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

    const { fio, password } = req.body;

    const user = await pool.query("select * from Users where fio = $1", [fio]);

    if (user.rowCount === 0) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);

    if (!isMatch) {
      return res.status(400).json({ message: "Некорректный логин или пароль" });
    }

    const token = jwt.sign(
      {
        userId: user.rows[0].id,
      },
      config.jwtSecret,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      userId: user.rows[0].id,
      fio: user.rows[0].fio,
      id_struct: user.rows[0].id_struct,
      id_dolgnost: user.rows[0].id_dolgnost,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
