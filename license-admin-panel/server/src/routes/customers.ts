import { Router } from 'express';
import { getLicenseRepository } from '../repositoryFactory';
import { groupByCustomer } from './licenses';

const repo = getLicenseRepository();

export const customersRouter = Router();

customersRouter.get('/', async (_req, res) => {
  const records = await repo.list();
  res.json(groupByCustomer(records));
});
