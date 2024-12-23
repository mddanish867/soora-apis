import nextConnect from 'next-connect';
import logger from './logger';

const middleware = nextConnect();

middleware.use((err, res, ) => {
  logger.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default middleware;
