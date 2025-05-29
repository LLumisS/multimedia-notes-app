import apiClient from './apiService';

const boardService = {
    createBoard: async (name, jsonData) => {
        try {
            const response = await apiClient.post('/boards', { name, jsonData });
            return response.data; // BoardDto
        } catch (error) {
            console.error('Failed to create board:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Failed to create board');
        }
    },

    getAllBoards: async () => {
        try {
            const response = await apiClient.get('/boards');
            return response.data; // List<BoardDto>
        } catch (error) {
            console.error('Failed to fetch boards:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Failed to fetch boards');
        }
    },

    getBoardById: async (boardId) => {
        try {
            const response = await apiClient.get(`/boards/${boardId}`);
            return response.data; // BoardDto
        } catch (error)      {
            console.error(`Failed to fetch board ${boardId}:`, error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error(`Failed to fetch board ${boardId}`);
        }
    },

    updateBoard: async (boardId, name, jsonData) => {
        try {
            const response = await apiClient.put(`/boards/${boardId}`, { name, jsonData });
            return response.data; // BoardDto
        } catch (error) {
            console.error(`Failed to update board ${boardId}:`, error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error(`Failed to update board ${boardId}`);
        }
    },

    deleteBoard: async (boardId) => {
        try {
            const response = await apiClient.delete(`/boards/${boardId}`);
            return response.data; // { message: "Board deleted successfully." }
        } catch (error) {
            console.error(`Failed to delete board ${boardId}:`, error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error(`Failed to delete board ${boardId}`);
        }
    },
};

export default boardService;
