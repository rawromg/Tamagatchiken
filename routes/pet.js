const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Tamagotchi = require('../models/Tamagotchi');
const router = express.Router();

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

module.exports = router; 