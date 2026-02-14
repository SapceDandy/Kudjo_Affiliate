import express from 'express';
import cors from 'cors';
import { json } from 'express';
import { authGuard } from './web/auth';
import { errorHandler } from './web/errors';
import { router as apiRouter } from './web/router';
import { handleRedirectResolve } from './apis/redirect.resolve';
import { handleRootRedirect } from './apis/root.redirect';
import { handleAdminRedirect } from './apis/admin.redirect';

export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(json());

app.use(authGuard);

app.get('/', handleRootRedirect);
app.get('/app', handleRootRedirect);
app.get('/admin', handleAdminRedirect);
app.get('/admin/*', handleAdminRedirect);

app.get('/r/:token', handleRedirectResolve);
app.get('/a/:token', (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', '2026-04-01');
  res.set('Link', `</r/${encodeURIComponent(req.params.token)}>; rel="successor-version"`);
  return handleRedirectResolve(req, res).catch(next);
});
app.use('/api', apiRouter);

app.use(errorHandler); 