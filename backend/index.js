import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";

import config from "./config.js";
import { pool } from "./db/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import ResearchRoutes from "./routes/ResearchRoutes.js";

const app = express();

const corsOptions = { origin: config.clientUrl, credentials: true };

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);

// ── Public routes ──────────────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    // Test database connectivity on every health check.
    // Deployment platforms ping /health to verify the service is up.
    // If the database is unreachable, return 503 (not 200).
    await pool.query('SELECT 1');
    res.json({
      status:      'ok',
      app:         config.appName,
      environment: config.nodeEnv,
      database:    'connected',
      timestamp:   new Date().toISOString(),
    });
  } catch (err) {
    // Database is down — the service is degraded, not healthy.
    res.status(503).json({
      status:   'degraded',
      database: 'unreachable',
      error:    config.nodeEnv ? err.message : 'Database connection failed',
    });
  }
});

// protected routes ────────────────────────────────────────────────────────────────

app.use("/api/v1/research", ResearchRoutes);

app.use(notFound);
app.use(errorHandler);

// ── Startup ────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {

    // Verify database connection before accepting requests.
    // If this fails, the error is caught below and the process exits.
    const dbCheck = await pool.query('SELECT NOW() AS startup_time');
    console.log(`Database connected at: ${dbCheck.rows[0].startup_time}`);

    app.listen(config.port, () => {
      console.log(`${config.appName} running on port ${config.port} [${config.nodeEnv}]`);
      console.log(`Health: http://localhost:${config.port}/health`);
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Check DATABASE_URL in .env and ensure PostgreSQL is running.');
    process.exit(1);
  }
};

startServer();