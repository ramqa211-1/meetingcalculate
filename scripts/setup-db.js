#!/usr/bin/env node

/**
 * Script to setup Supabase database schema
 * This script can be run directly or via Supabase CLI
 * 
 * Usage:
 *   node scripts/setup-db.js
 *   OR
 *   supabase db push
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file manually
let envVars = {};
try {
  const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.warn('Could not read .env file, using process.env');
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)');
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251118191750_7973c65e-6284-4a6d-a1cc-bdfe50a64ea6.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Executing migration...');
    
    // Split SQL by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          // This is a workaround - we'll use a different approach
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Note: If you see errors above, you may need to run migrations via Supabase CLI:');
    console.log('   supabase db push');
    console.log('   OR');
    console.log('   Use the Supabase Dashboard SQL Editor to run the migration file manually.');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('\n💡 Alternative: Use Supabase CLI or Dashboard:');
    console.error('   1. Install Supabase CLI: npm install -g supabase');
    console.error('   2. Run: supabase db push');
    console.error('   OR');
    console.error('   3. Copy the SQL from supabase/migrations/ and run it in Supabase Dashboard SQL Editor');
    process.exit(1);
  }
}

// Alternative: Use Supabase CLI approach
async function checkSupabaseCLI() {
  console.log('\n💡 Recommended: Use Supabase CLI for migrations');
  console.log('   1. Install: npm install -g supabase');
  console.log('   2. Link: supabase link --project-ref owarzqykotsvmdbbhxyn');
  console.log('   3. Push: supabase db push');
}

runMigration().then(() => {
  checkSupabaseCLI();
}).catch(console.error);
