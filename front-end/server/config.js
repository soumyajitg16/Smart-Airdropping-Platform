import 'dotenv/config';

const parseCorsOrigins = (origin) => {
  if (!origin || origin === '*') return true;
  return origin.split(',').map((item) => item.trim()).filter(Boolean);
};

export const config = {
  port: Number(process.env.API_PORT || process.env.PORT || 5050),
  host: process.env.HOST || 'localhost',
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || 'multidrop',
  collectionName: process.env.MONGODB_CAMPAIGNS_COLLECTION || 'campaigns',
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN || 'http://localhost:5173'),
};

export const requireMongoUri = () => {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required to use campaign persistence.');
  }
};
