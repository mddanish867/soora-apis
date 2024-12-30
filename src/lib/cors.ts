import { NextApiRequest, NextApiResponse } from "next";

export const allowCors = (fn: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => 
  async (req: NextApiRequest, res: NextApiResponse) => {
    // Allow requests from localhost during development
    res.setHeader('Access-Control-Allow-Credentials', "true")
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    try {
      return await fn(req, res)
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' })
    }
}