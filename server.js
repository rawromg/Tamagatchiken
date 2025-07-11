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

// Load static files at startup for Vercel compatibility
const fs = require('fs');
let indexHtml = null;
let stylesCss = null;
let appJs = null;

try {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const stylesPath = path.join(__dirname, 'public', 'styles.css');
  const appJsPath = path.join(__dirname, 'public', 'app.js');
  
  if (fs.existsSync(indexPath)) {
    indexHtml = fs.readFileSync(indexPath, 'utf8');
    console.log('✅ Loaded index.html from file system');
  }
  if (fs.existsSync(stylesPath)) {
    stylesCss = fs.readFileSync(stylesPath, 'utf8');
    console.log('✅ Loaded styles.css from file system');
  }
  if (fs.existsSync(appJsPath)) {
    appJs = fs.readFileSync(appJsPath, 'utf8');
    console.log('✅ Loaded app.js from file system');
  }
} catch (error) {
  console.warn('⚠️ Could not load static files from file system:', error.message);
}

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3001) : (process.env.PORT || 3000);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Note: Static files are now served directly from memory for better Vercel compatibility

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "https://localhost:3000"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
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
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL
  });
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  try {
    const db = require('./config/database');
    
    // Set a timeout for the database query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });
    
    const dbQuery = db.query('SELECT NOW() as current_time');
    const result = await Promise.race([dbQuery, timeoutPromise]);
    
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      database_time: result.rows[0].current_time,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = require('./config/database');
    
    // Set a timeout for the database query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });
    
    const dbQuery = db.query('SELECT NOW()');
    await Promise.race([dbQuery, timeoutPromise]);
    
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
// Only run in non-serverless environments
if (!process.env.VERCEL) {
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
}

// Background job: Daily evolution check
// Only run in non-serverless environments
if (!process.env.VERCEL) {
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
}



// Serve static files from memory
app.get('/styles.css', (req, res) => {
  if (stylesCss) {
    res.setHeader('Content-Type', 'text/css');
    res.send(stylesCss);
  } else {
    res.status(404).json({ error: 'styles.css not found' });
  }
});

app.get('/icon-fallback.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(`
/* Fallback icons using Unicode symbols */
.fa-utensils::before { content: "🍴"; }
.fa-gamepad::before { content: "🎮"; }
.fa-bath::before { content: "🛁"; }
.fa-heart::before { content: "❤️"; }
.fa-exclamation-triangle::before { content: "⚠️"; }
.fa-bed::before { content: "🛏️"; }
.fa-pencil-alt::before { content: "✏️"; }
.fa-egg::before { content: "🥚"; }
.fa-arrow-right::before { content: "➡️"; }

/* Hide Font Awesome icons if they fail to load */
.fa:not(.fa-utensils):not(.fa-gamepad):not(.fa-bath):not(.fa-heart):not(.fa-exclamation-triangle):not(.fa-bed):not(.fa-pencil-alt):not(.fa-egg):not(.fa-arrow-right) {
    display: none;
}
  `);
});

app.get('/app.js', (req, res) => {
  if (appJs) {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(appJs);
  } else {
    res.status(404).json({ error: 'app.js not found' });
  }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  console.log('Serving index.html for path:', req.path);
  
  if (indexHtml) {
    res.setHeader('Content-Type', 'text/html');
    res.send(indexHtml);
  } else {
    console.error('index.html not available in memory');
    
    // Fallback: try to read from file system
    const fs = require('fs');
    const possiblePaths = [
      path.join(__dirname, 'public', 'index.html'),
      path.join(__dirname, 'index.html'),
      'public/index.html',
      'index.html',
      '/var/task/public/index.html',
      '/tmp/public/index.html'
    ];
    
    let indexPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        indexPath = testPath;
        break;
      }
    }
    
    if (indexPath) {
      try {
        console.log('Found index.html at:', indexPath);
        res.sendFile(indexPath);
      } catch (error) {
        console.error('Error serving index.html:', error);
        res.status(500).json({ 
          error: 'Failed to serve static file',
          path: req.path,
          indexPath: indexPath,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error('index.html not found in any of the expected locations');
      
      // List files in both root and public directories for debugging
      let rootFiles = 'unable to read';
      let publicFiles = 'unable to read';
      
      try {
        rootFiles = fs.readdirSync(__dirname).join(', ');
      } catch (error) {
        rootFiles = `Error reading root: ${error.message}`;
      }
      
      try {
        const publicDir = path.join(__dirname, 'public');
        if (fs.existsSync(publicDir)) {
          publicFiles = fs.readdirSync(publicDir).join(', ');
        } else {
          publicFiles = 'public directory not found';
        }
      } catch (error) {
        publicFiles = `Error reading public: ${error.message}`;
      }
      
      res.status(404).json({ 
        error: 'Static files not found',
        path: req.path,
        timestamp: new Date().toISOString(),
        triedPaths: possiblePaths,
        rootFiles: rootFiles,
        publicFiles: publicFiles,
        vercel: !!process.env.VERCEL,
        cwd: process.cwd(),
        memoryLoaded: {
          indexHtml: !!indexHtml,
          stylesCss: !!stylesCss,
          appJs: !!appJs
        }
      });
    }
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
    console.log('🚀 Starting Tamagotchi server...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Port: ${PORT}`);
    console.log(`🏗️ Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
    
    // For Vercel serverless, skip database test on startup
    if (!process.env.VERCEL) {
      // Test database connection (but don't fail if it doesn't work)
      try {
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
          console.warn('⚠️ Database connection failed, but continuing...');
        }
      } catch (dbError) {
        console.warn('⚠️ Database test failed, but continuing:', dbError.message);
      }
    } else {
      console.log('✅ Skipping database test for serverless environment');
    }
    
    // For Vercel serverless, we don't actually listen on a port
    if (process.env.VERCEL) {
      console.log('✅ Serverless function ready');
      return;
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
    // Don't exit in serverless environment
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

startServer();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in serverless environment
  if (!process.env.VERCEL) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in serverless environment
  if (!process.env.VERCEL) {
    process.exit(1);
  }
});

module.exports = app; 