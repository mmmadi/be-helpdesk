import Pool from "pg-pool";
import config from "./config.json";

const databaseConfig = config.dbConfig;
const pool = new Pool(databaseConfig);

export default pool;
