import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Container, Box, Typography, Paper, TextField,
    Button, Stack, Grid, Divider, Chip,
    List, ListItem, IconButton, Collapse,
    Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, InputLabel, Select, MenuItem,
    Avatar, ListItemIcon, ListItemText,
    Drawer, useMediaQuery, useTheme, AppBar, Toolbar
} from '@mui/material';
import {
    Send as SendIcon,
    Archive as ArchiveIcon,
    Email as EmailIcon,
    Home as HomeIcon,
    ExitToApp as ExitIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Edit as EditIcon,
    Face as FaceIcon,
    Face2 as WomanIcon,
    Face3 as ManIcon,
    Face4 as KidIcon,
    Engineering as ConstructionIcon,
    WaterDrop as PlumbingIcon,
    MinorCrash as VehiclesIcon,
    Power as UtilitiesIcon,
    DirectionsBus, Payments, LocalHospital, School, Gavel, DeleteSweep,
    Campaign as AdIcon,
    Menu as MenuIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { TransitionGroup } from 'react-transition-group';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface UserPageProps {
    logout: () => Promise<void>;
}

const UserPage: React.FC<UserPageProps> = ({ logout }) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    const [ticketText, setTicketText] = useState('');
    const [subject, setSubject] = useState('');
    const [incidentType, setIncidentType] = useState('Other');
    const [showArchive, setShowArchive] = useState(false);
    const [tickets, setTickets] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [profile, setProfile] = useState({ name: 'My Cabinet', address: 'Baker St. 221B', phone: '+1 234 567 890' });
    const [tempProfile, setTempProfile] = useState({ ...profile });
    const [selectedAvatar, setSelectedAvatar] = useState<React.ReactNode>(<PersonIcon />);
    const [openAvatarDialog, setOpenAvatarDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [selectedMail, setSelectedMail] = useState<{ title: string; message: string } | null>(null);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/tickets');
            const result = res.data?.data || res.data;
            setTickets(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Error loading tickets:', error);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    const handleSendTicket = async () => {
        if (!ticketText || !subject) return;
        try {
            await api.post('/tickets', { title: subject, description: ticketText, type: incidentType });
            setTicketText(''); setSubject(''); setIncidentType('Other');
            await fetchTickets();
        } catch (error: any) {
            console.error('POST error:', error?.response?.data || error?.message || error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': case 'Incoming': case 'new': return '#f5a623';
            case 'In Progress': case 'in-progress': return '#2b4d7e';
            case 'Closed': case 'closed': case 'resolved': return '#9e9e9e';
            default: return '#eee';
        }
    };

    const mailScrollStyle = {
        flexGrow: 1, maxHeight: isMobile ? '220px' : '280px', overflowY: 'auto', pr: 1,
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.3)', borderRadius: '10px' }
    };

    const ticketScrollStyle = {
        flexGrow: 1, maxHeight: isMobile ? '300px' : '400px', overflowY: 'auto', pr: 1,
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
    };

    const listItemStyle = {
        flexDirection: 'column', alignItems: 'flex-start', mb: 2, cursor: 'pointer', transition: 'all 0.3s ease',
        '&:hover': { transform: 'translateX(5px)', '& .MuiTypography-subtitle1': { color: '#f5a623' } }
    };

    return (
        <Box sx={{
            bgcolor: '#f4f7f9', minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url(/houseback.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: isMobile ? 'scroll' : 'fixed',
            overflowX: 'hidden',
            '@keyframes marquee': { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } }
        }}>

            {/* Main layout */}
            <Box sx={{ display: 'flex', flexGrow: 1 }}>

                {/* Content area */}
                <Box sx={{ flexGrow: 1, py: { xs: 2, md: 4 }, px: { xs: 2, md: 4, lg: 6 }, display: 'flex', flexDirection: 'column' }}>

                    {/* HEADER */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: { xs: 3, md: 6 } }} flexWrap="wrap" gap={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar onClick={() => setOpenAvatarDialog(true)}
                                    sx={{ bgcolor: '#2b4d7e', width: { xs: 48, md: 64 }, height: { xs: 48, md: 64 }, border: '3px solid white', cursor: 'pointer', boxShadow: 3 }}>
                                {React.isValidElement(selectedAvatar) ? React.cloneElement(selectedAvatar as React.ReactElement<any>, { sx: { fontSize: isSmall ? 28 : 40 } }) : selectedAvatar}
                            </Avatar>
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant={isSmall ? 'h6' : 'h5'} sx={{ color: '#2b4d7e', fontWeight: 900 }}>{profile.name}</Typography>
                                    <IconButton size="small" onClick={() => { setTempProfile({ ...profile }); setOpenEditDialog(true); }}>
                                        <EditIcon sx={{ fontSize: 16, color: '#2b4d7e' }} />
                                    </IconButton>
                                </Stack>
                                <Stack spacing={0.2}>
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#2b4d7e', opacity: 0.8 }}>
                                        <LocationIcon sx={{ fontSize: 16 }} />
                                        <Typography variant="body2" fontWeight="bold">{profile.address}</Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#2b4d7e', opacity: 0.8 }}>
                                        <PhoneIcon sx={{ fontSize: 16 }} />
                                        <Typography variant="body2" fontWeight="bold">{profile.phone}</Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                            {!isMobile && (
                                <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate('/')}
                                        sx={{ borderRadius: 0, color: '#2b4d7e', borderColor: '#2b4d7e', fontWeight: 'bold', height: 40 }}>HOME</Button>
                            )}
                            <Button variant="contained" startIcon={<ExitIcon />} onClick={async () => { await logout(); navigate('/login'); }}
                                    sx={{ borderRadius: 0, bgcolor: '#2b4d7e', fontWeight: 'bold', height: 40 }}>EXIT</Button>
                            {isMobile && (
                                <IconButton onClick={() => setSidebarOpen(true)} sx={{ color: '#2b4d7e' }}>
                                    <MenuIcon />
                                </IconButton>
                            )}
                        </Stack>
                    </Stack>

                    {/* MAIN GRID */}
                    <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="space-between" sx={{ mb: 2 }}>

                        {/* MAIL */}
                        <Grid item xs={12} md={3.5}>
                            <Paper elevation={10} sx={{ p: { xs: 3, md: 4 }, borderRadius: 0, bgcolor: '#2b4d7e', color: 'white', display: 'flex', flexDirection: 'column' }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                    <EmailIcon /><Typography variant="h5" sx={{ fontWeight: 700 }}>YOUR MAIL</Typography>
                                </Stack>
                                <Box sx={mailScrollStyle}>
                                    <List disablePadding>
                                        {[
                                            { t: 'Re: Utility issue', m: 'Manager: "We have received your request."' },
                                            { t: 'System Update', m: 'Server maintenance successfully completed.' },
                                            { t: 'Parking Permit', m: 'Your permit has been approved.' },
                                            { t: 'Monthly Newsletter', m: 'Latest news for March.' },
                                            { t: 'Security Alert', m: 'New login detected.' },
                                            { t: 'Payment Confirmation', m: 'Payment processed.' },
                                            { t: 'Maintenance Schedule', m: 'Elevator maintenance this Friday.' },
                                            { t: 'Welcome Message', m: 'Welcome to your new digital cabinet.' }
                                        ].map((mail, i) => (
                                            <React.Fragment key={i}>
                                                <ListItem disableGutters sx={listItemStyle as any} onClick={() => setSelectedMail({ title: mail.t, message: mail.m })}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{mail.t}</Typography>
                                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', mt: 0.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mail.m}</Typography>
                                                </ListItem>
                                                {i < 7 && <Divider sx={{ bgcolor: 'rgba(255,255,255,0.15)', mb: 2 }} />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </Box>
                                <Button fullWidth sx={{ color: 'white', mt: 3, textTransform: 'none', textDecoration: 'underline' }}>View all</Button>
                            </Paper>
                        </Grid>

                        {/* TICKETS */}
                        <Grid item xs={12} md={4}>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2b4d7e' }}>YOUR REQUESTS</Typography>
                                    <IconButton onClick={() => setShowArchive(!showArchive)}><ArchiveIcon /></IconButton>
                                </Stack>
                                <Box sx={ticketScrollStyle}>
                                    <TransitionGroup>
                                        {tickets
                                            .filter((t: any) => showArchive ? true : !t.archived)
                                            .map((ticket: any) => (
                                                <Collapse key={ticket._id || ticket.id} sx={{ mb: 2 }}>
                                                    <Paper elevation={3} sx={{ p: 2, borderRadius: 0, borderLeft: `4px solid ${getStatusColor(ticket.status)}` }}>
                                                        <Typography fontWeight="bold" variant="body2">{ticket.title}</Typography>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                                            <Typography variant="caption">
                                                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ticket.date}
                                                            </Typography>
                                                            <Chip label={ticket.status} size="small" sx={{ borderRadius: 0, bgcolor: getStatusColor(ticket.status), color: 'white', height: 20, fontSize: '0.65rem' }} />
                                                        </Box>
                                                    </Paper>
                                                </Collapse>
                                            ))}
                                    </TransitionGroup>
                                    {tickets.length === 0 && (
                                        <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'center', mt: 4 }}>No requests yet</Typography>
                                    )}
                                </Box>
                            </Box>
                        </Grid>

                        {/* CREATE TICKET */}
                        <Grid item xs={12} md={4}>
                            <Paper elevation={10} sx={{ p: { xs: 3, md: 4 }, borderRadius: 0, borderTop: '5px solid #2b4d7e' }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#2b4d7e' }}>CREATE TICKET</Typography>
                                <Stack spacing={3}>
                                    <TextField fullWidth label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                                               sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Type</InputLabel>
                                        <Select value={incidentType} label="Type" onChange={(e) => setIncidentType(e.target.value)} sx={{ borderRadius: 0 }}>
                                            {['Water Leak','Power Failure','Elevator Issue','Gas Leak','Heating Problem','Sewage Issue','Road Damage','Street Light','Noise Complaint','Other'].map(t => (
                                                <MenuItem key={t} value={t}>{t}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField fullWidth multiline rows={4} label="Problem" value={ticketText} onChange={(e) => setTicketText(e.target.value)}
                                               sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                                    <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendTicket}
                                            sx={{ bgcolor: '#2b4d7e', py: 1.5, borderRadius: 0, fontWeight: 'bold' }}>SEND</Button>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Bottom icons */}
                    <Box sx={{ mt: 'auto', pt: { xs: 4, md: 8 }, pb: 4, display: 'flex', justifyContent: 'center' }}>
                        <Stack direction="row" spacing={{ xs: 3, md: 6 }} alignItems="center" flexWrap="wrap" justifyContent="center">
                            {[
                                { i: <ConstructionIcon />, t: 'Construction' },
                                { i: <PlumbingIcon />, t: 'Plumbing' },
                                { i: <VehiclesIcon />, t: 'Vehicles' },
                                { i: <UtilitiesIcon />, t: 'Utilities' }
                            ].map((item, idx) => (
                                <Stack key={idx} alignItems="center" spacing={1}>
                                    <Box sx={{ p: 1.2, borderRadius: '50%', bgcolor: 'white', boxShadow: 1, border: '1px solid rgba(43,77,126,0.05)', display: 'flex' }}>
                                        {React.isValidElement(item.i) ? React.cloneElement(item.i as React.ReactElement<any>, { sx: { fontSize: 22, color: '#2b4d7e' } }) : item.i}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#2b4d7e', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.55rem', opacity: 0.7 }}>{item.t}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </Box>

                {/* Sidebar — desktop only */}
                {!isMobile && (
                    <Box sx={{ width: '200px', flexShrink: 0, bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderLeft: '1px solid rgba(43,77,126,0.1)', p: 2, overflowY: 'auto' }}>
                        <Typography variant="subtitle1" sx={{ color: '#2b4d7e', fontWeight: 900, mb: 3, borderBottom: '2px solid #f5a623', pb: 1, letterSpacing: 0.5, mt: 1 }}>
                            CITY DIRECTORY
                        </Typography>
                        <List disablePadding>
                            {[
                                { i: <DirectionsBus />, t: "Transport", s: "Routes" },
                                { i: <Payments />, t: "Payments", s: "Bills" },
                                { i: <LocalHospital />, t: "Medical", s: "Clinics" },
                                { i: <School />, t: "Education", s: "Schools" },
                                { i: <Gavel />, t: "Justice", s: "Legal" },
                                { i: <DeleteSweep />, t: "Waste", s: "Garbage" }
                            ].map((item, idx) => (
                                <ListItem key={idx} sx={{ mb: 0.5, px: 1, borderRadius: 0, cursor: 'pointer', transition: '0.2s',
                                    '&:hover': { bgcolor: 'rgba(43,77,126,0.08)', transform: 'translateX(5px)', '& .MuiListItemIcon-root': { color: '#f5a623' } } }}>
                                    <ListItemIcon sx={{ minWidth: 30, color: '#2b4d7e' }}>
                                        {React.isValidElement(item.i) ? React.cloneElement(item.i as React.ReactElement<any>, { sx: { fontSize: 20 } }) : item.i}
                                    </ListItemIcon>
                                    <ListItemText primary={item.t} secondary={item.s}
                                                  primaryTypographyProps={{ fontWeight: 800, fontSize: '1rem', color: '#2b4d7e' }}
                                                  secondaryTypographyProps={{ fontSize: '0.8rem' }} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                {/* Mobile sidebar drawer */}
                <Drawer anchor="right" open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
                    <Box sx={{ width: 240, p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography fontWeight="bold" color="#2b4d7e">CITY DIRECTORY</Typography>
                            <IconButton onClick={() => setSidebarOpen(false)}><CloseIcon /></IconButton>
                        </Stack>
                        <List disablePadding>
                            {[
                                { i: <DirectionsBus />, t: "Transport", s: "Routes" },
                                { i: <Payments />, t: "Payments", s: "Bills" },
                                { i: <LocalHospital />, t: "Medical", s: "Clinics" },
                                { i: <School />, t: "Education", s: "Schools" },
                                { i: <Gavel />, t: "Justice", s: "Legal" },
                                { i: <DeleteSweep />, t: "Waste", s: "Garbage" }
                            ].map((item, idx) => (
                                <ListItem key={idx} sx={{ mb: 0.5, cursor: 'pointer' }}>
                                    <ListItemIcon sx={{ minWidth: 35, color: '#2b4d7e' }}>
                                        {React.isValidElement(item.i) ? React.cloneElement(item.i as React.ReactElement<any>, { sx: { fontSize: 22 } }) : item.i}
                                    </ListItemIcon>
                                    <ListItemText primary={item.t} secondary={item.s} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Drawer>
            </Box>

            {/* MARQUEE */}
            <Box sx={{ bgcolor: '#2b4d7e', height: '50px', display: 'flex', alignItems: 'center', overflow: 'hidden', borderTop: '2px solid #f5a623', position: 'relative' }}>
                <Box sx={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marquee 45s linear infinite', '&:hover': { animationPlayState: 'paused' } }}>
                    {[1, 2].map((group) => (
                        <Stack key={group} direction="row" spacing={8} alignItems="center" sx={{ color: 'white', px: 2 }}>
                            {["NEW SOLAR PANEL REBATES: SAVE 20% ON INSTALLATION!", "CITY MARATHON 2026: REGISTRATION IS OPEN!", "HIGH-SPEED FIBER NOW IN BAKER STREET AREA.", "FREE PARKING FOR ELECTRIC VEHICLES IN CENTER ZONE.", "NEW COMMUNITY CENTER OPENING - JUNE 15.", "UPGRADE YOUR WASTE MANAGEMENT PLAN.", "RECYCLING WEEK: GET EXTRA POINTS ON YOUR CITY CARD!"].map((text, i) => (
                                <Typography key={i} variant="body2" sx={{ fontWeight: 800, letterSpacing: 1, display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <AdIcon sx={{ fontSize: 16, mr: 1, color: '#f5a623' }} /> {text}
                                </Typography>
                            ))}
                        </Stack>
                    ))}
                </Box>
            </Box>

            {/* FOOTER */}
            <Box sx={{ bgcolor: '#1a2a40', py: 3, color: 'white' }}>
                <Container maxWidth="xl">
                    <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
                        © 2026 Smart City Israel. All Rights Reserved.
                    </Typography>
                </Container>
            </Box>

            {/* Dialogs */}
            <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} PaperProps={{ sx: { borderRadius: 0, minWidth: { xs: 280, sm: 350 } } }}>
                <DialogTitle sx={{ color: '#2b4d7e', fontWeight: 800 }}>Edit Profile</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Name" value={tempProfile.name} onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })} variant="standard" />
                        <TextField fullWidth label="Address" value={tempProfile.address} onChange={(e) => setTempProfile({ ...tempProfile, address: e.target.value })} variant="standard" />
                        <TextField fullWidth label="Phone" value={tempProfile.phone} onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })} variant="standard" />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
                    <Button onClick={() => { setProfile(tempProfile); setOpenEditDialog(false); }} variant="contained" sx={{ bgcolor: '#2b4d7e', borderRadius: 0 }}>Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAvatarDialog} onClose={() => setOpenAvatarDialog(false)}>
                <DialogTitle sx={{ color: '#2b4d7e', fontWeight: 800 }}>Choose Avatar</DialogTitle>
                <DialogContent>
                    <Stack direction="row" spacing={2} sx={{ py: 2 }}>
                        {[<FaceIcon />, <WomanIcon />, <ManIcon />, <KidIcon />].map((icon, idx) => (
                            <IconButton key={idx} onClick={() => { setSelectedAvatar(icon); setOpenAvatarDialog(false); }}>
                                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { sx: { fontSize: 40 } }) : icon}
                            </IconButton>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(selectedMail)} onClose={() => setSelectedMail(null)} PaperProps={{ sx: { borderRadius: 0 } }}>
                <DialogTitle sx={{ color: '#2b4d7e', fontWeight: 800 }}>{selectedMail?.title}</DialogTitle>
                <DialogContent><Typography>{selectedMail?.message}</Typography></DialogContent>
                <DialogActions><Button onClick={() => setSelectedMail(null)}>Close</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserPage;
