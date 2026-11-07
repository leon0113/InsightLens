import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import httpStatus from 'http-status';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import config from './config';
import routes from './routes';

const app: Application = express();

app.use(cors({ origin: config.cors_origins, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('Server is running');
});

// Not-found handler. Must come after all routes.
app.use((req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Route not found',
    errorMessages: [{ path: req.originalUrl, message: 'API not found' }],
  });
});

// Error handler. Must be the last middleware.
app.use(globalErrorHandler);

export default app;
