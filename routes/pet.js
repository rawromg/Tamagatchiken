const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Tamagotchi = require('../models/Tamagotchi');
const { createCanvas, loadImage, registerFont } = require('canvas');
const router = express.Router();

// Generate pet status image (must come before other routes to avoid conflicts)
router.get('/:petId.png', async (req, res) => {
  try {
    const { petId } = req.params;
    
    // Find pet by ID
    const tamagotchi = await Tamagotchi.findById(petId);
    
    if (!tamagotchi) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    
    // Calculate current state with passive degradation
    const currentState = await Tamagotchi.calculatePassiveDegradation(tamagotchi);
    
    // Generate the image
    const imageBuffer = await generatePetImage(currentState);
    
    // Check if it's SVG (fallback) or PNG
    const isSvg = imageBuffer.toString().startsWith('<?xml');
    
    // Set response headers
    if (isSvg) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else {
      res.setHeader('Content-Type', 'image/png');
    }
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('🐾 Generate pet image error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Get current pet state
router.get('/', auth, async (req, res) => {
  try {
    let tamagotchi = await Tamagotchi.findByUserId(req.user.id);
    
    if (!tamagotchi) {
      console.log('🐾 Get pet failed - no pet found:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        ip: req.ip
      }));
      return res.status(404).json({ error: 'No pet found' });
    }
    
    // Calculate current state with passive degradation
    const currentState = await Tamagotchi.calculatePassiveDegradation(tamagotchi);
    
    // Update database with current state
    const updatedPet = await Tamagotchi.updateStats(req.user.id, currentState);
    
    console.log('🐾 Pet state retrieved:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: updatedPet.id,
      petName: updatedPet.name,
      stage: updatedPet.stage,
      stats: {
        hunger: updatedPet.hunger,
        happiness: updatedPet.happiness,
        hygiene: updatedPet.hygiene,
        health: updatedPet.health,
        discipline: updatedPet.discipline,
        energy: updatedPet.energy
      },
      evolutionPoints: updatedPet.evolution_points,
      isSleeping: updatedPet.is_sleeping,
      ip: req.ip
    }));
    
    res.json({
      pet: {
        id: updatedPet.id,
        name: updatedPet.name,
        stage: updatedPet.stage,
        createdAt: updatedPet.created_at,
        lastInteractedAt: updatedPet.last_interacted_at,
        isSleeping: updatedPet.is_sleeping,
        stats: {
          hunger: updatedPet.hunger,
          happiness: updatedPet.happiness,
          hygiene: updatedPet.hygiene,
          health: updatedPet.health,
          discipline: updatedPet.discipline,
          energy: updatedPet.energy
        },
        evolutionPoints: updatedPet.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Get pet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Spawn new pet
router.post('/spawn', [
  auth,
  body('name').isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🐾 Spawn pet failed - validation errors:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        petName: req.body.name,
        errors: errors.array(),
        ip: req.ip
      }));
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user already has a pet
    const existingPet = await Tamagotchi.findByUserId(req.user.id);
    if (existingPet) {
      console.log('🐾 Spawn pet failed - user already has pet:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        existingPetId: existingPet.id,
        existingPetName: existingPet.name,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'User already has a pet' });
    }
    
    const { name } = req.body;
    const tamagotchi = await Tamagotchi.create(req.user.id, name);
    
    console.log('🐾 New pet spawned successfully:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: tamagotchi.id,
      petName: tamagotchi.name,
      stage: tamagotchi.stage,
      stats: {
        hunger: tamagotchi.hunger,
        happiness: tamagotchi.happiness,
        hygiene: tamagotchi.hygiene,
        health: tamagotchi.health,
        discipline: tamagotchi.discipline,
        energy: tamagotchi.energy
      },
      evolutionPoints: tamagotchi.evolution_points,
      ip: req.ip
    }));
    
    res.status(201).json({
      message: 'Pet spawned successfully',
      pet: {
        id: tamagotchi.id,
        name: tamagotchi.name,
        stage: tamagotchi.stage,
        createdAt: tamagotchi.created_at,
        lastInteractedAt: tamagotchi.last_interacted_at,
        isSleeping: tamagotchi.is_sleeping,
        stats: {
          hunger: tamagotchi.hunger,
          happiness: tamagotchi.happiness,
          hygiene: tamagotchi.hygiene,
          health: tamagotchi.health,
          discipline: tamagotchi.discipline,
          energy: tamagotchi.energy
        },
        evolutionPoints: tamagotchi.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Spawn pet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Perform action on pet
router.post('/action/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const validActions = ['feed', 'play', 'clean', 'heal', 'discipline'];
    
    if (!validActions.includes(type)) {
      console.log('🐾 Pet action failed - invalid action type:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        actionType: type,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'Invalid action type' });
    }
    
    const tamagotchi = await Tamagotchi.performAction(req.user.id, type);
    
    console.log('🐾 Pet action performed successfully:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: tamagotchi.id,
      petName: tamagotchi.name,
      actionType: type,
      stage: tamagotchi.stage,
      stats: {
        hunger: tamagotchi.hunger,
        happiness: tamagotchi.happiness,
        hygiene: tamagotchi.hygiene,
        health: tamagotchi.health,
        discipline: tamagotchi.discipline,
        energy: tamagotchi.energy
      },
      evolutionPoints: tamagotchi.evolution_points,
      isSleeping: tamagotchi.is_sleeping,
      ip: req.ip
    }));
    
    res.json({
      message: `Action ${type} performed successfully`,
      pet: {
        id: tamagotchi.id,
        name: tamagotchi.name,
        stage: tamagotchi.stage,
        createdAt: tamagotchi.created_at,
        lastInteractedAt: tamagotchi.last_interacted_at,
        isSleeping: tamagotchi.is_sleeping,
        stats: {
          hunger: tamagotchi.hunger,
          happiness: tamagotchi.happiness,
          hygiene: tamagotchi.hygiene,
          health: tamagotchi.health,
          discipline: tamagotchi.discipline,
          energy: tamagotchi.energy
        },
        evolutionPoints: tamagotchi.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Perform action error:', error);
    if (error.message === 'Pet is dead') {
      console.log('🐾 Pet action failed - pet is dead:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        actionType: req.params.type,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'Pet is dead' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle sleep state
router.post('/sleep', auth, async (req, res) => {
  try {
    const tamagotchi = await Tamagotchi.toggleSleep(req.user.id);
    
    console.log('🐾 Pet sleep state toggled:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: tamagotchi.id,
      petName: tamagotchi.name,
      newSleepState: tamagotchi.is_sleeping,
      stage: tamagotchi.stage,
      stats: {
        hunger: tamagotchi.hunger,
        happiness: tamagotchi.happiness,
        hygiene: tamagotchi.hygiene,
        health: tamagotchi.health,
        discipline: tamagotchi.discipline,
        energy: tamagotchi.energy
      },
      evolutionPoints: tamagotchi.evolution_points,
      ip: req.ip
    }));
    
    res.json({
      message: `Pet is now ${tamagotchi.is_sleeping ? 'sleeping' : 'awake'}`,
      pet: {
        id: tamagotchi.id,
        name: tamagotchi.name,
        stage: tamagotchi.stage,
        createdAt: tamagotchi.created_at,
        lastInteractedAt: tamagotchi.last_interacted_at,
        isSleeping: tamagotchi.is_sleeping,
        stats: {
          hunger: tamagotchi.hunger,
          happiness: tamagotchi.happiness,
          hygiene: tamagotchi.hygiene,
          health: tamagotchi.health,
          discipline: tamagotchi.discipline,
          energy: tamagotchi.energy
        },
        evolutionPoints: tamagotchi.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Toggle sleep error:', error);
    if (error.message === 'Pet is dead') {
      console.log('🐾 Sleep toggle failed - pet is dead:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'Pet is dead' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Revive pet (create new egg)
router.post('/revive', [
  auth,
  body('name').isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🐾 Revive pet failed - validation errors:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        petName: req.body.name,
        errors: errors.array(),
        ip: req.ip
      }));
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const tamagotchi = await Tamagotchi.revive(req.user.id, name);
    
    console.log('🐾 Pet revived successfully:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: tamagotchi.id,
      petName: tamagotchi.name,
      stage: tamagotchi.stage,
      stats: {
        hunger: tamagotchi.hunger,
        happiness: tamagotchi.happiness,
        hygiene: tamagotchi.hygiene,
        health: tamagotchi.health,
        discipline: tamagotchi.discipline,
        energy: tamagotchi.energy
      },
      evolutionPoints: tamagotchi.evolution_points,
      ip: req.ip
    }));
    
    res.json({
      message: 'Pet revived successfully',
      pet: {
        id: tamagotchi.id,
        name: tamagotchi.name,
        stage: tamagotchi.stage,
        createdAt: tamagotchi.created_at,
        lastInteractedAt: tamagotchi.last_interacted_at,
        isSleeping: tamagotchi.is_sleeping,
        stats: {
          hunger: tamagotchi.hunger,
          happiness: tamagotchi.happiness,
          hygiene: tamagotchi.hygiene,
          health: tamagotchi.health,
          discipline: tamagotchi.discipline,
          energy: tamagotchi.energy
        },
        evolutionPoints: tamagotchi.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Revive pet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Developer mode: Reset pet to egg stage
router.post('/dev-reset', auth, async (req, res) => {
  try {
    const tamagotchi = await Tamagotchi.findByUserId(req.user.id);
    if (!tamagotchi) {
      return res.status(404).json({ error: 'No pet found' });
    }
    
    // Reset pet to egg stage with full stats
    const resetUpdates = {
      stage: 'egg',
      hunger: 100,
      happiness: 100,
      hygiene: 100,
      health: 100,
      discipline: 0,
      energy: 100,
      evolutionPoints: 0,
      isSleeping: false
    };
    
    const updatedPet = await Tamagotchi.updateStats(req.user.id, resetUpdates);
    
    console.log('🐾 Pet reset to egg (dev mode):', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: updatedPet.id,
      petName: updatedPet.name,
      stage: updatedPet.stage,
      stats: {
        hunger: updatedPet.hunger,
        happiness: updatedPet.happiness,
        hygiene: updatedPet.hygiene,
        health: updatedPet.health,
        discipline: updatedPet.discipline,
        energy: updatedPet.energy
      },
      evolutionPoints: updatedPet.evolution_points,
      ip: req.ip
    }));
    
    res.json({
      message: 'Pet reset to egg stage',
      pet: {
        id: updatedPet.id,
        name: updatedPet.name,
        stage: updatedPet.stage,
        createdAt: updatedPet.created_at,
        lastInteractedAt: updatedPet.last_interacted_at,
        isSleeping: updatedPet.is_sleeping,
        stats: {
          hunger: updatedPet.hunger,
          happiness: updatedPet.happiness,
          hygiene: updatedPet.hygiene,
          health: updatedPet.health,
          discipline: updatedPet.discipline,
          energy: updatedPet.energy
        },
        evolutionPoints: updatedPet.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Dev reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Developer mode: Update pet stats
router.post('/dev-stats', [
  auth,
  body('stat').isIn(['hunger', 'happiness', 'hygiene', 'health', 'discipline', 'energy']),
  body('value').isInt({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🐾 Dev stats update failed - validation errors:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        stat: req.body.stat,
        value: req.body.value,
        errors: errors.array(),
        ip: req.ip
      }));
      return res.status(400).json({ errors: errors.array() });
    }

    const tamagotchi = await Tamagotchi.findByUserId(req.user.id);
    if (!tamagotchi) {
      return res.status(404).json({ error: 'No pet found' });
    }
    
    const { stat, value } = req.body;
    const statUpdates = { [stat]: value };
    
    const updatedPet = await Tamagotchi.updateStats(req.user.id, statUpdates);
    
    console.log('🐾 Pet stats updated (dev mode):', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: updatedPet.id,
      petName: updatedPet.name,
      statUpdated: stat,
      newValue: value,
      stats: {
        hunger: updatedPet.hunger,
        happiness: updatedPet.happiness,
        hygiene: updatedPet.hygiene,
        health: updatedPet.health,
        discipline: updatedPet.discipline,
        energy: updatedPet.energy
      },
      evolutionPoints: updatedPet.evolution_points,
      ip: req.ip
    }));
    
    res.json({
      message: `${stat} updated to ${value}`,
      pet: {
        id: updatedPet.id,
        name: updatedPet.name,
        stage: updatedPet.stage,
        createdAt: updatedPet.created_at,
        lastInteractedAt: updatedPet.last_interacted_at,
        isSleeping: updatedPet.is_sleeping,
        stats: {
          hunger: updatedPet.hunger,
          happiness: updatedPet.happiness,
          hygiene: updatedPet.hygiene,
          health: updatedPet.health,
          discipline: updatedPet.discipline,
          energy: updatedPet.energy
        },
        evolutionPoints: updatedPet.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Dev stats update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Developer mode: Change pet stage
router.post('/dev-stage', [
  auth,
  body('stage').isIn(['egg', 'baby', 'child', 'teen', 'adult', 'dead'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🐾 Dev stage change failed - validation errors:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        stage: req.body.stage,
        errors: errors.array(),
        ip: req.ip
      }));
      return res.status(400).json({ errors: errors.array() });
    }

    const tamagotchi = await Tamagotchi.findByUserId(req.user.id);
    if (!tamagotchi) {
      return res.status(404).json({ error: 'No pet found' });
    }
    
    const { stage } = req.body;
    const stageUpdates = { stage };
    
    const updatedPet = await Tamagotchi.updateStats(req.user.id, stageUpdates);
    
    console.log('🐾 Pet stage changed (dev mode):', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      petId: updatedPet.id,
      petName: updatedPet.name,
      oldStage: tamagotchi.stage,
      newStage: stage,
      stats: {
        hunger: updatedPet.hunger,
        happiness: updatedPet.happiness,
        hygiene: updatedPet.hygiene,
        health: updatedPet.health,
        discipline: updatedPet.discipline,
        energy: updatedPet.energy
      },
      evolutionPoints: updatedPet.evolution_points,
      ip: req.ip
    }));
    
    res.json({
      message: `Pet stage changed to ${stage}`,
      pet: {
        id: updatedPet.id,
        name: updatedPet.name,
        stage: updatedPet.stage,
        createdAt: updatedPet.created_at,
        lastInteractedAt: updatedPet.last_interacted_at,
        isSleeping: updatedPet.is_sleeping,
        stats: {
          hunger: updatedPet.hunger,
          happiness: updatedPet.happiness,
          hygiene: updatedPet.hygiene,
          health: updatedPet.health,
          discipline: updatedPet.discipline,
          energy: updatedPet.energy
        },
        evolutionPoints: updatedPet.evolution_points
      }
    });
  } catch (error) {
    console.error('🐾 Dev stage change error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to generate pet status image
async function generatePetImage(pet) {
  try {
    // Try to use canvas if available
    const width = 400;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Pet name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(pet.name, width / 2, 40);
    
    // Pet stage emoji
    const stageEmojis = {
      'egg': '🥚',
      'baby': '🐣',
      'child': '🐤',
      'teen': '🐥',
      'adult': '🐔',
      'dead': '💀'
    };
    
    const emoji = stageEmojis[pet.stage] || '🥚';
    ctx.font = '48px Arial';
    ctx.fillText(emoji, width / 2, 100);
    
    // Stage text
    ctx.font = '16px Arial';
    ctx.fillText(`Stage: ${pet.stage}`, width / 2, 130);
    
    // Stats section
    const stats = [
      { name: 'Hunger', value: pet.hunger, color: '#ff6b6b' },
      { name: 'Happiness', value: pet.happiness, color: '#4ecdc4' },
      { name: 'Hygiene', value: pet.hygiene, color: '#45b7d1' },
      { name: 'Health', value: pet.health, color: '#96ceb4' },
      { name: 'Discipline', value: pet.discipline, color: '#feca57' },
      { name: 'Energy', value: pet.energy, color: '#ff9ff3' }
    ];
    
    const startY = 160;
    const statHeight = 20;
    const barWidth = 200;
    
    stats.forEach((stat, index) => {
      const y = startY + (index * statHeight);
      
      // Stat name
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(stat.name, 50, y + 15);
      
      // Stat value
      ctx.textAlign = 'right';
      ctx.fillText(`${stat.value}%`, 350, y + 15);
      
      // Progress bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(150, y, barWidth, 12);
      
      // Progress bar fill
      ctx.fillStyle = stat.color;
      ctx.fillRect(150, y, (barWidth * stat.value) / 100, 12);
      
      // Progress bar border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeRect(150, y, barWidth, 12);
    });
    
    // Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tamagotchi Web App', width / 2, height - 10);
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Canvas generation failed, using SVG fallback:', error.message);
    
    // Fallback: Generate SVG instead
    const stageEmojis = {
      'egg': '🥚',
      'baby': '🐣',
      'child': '🐤',
      'teen': '🐥',
      'adult': '🐔',
      'dead': '💀'
    };
    
    const emoji = stageEmojis[pet.stage] || '🥚';
    const stats = [
      { name: 'Hunger', value: pet.hunger, color: '#ff6b6b' },
      { name: 'Happiness', value: pet.happiness, color: '#4ecdc4' },
      { name: 'Hygiene', value: pet.hygiene, color: '#45b7d1' },
      { name: 'Health', value: pet.health, color: '#96ceb4' },
      { name: 'Discipline', value: pet.discipline, color: '#feca57' },
      { name: 'Energy', value: pet.energy, color: '#ff9ff3' }
    ];
    
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bg)"/>
  <text x="200" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${pet.name}</text>
  <text x="200" y="100" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" fill="white">${emoji}</text>
  <text x="200" y="130" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">Stage: ${pet.stage}</text>
  ${stats.map((stat, index) => {
    const y = 160 + (index * 20);
    const barWidth = 200;
    const fillWidth = (barWidth * stat.value) / 100;
    return `
  <text x="50" y="${y + 15}" font-family="Arial, sans-serif" font-size="12" fill="white">${stat.name}</text>
  <text x="350" y="${y + 15}" font-family="Arial, sans-serif" font-size="12" text-anchor="end" fill="white">${stat.value}%</text>
  <rect x="150" y="${y}" width="${barWidth}" height="12" fill="rgba(255,255,255,0.3)"/>
  <rect x="150" y="${y}" width="${fillWidth}" height="12" fill="${stat.color}"/>
  <rect x="150" y="${y}" width="${barWidth}" height="12" fill="none" stroke="white" stroke-width="1"/>`;
  }).join('')}
  <text x="200" y="290" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="rgba(255,255,255,0.7)">Tamagotchi Web App</text>
</svg>`;
    
    return Buffer.from(svg, 'utf8');
  }
}

module.exports = router; 