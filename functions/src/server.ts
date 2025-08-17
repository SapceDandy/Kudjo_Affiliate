import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { authGuard } from './web/auth';
import { errorHandler } from './web/errors';
import { router as apiRouter } from './web/router';

export const app = express();
app.use(cors({ origin: true }));
app.use(json());

app.use(authGuard);
app.use('/api', apiRouter);

app.use(errorHandler); 