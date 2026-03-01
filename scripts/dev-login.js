import pg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query('SELECT id, github_username, display_name, tier, role FROM yy_users LIMIT 5');
    console.log('Users in DB:', JSON.stringify(res.rows, null, 2));

    if (res.rows.length > 0) {
      const user = res.rows[0];
      const token = jwt.sign({
        userId: user.id,
        userName: user.display_name || user.github_username,
        githubUsername: user.github_username,
        tier: user.tier || 'free',
        role: user.role || 'user',
      }, process.env.JWT_SECRET, {
        expiresIn: '7d',
        issuer: 'yigyaps-api',
        audience: 'yigyaps-clients',
      });
      console.log('\n--- DEV JWT TOKEN ---');
      console.log(token);
      console.log('--- END TOKEN ---');
    }

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
run();
