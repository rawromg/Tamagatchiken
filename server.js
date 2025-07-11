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

// Routes
app.use('/auth', authRoutes);
app.use('/pet', petRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Development mode check endpoint
app.get('/dev-mode', (req, res) => {
  res.json({ 
    isDevMode: process.env.NODE_ENV === 'development' || process.argv.includes('dev'),
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler (will not be reached due to SPA fallback)
// app.use((req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tamagotchi server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app; 