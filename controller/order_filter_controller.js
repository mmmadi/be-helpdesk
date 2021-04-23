const { Router } = require("express");
const pool = require("../config/dbPool.js");

const router = Router();

router.post("/api/get-filter-spec", async (req, res) => {
  try {
    const { struct_id } = req.body;

    if (!struct_id) {
      return res
        .status(500)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const query = await pool.query(`
      select s.*
      from spec s
      left join task t on t.id = s.task_id
      where t.struct_id = ${struct_id}
    `);

    return res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

router.post("/api/get-filter-sub-spec", async (req, res) => {
  try {
    const { spec_id } = req.body;

    if (!spec_id) {
      return res
        .status(500)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const query = await pool.query(`
      select ss.*
      from sub_spec ss
      left join spec s on s.id = ss.spec_id
      where s.id = ${spec_id}
    `);

    return res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

router.post("/api/get-filter-executor", async (req, res) => {
  try {
    const { struct_id } = req.body;

    if (!struct_id) {
      return res
        .status(500)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const query = await pool.query(`
        select id, fio from users where id_struct = ${struct_id}
    `);

    return res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

router.get("/api/get-filter-status", async (req, res) => {
  try {
    const query = await pool.query(`
        select * from status
    `);

    return res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

module.exports = router;
