const express = require('express');
const { Pool } = require('pg');
const { S3Client, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8092;

const upload = multer({ storage: multer.memoryStorage() });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres-db:5432/cafe_db',
  connectionTimeoutMillis: 5000, 
  idleTimeoutMillis: 30000
});

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
  },
  forcePathStyle: true, 
});

const BUCKET_NAME = process.env.BUCKET_NAME || 'cafe-data';

app.get('/', async (req, res) => {
  let dbStatus = { success: false, message: 'Connecting...' };
  let storageStatus = { success: false, message: 'Connecting...' };

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW();');
    client.release();
    dbStatus.success = true;
    dbStatus.message = 'Connected Successfully! ✅';
  } catch (error) {
    dbStatus.message = `Failed: ${error.message} ❌`;
  }

  try {
    await s3Client.send(new ListBucketsCommand({}));
    storageStatus.success = true;
    storageStatus.message = 'Connected Successfully! ✅';
  } catch (error) {
    storageStatus.message = `Failed: ${error.message} ❌`;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>System Integration Status</title>
      <style>
        body { font-family: sans-serif; background: #121214; color: #e1e1e6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin:0; padding: 20px; box-sizing: border-box; }
        .card { background: #202024; border-radius: 8px; padding: 32px; width: 450px; border: 1px solid #323238; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        h2 { margin-top: 0; color: #fff; text-align: center; }
        h3 { color: #fff; margin-top: 25px; font-size: 16px; }
        .status-item { padding: 16px; border-radius: 6px; margin: 15px 0; font-weight: bold; }
        .success { background: rgba(4, 211, 97, 0.1); color: #04d361; border: 1px solid #04d361; }
        .error { background: rgba(247, 81, 81, 0.1); color: #f75151; border: 1px solid #f75151; }
        .upload-box { background: #121214; border: 1px dashed #323238; padding: 20px; border-radius: 6px; text-align: center; margin-top: 15px; }
        input[type="file"] { margin-bottom: 15px; display: block; width: 100%; color: #8d8d99; }
        button { background: #04d361; color: #fff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%; font-size: 14px; }
        button:hover { background: #03b252; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Infrastructure Status Dashboard</h2>
        <hr style="border:0; border-top:1px solid #323238; margin-bottom: 20px;">
        
        <div><strong>PostgreSQL Database Connection:</strong></div>
        <div class="status-item ${dbStatus.success ? 'success' : 'error'}">${dbStatus.message}</div>
        
        <div><strong>MinIO S3 Object Storage Connection:</strong></div>
        <div class="status-item ${storageStatus.success ? 'success' : 'error'}">${storageStatus.message}</div>

        <h3>Interactive Storage Test</h3>
        <div class="upload-box">
          <form action="/upload" method="POST" enctype="multipart/form-data">
            <input type="file" name="file" required />
            <button type="submit">Upload File to MinIO</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const fileKey = `${Date.now()}-${req.file.originalname}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(command);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; background: #121214; color: #e1e1e6; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0; }
          .card { background: #202024; border-radius: 8px; padding: 32px; width: 450px; border: 1px solid #323238; text-align: center; }
          .success-text { color: #04d361; font-weight: bold; font-size: 18px; margin-bottom: 15px; }
          a { color: #04d361; text-decoration: none; display: inline-block; margin-top: 15px; font-weight: bold; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="success-text">File Stored Successfully! 🚀</div>
          <p>Your file has been committed down to your <strong>Local PC Hard Drive</strong> via the proxy tunnel.</p>
          <div style="background:#121214; padding:12px; border-radius:4px; word-break:break-all; font-size:13px; border:1px solid #323238;">
            <strong>Saved Object Key:</strong><br>${fileKey}
          </div>
          <a href="/">← Back to Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Failed to store file in MinIO: ${error.message}`);
  }
});

app.listen(PORT, () => console.log(`🚀 App listening on port ${PORT}`));