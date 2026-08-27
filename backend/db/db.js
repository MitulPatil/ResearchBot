import pg from "pg";
import config from "../config.js";
const { Pool } = pg;

export const pool = new Pool(
    config.dbUrl 
    ? {
        connectionString : config.dbUrl,
        ssl : {
            rejectUnauthorized : false
        }
    }
    : {
        user : "postgres",
        host : "localhost",
        database : "researchagent",
        password : config.dbPass,
        port : 5432
    }
)

