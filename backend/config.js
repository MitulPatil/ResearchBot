import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

const keys = ["GEMINI_API_KEY","DB_PASSWORD"];

keys.forEach(key => {
    if(!process.env[key]){
        console.error(`FATAL: missing required environment variable : ${key}`);
        console.error(`check your .env file or development environment settings`);
        process.exit(1);
    }
});

export const config = {
    port : parseInt(process.env.PORT,10) || 3000,
    nodeEnv : process.env.NODE_ENV || "development",
    clientUrl : process.env.CLIENT_URL || "http://localhost:5713",
    geminiApiKey : process.env.GEMINI_API_KEY,
    tavilyApiKey : process.env.TAVILY_API_KEY,
    appName : process.env.APP_NAME || "ResearchBot",
    dbPass : process.env.DB_PASSWORD,
    dbUrl : process.env.DB_URL,
    databaseUrl : process.env.DATABASE_URL,
}

export default config;