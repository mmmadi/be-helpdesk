const { Router } = require("express");
const pool = require("../config/dbPool.js");

const router = Router();

router.post("/api/get-dashboard-data", async (req, res) => {
  try {
    const { haveTask, userId, struct_id } = req.body;

    if (!userId || !struct_id) {
      return res.status(500).json({
        message: "Что-то пошло не так!",
        type: "danger",
        from: "check empty",
      });
    }

    if (haveTask) {
      const getTask = await pool.query(
        `select * from task where struct_id = ${struct_id}`
      );

      if (getTask.rowCount === 0) {
        return res
          .status(500)
          .json({ message: "Что-то пошло не так!", type: "danger" });
      }

      const inboxOrders = await pool.query(
        `select count(*) from orders where task_id = ${getTask.rows[0].id}`
      );

      const iAmExecutor = await pool.query(
        `select count(*) from orders where executor_id = ${userId}`
      );

      const outboxOrders = await pool.query(
        `select count(*) from orders where id_user_ins = ${userId}`
      );

      const doneOrders = await pool.query(
        `select count(*) from orders where executor_id = ${userId} and status = 3`
      );

      res.status(200).json({
        inboxOrders: inboxOrders.rows,
        iAmExecutor: iAmExecutor.rows,
        outboxOrders: outboxOrders.rows,
        doneOrders: doneOrders.rows,
      });
    } else {
      const outboxOrders = await pool.query(
        `select count(*) from orders where id_user_ins = ${userId}`
      );

      res.status(200).json({
        outboxOrders: outboxOrders.rows,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger", from: "catch" });
  }
});

module.exports = router;
