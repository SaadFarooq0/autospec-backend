import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import pkg from 'pg';

const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(fileUpload());
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/autospec'
});

app.get('/cars', async (req, res) => {
  const result = await pool.query('SELECT * FROM cars ORDER BY id DESC');
  res.json(result.rows);
});

app.post('/cars', async (req, res) => {
  const { model, specs } = req.body;
  await pool.query('INSERT INTO cars (model, specs) VALUES ($1, $2)', [model, specs]);
  res.sendStatus(201);
});

app.put('/cars/:id', async (req, res) => {
  const { id } = req.params;
  const { model, specs } = req.body;
  await pool.query('UPDATE cars SET model=$1, specs=$2 WHERE id=$3', [model, specs, id]);
  res.sendStatus(200);
});

app.delete('/cars/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM cars WHERE id=$1', [id]);
  res.sendStatus(200);
});

app.post('/extract-pdf-specs', async (req, res) => {
  const pdfParse = (await import('pdf-parse')).default;
  if (!req.files || !req.files.file) return res.status(400).send('No file uploaded');

  const pdfBuffer = req.files.file.data;
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const specs = extractSpecs(text);
  res.json(specs);
});

function extractSpecs(text) {
  const specs = {};
  const lines = text.split('\n');
  for (let line of lines) {
    const match = line.match(/(.+?):\s*(.+)/);
    if (match) {
      specs[match[1].trim()] = match[2].trim();
    }
  }
  return specs;
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});