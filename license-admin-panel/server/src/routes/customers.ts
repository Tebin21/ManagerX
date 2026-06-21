import { Router } from 'express';
import { JsonLicenseRepository } from '../jsonLicenseRepository';
import { groupByCustomer } from './licenses';

const repo = new JsonLicenseRepository();

export const customersRouter = Router();

customersRouter.get('/', async (_req, res) => {
  const records = await repo.list();
  res.json(groupByCustomer(records));
});
