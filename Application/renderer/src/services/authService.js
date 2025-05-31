import apiClient from './apiService';

const authService = {
    login: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            if (response.data && response.data.accessToken) {
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('userId', response.data.userId);
                localStorage.setItem('userEmail', response.data.email);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
            }
            return response.data; // Contains accessToken, refreshToken, userId, email
        } catch (error) {
            console.error('Login failed:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Login failed');
        }
    },

    register: async (email, password) => {
        try {
            const response = await apiClient.post('/auth/register', { email, password });
            return response.data; // Contains a message e.g., { message: "User registered successfully!" }
        } catch (error) {
            console.error('Registration failed:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Registration failed');
        }
    },

    logout: () => {
        // Clear tokens and user info from storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        // Remove Authorization header from axios defaults
        delete apiClient.defaults.headers.common['Authorization'];
        console.log('Logged out');
    },

    changePassword: async (userId, newPassword) => {
        try {
            const response = await apiClient.put(`/users/${userId}/password`, { newPassword });
            return response.data; // { message: "Password changed successfully." }
        } catch (error) {
            console.error('Change password failed:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Change password failed');
        }
    },

    deleteAccount: async (userId) => {
        try {
            const response = await apiClient.delete(`/users/${userId}`);
            // After successful deletion, perform logout actions
            authService.logout();
            return response.data; // { message: "User account deleted successfully." }
        } catch (error) {
            console.error('Delete account failed:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Delete account failed');
        }
    },

    // Helper to check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('accessToken');
    },

    getCurrentUserId: () => {
        return localStorage.getItem('userId');
    },

    getCurrentUserEmail: () => {
        return localStorage.getItem('userEmail');
    }
};

export default authService;