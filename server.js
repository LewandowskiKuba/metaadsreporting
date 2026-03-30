// server.js — Express proxy for Meta Graph API
// Token lives in .env — the browser never sees it.

import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = 3001;
const META_BASE = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_ACCESS_TOKEN;

if (!TOKEN || TOKEN === 'wklej_token_tutaj') {
  console.error('⚠️  Brak META_ACCESS_TOKEN w pliku .env — uzupełnij go przed uruchomieniem.');
  process.exit(1);
}

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.all('/api/meta/*', async (req, res) => {
  const metaPath = req.path.replace('/api/meta', '');
  const url = `${META_BASE}${metaPath}`;

  try {
    const response = await axios({
      method: req.method,
      url,
      params: { ...req.query, access_token: TOKEN },
      timeout: 30000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: { message: err.message } });
  }
});

app.listen(PORT, () => {
  console.log(`Meta API proxy → http://localhost:${PORT}`);
  console.log('React dev server should run on http://localhost:5173');
});
