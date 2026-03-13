import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Stack, Button, IconButton, TextField,
    Chip, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Snackbar, Alert, Fade, MenuItem, Select,
    FormControl, InputLabel, Badge, Menu, Dialog, DialogTitle,
    DialogContent, List, ListItem, ListItemText, Divider, DialogActions,
    Drawer, useMediaQuery, useTheme
} from '@mui/material';
import {
    Logout as LogoutIcon,
    Security as SecurityIcon,
    SettingsSuggest as SettingsIcon,
    Assessment as StatsIcon,
    Send as SendIcon,
    Chat as ChatIcon,
    MoveToInbox as InboxIcon,
    EditNote as EditIcon,
    DeleteOutline as RemoveIcon,
    Engineering as EngineerIcon,
    SupportAgent as SupportIcon,
    Menu as MenuIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface SystemLog {
    _id: string;
    incidentNumber?: string;
    title: string;
    createdAt: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
}

interface AdminPageProps {
    logout: () => Promise<void>;
}

const steamAnimation = {
    '0%': { transform: 'translateY(0) scaleX(1)', opacity: 0 },
    '15%': { opacity: 0.9 },
    '100%': { transform: 'translateY(-80px) scaleX(3)', opacity: 0 },
};
const floatAnimation = {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-12px)' },
};

const AdminPage: React.FC<AdminPageProps> = ({ logout }) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
    const [tempDetails, setTempDetails] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const openMenu = Boolean(anchorEl);
    const [inbox, setInbox] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const primaryMain = '#2b4d7e';
    const secondaryMain = '#f5a623';

    const navBtnSx = {
        fontWeight: 'bold', borderRadius: 0, px: 2, color: 'white',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: secondaryMain, color: 'white', transform: 'translateY(-1px)' }
    };

    const fetchTasks = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/incidents?limit=100', { withCredentials: true });
            const result = response.data;
            const arr = Array.isArray(result) ? result : result?.data || result?.incidents || [];
            setLogs(arr);
        } catch (error) {
            console.error('Failed to load incidents:', error);
            setLogs([]);
        } finally {
            setTimeout(() => setIsLoading(false), 2000);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/messages/inbox', { withCredentials: true });
            const msgs = Array.isArray(res.data) ? res.data : [];
            setInbox(msgs);
            setUnreadCount(msgs.filter((m: any) => !m.read).length);
        } catch { /* silent */ }
    };

    const handleSendMessage = async () => {
        if (!recipient || !message.trim()) return;
        try {
            await axios.post('https://eosm3-production-1bb1.up.railway.app', { to: recipient, text: message }, { withCredentials: true });
            showMessage(`Message sent to ${recipient}!`);
            setMessage('');
        } catch { showMessage('Failed to send message', 'error'); }
    };

    const handleOpenInbox = async () => {
        await fetchMessages();
        // mark all as read
        inbox.forEach(async (m: any) => {
            if (!m.read) {
                try { await axios.patch(`http://localhost:3000/api/messages/${m._id}/read`, {}, { withCredentials: true }); } catch {}
            }
        });
        setUnreadCount(0);
        setIsInboxOpen(true);
    };

    useEffect(() => { fetchTasks(); fetchMessages(); }, []);

    const showMessage = (msg: string, sev: 'success' | 'error' = 'success') =>
        setSnackbar({ open: true, message: msg, severity: sev });

    const handleRowClick = (log: SystemLog) => {
        setSelectedLog(log);
        setTempDetails(log.description || '');
    };

    const handleSaveReport = async () => {
        if (!selectedLog) return;
        try {
            await axios.patch(`http://localhost:3000/api/incidents/${selectedLog._id}`,
                { description: tempDetails }, { withCredentials: true });
            setLogs(prev => prev.map(l => l._id === selectedLog._id ? { ...l, description: tempDetails } : l));
            showMessage('Report updated!');
            setSelectedLog(null);
        } catch { showMessage('Update failed', 'error'); }
    };

    const handleDeleteRow = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Delete incident from database?')) return;
        try {
            await axios.delete(`http://localhost:3000/api/incidents/${id}`, { withCredentials: true });
            setLogs(prev => prev.filter(l => l._id !== id));
            showMessage('Incident deleted', 'error');
        } catch { showMessage('Delete failed', 'error'); }
    };

    if (isLoading) {
        return (
            <Box sx={{ height: '100vh', width: '100vw', bgcolor: '#0a0a0a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Box sx={{ animation: 'float 3.5s ease-in-out infinite', '@keyframes float': floatAnimation, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', mb: 1.5, gap: 2 }}>
                        {[0, 0.6, 1.2].map((delay, i) => (
                            <Box key={i} sx={{ width: 6, height: 35, bgcolor: '#ffffff', borderRadius: '50%', filter: 'blur(5px)', animation: `steam 2.8s infinite ease-in-out ${delay}s`, '@keyframes steam': steamAnimation }} />
                        ))}
                    </Box>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 125, height: 85, bgcolor: '#ffffff', borderRadius: '5px 5px 60px 60px', boxShadow: 'inset -15px -10px 20px rgba(0,0,0,0.1), 0 15px 35px rgba(0,0,0,0.7)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                            <Box sx={{ width: '100%', height: 28, bgcolor: '#5d4037', borderRadius: '50%', position: 'absolute', top: 2 }} />
                        </Box>
                        <Box sx={{ width: 48, height: 58, border: '10px solid #ffffff', borderRadius: '50%', ml: -4.5, mt: -1, zIndex: -1 }} />
                    </Box>
                    <Box sx={{ width: 170, height: 16, mt: -1, borderRadius: '50%', background: 'radial-gradient(ellipse at center, #ffffff 0%, #bcbcbc 100%)', boxShadow: '0 12px 25px rgba(0,0,0,0.8)' }} />
                </Box>
                <Typography variant={isSmall ? 'h4' : 'h2'} sx={{ mt: 7, color: 'white', letterSpacing: isSmall ? 3 : 8, textAlign: 'center' }}>ADMIN'S BREAK</Typography>
            </Box>
        );
    }

    const NavButtons = () => (
        <>
            <Button startIcon={<EngineerIcon />} onClick={() => { navigate('/engineer'); setDrawerOpen(false); }} sx={isMobile ? { ...navBtnSx, color: primaryMain, '&:hover': { bgcolor: primaryMain, color: 'white' } } : navBtnSx}>
                Engineer Page
            </Button>
            <Button startIcon={<SupportIcon />} onClick={() => { navigate('/support'); setDrawerOpen(false); }} sx={isMobile ? { ...navBtnSx, color: primaryMain, '&:hover': { bgcolor: primaryMain, color: 'white' } } : navBtnSx}>
                Support Page
            </Button>
            <Divider orientation={isMobile ? 'horizontal' : 'vertical'} flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1 }} />
            <Button startIcon={<SettingsIcon />} onClick={(e) => { setAnchorEl(e.currentTarget); setDrawerOpen(false); }}
                    sx={isMobile ? { ...navBtnSx, color: primaryMain, '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } } : { ...navBtnSx, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', transform: 'translateY(-1px)' } }}>
                Settings
            </Button>
            <Button variant="contained" startIcon={<LogoutIcon />} onClick={async () => { await logout(); navigate('/login'); setDrawerOpen(false); }}
                    sx={{ bgcolor: secondaryMain, fontWeight: 'bold', borderRadius: 0, '&:hover': { bgcolor: '#e6951d' } }}>
                Exit
            </Button>
        </>
    );

    return (
        <Fade in={!isLoading} timeout={1000}>
            <Box sx={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                backgroundImage: `linear-gradient(rgba(244,246,248,0.85), rgba(244,246,248,0.85)), url('/houseback.jpg')`,
                backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
            }}>
                {/* HEADER */}
                <Box sx={{ bgcolor: primaryMain, color: 'white', p: 2, px: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${secondaryMain}` }}>
                    <Typography variant={isSmall ? 'subtitle1' : 'h6'} sx={{ fontWeight: 900, letterSpacing: 1 }}>SYSTEM ROOT</Typography>

                    {isMobile ? (
                        <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                            <MenuIcon />
                        </IconButton>
                    ) : (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <NavButtons />
                        </Stack>
                    )}

                    <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 260, mt: 1.5, boxShadow: 5 } }}>
                        <MenuItem onClick={() => setAnchorEl(null)}>Admin Profile</MenuItem>
                        <MenuItem onClick={() => setAnchorEl(null)}>User Management</MenuItem>
                        <Divider />
                        <MenuItem onClick={() => setAnchorEl(null)}>Server Logs</MenuItem>
                        <MenuItem onClick={() => setAnchorEl(null)}>Security Settings</MenuItem>
                    </Menu>
                </Box>

                {/* MOBILE DRAWER */}
                <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    <Box sx={{ width: 260, p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography fontWeight="bold" color={primaryMain}>MENU</Typography>
                            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                        </Stack>
                        <Stack spacing={1}>
                            <NavButtons />
                        </Stack>
                    </Box>
                </Drawer>

                {/* CONTENT */}
                <Box sx={{ p: { xs: 2, md: 4 } }}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} alignItems="flex-start">

                        {/* Sidebar */}
                        <Box sx={{ width: { xs: '100%', lg: '320px' }, flexShrink: 0 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                <StatsIcon sx={{ mr: 1, verticalAlign: 'middle', color: primaryMain }} />System Pulse
                            </Typography>
                            <Stack direction={{ xs: 'row', sm: 'row', lg: 'column' }} spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Total Incidents', value: String(logs.length), color: primaryMain },
                                    { label: 'Critical / High', value: String(logs.filter(l => l.severity === 'critical' || l.severity === 'high').length), color: '#d32f2f' },
                                    { label: 'Resolved', value: String((logs as any[]).filter((l: any) => l.status === 'resolved').length), color: '#27ae60' },
                                    { label: 'Closed', value: String((logs as any[]).filter((l: any) => l.status === 'closed').length), color: '#4527a0' },
                                    { label: 'In Progress', value: String((logs as any[]).filter((l: any) => ['new','investigating','monitoring','identified'].includes(l.status)).length), color: '#f57f17' },
                                ].map((item, idx) => (
                                    <Paper key={idx} sx={{ p: 2, flex: { xs: '1 1 calc(50% - 8px)', lg: 'unset' }, borderRadius: 1, borderLeft: `6px solid ${item.color}`, boxShadow: 2, bgcolor: 'rgba(255,255,255,0.9)' }}>
                                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                        <Typography variant={isSmall ? 'h5' : 'h4'} sx={{ fontWeight: 900, color: item.color }}>{item.value}</Typography>
                                    </Paper>
                                ))}
                            </Stack>

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                <ChatIcon sx={{ mr: 1, verticalAlign: 'middle', color: primaryMain }} />Messenger
                            </Typography>
                            <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 2, bgcolor: 'rgba(255,255,255,0.9)' }}>
                                <Stack spacing={2}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Recipient</InputLabel>
                                        <Select value={recipient} label="Recipient" onChange={(e) => setRecipient(e.target.value)}>
                                            <MenuItem value="support">Support</MenuItem>
                                            <MenuItem value="engineer">Engineer</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField fullWidth multiline rows={2} placeholder="Message..." size="small" value={message} onChange={(e) => setMessage(e.target.value)} />
                                    <Stack direction="row" spacing={1}>
                                        <Button fullWidth variant="contained" startIcon={<SendIcon />}
                                                onClick={handleSendMessage}
                                                sx={{ bgcolor: primaryMain, borderRadius: 0 }}>Send</Button>
                                        <Button variant="outlined" sx={{ borderColor: primaryMain, color: primaryMain, borderRadius: 0 }} onClick={handleOpenInbox}>
                                            <Badge badgeContent={unreadCount || 0} color="error"><InboxIcon /></Badge>
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Box>

                        {/* Table */}
                        <Box sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: primaryMain }} />Incident Activity Log
                            </Typography>
                            <TableContainer component={Paper} sx={{ borderRadius: 0, boxShadow: 3, border: `2px solid ${primaryMain}`, bgcolor: 'rgba(255,255,255,0.95)', overflowX: 'auto' }}>
                                <Table stickyHeader size="small" sx={{ minWidth: { xs: 500, md: 'auto' } }}>
                                    <TableHead>
                                        <TableRow>
                                            {!isSmall && <TableCell sx={{ bgcolor: primaryMain, color: 'white', fontWeight: 900, fontSize: '1rem' }}>TIME</TableCell>}
                                            <TableCell sx={{ bgcolor: primaryMain, color: 'white', fontWeight: 900, fontSize: '1rem' }}>INCIDENT #</TableCell>
                                            <TableCell sx={{ bgcolor: primaryMain, color: 'white', fontWeight: 900, fontSize: '1rem' }}>TITLE</TableCell>
                                            <TableCell sx={{ bgcolor: primaryMain, color: 'white', fontWeight: 900, fontSize: '1rem' }}>SEVERITY</TableCell>
                                            <TableCell sx={{ bgcolor: primaryMain, color: 'white', fontWeight: 900, textAlign: 'center', fontSize: '1rem' }}>ACTIONS</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#888' }}>No incidents found</TableCell>
                                            </TableRow>
                                        ) : logs.map((log) => (
                                            <TableRow key={log._id} hover onClick={() => handleRowClick(log)} sx={{ cursor: 'pointer' }}>
                                                {!isSmall && <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{new Date(log.createdAt).toLocaleString()}</TableCell>}
                                                <TableCell sx={{ fontWeight: 'bold', color: primaryMain, fontSize: '1rem' }}>{log.incidentNumber || 'N/A'}</TableCell>
                                                <TableCell sx={{ fontWeight: 500, fontSize: '1rem' }}>{log.title}</TableCell>
                                                <TableCell>
                                                    <Chip label={log.severity?.toUpperCase()} size="small" sx={{
                                                        borderRadius: 0, fontWeight: 'bold', fontSize: '0.8rem',
                                                        bgcolor: (log.severity === 'high' || log.severity === 'critical') ? '#fdecea' : '#e3f2fd',
                                                        color: (log.severity === 'high' || log.severity === 'critical') ? '#d32f2f' : primaryMain
                                                    }} />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => handleRowClick(log)}>
                                                            <EditIcon fontSize="small" sx={{ color: primaryMain }} />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={(e) => handleDeleteRow(e, log._id)}>
                                                            <RemoveIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Stack>
                </Box>

                {/* Edit Dialog */}
                <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ bgcolor: primaryMain, color: 'white', fontWeight: 900 }}>
                        Edit Incident: {selectedLog?.incidentNumber}
                    </DialogTitle>
                    <DialogContent dividers>
                        <TextField label="Description" fullWidth multiline rows={6} value={tempDetails} onChange={(e) => setTempDetails(e.target.value)} sx={{ mt: 1 }} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSelectedLog(null)}>Cancel</Button>
                        <Button onClick={handleSaveReport} variant="contained" sx={{ bgcolor: secondaryMain, borderRadius: 0 }}>Save</Button>
                    </DialogActions>
                </Dialog>

                {/* Inbox Dialog */}
                <Dialog open={isInboxOpen} onClose={() => setIsInboxOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle sx={{ bgcolor: primaryMain, color: 'white' }}>Incoming Messages</DialogTitle>
                    <DialogContent dividers>
                        <List>
                            {inbox.length === 0 ? (
                                <ListItem><ListItemText primary="No messages" secondary="Your inbox is empty" /></ListItem>
                            ) : inbox.map((msg: any, i: number) => (
                                <React.Fragment key={msg._id}>
                                    {i > 0 && <Divider />}
                                    <ListItem alignItems="flex-start" sx={{ bgcolor: msg.read ? 'transparent' : 'rgba(43,77,126,0.05)' }}>
                                        <ListItemText
                                            primary={
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography fontWeight={msg.read ? 400 : 700} sx={{ color: '#2b4d7e', textTransform: 'capitalize' }}>
                                                        From: {msg.fromUsername} ({msg.from})
                                                    </Typography>
                                                    {!msg.read && <Chip label="NEW" size="small" sx={{ bgcolor: '#2b4d7e', color: 'white', fontSize: '0.6rem', height: 18 }} />}
                                                </Stack>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="body2" sx={{ mt: 0.5 }}>{msg.text}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(msg.createdAt).toLocaleString()}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions><Button onClick={() => setIsInboxOpen(false)}>Close</Button></DialogActions>
                </Dialog>

                <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
                </Snackbar>
            </Box>
        </Fade>
    );
};

export default AdminPage;
