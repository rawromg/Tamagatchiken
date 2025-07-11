const db = require('../config/database');

class Tamagotchi {
  static async create(userId, name) {
    const query = `
      INSERT INTO tamagotchi (user_id, name)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await db.query(query, [userId, name]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM tamagotchi WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  static async findById(petId) {
    const query = 'SELECT * FROM tamagotchi WHERE id = $1';
    const result = await db.query(query, [petId]);
    return result.rows[0];
  }

  static async updateStats(userId, updates) {
    const query = `
      UPDATE tamagotchi 
      SET 
        hunger = COALESCE($2, hunger),
        happiness = COALESCE($3, happiness),
        hygiene = COALESCE($4, hygiene),
        health = COALESCE($5, health),
        discipline = COALESCE($6, discipline),
        energy = COALESCE($7, energy),
        evolution_points = COALESCE($8, evolution_points),
        stage = COALESCE($9, stage),
        is_sleeping = COALESCE($10, is_sleeping),
        last_interacted_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [
      userId,
      updates.hunger,
      updates.happiness,
      updates.hygiene,
      updates.health,
      updates.discipline,
      updates.energy,
      updates.evolutionPoints,
      updates.stage,
      updates.isSleeping
    ]);
    
    return result.rows[0];
  }

  static async calculatePassiveDegradation(tamagotchi) {
    const now = new Date();
    const lastInteracted = new Date(tamagotchi.last_interacted_at);
    const hoursDiff = (now - lastInteracted) / (1000 * 60 * 60);
    
    if (hoursDiff < 0.1) return tamagotchi; // Less than 6 minutes, no degradation
    
    let updates = { ...tamagotchi };
    
    // Passive degradation rates
    const hungerDrop = Math.floor(hoursDiff * 10); // 10 pts per hour
    const happinessDrop = Math.floor(hoursDiff * 5); // 5 pts per hour
    const hygieneDrop = Math.floor(hoursDiff * 7 * 2/3); // 7 pts every 90 minutes
    
    // Energy logic: increases when sleeping, decreases when awake
    const energyChange = tamagotchi.is_sleeping ? 
      Math.floor(hoursDiff * 5) : // +5 pts per hour when sleeping (resting)
      -Math.floor(hoursDiff * 15); // -15 pts per hour when awake (being active)
    
    updates.hunger = Math.max(0, tamagotchi.hunger - hungerDrop);
    updates.happiness = Math.max(0, tamagotchi.happiness - happinessDrop);
    updates.hygiene = Math.max(0, tamagotchi.hygiene - hygieneDrop);
    updates.energy = Math.max(0, Math.min(100, tamagotchi.energy + energyChange));
    
    // Health degradation if hunger or hygiene is 0
    if (updates.hunger === 0 || updates.hygiene === 0) {
      const healthDrop = Math.floor(hoursDiff * 20); // 20 pts per hour
      updates.health = Math.max(0, tamagotchi.health - healthDrop);
    }
    
    // Death condition
    if (updates.health === 0) {
      updates.stage = 'dead';
    }
    
    // Evolution logic
    if (updates.stage !== 'dead') {
      updates = this.calculateEvolution(updates, hoursDiff);
    }
    
    return updates;
  }

  static calculateEvolution(tamagotchi, hoursDiff) {
    const totalHoursAlive = (new Date() - new Date(tamagotchi.created_at)) / (1000 * 60 * 60);
    const allStatsGood = tamagotchi.hunger > 70 && tamagotchi.happiness > 70 && 
                        tamagotchi.hygiene > 70 && tamagotchi.health > 70;
    
    let newStage = tamagotchi.stage;
    let evolutionPoints = tamagotchi.evolution_points;
    
    // Evolution conditions
    if (tamagotchi.stage === 'egg' && totalHoursAlive >= 0.1) {
      newStage = 'baby';
    } else if (tamagotchi.stage === 'baby' && totalHoursAlive >= 2 && allStatsGood) {
      newStage = 'child';
    } else if (tamagotchi.stage === 'child' && totalHoursAlive >= 8 && tamagotchi.discipline > 0) {
      newStage = 'teen';
    } else if (tamagotchi.stage === 'teen' && totalHoursAlive >= 24 && allStatsGood) {
      newStage = 'adult';
    }
    
    // Evolution points increase when all stats are good
    if (allStatsGood) {
      evolutionPoints += Math.floor(hoursDiff * 2); // 2 points per hour
    }
    
    return {
      ...tamagotchi,
      stage: newStage,
      evolution_points: evolutionPoints
    };
  }

  static async performAction(userId, actionType) {
    const tamagotchi = await this.findByUserId(userId);
    if (!tamagotchi) throw new Error('No tamagotchi found');
    if (tamagotchi.stage === 'dead') throw new Error('Pet is dead');
    
    // Calculate current state with passive degradation
    let currentState = await this.calculatePassiveDegradation(tamagotchi);
    
    // Apply action effects
    const actionEffects = {
      feed: { hunger: Math.min(100, currentState.hunger + 20), hygiene: Math.max(0, currentState.hygiene - 5) },
      play: { happiness: Math.min(100, currentState.happiness + 15), energy: Math.max(0, currentState.energy - 10) },
      clean: { hygiene: Math.min(100, currentState.hygiene + 30) },
      heal: { health: 100 },
      discipline: { discipline: Math.min(100, currentState.discipline + 10), happiness: Math.max(0, currentState.happiness - 5) }
    };
    
    const effects = actionEffects[actionType];
    if (!effects) throw new Error('Invalid action type');
    
    const updates = { ...currentState, ...effects };
    
    // Update in database
    return await this.updateStats(userId, updates);
  }

  static async toggleSleep(userId) {
    const tamagotchi = await this.findByUserId(userId);
    if (!tamagotchi) throw new Error('No tamagotchi found');
    if (tamagotchi.stage === 'dead') throw new Error('Pet is dead');
    
    const currentState = await this.calculatePassiveDegradation(tamagotchi);
    const updates = { ...currentState, is_sleeping: !currentState.is_sleeping };
    
    return await this.updateStats(userId, updates);
  }

  static async revive(userId, name) {
    // Delete current pet and create new egg
    await db.query('DELETE FROM tamagotchi WHERE user_id = $1', [userId]);
    return await this.create(userId, name);
  }
}

module.exports = Tamagotchi; 