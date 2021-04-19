import { Router } from "express";
import path from "path";
import bcrypt from "bcryptjs";
import fs from "fs";
import rimraf from "rimraf";
import pool from "../config/dbPool.js";

const router = Router();

router.post("/api/profile/get-general-settings", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(500)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const query = await pool.query(`select * from users where id = ${userId}`);

    return res.status(200).json([query.rows, query.rows[0].img]);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

router.put("/api/profile/change-general-settings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { img } = req.body;

    if (!id || !img) {
      return res
        .status(500)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const query = await pool.query(
      `
        update users
        set img = '${img.name}'
        where id = ${id}
        returning img
    `
    );

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const users_dir = current_path + `/public/users/${id}`;

    if (!fs.existsSync(users_dir)) {
      fs.mkdirSync(users_dir);
      fs.writeFileSync(`${users_dir}/${img.name}`, img.base64, "base64");
    } else {
      rimraf.sync(users_dir);
      fs.mkdirSync(users_dir);
      fs.writeFileSync(`${users_dir}/${img.name}`, img.base64, "base64");
    }

    return res.status(200).json(query.rows[0].img);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

router.put("/api/profile/change-password/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { newPass } = req.body;

    if (!newPass) {
      return res
        .status(400)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const hashedPassword = await bcrypt.hash(newPass, 12);

    const query = await pool.query(`
      update users
      set password = '${hashedPassword}'
      where id = ${id}
    `);

    if (query.rowCount === 0) {
      return res.status(400).json({
        message: "Что-то пошло не так! Обратитесь к администратору.",
        type: "danger",
      });
    }

    return res
      .status(200)
      .json({ message: "Пароль успешно изменён!", type: "success" });
  } catch (e) {
    return res.status(500).json({ message: e.message, type: "danger" });
  }
});

export default router;