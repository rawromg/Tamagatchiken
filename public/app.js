class TamagotchiApp {
    constructor() {
        // Use current domain for API calls
        this.apiBase = window.location.origin;
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
        this.currentPet = null;
        this.updateInterval = null;
        this.isDevMode = false;
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.checkDevMode();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Auth tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signup();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Pet actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                            if (action === 'sleep') {
                this.toggleSleep();
            } else if (action === 'light') {
                this.toggleLight();
            } else {
                this.performAction(action);
            }
            });
        });

        // Spawn pet
        document.getElementById('spawn-btn').addEventListener('click', () => {
            this.spawnPet();
        });

        // Revive pet
        document.getElementById('revive-btn').addEventListener('click', () => {
            this.revivePet();
        });

        // Developer reset button
        document.getElementById('dev-reset-btn').addEventListener('click', () => {
            this.devResetPet();
        });

        // Developer stage change button
        document.getElementById('dev-stage-btn').addEventListener('click', () => {
            this.devChangeStage();
        });

        // Stat edit buttons (only in dev mode)
        document.querySelectorAll('.stat-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stat = e.currentTarget.dataset.stat;
                this.openStatEditModal(stat);
            });
        });

        // Stat edit modal
        document.getElementById('stat-edit-cancel').addEventListener('click', () => {
            this.closeStatEditModal();
        });

        document.getElementById('stat-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStatEdit();
        });
    }

    switchAuthTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}-form`);
        });
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.showToast('Login successful!', 'success');
                this.showGameScreen();
                this.loadPet();
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Login failed. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async signup() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.showToast('Account created successfully!', 'success');
                this.showGameScreen();
                this.loadPet();
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Signup failed. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        this.currentPet = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.showAuthScreen();
        this.showToast('Logged out successfully', 'info');
    }

    checkAuthStatus() {
        if (this.token && this.user) {
            this.showGameScreen();
            this.loadPet();
        } else {
            this.showAuthScreen();
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('game-screen').classList.remove('active');
    }

    showGameScreen() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        document.getElementById('user-email').textContent = this.user.email;
    }

    async loadPet() {
        try {
            const response = await fetch(`${this.apiBase}/pet`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.startAutoUpdate();
            } else if (response.status === 404) {
                // No pet found, show spawn section
                this.showSpawnSection();
            } else {
                this.showToast('Failed to load pet', 'error');
            }
        } catch (error) {
            this.showToast('Failed to load pet', 'error');
        }
    }

    async spawnPet() {
        const name = document.getElementById('pet-name-input').value.trim();
        if (!name) {
            this.showToast('Please enter a pet name', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/pet/spawn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.hideSpawnSection();
                this.showToast('Pet spawned successfully!', 'success');
                this.startAutoUpdate();
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Failed to spawn pet', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async revivePet() {
        const name = document.getElementById('revive-name-input').value.trim();
        if (!name) {
            this.showToast('Please enter a pet name', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/pet/revive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.hideReviveSection();
                this.showToast('New life begins!', 'success');
                this.startAutoUpdate();
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Failed to revive pet', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async performAction(action) {
        if (!this.currentPet || this.currentPet.stage === 'dead') {
            this.showToast('Pet is not available for actions', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/pet/action/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.showToast(`Action ${action} performed!`, 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Action failed', 'error');
        }
    }

    async toggleSleep() {
        if (!this.currentPet || this.currentPet.stage === 'dead') {
            this.showToast('Pet is not available for actions', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/pet/sleep`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.showToast(data.message, 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Sleep toggle failed', 'error');
        }
    }

    async toggleLight() {
        if (!this.currentPet || this.currentPet.stage === 'dead') {
            this.showToast('Pet is not available for actions', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/pet/light`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.updateDarkMode();
                this.showToast(data.message, 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Light toggle failed', 'error');
        }
    }

    updatePetDisplay() {
        if (!this.currentPet) return;

        // Update pet info
        document.getElementById('pet-name').textContent = this.currentPet.name;
        document.getElementById('pet-stage').textContent = `Stage: ${this.currentPet.stage}`;
        
        const age = this.calculateAge(this.currentPet.createdAt);
        document.getElementById('pet-age').textContent = `Age: ${age}`;
        
        // Show pet ID
        document.getElementById('pet-id-value').textContent = this.currentPet.id;
        document.getElementById('pet-id').classList.remove('hidden');

        // Update light indicator
        this.updateLightIndicator();

        // Update pet sprite
        const petSprite = document.getElementById('pet-sprite');
        petSprite.className = 'pet-sprite';
        petSprite.classList.add(this.currentPet.stage);
        
        // Update sleep state
        if (this.currentPet.sleepState === 'asleep') {
            petSprite.classList.add('sleeping');
        } else if (this.currentPet.sleepState === 'falling_asleep') {
            petSprite.classList.add('falling-asleep');
        } else if (this.currentPet.sleepState === 'waking_up') {
            petSprite.classList.add('waking-up');
        } else {
            petSprite.classList.remove('sleeping', 'falling-asleep', 'waking-up');
        }

        // Update sprite emoji
        const stageEmoji = this.getStageEmoji(this.currentPet.stage);
        petSprite.querySelector('.pet-stage').textContent = stageEmoji;

        // Update stats
        this.updateStatBar('hunger', this.currentPet.stats.hunger);
        this.updateStatBar('happiness', this.currentPet.stats.happiness);
        this.updateStatBar('hygiene', this.currentPet.stats.hygiene);
        this.updateStatBar('health', this.currentPet.stats.health);
        this.updateStatBar('discipline', this.currentPet.stats.discipline);
        this.updateStatBar('energy', this.currentPet.stats.energy);

        // Update action buttons
        this.updateActionButtons();

        // Show/hide sections based on pet state
        if (this.currentPet.stage === 'dead') {
            this.showReviveSection();
        } else {
            this.hideReviveSection();
        }

        // Update developer stage selector if in dev mode
        if (this.isDevMode) {
            const stageSelect = document.getElementById('dev-stage-select');
            if (stageSelect) {
                stageSelect.value = this.currentPet.stage;
            }
        }

        // Update dark mode based on light state
        this.updateDarkMode();
    }

    updateDarkMode() {
        if (!this.currentPet) return;
        
        const body = document.body;
        const isLightOn = this.currentPet.lightOn;
        
        if (isLightOn) {
            body.classList.remove('dark-mode');
        } else {
            body.classList.add('dark-mode');
        }
    }

    updateLightIndicator() {
        if (!this.currentPet) return;
        
        const lightIndicator = document.getElementById('light-indicator');
        const lightStatus = document.getElementById('light-status');
        const lightIcon = lightIndicator.querySelector('i');
        
        if (this.currentPet.lightOn) {
            lightIndicator.classList.remove('lights-off', 'hidden');
            lightStatus.textContent = 'Lights On';
            lightIcon.className = 'fas fa-lightbulb';
        } else {
            lightIndicator.classList.remove('hidden');
            lightIndicator.classList.add('lights-off');
            lightStatus.textContent = 'Lights Off';
            lightIcon.className = 'fas fa-moon';
        }
    }

    updateStatBar(statName, value) {
        const bar = document.getElementById(`${statName}-bar`);
        const valueSpan = document.getElementById(`${statName}-value`);
        
        if (bar && valueSpan) {
            bar.style.width = `${value}%`;
            valueSpan.textContent = value;
            
            // Update color based on value
            if (value <= 20) {
                bar.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
            } else if (value <= 50) {
                bar.style.background = 'linear-gradient(90deg, #ffc107, #ffd93d)';
            } else {
                bar.style.background = 'linear-gradient(90deg, #28a745, #4ecdc4)';
            }
        }
    }

    updateActionButtons() {
        const isDead = this.currentPet.stage === 'dead';
        const sleepState = this.currentPet.sleepState;
        
        document.querySelectorAll('.action-btn').forEach(btn => {
            const action = btn.dataset.action;
            
            if (action === 'sleep') {
                btn.disabled = isDead;
                const isAsleep = sleepState === 'asleep' || sleepState === 'falling_asleep';
                btn.innerHTML = `
                    <i class="fas fa-${isAsleep ? 'sun' : 'bed'}"></i>
                    <span>${isAsleep ? 'Wake' : 'Sleep'}</span>
                `;
            } else if (action === 'light') {
                btn.disabled = isDead;
                const lightOn = this.currentPet.lightOn;
                btn.innerHTML = `
                    <i class="fas fa-${lightOn ? 'lightbulb' : 'moon'}"></i>
                    <span>${lightOn ? 'Lights Off' : 'Lights On'}</span>
                `;
            } else {
                btn.disabled = isDead;
            }
        });
    }

    getStageEmoji(stage) {
        const emojis = {
            'egg': '🥚',
            'baby': '🐣',
            'child': '🐤',
            'teen': '🐥',
            'adult': '🐔',
            'dead': '💀'
        };
        return emojis[stage] || '🥚';
    }

    calculateAge(createdAt) {
        const now = new Date();
        const created = new Date(createdAt);
        const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
        
        if (diffHours < 1) {
            return 'Less than 1 hour';
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(diffHours / 24);
            const hours = diffHours % 24;
            return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
        }
    }

    showSpawnSection() {
        document.getElementById('spawn-section').classList.remove('hidden');
        document.getElementById('revive-section').classList.add('hidden');
        document.getElementById('pet-id').classList.add('hidden');
    }

    hideSpawnSection() {
        document.getElementById('spawn-section').classList.add('hidden');
    }

    showReviveSection() {
        document.getElementById('revive-section').classList.remove('hidden');
        document.getElementById('spawn-section').classList.add('hidden');
    }

    hideReviveSection() {
        document.getElementById('revive-section').classList.add('hidden');
    }

    startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update pet every 30 seconds
        this.updateInterval = setInterval(() => {
            this.loadPet();
        }, 30000);
    }

    showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    async checkDevMode() {
        try {
            const response = await fetch(`${this.apiBase}/dev-mode`);
            const data = await response.json();
            this.isDevMode = data.isDevMode;
            
            if (this.isDevMode) {
                document.getElementById('dev-section').classList.remove('hidden');
                document.body.classList.add('dev-mode');
            }
        } catch (error) {
            console.log('Could not check dev mode:', error);
        }
    }

    async devResetPet() {
        if (!this.currentPet) {
            this.showToast('No pet to reset', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/pet/dev-reset`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.showToast('Pet reset to egg stage!', 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Reset failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async devChangeStage() {
        if (!this.currentPet) {
            this.showToast('No pet to modify', 'error');
            return;
        }

        const stageSelect = document.getElementById('dev-stage-select');
        const newStage = stageSelect.value;

        if (newStage === this.currentPet.stage) {
            this.showToast('Pet is already at this stage', 'info');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/pet/dev-stage`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stage: newStage })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.showToast(`Pet stage changed to ${newStage}!`, 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Stage change failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Stat editing functionality
    openStatEditModal(stat) {
        if (!this.isDevMode) {
            this.showToast('Developer mode required', 'error');
            return;
        }

        if (!this.currentPet) {
            this.showToast('No pet to edit', 'error');
            return;
        }

        const currentValue = this.currentPet.stats[stat];
        const modal = document.getElementById('stat-edit-modal');
        const title = document.getElementById('stat-edit-title');
        const input = document.getElementById('stat-edit-value');

        // Set modal content
        title.textContent = `Edit ${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
        input.value = currentValue;
        input.focus();

        // Store the stat being edited
        this.editingStat = stat;

        // Show modal
        modal.classList.add('show');
    }

    closeStatEditModal() {
        const modal = document.getElementById('stat-edit-modal');
        modal.classList.remove('show');
        this.editingStat = null;
    }

    async saveStatEdit() {
        if (!this.editingStat) {
            this.closeStatEditModal();
            return;
        }

        const input = document.getElementById('stat-edit-value');
        const value = parseInt(input.value);

        if (isNaN(value) || value < 0 || value > 100) {
            this.showToast('Please enter a valid number between 0 and 100', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`${this.apiBase}/pet/dev-stats`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    stat: this.editingStat, 
                    value: value 
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentPet = data.pet;
                this.updatePetDisplay();
                this.showToast(`${this.editingStat} updated to ${value}!`, 'success');
                this.closeStatEditModal();
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Failed to update stat', 'error');
        } finally {
            this.hideLoading();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TamagotchiApp();
}); 