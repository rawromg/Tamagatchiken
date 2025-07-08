#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🐣 Tamagotchi Web App Setup\n');

async function checkEnvironment() {
    console.log('📋 Checking environment variables...');
    
    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing environment variables:', missing.join(', '));
        console.log('💡 Please copy env.example to .env and fill in the required values');
        process.exit(1);
    }
    
    console.log('✅ Environment variables configured');
}

async function testDatabaseConnection() {
    console.log('\n🔌 Testing database connection...');
    
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Please ensure PostgreSQL is running and credentials are correct');
        process.exit(1);
    }
}

async function createTables(pool) {
    console.log('\n🗄️ Creating database tables...');
    
    try {
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await pool.query(schema);
        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Failed to create tables:', error.message);
        process.exit(1);
    }
}

async function checkDependencies() {
    console.log('\n📦 Checking dependencies...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = Object.keys(packageJson.dependencies || {});
        
        if (dependencies.length === 0) {
            console.log('⚠️ No dependencies found. Run "npm install" first');
            return false;
        }
        
        console.log('✅ Dependencies found');
        return true;
    } catch (error) {
        console.error('❌ Error reading package.json:', error.message);
        return false;
    }
}

async function main() {
    try {
        await checkEnvironment();
        await checkDependencies();
        
        const pool = await testDatabaseConnection();
        await createTables(pool);
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\n🚀 To start the application:');
        console.log('   npm run dev');
        console.log('\n🌐 Then open http://localhost:3000 in your browser');
        
        await pool.end();
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkEnvironment, testDatabaseConnection, createTables }; 