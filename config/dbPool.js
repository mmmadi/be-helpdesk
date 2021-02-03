const Pool = require("pg").Pool;
const config = require("./config");

const databaseConfig = config.dbConfig;
const pool = new Pool(databaseConfig);

// const pool = new Pool();

module.exports = pool;
