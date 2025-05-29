import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Link, Typography } from '@mui/material';
import authService from '../../services/authService';

function RegisterForm({ onSuccess, onClose, onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError('');
        setLoading(true);
        try {
            await authService.register(email, password);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Register</DialogTitle>
            <DialogContent>
                {error && <Typography color="error" gutterBottom>{error}</Typography>}
                <TextField autoFocus margin="dense" label="Email" type="email" fullWidth variant="outlined" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField margin="dense" label="Password (min 6 chars)" type="password" fullWidth variant="outlined" value={password} onChange={(e) => setPassword(e.target.value)} />
                <TextField margin="dense" label="Confirm Password" type="password" fullWidth variant="outlined" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Already have an account?{' '}
                    <Link component="button" variant="body2" onClick={onSwitchToLogin}>
                        Login here
                    </Link>
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Registering...' : 'Register'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
export default RegisterForm;