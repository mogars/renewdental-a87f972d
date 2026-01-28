import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import patientsRouter from './routes/patients';
import appointmentsRouter from './routes/appointments';
import doctorsRouter from './routes/doctors';
import chartRecordsRouter from './routes/chart-records';
import treatmentTypesRouter from './routes/treatment-types';
import appSettingsRouter from './routes/app-settings';
import usersRouter from './routes/users';
import smsRouter from './routes/sms';
import { initReminderService } from './services/reminder-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// CORS configuration - allow all origins in development
app.use(cors({
  origin: true,
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes (no /api prefix to match frontend expectations)
app.use('/patients', patientsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/doctors', doctorsRouter);
app.use('/chart-records', chartRecordsRouter);
app.use('/treatment-types', treatmentTypesRouter);
app.use('/app-settings', appSettingsRouter);
app.use('/users', usersRouter);
app.use('/send-sms', smsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
