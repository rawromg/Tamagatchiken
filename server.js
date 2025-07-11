const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const petRoutes = require('./routes/pet');
const Tamagotchi = require('./models/Tamagotchi');

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3001) : (process.env.PORT || 3000);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from public directory
app.use(express.static('public'));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes with error handling
app.use('/auth', (req, res, next) => {
  console.log('Auth route accessed:', req.path);
  next();
}, authRoutes);

app.use('/pet', (req, res, next) => {
  console.log('Pet route accessed:', req.path);
  next();
}, petRoutes);

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.query('SELECT NOW()');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Development mode check endpoint
app.get('/dev-mode', (req, res) => {
  res.json({ 
    isDevMode: process.env.NODE_ENV === 'development' || process.argv.includes('dev'),
    timestamp: new Date().toISOString() 
  });
});

// Debug endpoint for environment variables (development only)
app.get('/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 'not set',
    dbHost: process.env.DB_HOST || 'not set',
    dbPort: process.env.DB_PORT || 'not set',
    dbName: process.env.DB_NAME || 'not set',
    dbUser: process.env.DB_USER ? 'set' : 'not set',
    dbPassword: process.env.DB_PASSWORD ? 'set' : 'not set',
    jwtSecret: process.env.JWT_SECRET ? 'set' : 'not set',
    timestamp: new Date().toISOString()
  });
});

// Background job: Check for inactive pets and force death after 72 hours
cron.schedule('0 */6 * * *', async () => { // Every 6 hours
  try {
    console.log('Running background job: Checking for inactive pets...');
    
    const db = require('./config/database');
    const query = `
      UPDATE tamagotchi 
      SET stage = 'dead', health = 0
      WHERE last_interacted_at < NOW() - INTERVAL '72 hours'
      AND stage != 'dead'
    `;
    
    const result = await db.query(query);
    if (result.rowCount > 0) {
      console.log(`Forced death for ${result.rowCount} inactive pets`);
    }
  } catch (error) {
    console.error('Background job error:', error);
  }
});

// Background job: Daily evolution check
cron.schedule('0 0 * * *', async () => { // Every day at midnight
  try {
    console.log('Running background job: Daily evolution check...');
    
    const db = require('./config/database');
    const query = `
      SELECT * FROM tamagotchi 
      WHERE stage != 'dead' 
      AND stage != 'adult'
    `;
    
    const result = await db.query(query);
    
    for (const pet of result.rows) {
      const updatedPet = await Tamagotchi.calculatePassiveDegradation(pet);
      if (updatedPet.stage !== pet.stage) {
        await Tamagotchi.updateStats(pet.user_id, updatedPet);
        console.log(`Pet ${pet.id} evolved to ${updatedPet.stage}`);
      }
    }
  } catch (error) {
    console.error('Evolution check error:', error);
  }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  console.log('Serving index.html for path:', req.path);
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).json({ 
      error: 'Failed to serve static file',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  console.error('Error stack:', err.stack);
  
  // Don't expose internal errors in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(500).json({ 
    error: errorMessage,
    timestamp: new Date().toISOString()
  });
});

// 404 handler (will not be reached due to SPA fallback)
// app.use((req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    const db = require('./config/database');
    await db.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Tamagotchi server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔒 SSL Mode: ${process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'}`);
      console.log(`🌐 CORS: ${process.env.NODE_ENV === 'production' ? 'disabled' : 'enabled'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app; 