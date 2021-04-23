const { Router } = require("express");
const pool = require("../config/dbPool.js");

const router = Router();

router.get("/api/test", async (req, res) => {
  try {
    const users = await pool.query("select * from test");
    await res.json(users.rows[0]);
  } catch (e) {
    res.json({ message: e.message });
  }
});
module.exports = router;
