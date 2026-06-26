const axios = require('axios');

const API_URL = 'http://localhost:5001/api/auth';

const testAuth = async () => {
    try {
        console.log('--- Testing Registration ---');
        const uniqueEmail = `test_${Date.now()}@example.com`;
        const registerRes = await axios.post(`${API_URL}/register`, {
            name: 'Test User',
            email: uniqueEmail,
            password: 'password123',
            role: 'candidate'
        });
        console.log('✅ Register Success:', registerRes.data.success);
        const token = registerRes.data.data.token;

        console.log('\n--- Testing Login ---');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: uniqueEmail,
            password: 'password123'
        });
        console.log('✅ Login Success:', loginRes.data.success);

        console.log('\n--- Testing Protected Route ---');
        const profileRes = await axios.get(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Profile Access Success:', profileRes.data.success);
        console.log('User Role:', profileRes.data.data.role);

        console.log('\n--- Testing Invalid Login (Error Handling) ---');
        try {
            await axios.post(`${API_URL}/login`, {
                email: uniqueEmail,
                password: 'wrongpassword'
            });
        } catch (error) {
            console.log('✅ Error Handled Correctly:', error.response.data.message);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received:', error.request);
        }
    }
};

testAuth();
