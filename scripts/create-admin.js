/**
 * NIMO-CRM: Instant Admin Creator Script
 * 
 * Usage:
 *   node scripts/create-admin.js <email> <password> [name] [companyName]
 * 
 * Example:
 *   node scripts/create-admin.js admin@nimo-crm.com Admin@123 "System Admin" "NIMO Workspace"
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split(/\r?\n/).forEach(line => {
    const idx = line.indexOf('=');
    if (idx > -1) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (k && !k.startsWith('#') && !process.env[k]) {
        process.env[k] = v;
      }
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not set in .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = (args[0] || 'admin@nimo-crm.com').toLowerCase().trim();
const password = args[1] || 'Admin@12345';
const name = args[2] || 'Workspace Admin';
const companyName = args[3] || 'NIMO CRM';

async function main() {
  console.log(`Connecting to MongoDB at: ${MONGODB_URI.split('@')[1] || 'cluster'}...`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  // 1. Find or create Tenant
  let tenant = await db.collection('tenants').findOne({});
  if (!tenant) {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
    const newTenant = {
      name: companyName,
      slug: slug,
      email: email,
      legalName: companyName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tRes = await db.collection('tenants').insertOne(newTenant);
    tenant = { ...newTenant, _id: tRes.insertedId };
    console.log(`Created new Tenant: "${companyName}" (ID: ${tenant._id})`);
  } else {
    console.log(`Found existing Tenant: "${tenant.name}" (ID: ${tenant._id})`);
  }

  // 2. Check if user already exists
  const existingUser = await db.collection('users').findOne({ email: email });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUser) {
    await db.collection('users').updateOne(
      { _id: existingUser._id },
      {
        $set: {
          passwordHash: hashedPassword,
          role: 'Admin',
          status: 'Active',
          updatedAt: new Date(),
        }
      }
    );
    console.log(`Updated existing user "${email}" to Admin role with new password!`);
  } else {
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'admin';
    const newUser = {
      name: name,
      username: username,
      email: email,
      passwordHash: hashedPassword,
      role: 'Admin',
      status: 'Active',
      tenantId: tenant._id,
      department: 'Management',
      authProvider: 'credentials',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const uRes = await db.collection('users').insertOne(newUser);
    console.log(`Created new Admin User:`);
    console.log(`  - Name:     ${name}`);
    console.log(`  - Email:    ${email}`);
    console.log(`  - Password: ${password}`);
    console.log(`  - Role:     Admin`);
    console.log(`  - Status:   Active`);
    console.log(`  - ID:       ${uRes.insertedId}`);
  }

  console.log('\nYou can now log in at http://localhost:3000/login with these credentials!');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to create Admin:', err);
  process.exit(1);
});

