import { MongoClient } from 'mongodb';
import { config, requireMongoUri } from './config.js';

let clientPromise;

export const getDatabase = async () => {
  requireMongoUri();

  if (!clientPromise) {
    const client = new MongoClient(config.mongoUri);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db(config.dbName);
};

export const ensureDatabaseReady = async () => {
  const db = await getDatabase();
  const existingCollections = await db
    .listCollections({ name: config.collectionName })
    .toArray();

  if (existingCollections.length === 0) {
    await db.createCollection(config.collectionName);
  }

  const collection = db.collection(config.collectionName);
  await collection.createIndex({ id: 1 }, { name: 'campaign_id_idx' });
  await collection.createIndex({ sortIndex: 1 }, { name: 'campaign_sort_idx' });
};

export const closeDatabase = async () => {
  if (!clientPromise) return;

  const client = await clientPromise;
  await client.close();
  clientPromise = null;
};
