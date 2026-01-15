const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'football_management_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// ===========================
// Middleware: Authentication
// ===========================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ===========================
// Authentication Routes
// ===========================

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }
        
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // In production, passwords should be hashed with bcrypt
        // For now, direct comparison (INSECURE - for demo only)
        // const validPassword = await bcrypt.compare(password, user.password);
        const validPassword = password === 'admin123'; // Demo mode
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
//---------------------------
// Forget password
//----------------------------
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

        await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: { user: process.env.SMTP_USER || 'your-email@example.com', pass: process.env.SMTP_PASS || 'your-email-password' }
        });

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${token}&email=${email}`;
        await transporter.sendMail({
            from: '"Football Management" <no-reply@fms.com>',
            to: email,
            subject: 'Password Reset Request',
            html: `<p>Click the link to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
        });

        res.json({ message: 'Password reset email sent' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ------------------------------
// Reset Password
// ------------------------------
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) return res.status(400).json({ message: 'All fields are required' });

        const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND reset_token = ?', [email, token]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid token or email' });

        const user = users[0];
        if (new Date(user.reset_token_expires) < new Date()) return res.status(400).json({ message: 'Token expired' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// ===========================
// Dashboard Routes
// ===========================

app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        // Get total players
        const [playerCount] = await pool.query('SELECT COUNT(*) as count FROM players');
        
        // Get total teams
        const [teamCount] = await pool.query('SELECT COUNT(*) as count FROM teams');
        
        // Get upcoming matches
        const [matchCount] = await pool.query(
            'SELECT COUNT(*) as count FROM matches WHERE status = "Scheduled"'
        );
        
        // Get total coaches
        const [coachCount] = await pool.query('SELECT COUNT(*) as count FROM coaches');
        
        // Get recent matches
        const [recentMatches] = await pool.query(`
            SELECT 
                m.id,
                m.match_date,
                ht.name as homeTeam,
                at.name as awayTeam,
                m.home_score as homeScore,
                m.away_score as awayScore,
                m.status
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE m.status = 'Completed'
            ORDER BY m.match_date DESC
            LIMIT 5
        `);
        
        // Get top players
        const [topPlayers] = await pool.query(`
            SELECT 
                p.id,
                p.name,
                t.name as team,
                ps.goals,
                ps.assists
            FROM players p
            JOIN teams t ON p.team_id = t.id
            JOIN player_statistics ps ON p.id = ps.player_id
            WHERE ps.season = '2024-25'
            ORDER BY ps.goals DESC, ps.assists DESC
            LIMIT 5
        `);
        
        res.json({
            stats: {
                totalPlayers: playerCount[0].count,
                totalTeams: teamCount[0].count,
                upcomingMatches: matchCount[0].count,
                totalCoaches: coachCount[0].count
            },
            recentMatches,
            topPlayers
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================
// Player Routes
// ===========================

// Get all players
app.get('/api/players', authenticateToken, async (req, res) => {
    try {
        const [players] = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.position,
                p.team_id as teamId,
                t.name as team,
                p.age,
                p.nationality,
                p.jersey_number as jerseyNumber,
                p.height,
                p.weight,
                p.status
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            ORDER BY p.name
        `);
        
        res.json(players);
    } catch (error) {
        console.error('Get players error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single player
app.get('/api/players/:id', authenticateToken, async (req, res) => {
    try {
        const [players] = await pool.query(`
            SELECT 
                p.*,
                t.name as team
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (players.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        res.json(players[0]);
    } catch (error) {
        console.error('Get player error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create player
app.post('/api/players', authenticateToken, async (req, res) => {
    try {
        const { name, position, teamId, age, nationality, jerseyNumber, height, weight, status } = req.body;
        
        if (!name || !position || !teamId) {
            return res.status(400).json({ message: 'Name, position, and team are required' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO players 
            (name, position, team_id, age, nationality, jersey_number, height, weight, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, position, teamId, age, nationality, jerseyNumber, height, weight, status || 'Active']);
        
        res.status(201).json({
            id: result.insertId,
            message: 'Player created successfully'
        });
    } catch (error) {
        console.error('Create player error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update player
app.put('/api/players/:id', authenticateToken, async (req, res) => {
    try {
        const { name, position, teamId, age, nationality, jerseyNumber, height, weight, status } = req.body;
        
        const [result] = await pool.query(`
            UPDATE players 
            SET name = ?, position = ?, team_id = ?, age = ?, nationality = ?, 
                jersey_number = ?, height = ?, weight = ?, status = ?
            WHERE id = ?
        `, [name, position, teamId, age, nationality, jerseyNumber, height, weight, status, req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        res.json({ message: 'Player updated successfully' });
    } catch (error) {
        console.error('Update player error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete player
app.delete('/api/players/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM players WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Delete player error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================
// Team Routes
// ===========================

// Get all teams
app.get('/api/teams', authenticateToken, async (req, res) => {
    try {
        const [teams] = await pool.query(`
            SELECT 
                t.id,
                t.name,
                t.city,
                t.country,
                t.founded_year as foundedYear,
                t.stadium,
                c.name as coachName
            FROM teams t
            LEFT JOIN coaches c ON t.coach_id = c.id
            ORDER BY t.name
        `);
        
        res.json(teams);
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get team with players
app.get('/api/teams/:id/players', authenticateToken, async (req, res) => {
    try {
        const [players] = await pool.query(`
            SELECT * FROM players 
            WHERE team_id = ?
            ORDER BY position, jersey_number
        `, [req.params.id]);
        
        res.json(players);
    } catch (error) {
        console.error('Get team players error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single team
app.get('/api/teams/:id', authenticateToken, async (req, res) => {
    try {
        const [teams] = await pool.query(`
            SELECT 
                t.id,
                t.name,
                t.city,
                t.country,
                t.founded_year as foundedYear,
                t.stadium,
                t.coach_id as coachId,
                c.name as coachName
            FROM teams t
            LEFT JOIN coaches c ON t.coach_id = c.id
            WHERE t.id = ?
        `, [req.params.id]);
        
        if (teams.length === 0) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        res.json(teams[0]);
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create team
app.post('/api/teams', authenticateToken, async (req, res) => {
    try {
        const { name, city, country, foundedYear, stadium, coachId } = req.body;
        
        if (!name || !city || !country) {
            return res.status(400).json({ message: 'Name, city, and country are required' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO teams 
            (name, city, country, founded_year, stadium, coach_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, city, country, foundedYear, stadium, coachId || null]);
        
        res.status(201).json({
            id: result.insertId,
            message: 'Team created successfully'
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update team
app.put('/api/teams/:id', authenticateToken, async (req, res) => {
    try {
        const { name, city, country, foundedYear, stadium, coachId } = req.body;
        
        const [result] = await pool.query(`
            UPDATE teams 
            SET name = ?, city = ?, country = ?, founded_year = ?, stadium = ?, coach_id = ?
            WHERE id = ?
        `, [name, city, country, foundedYear, stadium, coachId || null, req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        res.json({ message: 'Team updated successfully' });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete team
app.delete('/api/teams/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================
// Coach Routes
// ===========================

// Get all coaches
app.get('/api/coaches', authenticateToken, async (req, res) => {
    try {
        const [coaches] = await pool.query(`
            SELECT 
                c.id,
                c.name,
                c.nationality,
                c.date_of_birth AS dateOfBirth,
                c.experience_years AS experienceYears,
                c.specialization,
                c.license_type AS licenseLevel,   -- corrected column name
                c.status,
                t.name AS teamName,
                t.id AS teamId
            FROM coaches c
            LEFT JOIN teams t ON c.id = t.coach_id
            ORDER BY c.name
        `);
        
        res.json(coaches);
    } catch (error) {
        console.error('Get coaches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get single coach
app.get('/api/coaches/:id', authenticateToken, async (req, res) => {
    try {
        const [coaches] = await pool.query(`
            SELECT 
                c.*,
                t.name as teamName,
                t.id as teamId
            FROM coaches c
            LEFT JOIN teams t ON c.id = t.coach_id
            WHERE c.id = ?
        `, [req.params.id]);
        
        if (coaches.length === 0) {
            return res.status(404).json({ message: 'Coach not found' });
        }
        
        res.json(coaches[0]);
    } catch (error) {
        console.error('Get coach error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create coach
app.post('/api/coaches', authenticateToken, async (req, res) => {
    try {
        const { name, nationality, dateOfBirth, experienceYears, specialization, licenseLevel, status } = req.body;
        
        if (!name || !nationality) {
            return res.status(400).json({ message: 'Name and nationality are required' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO coaches 
            (name, nationality, date_of_birth, experience_years, specialization, license_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            name, 
            nationality, 
            dateOfBirth || null, 
            experienceYears || null, 
            specialization || null, 
            licenseLevel || null, 
            status || 'Active'
        ]);
        
        res.status(201).json({
            id: result.insertId,
            message: 'Coach created successfully'
        });
    } catch (error) {
        console.error('Create coach error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update coach
app.put('/api/coaches/:id', authenticateToken, async (req, res) => {
    try {
        const { name, nationality, dateOfBirth, experienceYears, specialization, licenseLevel, status } = req.body;
        
        const [result] = await pool.query(`
            UPDATE coaches 
            SET name = ?, 
                nationality = ?, 
                date_of_birth = ?, 
                experience_years = ?, 
                specialization = ?, 
                license_type = ?, 
                status = ?
            WHERE id = ?
        `, [
            name, 
            nationality, 
            dateOfBirth || null, 
            experienceYears || null, 
            specialization || null, 
            licenseLevel || null, 
            status || 'Active', 
            req.params.id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Coach not found' });
        }
        
        res.json({ message: 'Coach updated successfully' });
    } catch (error) {
        console.error('Update coach error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete coach
app.delete('/api/coaches/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM coaches WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Coach not found' });
        }
        
        res.json({ message: 'Coach deleted successfully' });
    } catch (error) {
        console.error('Delete coach error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================
// Match Routes
// ===========================

// Get all matches
app.get('/api/matches', authenticateToken, async (req, res) => {
    try {
        const [matches] = await pool.query(`
            SELECT 
                m.id,
                m.match_date as matchDate,
                m.match_time as matchTime,
                ht.name as homeTeam,
                at.name as awayTeam,
                m.home_score as homeScore,
                m.away_score as awayScore,
                m.venue,
                m.competition,
                m.status
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            ORDER BY m.match_date DESC, m.match_time DESC
        `);
        
        res.json(matches);
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single match
app.get('/api/matches/:id', authenticateToken, async (req, res) => {
    try {
        const [matches] = await pool.query(`
            SELECT 
                m.*,
                ht.name as homeTeam,
                at.name as awayTeam
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE m.id = ?
        `, [req.params.id]);
        
        if (matches.length === 0) {
            return res.status(404).json({ message: 'Match not found' });
        }
        
        res.json(matches[0]);
    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create match
app.post('/api/matches', authenticateToken, async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, matchDate, matchTime, venue, competition, status } = req.body;
        
        if (!homeTeamId || !awayTeamId || !matchDate || !matchTime) {
            return res.status(400).json({ message: 'Home team, away team, date, and time are required' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO matches 
            (home_team_id, away_team_id, match_date, match_time, venue, competition, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [homeTeamId, awayTeamId, matchDate, matchTime, venue, competition, status || 'Scheduled']);
        
        res.status(201).json({
            id: result.insertId,
            message: 'Match created successfully'
        });
    } catch (error) {
        console.error('Create match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update match
app.put('/api/matches/:id', authenticateToken, async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, matchDate, matchTime, venue, competition, homeScore, awayScore, status } = req.body;
        
        const [result] = await pool.query(`
            UPDATE matches 
            SET home_team_id = ?, away_team_id = ?, match_date = ?, match_time = ?, 
                venue = ?, competition = ?, home_score = ?, away_score = ?, status = ?
            WHERE id = ?
        `, [homeTeamId, awayTeamId, matchDate, matchTime, venue, competition, homeScore, awayScore, status, req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Match not found' });
        }
        
        res.json({ message: 'Match updated successfully' });
    } catch (error) {
        console.error('Update match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete match
app.delete('/api/matches/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM matches WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Match not found' });
        }
        
        res.json({ message: 'Match deleted successfully' });
    } catch (error) {
        console.error('Delete match error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================
// Statistics Routes
// ===========================

// Get player statistics
app.get('/api/statistics/players', authenticateToken, async (req, res) => {
    try {
        const season = req.query.season || '2024-25';
        
        const [stats] = await pool.query(`
            SELECT 
                p.id,
                p.name as playerName,
                p.position,
                t.name as teamName,
                ps.matches_played as matchesPlayed,
                ps.goals,
                ps.assists,
                ps.yellow_cards as yellowCards,
                ps.red_cards as redCards,
                ps.minutes_played as minutesPlayed
            FROM player_statistics ps
            JOIN players p ON ps.player_id = p.id
            JOIN teams t ON p.team_id = t.id
            WHERE ps.season = ?
            ORDER BY ps.goals DESC, ps.assists DESC
        `, [season]);
        
        res.json(stats);
    } catch (error) {
        console.error('Get player statistics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================
// Health Check
// ===========================

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// ===========================
// Error Handling
// ===========================

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal server error' });
});

// ===========================
// Start Server
// ===========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Football Management System API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await pool.end();
    process.exit(0);
});