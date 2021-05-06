const { Router } = require("express");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const pool = require("../config/dbPool.js");

const router = Router();

// GET
router.get("/api/help/get-categories", async (req, res) => {
  try {
    const query = await pool.query("select * from helpcategory order by id");
    res.json({
      data: query.rows,
      message: "success",
      type: "success",
    });
  } catch (e) {
    res.json({
      data: [],
      message: e.message,
      type: "danger",
    });
  }
});
router.get("/api/help/get-help-items", async (req, res) => {
  try {
    const query = await pool.query(`
      select hi.*, hp.name as category_name, to_char(hi.date_ins, 'DD TMMonth YYYY, HH24:MI'::text) AS date
      from help_items hi
      left join helpcategory hp on hp.id = hi.help_category_id
      order by id
    `);
    res.json({
      data: query.rows,
      message: "success",
      type: "success",
    });
  } catch (e) {
    res.json({
      data: [],
      message: e.message,
      type: "danger",
    });
  }
});

// POST
router.post("/api/help/create-category", async (req, res) => {
  try {
    const { name, icon } = req.body;

    const query = await pool.query(`
      insert into helpcategory (name, icon, date_ins) values ('${name}', '${icon}', now());
    `);

    res.status(200).json({ message: "Категория создана!", type: "success" });
  } catch (e) {
    res.json({ message: e.message, type: "danger" });
  }
});
router.post("/api/help/create-item", async (req, res) => {
  try {
    const { name, categoryId, text, files } = req.body;

    const docs = `{"files": [${files.map((file) => {
      return `{"name": ${'"' + file.name + '"'}, "hashname": ${
        '"' + file.hashName + '"'
      }}`;
    })}]}`;

    const query = await pool.query(`
      insert into help_items (name,text,files,help_category_id,date_ins)
      values ('${name}','${text}','${docs}',${parseInt(
      categoryId
    )},now()) returning id;
    `);

    if (!files.length) {
      return res
        .status(200)
        .json({ message: "Материал добавлен!", type: "success" });
    }

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const help_dir = current_path + `/public/help`;

    const help_cat_dir = current_path + `/public/help/${categoryId}`;

    const help_item_dir =
      current_path + `/public/help/${categoryId}/${query.rows[0].id}`;

    if (!fs.existsSync(help_dir)) {
      fs.mkdirSync(help_dir);
    }

    if (!fs.existsSync(help_cat_dir)) {
      fs.mkdirSync(help_cat_dir);
    }

    if (!fs.existsSync(help_item_dir)) {
      fs.mkdirSync(help_item_dir);
    }

    files.forEach((file) => {
      fs.writeFile(
        `${help_item_dir}/${file.hashName}`,
        file.base64,
        "base64",
        function (err) {
          if (err) console.log("error", err);
        }
      );
    });

    res.status(200).json({ message: "Материал добавлен!", type: "success" });
  } catch (e) {
    res.json({ message: e.message, type: "danger" });
  }
});

// PUT
router.put("/api/help/update-category/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, icon } = req.body;

    const query = await pool.query(`
      update helpcategory 
      set name = '${name}', icon = '${icon}'
      where id = ${id}
    `);

    res.json({ message: "Категория отредактирована!", type: "success" });
  } catch (e) {
    res.json({ message: e.message, type: "danger" });
  }
});
router.put("/api/help/update-item/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, categoryId, text, files } = req.body;

    const docs = `{"files": [${files.map((file) => {
      return `{"name": ${'"' + file.name + '"'}, "hashname": ${
        '"' + file.hashName + '"'
      }}`;
    })}]}`;

    const query = await pool.query(`
      update help_items
      set name = '${name}', text = '${text}', files = '${docs}', help_category_id = ${parseInt(
      categoryId
    )}
      where id = ${id}
    `);

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const help_cat_dir = current_path + `/public/help/${categoryId}`;

    if (!fs.existsSync(help_cat_dir)) {
      fs.mkdirSync(help_cat_dir);
    }

    const help_item_dir = current_path + `/public/help/${categoryId}/${id}`;

    if (!files.length) {
      if (fs.existsSync(help_item_dir)) {
        rimraf.sync(help_item_dir);
        res.status(200).json({
          message: "Материал отредактирован!",
          type: "success",
        });
      }
      return;
    } else {
      if (!fs.existsSync(help_item_dir)) {
        fs.mkdirSync(help_item_dir);

        files.forEach((file) => {
          fs.writeFile(
            `${help_item_dir}/${file.hashName}`,
            file.base64,
            "base64",
            function (err) {
              if (err) console.log("error", err);
            }
          );
        });
      } else {
        const readedFiles = fs.readdirSync(help_item_dir);

        readedFiles
          .filter(
            (file) =>
              !files
                .map((elem) => elem.base64 === "from order" && elem.hashName)
                .includes(file)
          )
          .forEach((x) => fs.unlinkSync(path.resolve(help_item_dir, x)));

        files.forEach((file) => {
          if (file.base64 !== "from order") {
            fs.writeFile(
              `${help_item_dir}/${file.hashName}`,
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

    res.json({ message: "Категория отредактирована!", type: "success" });
  } catch (e) {
    res.json({ message: e.message, type: "danger" });
  }
});

// DELETE
router.delete("/api/help/delete-category/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const query = await pool.query(`
      delete from helpcategory where id = ${id}
    `);

    const query2 = await pool.query(`
      delete from help_items where help_category_id = ${id}
    `);

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const help_cat_dir = current_path + `/public/help/${id}`;

    if (!fs.existsSync(help_cat_dir)) {
      return;
    }

    rimraf.sync(help_cat_dir);

    res.json({ message: "Категория удалена!", type: "success" });
  } catch (e) {
    res.json({ message: e.message, type: "danger" });
  }
});
router.delete("/api/help/delete-item/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const cat_id = req.body.help_category_id;

    const query = await pool.query(`
      delete from help_items where id = ${id}
    `);

    const __dirname = path.resolve();

    const current_path = path.resolve(__dirname);

    const help_item_dir = current_path + `/public/help/${cat_id}/${id}`;

    if (!fs.existsSync(help_item_dir)) {
      return;
    }

    rimraf.sync(help_item_dir);

    res.json({ message: "Категория удалена!", type: "success" });
  } catch (e) {
    res.json({ message: e.message, type: "danger" });
  }
});

module.exports = router;
