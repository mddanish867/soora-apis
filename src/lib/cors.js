// lib/cors.js
import Cors from 'cors';

// Initialize the cors middleware
export const cors = Cors({
  methods: ['POST', 'GET', 'HEAD'],
  origin: 'http://localhost:5173', // Adjust to match your frontend URL
});

// Helper to run middleware
export function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}
