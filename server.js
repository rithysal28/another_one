const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8092;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000, 
  idleTimeoutMillis: 30000
});

app.get('/', async (req, res) => {
  let dbStatus = {
    success: false,
    message: 'Connecting to database...',
    time: null,
    version: null
  };

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version();');
    client.release();

    dbStatus.success = true;
    dbStatus.message = 'Connected Successfully!';
    dbStatus.time = result.rows[0].current_time;
    dbStatus.version = result.rows[0].version;
  } catch (error) {
    dbStatus.success = false;
    dbStatus.message = `Connection Failed: ${error.message}`;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Database Integration Test</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #121214;
          color: #e1e1e6;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background-color: #202024;
          border-radius: 8px;
          padding: 32px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          width: 450px;
          border: 1px solid #323238;
        }
        h2 { margin-top: 0; color: #ffffff; font-size: 24px; }
        .status-box {
          padding: 16px;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
          font-size: 16px;
          text-align: center;
        }
        .success { background-color: rgba(4, 211, 97, 0.1); color: #04d361; border: 1px solid #04d361; }
        .error { background-color: rgba(247, 81, 81, 0.1); color: #f75151; border: 1px solid #f75151; }
        .details { font-size: 13px; color: #a8a8b3; line-height: 1.6; }
        .details strong { color: #ffffff; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Database Integration Test</h2>
        <hr style="border: 0; border-top: 1px solid #323238;">
        
        <div class="status-box ${dbStatus.success ? 'success' : 'error'}">
          Connection Result: ${dbStatus.success ? '✅ ' + dbStatus.message : '❌ ' + dbStatus.message}
        </div>

        <div class="details">
          <p><strong>App Port:</strong> ${PORT}</p>
          <p><strong>Target Engine:</strong> PostgreSQL</p>
          ${dbStatus.success ? `
            <p><strong>Database Time:</strong> ${dbStatus.time}</p>
            <p><strong>Engine Version:</strong> ${dbStatus.version.split(',')[0]}</p>
          ` : '<p style="color: #f75151;">Verify your Environment Variables row inside Coolify.</p>'}
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 Verification test server streaming live on port ${PORT}`);
});