const { Router } = require("express");
const { validationResult } = require("express-validator");
const request = require("request");
const path = require("path");
const fs = require("fs");
const utf8 = require("utf8");
const rimraf = require("rimraf");
const pool = require("../config/dbPool.js");
const config = require("../config/config.json");
const mailMiddleware = require("../middleware/mailMiddleware.js");
const checkWorkTime = require("../middleware/checkWorkTime.js");
const telegramText = require("../helpers/telegramText.js");

const router = Router();

// GET REQUESTS
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
router.get("/api/get-users", async (req, res) => {
  try {
    const query = await pool.query(`
      select id, fio from users
    `);
    res.status(200).json(query.rows);
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
      return res.status(400).json({
        data: [],
        message: "пустой id. Обратитесь к администратору!",
        type: "danger",
      });
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
            author.img as image,
            astr.name as author_struct,
            creator_user.img as creator_img,
            creator_user.fio as creator_fio,
            str.name as creator_struct
        from orders o
        left join task t on t.id = o.task_id
        left join status s on s.id = o.status
        left join prioritet p on p.id = o.prioritet
        left join users author on author.id = o.id_user_ins
        left join structs astr on astr.id = author.id_struct
        left join users owner on owner.id = o.owner_id
        left join users exec on exec.id = o.executor_id
        left join users cancel_user on cancel_user.id = o.id_user_cancel
        left join users inwork_user on inwork_user.id = o.id_user_inwork
        left join users creator_user on creator_user.id = o.creator
        left join structs str on str.id = creator_user.id_struct
        where o.id = $1
    `,
      [id]
    );

    if (query.rowCount === 0) {
      return res.status(200).json({
        data: [],
        message: "Данной заявки не существует, обратитесь к администратору!",
        type: "warning",
      });
    }

    return res.status(200).json({
      data: query.rows,
      message: "Success query",
      type: "success",
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      message: "catch get-order-id " + e.message,
      type: "danger",
    });
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
        c.date_ins AS date_ins_true,
        c.id_user_ins,
        u.fio,
        u.img,
        c.order_id,
        u.username
      from comments c
      left join users u on u.id = c.id_user_ins
      where c.order_id = ${id}
      order by c.date_ins
    `);

    res.status(200).json({
      data: query.rows,
      message: "success",
      type: "success",
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      message: "catch get-comments-id " + e.message,
      type: "danger",
    });
  }
});
router.get("/api/get-under-comments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = await pool.query(`
      select
        uc.id,
        uc.text,
        uc.date_ins,
        uc.comment_id,
        uc.id_user_ins,
        u.fio,
        u.username,
        u.img,
        c.order_id,
        marked.username as marked
      from under_comments uc
      left join comments c on c.id = uc.comment_id
      left join users u on u.id = uc.id_user_ins
      left join users marked on marked.id = uc.mark
      where c.order_id = ${id}
      order by uc.date_ins
    `);

    res.status(200).json({
      data: query.rows,
      message: "success",
      type: "success",
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      message: "catch get-under-comments-id " + e.message,
      type: "danger",
    });
  }
});
router.get("/api/get-order-party/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const query = await pool.query(`
      select u.FIO, u.img, u.id, true as checked
      from order_party op
      left join users u on u.id = op.user_id
      where op.order_id = ${id}
    `);

    res.status(200).json({
      data: query.rows,
      message: "success",
      type: "success",
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      message: "catch get-order-party-id " + e.message,
      type: "danger",
    });
  }
});

// POST REQUESTS
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

    const { form, files, client } = req.body;
    const notifyType = "Создание заявки";

    const docs = `{"files": [${files.map((file) => {
      return `{"name": ${'"' + file.name + '"'}, "hashname": ${
        '"' + file.hashName + '"'
      }}`;
    })}]}`;

    const dateIns = new Date();

    const isWorkTime = checkWorkTime(dateIns);

    const query = await pool.query(
      `
        insert into orders
        (prioritet, subject, description, id_user_ins, date_ins, files, status, owner_id, task_id, executor_id, spec_id, sub_spec_id, isworktime, creator, client)
        values ($1,$2,$3,$4,$5,$6,1,null,$7,null,$8,$9, $10,$11,$12) returning id;
    `,
      [
        form.priority,
        form.subject,
        form.description,
        form.userId,
        dateIns,
        docs,
        form.task,
        form.spec === "" ? null : form.spec,
        form.sub_spec === "" ? null : form.sub_spec,
        isWorkTime,
        client.id ? client.id : null,
        !client.id ? (client.value === "" ? null : client.value) : null,
      ]
    );

    //// отправка email

    const getTaskName = await pool.query(`
       select s.name
       from structs s
       left join task t on t.struct_id = s.id
       where t.id = ${form.task}
     `);

    const getTaskEmails = await pool.query(`
       select mail, notifications from users u
       left join structs s on s.id = u.id_struct
       left join task t on t.struct_id = s.id
       where t.id = ${form.task}
     `);

    const getAllowsNotify = getTaskEmails.rows.filter((user) =>
      user.notifications.find((x) => x.name === notifyType)
    );

    const modified = getAllowsNotify.map((x) => {
      return x["mail"];
    });

    const data = {
      title: "Заявка создана",
      type: "Заявка создана",
      name: getTaskName.rows[0].name,
      text: `К вам поступила новая заявка <br> № ${query.rows[0].id} <br> Тема: ${form.subject}`,
      mail: modified.join(),
      orderId: query.rows[0].id,
    };

    mailMiddleware(data);

    ///////////////////

    //// отправка telegram

    const getTeleIds = await pool.query(`
      select telegram_id, telegram from users u
      left join structs s on s.id = u.id_struct
      left join task t on t.struct_id = s.id
      where t.id = ${form.task}
    `);

    const getAllowsTelegramNotify = getTeleIds.rows.filter((user) =>
      user.telegram.find((x) => x.name === notifyType)
    );

    const modifiedTele = getAllowsTelegramNotify.map((x) => {
      return x["telegram_id"];
    });

    const text = telegramText(1, {
      id: query.rows[0].id,
      subject: form.subject,
    });

    modifiedTele.forEach((x) => {
      request(
        `https://api.telegram.org/bot${
          config.telegram.token
        }/sendMessage?chat_id=${x}&text=${utf8.encode(text)}&parse_mode=${
          config.telegram.parse_mode
        }`,
        (error) => {
          if (error) console.log(error);
        }
      );
    });

    ///////////////////

    if (!files.length) {
      return res
        .status(200)
        .json({ message: "Заявка добавлена!", type: "success" });
    }

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const order_dir = current_path + `/public/orders`;

    const order_id_dir = current_path + `/public/orders/${query.rows[0].id}`;

    if (!fs.existsSync(order_dir)) {
      fs.mkdirSync(order_dir);
    }

    if (!fs.existsSync(order_id_dir)) {
      fs.mkdirSync(order_id_dir);
    }

    files.forEach((file) => {
      fs.writeFile(
        `${order_id_dir}/${file.hashName}`,
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
    res.status(500).json({ message: e.message, type: "danger" });
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
            to_char(o.date_ins, 'DD.MM.YY, HH24:MI'::text) AS date_ins,
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
        order by o.status, o.date_ins desc
      `
      );

      return res.status(200).json({
        data: query.rows,
        message: "success",
        type: "success",
      });
    }

    // to_char(o.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date_ins

    const query = await pool.query(
      `
      select
          o.*,
          p.name as priority,
          o.subject,
          author.FIO as author,
          to_char(o.date_ins, 'DD.MM.YY, HH24:MI'::text) AS date_ins,
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
      order by o.status, o.date_ins desc
    `
    );

    return res.status(200).json({
      data: query.rows,
      message: "success",
      type: "success",
    });
  } catch (e) {
    return res.status(500).json({
      data: [],
      message: "catch get-orders " + e.message,
      type: "danger",
    });
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
              o.date_ins between '${startDate}' and '${endDate}'
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

      return res
        .status(200)
        .json({ data: query.rows, message: "success", type: "success" });
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
          o.date_ins between '${startDate}' and '${endDate}'
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
      return res
        .status(200)
        .json({ data: query.rows, message: "success", type: "success" });
    }
  } catch (e) {
    res.status(500).json({ data: [], message: e.message, type: "danger" });
  }
});
router.post("/api/add-comment", async (req, res) => {
  try {
    const { id, form, files } = req.body;

    const notifyType = "Комментирование заявки";

    const getUserIns = await pool.query(
      `select * from orders where id = ${id}`
    );

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
        c.date_ins AS date_ins_true,
        c.id_user_ins,
        u.fio,
        u.img,
        c.order_id,
        u.username
      from comments c
      left join users u on u.id = c.id_user_ins
      where c.order_id = ${id}
      order by c.date_ins
    `);

    //////////////////////////////////////// Отправка Email
    const creator = await pool.query(
      `select * from users where id = ${getUserIns.rows[0].id_user_ins}`
    );

    const checkNotifyType = creator.rows[0].notifications.findIndex(
      (x) => x.name === notifyType
    );

    if (checkNotifyType >= 0) {
      const data = {
        title: "Добавлен комментарий",
        type: "Вашу заявку прокомментировали",
        name: creator.rows[0].name,
        text: "Вашу заявку прокомментировали",
        mail: creator.rows[0].mail,
        orderId: id,
      };

      mailMiddleware(data);
    }
    /////////////////////////////////////////////////////

    //// отправка telegram

    const checkTelegramNotifyType = creator.rows[0].telegram.findIndex(
      (x) => x.name === notifyType
    );

    const text = telegramText(6, {
      id: id,
      subject: "",
      name: creator.rows[0].name,
    });

    if (checkTelegramNotifyType >= 0) {
      request(
        `https://api.telegram.org/bot${
          config.telegram.token
        }/sendMessage?chat_id=${creator.rows[0].telegram_id}&text=${utf8.encode(
          text
        )}&parse_mode=${config.telegram.parse_mode}`,
        (error) => {
          if (error) console.log(error);
        }
      );
    }

    ///////////////////

    if (!files.length) {
      return res.status(200).json({
        message: "Комментарий добавлен!",
        status: 200,
        data: getNewComments.rows,
      });
    }

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const order_dir = current_path + `/public/orders`;

    const order_id_dir = current_path + `/public/orders/${id}`;

    const comments_dir = current_path + `/public/orders/${id}/comments`;

    if (!fs.existsSync(order_dir)) {
      fs.mkdirSync(order_dir);
    }

    if (!fs.existsSync(order_id_dir)) {
      fs.mkdirSync(order_id_dir);
    }
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
      type: "success",
      data: getNewComments.rows,
    });
  } catch (e) {
    res.status(500).json({ data: [], message: e.message, type: "danger" });
  }
});
router.post("/api/add-under-comment", async (req, res) => {
  try {
    const { id, userId, text, orderId, mark } = req.body;

    const notifyType = "Ответ на комментарий";

    const query = await pool.query(
      `
      insert into under_comments (text, date_ins, id_user_ins, comment_id, mark)
      values ('${text}', now(), ${userId}, ${id}, ${mark ? mark : null});
    `
    );

    const getNewComments = await pool.query(`
      select
        uc.id,
        uc.text,
        uc.date_ins,
        uc.comment_id,
        uc.id_user_ins,
        u.fio,
        u.username,
        u.img,
        c.order_id,
        marked.username as marked
      from under_comments uc
      left join comments c on c.id = uc.comment_id
      left join users u on u.id = uc.id_user_ins
      left join users marked on marked.id = uc.mark
      where c.order_id = ${orderId}
      order by uc.date_ins
    `);

    if (!mark) {
      return res.status(200).json({
        message: "Комментарий добавлен!",
        type: "success",
        data: getNewComments.rows,
      });
    }

    //////////////////////////////////////// Отправка Email
    const creator = await pool.query(`select * from users where id = ${mark}`);

    const checkNotifyType = creator.rows[0].notifications.findIndex(
      (x) => x.name === notifyType
    );

    if (checkNotifyType >= 0) {
      const data = {
        title: "Ответ в комментариях",
        type: "На Ваш комментарий ответили",
        name: creator.rows[0].name,
        text: "На Ваш комментарий ответили",
        mail: creator.rows[0].mail,
        orderId: orderId,
      };

      mailMiddleware(data);
    }
    /////////////////////////////////////////////////////

    //// отправка telegram

    const checkTelegramNotifyType = creator.rows[0].telegram.findIndex(
      (x) => x.name === notifyType
    );

    const textTele = telegramText(7, {
      id: orderId,
      subject: "",
      name: creator.rows[0].name,
    });

    if (checkTelegramNotifyType >= 0) {
      request(
        `https://api.telegram.org/bot${
          config.telegram.token
        }/sendMessage?chat_id=${creator.rows[0].telegram_id}&text=${utf8.encode(
          textTele
        )}&parse_mode=${config.telegram.parse_mode}`,
        (error) => {
          if (error) console.log(error);
        }
      );
    }

    ///////////////////

    res.status(200).json({
      message: "Комментарий добавлен!",
      type: "success",
      data: getNewComments.rows,
    });
  } catch (e) {
    res.status(500).json({ data: [], message: e.message, type: "danger" });
  }
});
router.post("/api/add-order-party", async (req, res) => {
  try {
    const { orderId, data } = req.body;

    if (!orderId && !data) {
      res.status(400).json({ message: "Что-то пошло не так!", type: "danger" });
    }

    const notifyType = "Добавление в участники заявки";

    const deleteOrderParty = await pool.query(
      `delete from order_party where order_id = ${orderId}`
    );

    data.map(async (x) => {
      //// отправка email

      const creator = await pool.query(
        `select * from users where id = ${x.id}`
      );

      const checkNotifyType = creator.rows[0].notifications.findIndex(
        (x) => x.name === notifyType
      );

      if (checkNotifyType >= 0) {
        const data = {
          title: "Добавление в участники заявки",
          type: "Вас добавили в участники заявки",
          name: creator.rows[0].name,
          text: "Вас добавили в участники заявки",
          mail: creator.rows[0].mail,
          orderId: orderId,
        };

        mailMiddleware(data);
      }

      ///////////////////

      //// отправка telegram

      const checkTelegramNotifyType = creator.rows[0].telegram.findIndex(
        (x) => x.name === notifyType
      );

      const text = telegramText(5, {
        id: orderId,
        subject: "",
        name: creator.rows[0].name,
      });

      if (checkTelegramNotifyType >= 0) {
        request(
          `https://api.telegram.org/bot${
            config.telegram.token
          }/sendMessage?chat_id=${
            creator.rows[0].telegram_id
          }&text=${utf8.encode(text)}&parse_mode=${config.telegram.parse_mode}`,
          (error) => {
            if (error) console.log(error);
          }
        );
      }

      ///////////////////

      const query = await pool.query(`
        insert into order_party (order_id, user_id, date_ins) values (${orderId}, ${x.id}, now());
      `);
    });

    const getNewOrderParty = await pool.query(`
      select u.FIO, u.img, u.id, true as checked
      from order_party op
      left join users u on u.id = op.user_id
      where op.order_id = ${orderId}
    `);

    return res.status(200).json(getNewOrderParty.rows);
  } catch (e) {
    res.status(500).json({ message: e.message, type: "danger" });
  }
});

// PUT REQUESTS
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
router.put("/api/take-in-work-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, param } = req.body;

    const getUserIns = await pool.query(
      `select * from orders where id = ${id}`
    );

    ////1
    if (param === 1) {
      const notifyType = "Взятие в работу заявки";
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

      const joinOrderParty = await pool.query(`
        insert into order_party (order_id, user_id, date_ins) values (${id}, ${userId}, now());
      `);

      const getStatus = await pool.query(
        `select * from status where id = ${query.rows[0].status}`
      );

      const getUser = await pool.query(`
        select * from users where id = ${userId}
      `);

      //// отправка email

      const creator = await pool.query(
        `select * from users where id = ${getUserIns.rows[0].id_user_ins}`
      );

      const checkNotifyType = creator.rows[0].notifications.findIndex(
        (x) => x.name === notifyType
      );

      if (checkNotifyType >= 0) {
        const data = {
          title: "Статус заявки изменён",
          type: "Ваша заявка взята в работу",
          name: creator.rows[0].name,
          text: "Ваша заявка взята в работу",
          mail: creator.rows[0].mail,
          orderId: id,
        };

        mailMiddleware(data);
      }

      ///////////////////

      //// отправка telegram

      const checkTelegramNotifyType = creator.rows[0].telegram.findIndex(
        (x) => x.name === notifyType
      );

      const text = telegramText(2, {
        id: id,
        subject: "",
        name: creator.rows[0].name,
      });

      if (checkTelegramNotifyType >= 0) {
        request(
          `https://api.telegram.org/bot${
            config.telegram.token
          }/sendMessage?chat_id=${
            creator.rows[0].telegram_id
          }&text=${utf8.encode(text)}&parse_mode=${config.telegram.parse_mode}`,
          (error) => {
            if (error) console.log(error);
          }
        );
      }

      ///////////////////

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

      const removeOrderParty = await pool.query(`
        delete from order_party where order_id = ${id} and user_id = ${userId}
      `);

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
      const notifyType = "Отмена заявки";
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

      //////////////////////////////////////// Отправка Email
      const creator = await pool.query(
        `select * from users where id = ${getCreator.rows[0].id_user_ins}`
      );

      const checkNotifyType = creator.rows[0].notifications.findIndex(
        (x) => x.name === notifyType
      );

      if (checkNotifyType >= 0) {
        const data = {
          title: "Статус заявки изменён",
          type: "Ваша заявка была отклонена",
          name: creator.rows[0].name,
          text: "Вашу заявку отклонили",
          mail: creator.rows[0].mail,
          orderId: id,
        };

        mailMiddleware(data);
      }
      /////////////////////////////////////////////////////

      //// отправка telegram

      const checkTelegramNotifyType = creator.rows[0].telegram.findIndex(
        (x) => x.name === notifyType
      );

      const text = telegramText(4, {
        id: id,
        subject: "",
        name: creator.rows[0].name,
      });

      if (checkTelegramNotifyType >= 0) {
        request(
          `https://api.telegram.org/bot${
            config.telegram.token
          }/sendMessage?chat_id=${
            creator.rows[0].telegram_id
          }&text=${utf8.encode(text)}&parse_mode=${config.telegram.parse_mode}`,
          (error) => {
            if (error) console.log(error);
          }
        );
      }

      ///////////////////

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

    const notifyType = "Выполнение заявки";

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

      //////////////////////////////////////// Отправка Email
      const creator = await pool.query(
        `select * from users where id = ${getUserIns.rows[0].id_user_ins}`
      );

      const checkNotifyType = creator.rows[0].notifications.findIndex(
        (x) => x.name === notifyType
      );

      if (checkNotifyType >= 0) {
        const data = {
          title: "Статус заявки изменён",
          type: "Ваша заявка выполнена",
          name: creator.rows[0].name,
          text: "Статус вашей заявки был изменён на выполнено",
          mail: creator.rows[0].mail,
          orderId: id,
        };

        mailMiddleware(data);
      }
      /////////////////////////////////////////////////////

      //// отправка telegram

      const checkTelegramNotifyType = creator.rows[0].telegram.findIndex(
        (x) => x.name === notifyType
      );

      const text = telegramText(3, {
        id: id,
        subject: "",
        name: creator.rows[0].name,
      });

      if (checkTelegramNotifyType >= 0) {
        request(
          `https://api.telegram.org/bot${
            config.telegram.token
          }/sendMessage?chat_id=${
            creator.rows[0].telegram_id
          }&text=${utf8.encode(text)}&parse_mode=${config.telegram.parse_mode}`,
          (error) => {
            if (error) console.log(error);
          }
        );
      }

      ///////////////////

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

// DELETE REQUESTS
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

module.exports = router;
