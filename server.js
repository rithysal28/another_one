const express = require('express');
const { Pool } = require('pg');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 8092;

// 1. Postgres Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, 
  idleTimeoutMillis: 30000
});

// 2. MinIO S3 Setup
const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://minio-storage:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'rithysal_access_key',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'rithysal_secret_secure_key',
  },
  forcePathStyle: true, // Required for local self-hosted S3/MinIO setups
});

app.get('/', async (req, res) => {
  let dbStatus = { success: false, message: 'Connecting...' };
  let storageStatus = { success: false, message: 'Connecting...' };

  // Run Postgres Test
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW();');
    client.release();
    dbStatus.success = true;
    dbStatus.message = 'Connected Successfully! ✅';
  } catch (error) {
    dbStatus.message = `Failed: ${error.message} ❌`;
  }

  // Run MinIO Test (Try to list your buckets)
  try {
    await s3Client.send(new ListBucketsCommand({}));
    storageStatus.success = true;
    storageStatus.message = 'Connected Successfully! ✅';
  } catch (error) {
    storageStatus.message = `Failed: ${error.message} ❌`;
  }

  // Generate the clean UI
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>System Integration Status</title>
      <style>
        body { font-family: sans-serif; background: #121214; color: #e1e1e6; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0; }
        .card { background: #202024; border-radius: 8px; padding: 32px; width: 450px; border: 1px solid #323238; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        h2 { margin-top: 0; color: #fff; text-align: center; }
        .status-item { padding: 16px; border-radius: 6px; margin: 15px 0; font-weight: bold; }
        .success { background: rgba(4, 211, 97, 0.1); color: #04d361; border: 1px solid #04d361; }
        .error { background: rgba(247, 81, 81, 0.1); color: #f75151; border: 1px solid #f75151; }
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
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

app.listen(PORT, () => console.log(`🚀 App listening on port ${PORT}`));