import express from 'express';
import cors from 'cors';
import contactsRouter from './routes/contactsRoutes.js';
import pino from 'pino'; // Додано логгер (якщо використовується)

export const setupServer = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/contacts', contactsRouter);

  // Обробник 404 має бути перед обробником помилок
  app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  // Глобальний обробник помилок - останній у ланцюжку
  app.use((err, req, res, next) => {
    const logger = pino(); // Ініціалізація логгера
    logger.error(err.message); // Логування помилки
    res.status(500).json({ message: 'Internal server error' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};