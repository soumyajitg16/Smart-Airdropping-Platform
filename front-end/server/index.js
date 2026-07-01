import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureDatabaseReady } from './db.js';
import campaignRoutes from './routes/campaignRoutes.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mongoConfigured: Boolean(config.mongoUri),
    database: config.dbName,
    collection: config.collectionName,
  });
});

app.use('/api/campaigns', campaignRoutes);

app.use((err, _req, res, _next) => {
  void _next;
  console.error(err);
  res.status(500).json({
    message: err.message || 'Internal server error.',
  });
});

const startServer = async () => {
  if (config.mongoUri) {
    await ensureDatabaseReady();
    console.log(
      `MongoDB ready: ${config.dbName}.${config.collectionName}`,
    );
  }

  app.listen(config.port, config.host, () => {
    console.log(`Campaign API listening on http://${config.host}:${config.port}`);
  });
};

startServer().catch((err) => {
  console.error('Unable to initialize MongoDB campaign storage.');
  console.error(err);
  process.exit(1);
});
