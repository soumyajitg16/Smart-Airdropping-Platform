import { config } from '../config.js';
import { getDatabase } from '../db.js';

const getCollection = async () => {
  const db = await getDatabase();
  return db.collection(config.collectionName);
};

const toDocument = (campaign, sortIndex = 0) => {
  const { _id, ...safeCampaign } = campaign;
  const id = String(safeCampaign.id || _id || Date.now());

  return {
    ...safeCampaign,
    _id: id,
    id,
    sortIndex,
    syncedAt: new Date(),
  };
};

const fromDocument = (document) => {
  const campaign = { ...document };
  const mongoId = campaign._id;

  delete campaign._id;
  delete campaign.sortIndex;
  delete campaign.syncedAt;

  return {
    id: campaign.id || mongoId,
    ...campaign,
  };
};

export const listCampaigns = async () => {
  const collection = await getCollection();
  const documents = await collection.find({}).sort({ sortIndex: 1, _id: 1 }).toArray();
  return documents.map(fromDocument);
};

export const replaceCampaigns = async (campaigns) => {
  const normalizedCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const collection = await getCollection();
  const documents = normalizedCampaigns.map((campaign, index) =>
    toDocument(campaign, index),
  );

  await collection.deleteMany({});

  if (documents.length > 0) {
    await collection.insertMany(documents, { ordered: true });
  }

  return listCampaigns();
};

export const upsertCampaign = async (campaign) => {
  const collection = await getCollection();
  const currentCount = await collection.countDocuments();
  const document = toDocument(campaign, currentCount);

  await collection.replaceOne({ _id: document._id }, document, { upsert: true });

  const saved = await collection.findOne({ _id: document._id });
  return fromDocument(saved);
};

export const updateCampaignStatus = async (id, status) => {
  const collection = await getCollection();

  await collection.updateOne(
    { _id: String(id) },
    {
      $set: {
        status,
        syncedAt: new Date(),
      },
    },
  );

  const saved = await collection.findOne({ _id: String(id) });
  return saved ? fromDocument(saved) : null;
};
