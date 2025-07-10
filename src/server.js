import express from 'express';
import cors from 'cors';
import contactsRouter from './routes/contactsRoutes.js';

export const setupServer = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  app.use('/contacts', contactsRouter);

  app.use((req, res) => {
    console.error(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json({ message: 'Route not found' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
