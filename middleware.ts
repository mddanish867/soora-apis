// // // lib/cors.ts
// // import { NextApiRequest, NextApiResponse } from 'next';
// // import Cors from 'cors';
// // import type { CorsOptions } from 'cors';

// // // Define allowed origins at the top of the file
// // const allowedOrigins = [
// //   'https://taskflow-three-mu.vercel.app',
// //   'http://localhost:5173',
// //   'http://localhost:3000',
// //   'https://soora-sigma.vercel.app'
// // ].filter(Boolean);

// // // Initialize the cors middleware with dynamic origin checking
// // const corsOptions: CorsOptions = {
// //   credentials: true,
// //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
// //   allowedHeaders: [
// //     'X-CSRF-Token',
// //     'X-Requested-With',
// //     'Accept',
// //     'Accept-Version',
// //     'Content-Length',
// //     'Content-MD5',
// //     'Content-Type',
// //     'Date',
// //     'X-Api-Version',
// //     'Authorization',
// //   ],
// //   origin: (origin, callback) => {
// //     if (!origin || allowedOrigins.includes(origin)) {
// //       callback(null, true);
// //     } else {
// //       console.log('Blocked by CORS:', origin); // Helpful for debugging
// //       callback(new Error('Not allowed by CORS'));
// //     }
// //   }
// // };

// // const cors = Cors(corsOptions);

// // function runMiddleware(
// //   req: NextApiRequest,
// //   res: NextApiResponse,
// //   fn: Function
// // ): Promise<any> {
// //   return new Promise((resolve, reject) => {
// //     fn(req, res, (result: any) => {
// //       if (result instanceof Error) {
// //         return reject(result);
// //       }
// //       return resolve(result);
// //     });
// //   });
// // }

// // export function corsMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>) {
// //   return async (req: NextApiRequest, res: NextApiResponse) => {
// //     try {
// //       await runMiddleware(req, res, cors);

// //       if (req.method === 'OPTIONS') {
// //         return res.status(200).end();
// //       }

// //       return handler(req, res);
// //     } catch (error) {
// //       console.error('CORS Error:', error);
// //       return res.status(403).json({
// //         success: false,
// //         message: 'Not allowed by CORS'
// //       });
// //     }
// //   };
// // }
// // lib/cors.ts
// import { NextApiRequest, NextApiResponse } from "next";
// import Cors from "cors";

// const cors = Cors({
//   origin: "https://taskflow-three-mu.vercel.app",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
// });

// function runMiddleware(
//   req: NextApiRequest,
//   res: NextApiResponse,
//   fn: Function
// ) {
//   return new Promise((resolve, reject) => {
//     fn(req, res, (result: any) => {
//       if (result instanceof Error) return reject(result);
//       return resolve(result);
//     });
//   });
// }

// export function corsMiddleware(handler: Function) {
//   return async (req: NextApiRequest, res: NextApiResponse) => {
//     await runMiddleware(req, res, cors);
//     if (req.method === "OPTIONS") return res.status(200).end();
//     return handler(req, res);
//   };
// }
