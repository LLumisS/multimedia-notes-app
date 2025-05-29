import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Link, Typography } from '@mui/material';
import authService from '../../services/authService';

function LoginForm({ onSuccess, onClose, onSwitchToRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userData = await authService.login(email, password);
            onSuccess(userData);
        } catch (err) {
            setError(err.message || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Login</DialogTitle>
            <DialogContent>
                {error && <Typography color="error" gutterBottom>{error}</Typography>}
                <TextField autoFocus margin="dense" label="Email" type="email" fullWidth variant="outlined" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField margin="dense" label="Password" type="password" fullWidth variant="outlined" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Don't have an account?{' '}
                    <Link component="button" variant="body2" onClick={onSwitchToRegister}>
                        Register here
                    </Link>
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
export default LoginForm;