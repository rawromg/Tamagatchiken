#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🗄️ Database Setup Script for Tamagotchi Web App\n');

async function setupDatabase() {
    // Check if we're in a Vercel build environment
    if (process.env.VERCEL) {
        console.log('🏗️ Vercel build environment detected');
        console.log('💡 Database setup will be skipped during build');
        console.log('💡 Database tables must be created manually in production');
        console.log('💡 Run the schema.sql file on your PostgreSQL database');
        return;
    }
    
    console.log('📋 Checking environment variables...');
    
    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing database environment variables:', missing.join(', '));
        console.log('💡 Please ensure all database credentials are set');
        
        // In Vercel build environment, don't fail the build if DB vars are missing
        if (process.env.VERCEL) {
            console.log('🏗️ Vercel build environment detected - database setup will be skipped');
            console.log('💡 Database tables must be created manually in production');
            return;
        }
        
        process.exit(1);
    }
    
    console.log('✅ Database environment variables configured');
    
    // Create database connection pool
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 1, // Use single connection for setup
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });
    
    try {
        console.log('\n🔌 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        
        console.log('\n🗄️ Creating database tables...');
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await pool.query(statement);
                    console.log('✅ Executed:', statement.substring(0, 50) + '...');
                } catch (error) {
                    // Ignore "already exists" errors
                    if (error.message.includes('already exists') || 
                        error.message.includes('duplicate key') ||
                        error.message.includes('already exists')) {
                        console.log('ℹ️ Skipped (already exists):', statement.substring(0, 50) + '...');
                    } else {
                        console.error('❌ Error executing statement:', error.message);
                        throw error;
                    }
                }
            }
        }
        
        console.log('\n✅ Database setup completed successfully!');
        console.log('📊 Tables created/verified:');
        console.log('   - users');
        console.log('   - tamagotchi');
        console.log('   - indexes and triggers');
        
    } catch (error) {
        console.error('\n❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase }; 