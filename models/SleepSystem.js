class SleepSystem {
  // Sleep schedule by pet stage
  static SLEEP_SCHEDULES = {
    baby: { sleepStart: 20, sleepEnd: 8, duration: 12 },    // 8 PM - 8 AM
    child: { sleepStart: 20, sleepEnd: 7, duration: 11 },   // 8 PM - 7 AM
    teen: { sleepStart: 21, sleepEnd: 7, duration: 10 },    // 9 PM - 7 AM
    adult: { sleepStart: 22, sleepEnd: 6, duration: 8 }     // 10 PM - 6 AM
  };

  // Sleep states
  static SLEEP_STATES = {
    AWAKE: 'awake',
    FALLING_ASLEEP: 'falling_asleep',
    ASLEEP: 'asleep',
    WAKING_UP: 'waking_up'
  };

  // Transition times (in minutes)
  static TRANSITION_TIMES = {
    FALLING_ASLEEP: 5,  // 5 minutes to fall asleep
    WAKING_UP: 3        // 3 minutes to wake up
  };

  /**
   * Calculate current game time (can be accelerated for testing)
   */
  static getCurrentGameTime() {
    const now = new Date();
    // For testing: you can accelerate time by changing this multiplier
    const timeMultiplier = process.env.TIME_MULTIPLIER ? parseFloat(process.env.TIME_MULTIPLIER) : 1;
    
    const acceleratedTime = new Date(now.getTime() * timeMultiplier);
    return {
      hour: acceleratedTime.getHours(),
      minute: acceleratedTime.getMinutes(),
      timestamp: acceleratedTime
    };
  }

  /**
   * Check if pet should be sleeping based on time and stage
   */
  static shouldBeSleeping(stage, currentHour) {
    if (stage === 'egg' || stage === 'dead') return false;
    
    const schedule = this.SLEEP_SCHEDULES[stage];
    if (!schedule) return false;

    // Handle overnight sleep (e.g., 22:00 to 06:00)
    if (schedule.sleepStart > schedule.sleepEnd) {
      return currentHour >= schedule.sleepStart || currentHour < schedule.sleepEnd;
    } else {
      return currentHour >= schedule.sleepStart && currentHour < schedule.sleepEnd;
    }
  }

  /**
   * Calculate sleep quality based on conditions
   */
  static calculateSleepQuality(pet, lightOn, isInterrupted) {
    let quality = 100;

    // Light on during sleep reduces quality
    if (pet.sleep_state === this.SLEEP_STATES.ASLEEP && lightOn) {
      quality -= 30;
    }

    // Interruptions reduce quality
    if (isInterrupted) {
      quality -= 20;
    }

    // Poor stats reduce sleep quality
    if (pet.hunger < 30) quality -= 15;
    if (pet.hygiene < 30) quality -= 15;
    if (pet.happiness < 30) quality -= 10;

    return Math.max(0, quality);
  }

  /**
   * Update pet's sleep state based on current conditions
   */
  static updateSleepState(pet) {
    const gameTime = this.getCurrentGameTime();
    const shouldSleep = this.shouldBeSleeping(pet.stage, gameTime.hour);
    const currentState = pet.sleep_state;
    
    let newState = currentState;
    let sleepStartTime = pet.sleep_start_time;
    let isInterrupted = false;

    // State transitions
    switch (currentState) {
      case this.SLEEP_STATES.AWAKE:
        if (shouldSleep) {
          newState = this.SLEEP_STATES.FALLING_ASLEEP;
          sleepStartTime = gameTime.timestamp;
        }
        break;

      case this.SLEEP_STATES.FALLING_ASLEEP:
        const fallAsleepMinutes = (gameTime.timestamp - new Date(sleepStartTime)) / (1000 * 60);
        if (fallAsleepMinutes >= this.TRANSITION_TIMES.FALLING_ASLEEP) {
          newState = this.SLEEP_STATES.ASLEEP;
        } else if (!shouldSleep) {
          // Interrupted while falling asleep
          newState = this.SLEEP_STATES.AWAKE;
          isInterrupted = true;
        }
        break;

      case this.SLEEP_STATES.ASLEEP:
        if (!shouldSleep) {
          newState = this.SLEEP_STATES.WAKING_UP;
        }
        break;

      case this.SLEEP_STATES.WAKING_UP:
        const wakeUpMinutes = (gameTime.timestamp - new Date(sleepStartTime)) / (1000 * 60);
        if (wakeUpMinutes >= this.TRANSITION_TIMES.WAKING_UP) {
          newState = this.SLEEP_STATES.AWAKE;
        }
        break;
    }

    // Calculate sleep quality
    const sleepQuality = this.calculateSleepQuality(pet, pet.light_on, isInterrupted);

    return {
      sleep_state: newState,
      sleep_start_time: sleepStartTime,
      sleep_quality: sleepQuality,
      isInterrupted
    };
  }

  /**
   * Calculate energy changes based on sleep state
   */
  static calculateEnergyChange(pet, hoursDiff) {
    let energyChange = 0;

    switch (pet.sleep_state) {
      case this.SLEEP_STATES.ASLEEP:
        // Good sleep: +10 energy per hour
        energyChange = Math.floor(hoursDiff * 10);
        break;
      
      case this.SLEEP_STATES.FALLING_ASLEEP:
      case this.SLEEP_STATES.WAKING_UP:
        // Transition states: +5 energy per hour
        energyChange = Math.floor(hoursDiff * 5);
        break;
      
      case this.SLEEP_STATES.AWAKE:
        // Awake: -15 energy per hour (being active)
        energyChange = -Math.floor(hoursDiff * 15);
        break;
    }

    // Sleep quality affects energy gain
    if (pet.sleep_state === this.SLEEP_STATES.ASLEEP) {
      const qualityMultiplier = pet.sleep_quality / 100;
      energyChange = Math.floor(energyChange * qualityMultiplier);
    }

    return energyChange;
  }

  /**
   * Handle manual sleep toggle (player intervention)
   */
  static handleManualSleepToggle(pet, forceAwake = false) {
    const gameTime = this.getCurrentGameTime();
    const shouldSleep = this.shouldBeSleeping(pet.stage, gameTime.hour);
    
    let newState = pet.sleep_state;
    let sleepStartTime = pet.sleep_start_time;
    let happinessPenalty = 0;

    if (forceAwake) {
      // Force wake up
      if (pet.sleep_state === this.SLEEP_STATES.ASLEEP) {
        happinessPenalty = -10; // Penalty for waking sleeping pet
      }
      newState = this.SLEEP_STATES.AWAKE;
      sleepStartTime = null;
    } else {
      // Toggle sleep state
      if (pet.sleep_state === this.SLEEP_STATES.AWAKE) {
        newState = this.SLEEP_STATES.FALLING_ASLEEP;
        sleepStartTime = gameTime.timestamp;
      } else {
        newState = this.SLEEP_STATES.AWAKE;
        sleepStartTime = null;
        if (pet.sleep_state === this.SLEEP_STATES.ASLEEP) {
          happinessPenalty = -5; // Small penalty for interrupting sleep
        }
      }
    }

    return {
      sleep_state: newState,
      sleep_start_time: sleepStartTime,
      happinessPenalty
    };
  }

  /**
   * Handle light toggle
   */
  static handleLightToggle(pet, lightOn) {
    let happinessBonus = 0;

    // Turning off lights when pet should be sleeping is good
    if (this.shouldBeSleeping(pet.stage, this.getCurrentGameTime().hour) && !lightOn) {
      happinessBonus = 5;
    }

    // Turning on lights when pet is sleeping is bad
    if (pet.sleep_state === this.SLEEP_STATES.ASLEEP && lightOn) {
      happinessBonus = -5;
    }

    return {
      light_on: lightOn,
      happinessBonus
    };
  }

  /**
   * Get sleep status for UI display
   */
  static getSleepStatus(pet) {
    const gameTime = this.getCurrentGameTime();
    const shouldSleep = this.shouldBeSleeping(pet.stage, gameTime.hour);
    
    return {
      currentState: pet.sleep_state,
      shouldBeSleeping: shouldSleep,
      isSleeping: pet.sleep_state === this.SLEEP_STATES.ASLEEP,
      isFallingAsleep: pet.sleep_state === this.SLEEP_STATES.FALLING_ASLEEP,
      isWakingUp: pet.sleep_state === this.SLEEP_STATES.WAKING_UP,
      lightOn: pet.light_on,
      sleepQuality: pet.sleep_quality,
      currentTime: gameTime,
      schedule: this.SLEEP_SCHEDULES[pet.stage] || null
    };
  }
}

module.exports = SleepSystem; 