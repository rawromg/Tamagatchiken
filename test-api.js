const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testAPI() {
    console.log('🧪 Testing Tamagotchi API...\n');

    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);

        // Test signup
        console.log('\n2. Testing user signup...');
        const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });
        
        if (signupResponse.ok) {
            const signupData = await signupResponse.json();
            console.log('✅ Signup successful:', signupData.message);
            
            // Test login
            console.log('\n3. Testing user login...');
            const loginResponse = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'password123'
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('✅ Login successful:', loginData.message);
                
                const token = loginData.token;
                
                // Test pet spawn
                console.log('\n4. Testing pet spawn...');
                const spawnResponse = await fetch(`${API_BASE}/pet/spawn`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: 'TestPet' })
                });
                
                if (spawnResponse.ok) {
                    const spawnData = await spawnResponse.json();
                    console.log('✅ Pet spawned:', spawnData.message);
                    
                    // Test get pet
                    console.log('\n5. Testing get pet...');
                    const getPetResponse = await fetch(`${API_BASE}/pet`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (getPetResponse.ok) {
                        const petData = await getPetResponse.json();
                        console.log('✅ Pet retrieved:', petData.pet.name, 'Stage:', petData.pet.stage);
                        
                        // Test action
                        console.log('\n6. Testing pet action (feed)...');
                        const actionResponse = await fetch(`${API_BASE}/pet/action/feed`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (actionResponse.ok) {
                            const actionData = await actionResponse.json();
                            console.log('✅ Action performed:', actionData.message);
                            console.log('   New hunger level:', actionData.pet.stats.hunger);
                        } else {
                            const errorData = await actionResponse.json();
                            console.log('❌ Action failed:', errorData.error);
                        }
                    } else {
                        const errorData = await getPetResponse.json();
                        console.log('❌ Get pet failed:', errorData.error);
                    }
                } else {
                    const errorData = await spawnResponse.json();
                    console.log('❌ Pet spawn failed:', errorData.error);
                }
            } else {
                const errorData = await loginResponse.json();
                console.log('❌ Login failed:', errorData.error);
            }
        } else {
            const errorData = await signupResponse.json();
            console.log('❌ Signup failed:', errorData.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('💡 Make sure the server is running on http://localhost:3000');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testAPI();
}

module.exports = { testAPI }; 