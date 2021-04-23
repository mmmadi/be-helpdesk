const Pool = require("pg").Pool;
const config = require("./config");

const databaseConfig = config.dbConfig;
const pool = new Pool(databaseConfig);

module.exports = pool;
