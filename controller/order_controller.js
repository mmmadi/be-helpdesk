import { Router } from "express";
import { validationResult } from "express-validator";
import path from "path";
import fs from "fs";
import rimraf from "rimraf";
import pool from "../config/dbPool.js";

const router = Router();

router.get("/api/get-tasks", async (req, res) => {
  try {
    const query = await pool.query(`
      select * from task
    `);
    res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/get-spec", async (req, res) => {
  try {
    const { task_id } = req.body;

    const query = await pool.query(
      `select * from spec where task_id = ${task_id}`
    );

    res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/get-sub-spec", async (req, res) => {
  try {
    const { spec_id } = req.body;

    const query = await pool.query(
      `select * from sub_spec where spec_id = ${spec_id}`
    );

    res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/create-order", async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.status(400).json({
        errors: error.array(),
        message: "Некорректные данные",
      });
    }

    const { form, files } = req.body;

    const docs = `{"files": [${files.map((file) => {
      return `{"name": ${'"' + file.name + '"'}, "hashname": ${
        '"' + file.hashName + '"'
      }}`;
    })}]}`;

    const query = await pool.query(
      `
        insert into orders
        (prioritet, subject, description, id_user_ins, date_ins, files, status, owner_id, task_id, executor_id, spec_id, sub_spec_id)
        values ($1,$2,$3,$4,$5,$6,1,null,$7,null,$8,$9) returning id;
    `,
      [
        form.priority,
        form.subject,
        form.description,
        form.userId,
        new Date(),
        docs,
        form.task,
        form.spec === "" ? null : form.spec,
        form.sub_spec === "" ? null : form.sub_spec,
      ]
    );

    if (!files.length) {
      return res
        .status(200)
        .json({ message: "Заявка добавлена!", status: 200, type: "success" });
    }

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const order_dir = current_path + `/public/orders/${query.rows[0].id}`;

    if (!fs.existsSync(order_dir)) {
      fs.mkdirSync(order_dir);
    }

    files.forEach((file) => {
      fs.writeFile(
        `${order_dir}/${file.hashName}`,
        file.base64,
        "base64",
        function (err) {
          if (err) console.log("error", err);
        }
      );
    });

    res
      .status(200)
      .json({ message: "Заявка добавлена!", status: 200, type: "success" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/api/update-order/:id", async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.status(400).json({
        errors: error.array(),
        message: "Некорректные данные",
      });
    }

    const { id } = req.params;
    const { form, files } = req.body;

    const docs = `{"files": [${files.map((file) => {
      return `{"name": ${'"' + file.name + '"'}, "hashname": ${
        '"' + file.hashName + '"'
      }}`;
    })}]}`;

    const query = await pool.query(
      `
      update orders
      set
        task_id = $1, spec_id = $2, sub_spec_id = $3, prioritet = $4, subject = $5,
        description = $6, files = $7, date_update = now()
      where id = $8
    `,
      [
        form.task,
        form.spec === "" ? null : form.spec,
        form.sub_spec === "" ? null : form.sub_spec,
        form.priority,
        form.subject,
        form.description,
        docs,
        id,
      ]
    );

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const order_dir = current_path + `/public/orders/${id}`;

    if (!files.length) {
      if (fs.existsSync(order_dir)) {
        rimraf.sync(order_dir);
        res.status(200).json({
          message: "Заявка отредактирована!",
          status: 200,
          type: "success",
        });
      }
      return;
    } else {
      if (!fs.existsSync(order_dir)) {
        fs.mkdirSync(order_dir);

        files.forEach((file) => {
          fs.writeFile(
            `${order_dir}/${file.hashName}`,
            file.base64,
            "base64",
            function (err) {
              if (err) console.log("error", err);
            }
          );
        });
      } else {
        const readedFiles = fs.readdirSync(order_dir);

        readedFiles
          .filter(
            (file) =>
              !files
                .map((elem) => elem.base64 === "from order" && elem.hashName)
                .includes(file)
          )
          .forEach((x) => fs.unlinkSync(path.resolve(order_dir, x)));

        files.forEach((file) => {
          if (file.base64 !== "from order") {
            fs.writeFile(
              `${order_dir}/${file.hashName}`,
              file.base64,
              "base64",
              function (err) {
                if (err) console.log("error", err);
              }
            );
          }
        });
      }
    }

    res.status(200).json({
      message: "Заявка отредактирована! Обновите страницу!",
      status: 200,
      type: "success",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/get-orders", async (req, res) => {
  try {
    const { param, userId, struct_id } = req.body;

    const getTask = await pool.query(`
      select
          t.id
      from Task t
      left join users u on u.id_struct = t.struct_id
      where u.id = ${userId}
    `);

    if (getTask.rowCount === 0) {
      const query = await pool.query(
        `
        select
            o.*,
            p.name as priority,
            o.subject,
            author.FIO as author,
            to_char(o.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
            owner.fio as owner,
            exec.fio as executor,
            s.name as status,
            t.name as task,
            spec.name as spec,
            sub_spec.name as sub_spec
        from orders o
        left join task t on t.id = o.task_id
        left join status s on s.id = o.status
        left join prioritet p on p.id = o.prioritet
        left join users author on author.id = o.id_user_ins
        left join users owner on owner.id = o.owner_id
        left join users exec on exec.id = o.executor_id
        left join spec on spec.id = o.spec_id
        left join sub_spec on sub_spec.id = o.sub_spec_id
        where o.id_user_ins = ${userId}
        order by o.date_ins
      `
      );

      return res.status(200).json(query.rows);
    }

    const query = await pool.query(
      `
      select
          o.*,
          p.name as priority,
          o.subject,
          author.FIO as author,
          to_char(o.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
          owner.fio as owner,
          exec.fio as executor,
          s.name as status,
          t.name as task,
          spec.name as spec,
          sub_spec.name as sub_spec,
          ${param} as param
      from orders o
      left join task t on t.id = o.task_id
      left join status s on s.id = o.status
      left join prioritet p on p.id = o.prioritet
      left join users author on author.id = o.id_user_ins
      left join users owner on owner.id = o.owner_id
      left join users exec on exec.id = o.executor_id
      left join spec spec on spec.id = o.spec_id
      left join sub_spec sub_spec on sub_spec.id = o.sub_spec_id
      ${
        param === 2
          ? `where id_user_ins = ${userId}`
          : `where o.task_id = ${getTask.rows[0].id} or o.owner_id = ${userId}`
      }
      order by o.date_ins
    `
    );

    res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/get-filter-orders", async (req, res) => {
  try {
    const { param, userId, form } = req.body;

    const startDate = form.date_start.slice(0, 10) + "T00:00:00.000Z";
    const endDate = form.date_end.slice(0, 10) + "T23:59:59.000Z";

    const getTask = await pool.query(`
      select
          t.id
      from Task t
      left join users u on u.id_struct = t.struct_id
      where u.id = ${userId}
    `);

    if (param === 1) {
      const query = await pool.query(
        `
        select
            o.*,
            p.name as priority,
            o.subject,
            author.FIO as author,
            to_char(o.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
            owner.fio as owner,
            exec.fio as executor,
            s.name as status,
            t.name as task,
            spec.name as spec,
            sub_spec.name as sub_spec,
            ${param} as param
        from orders o
        left join task t on t.id = o.task_id
        left join status s on s.id = o.status
        left join prioritet p on p.id = o.prioritet
        left join users author on author.id = o.id_user_ins
        left join users owner on owner.id = o.owner_id
        left join users exec on exec.id = o.executor_id
        left join spec spec on spec.id = o.spec_id
        left join sub_spec sub_spec on sub_spec.id = o.sub_spec_id
        where (o.task_id = ${getTask.rows[0].id} or o.owner_id = ${userId})
          and (
              o.date_update between '${startDate}' and '${endDate}'
              ${
                form.spec !== ""
                  ? `and o.spec_id = '${form.spec}'`
                  : `and o.id is not null`
              }
              ${
                form.sub_spec !== ""
                  ? `and o.sub_spec_id = '${form.sub_spec}'`
                  : `and o.id is not null`
              }
              ${
                form.executor !== null
                  ? `and o.executor_id = '${form.executor}'`
                  : `and o.id is not null`
              }
              ${
                form.status !== null
                  ? `and o.status = '${form.status}'`
                  : `and o.id is not null`
              }
            )
        order by o.date_ins
      `
      );

      return res.status(200).json(query.rows);
    } else {
      const query = await pool.query(
        `
        select
            o.*,
            p.name as priority,
            o.subject,
            author.FIO as author,
            to_char(o.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
            owner.fio as owner,
            exec.fio as executor,
            s.name as status,
            t.name as task,
            spec.name as spec,
            sub_spec.name as sub_spec,
            ${param} as param
        from orders o
        left join task t on t.id = o.task_id
        left join status s on s.id = o.status
        left join prioritet p on p.id = o.prioritet
        left join users author on author.id = o.id_user_ins
        left join users owner on owner.id = o.owner_id
        left join users exec on exec.id = o.executor_id
        left join spec spec on spec.id = o.spec_id
        left join sub_spec sub_spec on sub_spec.id = o.sub_spec_id
        where id_user_ins = ${userId}
        and (
          o.date_update between '${startDate}' and '${endDate}'
          ${
            form.spec !== ""
              ? `and o.spec_id = '${form.spec}'`
              : `and o.id is not null`
          }
          ${
            form.sub_spec !== ""
              ? `and o.sub_spec_id = '${form.sub_spec}'`
              : `and o.id is not null`
          }
          ${
            form.executor !== null
              ? `and o.executor_id = '${form.executor}'`
              : `and o.id is not null`
          }
          ${
            form.status !== null
              ? `and o.status = '${form.status}'`
              : `and o.id is not null`
          }
        )
        order by o.date_ins
      `
      );
      return res.status(200).json(query.rows);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/get-count", async (req, res) => {
  try {
    const { userId } = req.body;

    const getTask = await pool.query(`
      select
          t.id
      from Task t
      left join users u on u.id_struct = t.struct_id
      where u.id = ${userId}
    `);

    if (getTask.rowCount === 0) {
      const query = await pool.query(`
      select count(*)
      from Orders
      where owner_id = ${userId} and status in (3,4)
    `);

      if (query.rows[0].count === "0") {
        return res.status(200).json({ count: null });
      }

      return res.status(200).json(query.rows[0]);
    }

    const query = await pool.query(`
      select count(*)
      from Orders
      where (task_id = ${getTask.rows[0].id} or owner_id = ${userId})
      and status = 1
    `);

    if (query.rows[0].count === "0") {
      return res.status(200).json({ count: null });
    }

    res.status(200).json(query.rows[0]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/api/get-order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "id is null" });
    }

    const query = await pool.query(
      `
      select
            o.*,
            p.name as priority,
            o.subject,
            author.FIO as author,
            to_char(o.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
            owner.fio as owner,
            exec.fio as executor,
            s.name as status,
            case 
              when status = 2 then true
              else false
            end as isLock,
            case 
              when status = 3 then true
              else false
            end as isDone,
            case 
              when status = 4 then true
              else false
            end as isCancel,
            cancel_user.fio as cancel_user,
            inwork_user.fio as inwork_user,
            author.img as image
        from orders o
        left join task t on t.id = o.task_id
        left join status s on s.id = o.status
        left join prioritet p on p.id = o.prioritet
        left join users author on author.id = o.id_user_ins
        left join users owner on owner.id = o.owner_id
        left join users exec on exec.id = o.executor_id
        left join users cancel_user on cancel_user.id = o.id_user_cancel
        left join users inwork_user on inwork_user.id = o.id_user_inwork
        where o.id = $1
    `,
      [id]
    );

    res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/api/take-in-work-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, param } = req.body;

    ////1
    if (param === 1) {
      const checkLock = await pool.query(`
      select count(*) from orders where id = ${id} and owner_id is null and executor_id is null and status = 1
    `);

      if (checkLock.rows[0].count === "0") {
        return res.json({ message: "Заявка заблокирована!", type: "danger" });
      }

      const query = await pool.query(`
      update orders
      set owner_id = ${userId}, executor_id = ${userId}, status = 2, date_in_work = now(), id_user_inwork = ${userId}
      where id = ${id}
      returning status
    `);

      if (query.rowCount === 0) {
        return res.status(400).json({
          message: "Что-то пошло не так! Обратитесь к администратору.",
          type: "danger",
        });
      }

      const getStatus = await pool.query(
        `select * from status where id = ${query.rows[0].status}`
      );

      const getUser = await pool.query(`
      select * from users where id = ${userId}
    `);

      res.status(200).json({
        message: "Заявка обновлена!",
        type: "success",
        userId,
        isLock: true,
        userfio: getUser.rows[0].fio,
        status: getStatus.rows[0].name,
      });
      /////2
    } else if (param === 2) {
      const checkLock = await pool.query(`
      select count(*) from orders where id = ${id} and owner_id is null and executor_id is null and status = 1
    `);

      if (checkLock.rows[0].count === "1") {
        return res.json({
          message: "Заявка уже разблокирована!",
          type: "danger",
        });
      }

      const query = await pool.query(`
      update orders
      set owner_id = null, executor_id = null, status = 1, date_in_work = null, id_user_inwork = null
      where id = ${id}
      returning status
    `);

      if (query.rowCount === 0) {
        return res.status(400).json({
          message: "Что-то пошло не так! Обратитесь к администратору.",
          type: "danger",
        });
      }
      const getStatus = await pool.query(
        `select * from status where id = ${query.rows[0].status}`
      );

      res.status(200).json({
        message: "Заявка обновлена!",
        type: "success",
        isLock: false,
        status: getStatus.rows[0].name,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/api/cancel-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, param } = req.body;

    const getUser = await pool.query(
      `select * from users where id = ${userId}`
    );

    const getCreator = await pool.query(
      `select * from orders where id = ${id}`
    );

    if (param === 1) {
      const checkCancel = await pool.query(
        `select count(*) from orders where id = ${id} and status = 4`
      );

      if (checkCancel.rows[0].count === "1") {
        return res.json({
          message: "Заявка уже отменена! Обновите страницу!",
          type: "danger",
        });
      }

      const query = await pool.query(`
          update orders
          set status = 4, owner_id = ${getCreator.rows[0].id_user_ins}, executor_id = null,
          id_user_cancel = ${userId}, date_cancel = now()
          where id = ${id}
          returning status
        `);

      if (query.rowCount === 0) {
        return res.status(400).json({
          message: "Что-то пошло не так! Обратитесь к администратору.",
          type: "danger",
        });
      }

      const getStatus = await pool.query(`
          select * from status where id = ${query.rows[0].status}
        `);

      return res.status(200).json({
        message: "Заявка отменена!",
        type: "success",
        userfio: getUser.rows[0].fio,
        status: getStatus.rows[0].name,
        isCancel: true,
      });
    } ///////////////////////
    else {
      const checkCancel = await pool.query(
        `select count(*) from orders where id = ${id} and status = 1`
      );

      if (checkCancel.rows[0].count === "1") {
        return res.json({
          message: "Заявка не отменена! Обновите страницу!",
          type: "danger",
        });
      }

      const query = await pool.query(`
          update orders
          set status = 1, owner_id = null, id_user_cancel = null, date_cancel = null
          where id = ${id}
          returning status
        `);

      if (query.rowCount === 0) {
        return res.status(400).json({
          message: "Что-то пошло не так! Обратитесь к администратору.",
          type: "danger",
        });
      }

      const getStatus = await pool.query(`
          select * from status where id = ${query.rows[0].status}
        `);

      return res.status(200).json({
        message: "Заявка обновлена!",
        type: "success",
        status: getStatus.rows[0].name,
        isCancel: false,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/api/done-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, param } = req.body;

    const getUser = await pool.query(
      `select * from users where id = ${userId}`
    );

    const getUserIns = await pool.query(
      `select * from orders where id = ${id}`
    );

    if (param === 1) {
      const checkDone = await pool.query(
        `select count(*) from orders where id = ${id} and status = 3`
      );

      if (checkDone.rows[0].count === "1") {
        return res.json({
          message: "Заявка уже выполнена! Обновите страницу!",
          type: "danger",
        });
      }

      const doneQuery = await pool.query(`
      update orders
      set status = 3, owner_id = ${getUserIns.rows[0].id_user_ins},
          date_done = now()
      where id = ${id}
      returning status
    `);

      if (doneQuery.rowCount === 0) {
        return res.status(400).json({
          message: "Что-то пошло не так! Обратитесь к администратору.",
          type: "danger",
        });
      }

      const getStatus = await pool.query(`
        select * from status where id = ${doneQuery.rows[0].status}
      `);

      res.status(200).json({
        message: "Заявка обновлена!",
        type: "success",
        userfio: getUser.rows[0].fio,
        status: getStatus.rows[0].name,
        isDone: true,
      });
    } else if (param === 2) {
      const checkDone = await pool.query(
        `select count(*) from orders where id = ${id} and status = 3`
      );

      if (checkDone.rows[0].count === "0") {
        return res.json({
          message: "Заявку уже отменили! Обновите страницу!",
          type: "danger",
        });
      }

      const doneQuery = await pool.query(`
        update orders
        set status = 2, owner_id = executor_id,
            date_done = null
        where id = ${id}
        returning status
      `);

      if (doneQuery.rowCount === 0) {
        return res.status(400).json({
          message: "Что-то пошло не так! Обратитесь к администратору.",
          type: "danger",
        });
      }

      const getStatus = await pool.query(`
        select * from status where id = ${doneQuery.rows[0].status}
      `);

      res.status(200).json({
        message: "Заявка обновлена!",
        type: "success",
        isDone: false,
        status: getStatus.rows[0].name,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/api/add-comment", async (req, res) => {
  try {
    const { id, form, files } = req.body;

    const docs = `{"files": [${files.map((file) => {
      return `{"name": ${'"' + file.name + '"'}, "hashname": ${
        '"' + file.hashName + '"'
      }}`;
    })}]}`;

    const query = await pool.query(
      `
      insert into comments (comment, files, date_ins, id_user_ins, order_id)
      values ($1,$2,now(),$3,$4)
      returning id;
    `,
      [form.comment, docs, form.userId, id]
    );

    const getNewComments = await pool.query(`
      select
        c.id,
        c.comment,
        c.files,
        to_char(c.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
        c.id_user_ins,
        u.fio,
        c.order_id
      from comments c
      left join users u on u.id = c.id_user_ins
      where c.order_id = ${id}
      order by c.date_ins
    `);

    if (!files.length) {
      return res.status(200).json({
        message: "Комментарий добавлен!",
        status: 200,
        data: getNewComments.rows,
      });
    }

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const comments_dir = current_path + `/public/orders/${id}/comments`;

    if (!fs.existsSync(comments_dir)) {
      fs.mkdirSync(comments_dir);
    }

    const comment_dir =
      current_path + `/public/orders/${id}/comments/${query.rows[0].id}`;

    if (!fs.existsSync(comment_dir)) {
      fs.mkdirSync(comment_dir);
    }

    files.forEach((file) => {
      fs.writeFile(
        `${comment_dir}/${file.hashName}`,
        file.base64,
        "base64",
        function (err) {
          if (err) console.log("error", err);
        }
      );
    });

    res.status(200).json({
      message: "Комментарий добавлен!",
      status: 200,
      data: getNewComments.rows,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/api/get-comments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = await pool.query(`
      select
        c.id,
        c.comment,
        c.files,
        to_char(c.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins,
        c.id_user_ins,
        u.fio,
        u.img,
        c.order_id
      from comments c
      left join users u on u.id = c.id_user_ins
      where c.order_id = ${id}
      order by c.date_ins
    `);

    res.status(200).json(query.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/api/delete-order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const checkStatus = await pool.query(
      `select * from orders where id = ${id}`
    );

    if (checkStatus.rows[0].status !== 1) {
      return res.json({
        message: "Не удалось удалить заявку. Обратитесь к Администратору!",
        type: "danger",
      });
    }

    const deleteQuery = await pool.query(`
      delete from orders
      where id = ${id};
      delete from comments
      where order_id = ${id};
    `);

    if (deleteQuery.rowCount === 0) {
      return res.status(400).json({
        message: "Что-то пошло не так! Обратитесь к администратору.",
        type: "danger",
      });
    }

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const order_dir = current_path + `/public/orders/${id}`;

    if (!fs.existsSync(order_dir)) {
      return;
    }

    rimraf.sync(order_dir);

    res.status(200).json({ message: "Заявка удалена!", type: "success" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
