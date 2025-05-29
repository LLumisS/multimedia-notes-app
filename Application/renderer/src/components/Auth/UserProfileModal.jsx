import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
// You could add change password / delete account functionality here using authService

function UserProfileModal({ user, onClose, onLogout }) {
    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>User Profile</DialogTitle>
            <DialogContent>
                <Typography>Email: {user?.email}</Typography>
                {/* Add Change Password / Delete Account forms/buttons here if desired */}
            </DialogContent>
            <DialogActions>
                <Button onClick={onLogout} color="error">Logout</Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
export default UserProfileModal;