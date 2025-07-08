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
      return res.status(404).json({ error: 'No pet found' });
    }
    
    // Calculate current state with passive degradation
    const currentState = await Tamagotchi.calculatePassiveDegradation(tamagotchi);
    
    // Update database with current state
    const updatedPet = await Tamagotchi.updateStats(req.user.id, currentState);
    
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
    console.error('Get pet error:', error);
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
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user already has a pet
    const existingPet = await Tamagotchi.findByUserId(req.user.id);
    if (existingPet) {
      return res.status(400).json({ error: 'User already has a pet' });
    }
    
    const { name } = req.body;
    const tamagotchi = await Tamagotchi.create(req.user.id, name);
    
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
    console.error('Spawn pet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Perform action on pet
router.post('/action/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const validActions = ['feed', 'play', 'clean', 'heal', 'discipline'];
    
    if (!validActions.includes(type)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }
    
    const tamagotchi = await Tamagotchi.performAction(req.user.id, type);
    
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
    console.error('Perform action error:', error);
    if (error.message === 'Pet is dead') {
      return res.status(400).json({ error: 'Pet is dead' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle sleep state
router.post('/sleep', auth, async (req, res) => {
  try {
    const tamagotchi = await Tamagotchi.toggleSleep(req.user.id);
    
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
    console.error('Toggle sleep error:', error);
    if (error.message === 'Pet is dead') {
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
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const tamagotchi = await Tamagotchi.revive(req.user.id, name);
    
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
    console.error('Revive pet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 