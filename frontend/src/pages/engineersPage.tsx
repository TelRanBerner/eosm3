import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Paper, Stack,
    Button, IconButton, TextField, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Alert, Snackbar, MenuItem, CircularProgress, Badge, List, ListItem, ListItemText,
    Select, Divider, Avatar, Drawer, useMediaQuery, useTheme
} from '@mui/material';
import {
    Build as BuildIcon,
    SupportAgent as SupportIcon,
    AdminPanelSettings as AdminIcon,
    Delete as DeleteIcon,
    Send as SendIcon,
    Info as InfoIcon,
    Menu as MenuIcon,
    Close as CloseIcon,
    MoveToInbox as InboxIcon,
    Chat as ChatIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface IncidentUpdate {
    _id?: string;
    message: string;
    author?: { username: string } | string;
    createdAt?: string;
    isPublic?: boolean;
}

interface EngineerTask {
    _id: string;
    incidentNumber: string;
    location?: string;
    createdAt: string;
    title: string;
    type?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    description?: string;
    ticketId?: { ticketNumber?: string; title?: string } | string;
    createdBy?: { username: string; email?: string } | string;
    assignedTo?: { username: string } | string;
    updates?: IncidentUpdate[];
}

interface EngineerPageProps {
    logout: () => Promise<void>;
}

const BASE_URL = 'https://eosm3-production-1bb1.up.railway.app';

const getStatusStyles = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'resolved')      return { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' };
    if (s === 'closed')        return { bg: '#ede7f6', text: '#4527a0', border: '#b39ddb' };
    if (s === 'monitoring')    return { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' };
    if (s === 'investigating')  return { bg: '#fff8e1', text: '#f57f17', border: '#ffcc02' };
    if (s === 'identified')    return { bg: '#fce4ec', text: '#c62828', border: '#ef9a9a' };
    if (s === 'in-progress')   return { bg: '#fffde7', text: '#f57f17', border: '#fff59d' };
    return { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' };
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'critical': return '#d32f2f';
        case 'high':     return '#e67e22';
        case 'medium':   return '#f9a825';
        case 'low':      return '#388e3c';
        default:         return '#7f8c8d';
    }
};

const getAuthorName = (author: any): string => {
    if (!author) return 'Unknown';
    if (typeof author === 'object') return author.username || author.email || 'Unknown';
    return String(author);
};


// ── Standalone dialogs — own local state so typing doesn't re-render parent ──

interface SendMsgDialogProps {
    open: boolean;
    onClose: () => void;
    onSent: (msg: string) => void;
    title: string;
    titleBg: string;
    to: string;
}

const SendMsgDialog: React.FC<SendMsgDialogProps> = ({ open, onClose, onSent, title, titleBg, to }) => {
    const [text, setText] = React.useState('');
    const handleClose = () => { setText(''); onClose(); };
    const handleSend = async () => {
        const txt = text.trim();
        if (!txt) return;
        try {
            await axios.post(`${BASE_URL}/api/messages`, { to, text: txt }, { withCredentials: true });
            onSent(`Message sent to ${title}!`);
            setText('');
            onClose();
        } catch (err: any) {
            onSent('Failed to send — ' + (err?.response?.data?.message || err?.message || 'error'));
        }
    };
    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ bgcolor: titleBg, color: 'white', fontWeight: 900 }}>{title.toUpperCase()}</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1.5 }}>
                    <textarea
                        rows={5}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type your message here..."
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '10px', fontSize: '1rem',
                            border: '1px solid #ccc', borderRadius: 0,
                            resize: 'vertical', fontFamily: 'inherit', outline: 'none'
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f4f7f9' }}>
                <Button onClick={handleClose} sx={{ fontWeight: 'bold' }}>CANCEL</Button>
                <Button variant="contained" onClick={handleSend}
                        sx={{ bgcolor: titleBg, borderRadius: 0, fontWeight: 'bold', px: 3 }}>SEND</Button>
            </DialogActions>
        </Dialog>
    );
};

const EngineerPage: React.FC<EngineerPageProps> = ({ logout }) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [tasks, setTasks] = useState<EngineerTask[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [inboxOpen, setInboxOpen] = useState(false);
    const [inbox, setInbox] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [replyText, setReplyText] = useState('');

    const [openDetails, setOpenDetails] = useState(false);
    const [selectedTask, setSelectedTask] = useState<EngineerTask | null>(null);
    const [noteText, setNoteText] = useState('');
    const [sendingNote, setSendingNote] = useState(false);

    const [openSupportDialog, setOpenSupportDialog] = useState(false);
    const [openAdminDialog, setOpenAdminDialog] = useState(false);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const showMessage = (msg: string, sev: 'success' | 'error' = 'success') =>
        setSnackbar({ open: true, message: msg, severity: sev });

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_URL}/api/incidents?limit=100`, { withCredentials: true });
            const result = response.data;
            const arr = Array.isArray(result) ? result : result?.data || result?.incidents || [];
            setTasks(arr);
        } catch (error) {
            console.error('Failed to load incidents:', error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    // ── Messenger — useCallback prevents re-creation on every render ──
    const fetchMessages = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/messages/inbox`, { withCredentials: true });
            const msgs = Array.isArray(res.data) ? res.data : [];
            setInbox(msgs);
            setUnreadCount(msgs.filter((m: any) => !m.read).length);
        } catch { /* silent */ }
    }, []);

    const handleOpenInbox = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/messages/inbox`, { withCredentials: true });
            const msgs = Array.isArray(res.data) ? res.data : [];
            // mark all as read
            msgs.forEach(async (m: any) => {
                if (!m.read) {
                    try { await axios.patch(`${BASE_URL}/api/messages/${m._id}/read`, {}, { withCredentials: true }); } catch {}
                }
            });
            setInbox(msgs.map((m: any) => ({ ...m, read: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
        setInboxOpen(true);
    }, []);

    // Poll every 60s — stable ref so no re-render side effects
    useEffect(() => {
        fetchMessages();
        const t = setInterval(fetchMessages, 60000);
        return () => clearInterval(t);
    }, [fetchMessages]);

    const openIncidentDetails = async (task: EngineerTask) => {
        try {
            const res = await axios.get(`${BASE_URL}/api/incidents/${task._id}`, { withCredentials: true });
            setSelectedTask(res.data?.data || res.data);
        } catch { setSelectedTask(task); }
        setNoteText('');
        setOpenDetails(true);
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await axios.patch(`${BASE_URL}/api/incidents/${taskId}/status`, { status: newStatus }, { withCredentials: true });
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
            if (selectedTask?._id === taskId) setSelectedTask(prev => prev ? { ...prev, status: newStatus } : prev);
            showMessage(`Status updated → ${newStatus.toUpperCase()}`);
        } catch { showMessage('Failed to update status', 'error'); }
    };

    const handleSendNote = async () => {
        if (!noteText.trim() || !selectedTask) return;
        setSendingNote(true);
        try {
            await axios.post(`${BASE_URL}/api/incidents/${selectedTask._id}/updates`,
                { message: noteText.trim(), isPublic: true }, { withCredentials: true });
            const res = await axios.get(`${BASE_URL}/api/incidents/${selectedTask._id}`, { withCredentials: true });
            setSelectedTask(res.data?.data || res.data);
            setNoteText('');
            showMessage('Note sent successfully');
        } catch { showMessage('Failed to send note', 'error'); }
        finally { setSendingNote(false); }
    };

    const handleDeleteIncident = async (id: string) => {
        if (!window.confirm('Delete this incident from the database?')) return;
        try {
            await axios.delete(`${BASE_URL}/api/incidents/${id}`, { withCredentials: true });
            setTasks(prev => prev.filter(t => t._id !== id));
            showMessage('Incident deleted', 'error');
        } catch { showMessage('Failed to delete incident', 'error'); }
    };

    const filteredTasks = React.useMemo(() =>
            tasks.filter(task =>
                (task.location ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.incidentNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.title ?? '').toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [tasks, searchTerm]);

    return (
        <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <Box sx={{ p: 2, px: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e67e22', bgcolor: '#1a1a1a', color: 'white', flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <BuildIcon sx={{ color: '#e67e22' }} />
                    <Typography variant={isSmall ? 'body1' : 'h6'} sx={{ fontWeight: 900, letterSpacing: 1 }}>ENGINEER TERMINAL</Typography>
                </Stack>

                {/* Search — hidden on small screens, shown in drawer */}
                {!isSmall && (
                    <Stack direction="row" spacing={1} sx={{ flexGrow: 1, mx: 2, maxWidth: 400 }} alignItems="center">
                        <TextField size="small" fullWidth placeholder="Search by Incident # or Title..."
                                   value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(searchTerm.trim())}
                                   sx={{ bgcolor: 'white', borderRadius: 0 }} />
                        <Button variant="contained" onClick={() => setSearchTerm(searchTerm.trim())} sx={{ bgcolor: '#e67e22', borderRadius: 0, minWidth: 45 }}>OK</Button>
                        <Button variant="contained" onClick={() => setSearchTerm('')} sx={{ bgcolor: '#555', borderRadius: 0 }}>↺</Button>
                    </Stack>
                )}

                {isMobile ? (
                    <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ color: '#e67e22' }}>
                        <MenuIcon />
                    </IconButton>
                ) : (
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" startIcon={<SupportIcon />} onClick={() => setOpenSupportDialog(true)} sx={{ bgcolor: '#2b4d7e', borderRadius: 0 }}>Support</Button>
                        <Button variant="contained" startIcon={<AdminIcon />} onClick={() => setOpenAdminDialog(true)} sx={{ bgcolor: '#d32f2f', borderRadius: 0 }}>Admin</Button>
                        <IconButton onClick={handleOpenInbox} sx={{ color: '#e67e22', border: '1px solid #e67e22' }}>
                            <Badge badgeContent={unreadCount} color="error"><InboxIcon /></Badge>
                        </IconButton>
                        <Button variant="contained" onClick={async () => { await logout(); navigate('/login'); }} sx={{ bgcolor: '#444', borderRadius: 0 }}>EXIT</Button>
                    </Stack>
                )}
            </Box>

            {/* Mobile search bar */}
            {isSmall && (
                <Box sx={{ p: 1.5, bgcolor: '#2a2a2a', display: 'flex', gap: 1 }}>
                    <TextField size="small" fullWidth placeholder="Search incidents..." value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               sx={{ bgcolor: 'white', borderRadius: 0, '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                    <Button variant="contained" onClick={() => setSearchTerm('')} sx={{ bgcolor: '#555', borderRadius: 0, minWidth: 40 }}>↺</Button>
                </Box>
            )}

            {/* Mobile Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{ width: 240, p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography fontWeight="bold">MENU</Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                    </Stack>
                    <Stack spacing={1}>
                        <Button variant="contained" startIcon={<SupportIcon />} fullWidth onClick={() => { setOpenSupportDialog(true); setDrawerOpen(false); }} sx={{ bgcolor: '#2b4d7e', borderRadius: 0 }}>Contact Support</Button>
                        <Button variant="contained" startIcon={<AdminIcon />} fullWidth onClick={() => { setOpenAdminDialog(true); setDrawerOpen(false); }} sx={{ bgcolor: '#d32f2f', borderRadius: 0 }}>Admin Report</Button>
                        <Button fullWidth onClick={() => { handleOpenInbox(); setDrawerOpen(false); }}
                                startIcon={<Badge badgeContent={unreadCount} color="error"><InboxIcon /></Badge>}
                                sx={{ justifyContent: 'flex-start', color: '#e67e22', border: '1px solid #e67e22', borderRadius: 0, py: 1 }}>
                            Inbox {unreadCount > 0 ? `(${unreadCount})` : ''}
                        </Button>
                        <Button variant="contained" fullWidth onClick={async () => { await logout(); navigate('/login'); }} sx={{ bgcolor: '#444', borderRadius: 0 }}>EXIT</Button>
                    </Stack>
                </Box>
            </Drawer>

            {/* Table */}
            <Box sx={{ flexGrow: 1, p: { xs: 1.5, md: 3 } }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                        <CircularProgress sx={{ color: '#e67e22' }} />
                    </Box>
                ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: 0, border: '2px solid #e67e22', overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: { xs: 480, md: 'auto' } }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#1a1a1a' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>INC #</TableCell>
                                    {!isSmall && <TableCell sx={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>DATE</TableCell>}
                                    <TableCell sx={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>TITLE</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>SEV</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>STATUS</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 900, textAlign: 'center', fontSize: '1rem' }}>ACT</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#888' }}>No incidents found</TableCell>
                                    </TableRow>
                                ) : filteredTasks.map((task) => {
                                    const st = getStatusStyles(task.status);
                                    return (
                                        <TableRow key={task._id} hover>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#e67e22', fontSize: '1rem' }}>{task.incidentNumber}</TableCell>
                                            {!isSmall && <TableCell sx={{ fontSize: '0.95rem' }}>{new Date(task.createdAt).toLocaleDateString()}</TableCell>}
                                            <TableCell>
                                                <Typography onClick={() => openIncidentDetails(task)}
                                                            sx={{ cursor: 'pointer', color: '#2b4d7e', textDecoration: 'underline', fontWeight: 'bold', fontSize: '1rem' }}>
                                                    {task.title}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={isSmall ? task.severity?.charAt(0).toUpperCase() : task.severity?.toUpperCase()} size="small"
                                                      sx={{ bgcolor: getSeverityColor(task.severity), color: 'white', fontWeight: 'bold', borderRadius: 0, fontSize: isSmall ? '0.55rem' : '0.78rem', height: isSmall ? 18 : 24, px: isSmall ? 0 : 0.5 }} />
                                            </TableCell>
                                            <TableCell sx={{ minWidth: isSmall ? 30 : 145, px: isSmall ? 0.5 : 1 }}>
                                                <Select size="small" value={task.status ?? 'new'}
                                                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                                                        sx={{ borderRadius: 0, fontWeight: 'bold',
                                                            fontSize: isSmall ? '0.55rem' : '0.875rem',
                                                            color: st.text, bgcolor: st.bg,
                                                            border: `1px solid ${st.border}`,
                                                            width: isSmall ? 'auto' : '100%', maxWidth: isSmall ? 72 : 145,
                                                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                                            '& .MuiSelect-icon': { color: st.text, fontSize: isSmall ? '0.9rem' : '1.25rem' },
                                                            '& .MuiSelect-select': { py: isSmall ? '2px' : '4px', px: isSmall ? '4px' : '6px' } }}>
                                                    {['new', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'].map(s => {
                                                        const ss = getStatusStyles(s);
                                                        return <MenuItem key={s} value={s} sx={{ fontSize: '0.875rem', fontWeight: 'bold', color: ss.text }}>{s.toUpperCase()}</MenuItem>;
                                                    })}
                                                </Select>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <IconButton size="small" onClick={() => openIncidentDetails(task)} sx={{ color: '#2b4d7e', border: '1px solid #2b4d7e', p: '3px' }}>
                                                        <InfoIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteIncident(task._id)} sx={{ color: '#d32f2f', border: '1px solid #d32f2f', p: '3px' }}>
                                                        <DeleteIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{ bgcolor: '#1a2a40', py: 2, color: 'white', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>© 2026 Smart City Israel. All Rights Reserved.</Typography>
            </Box>

            {/* Incident Details Dialog */}
            <Dialog open={openDetails} onClose={() => setOpenDetails(false)} fullWidth maxWidth="md" fullScreen={isSmall} PaperProps={{ sx: { borderRadius: 0 } }}>
                <DialogTitle sx={{ bgcolor: '#1a1a1a', color: '#e67e22', fontWeight: 900, pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant={isSmall ? 'body1' : 'h6'} sx={{ fontWeight: 900, color: '#e67e22' }}>
                            ⚙️ {selectedTask?.incidentNumber} — {selectedTask?.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={selectedTask?.severity?.toUpperCase()}
                                  sx={{ bgcolor: getSeverityColor(selectedTask?.severity || ''), color: 'white', fontWeight: 'bold', borderRadius: 0 }} />
                            {isSmall && <IconButton size="small" onClick={() => setOpenDetails(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>}
                        </Stack>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {selectedTask && (
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: { xs: 'auto', md: 450 } }}>
                            {/* Left panel */}
                            <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, borderRight: { md: '1px solid #eee' } }}>
                                <Typography variant="overline" color="text.secondary">Description</Typography>
                                <Typography variant="body2" sx={{ mb: 2, color: '#333' }}>{selectedTask.description || '—'}</Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Stack spacing={1.5}>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary">Status</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Select size="small" value={selectedTask.status ?? 'new'}
                                                    onChange={(e) => handleStatusChange(selectedTask._id, e.target.value)}
                                                    sx={{ borderRadius: 0, fontWeight: 'bold', fontSize: '0.78rem',
                                                        color: getStatusStyles(selectedTask.status).text,
                                                        bgcolor: getStatusStyles(selectedTask.status).bg,
                                                        border: `1px solid ${getStatusStyles(selectedTask.status).border}`,
                                                        minWidth: 160, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}>
                                                {['new', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'].map(s => {
                                                    const ss = getStatusStyles(s);
                                                    return <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: ss.text }}>{s.toUpperCase()}</MenuItem>;
                                                })}
                                            </Select>
                                        </Box>
                                    </Box>
                                    {selectedTask.type && <Box><Typography variant="overline" color="text.secondary">Type</Typography><Typography variant="body2" fontWeight="bold">{selectedTask.type}</Typography></Box>}
                                    {selectedTask.createdBy && <Box><Typography variant="overline" color="text.secondary">Created By</Typography><Typography variant="body2" fontWeight="bold">{getAuthorName(selectedTask.createdBy)}</Typography></Box>}
                                    {selectedTask.assignedTo && <Box><Typography variant="overline" color="text.secondary">Assigned To</Typography><Typography variant="body2" fontWeight="bold">{getAuthorName(selectedTask.assignedTo)}</Typography></Box>}
                                    <Box><Typography variant="overline" color="text.secondary">Created At</Typography><Typography variant="body2">{new Date(selectedTask.createdAt).toLocaleString()}</Typography></Box>
                                    {selectedTask.ticketId && (
                                        <Box><Typography variant="overline" color="text.secondary">Linked Ticket</Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {typeof selectedTask.ticketId === 'object' ? selectedTask.ticketId.ticketNumber || selectedTask.ticketId.title : selectedTask.ticketId}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>

                            {/* Right panel */}
                            <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                                    Work Log ({selectedTask.updates?.length || 0})
                                </Typography>
                                <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: { xs: 200, md: 280 }, mb: 2, pr: 1 }}>
                                    {(!selectedTask.updates || selectedTask.updates.length === 0) ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No entries yet</Typography>
                                    ) : [...selectedTask.updates].reverse().map((upd, i) => (
                                        <Box key={upd._id || i} sx={{ mb: 1.5, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0', borderLeft: '3px solid #e67e22' }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap" gap={0.5}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Avatar sx={{ width: 22, height: 22, bgcolor: '#e67e22', fontSize: '0.6rem' }}>
                                                        {getAuthorName(upd.author).charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Typography variant="caption" fontWeight="bold" color="#e67e22">{getAuthorName(upd.author)}</Typography>
                                                </Stack>
                                                {upd.createdAt && <Typography variant="caption" color="text.secondary">{new Date(upd.createdAt).toLocaleString()}</Typography>}
                                            </Stack>
                                            <Typography variant="body2" sx={{ color: '#333' }}>{upd.message}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>Add a Note</Typography>
                                <TextField fullWidth multiline rows={3}
                                           placeholder="Describe the work performed or add a comment..."
                                           value={noteText} onChange={(e) => setNoteText(e.target.value)}
                                           sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                                <Button variant="contained" endIcon={<SendIcon />}
                                        disabled={!noteText.trim() || sendingNote} onClick={handleSendNote}
                                        sx={{ bgcolor: '#e67e22', borderRadius: 0, fontWeight: 'bold', alignSelf: 'flex-end' }}>
                                    {sendingNote ? 'Sending...' : 'Send'}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ bgcolor: '#f5f5f5', px: 3 }}>
                    <Button onClick={() => setOpenDetails(false)} sx={{ fontWeight: 'bold' }}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Contact Support Dialog */}
            <SendMsgDialog
                open={openSupportDialog}
                onClose={() => setOpenSupportDialog(false)}
                onSent={(msg) => showMessage(msg)}
                title="Contact Support"
                titleBg="#2b4d7e"
                to="support"
            />

            {/* Admin Report Dialog */}
            <SendMsgDialog
                open={openAdminDialog}
                onClose={() => setOpenAdminDialog(false)}
                onSent={(msg) => showMessage(msg)}
                title="Admin Report"
                titleBg="#d32f2f"
                to="admin"
            />

            {/* Inbox Dialog */}
            <Dialog open={inboxOpen} onClose={() => setInboxOpen(false)} fullWidth maxWidth="xs" fullScreen={isSmall}>
                <DialogTitle sx={{ bgcolor: '#1a2a40', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <ChatIcon />
                        <Typography fontWeight={900}>Incoming Messages</Typography>
                    </Stack>
                    <IconButton size="small" onClick={() => setInboxOpen(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <List>
                        {inbox.length === 0 ? (
                            <ListItem><ListItemText primary="No messages" secondary="Your inbox is empty" /></ListItem>
                        ) : inbox.map((msg: any, i: number) => (
                            <React.Fragment key={msg._id}>
                                {i > 0 && <Divider />}
                                <ListItem alignItems="flex-start" sx={{ bgcolor: msg.read ? 'transparent' : 'rgba(230,126,34,0.05)' }}>
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography fontWeight={msg.read ? 400 : 700} sx={{ color: '#e67e22', textTransform: 'capitalize' }}>
                                                    From: {msg.fromUsername} ({msg.from})
                                                </Typography>
                                                {!msg.read && <Chip label="NEW" size="small" sx={{ bgcolor: '#e67e22', color: 'white', fontSize: '0.6rem', height: 18 }} />}
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
                <DialogActions><Button onClick={() => setInboxOpen(false)}>Close</Button></DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default EngineerPage;
