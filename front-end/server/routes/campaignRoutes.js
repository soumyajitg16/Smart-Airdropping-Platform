import { Router } from 'express';
import {
  listCampaigns,
  replaceCampaigns,
  updateCampaignStatus,
  upsertCampaign,
} from '../repositories/campaignRepository.js';

const router = Router();

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (err) {
    next(err);
  }
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const campaigns = await listCampaigns();
    res.json({ campaigns });
  }),
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body.campaigns)) {
      res.status(400).json({ message: 'campaigns must be an array.' });
      return;
    }

    const campaigns = await replaceCampaigns(req.body.campaigns);
    res.json({ campaigns });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.body.campaign || typeof req.body.campaign !== 'object') {
      res.status(400).json({ message: 'campaign must be an object.' });
      return;
    }

    const campaign = await upsertCampaign(req.body.campaign);
    res.status(201).json({ campaign });
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    if (!req.body.status) {
      res.status(400).json({ message: 'status is required.' });
      return;
    }

    const campaign = await updateCampaignStatus(req.params.id, req.body.status);
    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found.' });
      return;
    }

    res.json({ campaign });
  }),
);

export default router;
