/**
 * Initial Seed Migration to Supabase
 * 
 * This script pushes a set of initial patient and doctor records directly 
 * to your Supabase cloud database.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sakzbxvbqjsbrwtbedde.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxJxTby9UXtwGPbvY7pbWA_F8WXtoxk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const seedPatients = [
  {
    name: 'John Doe',
    username: 'patient',
    email: 'patient@example.com',
    dob: '01/01/1990',
    password: 'v2_756678787c7a77a777696778', // encrypted 'password123'
    nextappointment: 'Oct 15, 10:00 AM',
    age: 34,
    condition: 'General Checkup',
    status: 'Stable',
    timestamp: Date.now(),
    notes: 'Standard checkup patient.'
  },
  {
    name: 'Jane Smith',
    username: 'jsmith',
    email: 'jane@example.com',
    dob: '05/12/1985',
    password: 'v2_756678787c7a77a777696778',
    nextappointment: 'Oct 16, 02:30 PM',
    age: 39,
    condition: 'Post-surgery recovery',
    status: 'Review',
    timestamp: Date.now(),
    notes: 'Recovering well from minor surgery.'
  }
];

async function migrate() {
  console.log('🚀 Starting Seed Migration to Supabase...');
  
  const { data, error } = await supabase
    .from('patients')
    .upsert(seedPatients, { onConflict: 'username' });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nWait! Have you run the SQL schema in the Supabase Dashboard yet?');
    console.log('The "patients" table must exist before this script can run.');
  } else {
    console.log('✅ Migration Successful! Initial patients are now in the cloud.');
  }
}

migrate();
