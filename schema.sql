
CREATE DATABASE IF NOT EXISTS football_management_system;
USE football_management_system;
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'coach', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    founded_year INT,
    stadium VARCHAR(100),
    city VARCHAR(100),
    country VARCHAR(100),
    logo_url VARCHAR(255),
    coach_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_coach (coach_id)
);

-- ===========================
-- Coaches Table
-- ===========================
CREATE TABLE coaches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100),
    date_of_birth DATE,
    experience_years INT,
    specialization VARCHAR(100),
    license_type VARCHAR(50),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    status ENUM('Active', 'Inactive', 'On Leave') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
);

-- ===========================
-- Players Table
-- ===========================
CREATE TABLE players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    position ENUM('Goalkeeper', 'Defender', 'Midfielder', 'Forward') NOT NULL,
    team_id INT,
    age INT,
    date_of_birth DATE,
    nationality VARCHAR(100),
    jersey_number INT,
    height INT COMMENT 'Height in cm',
    weight INT COMMENT 'Weight in kg',
    status ENUM('Active', 'Injured', 'Suspended', 'Inactive') DEFAULT 'Active',
    contract_start DATE,
    contract_end DATE,
    market_value DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_team (team_id),
    INDEX idx_position (position),
    INDEX idx_status (status)
);

-- ===========================
-- Matches Table
-- ===========================
CREATE TABLE matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    home_team_id INT NOT NULL,
    away_team_id INT NOT NULL,
    match_date DATE NOT NULL,
    match_time TIME NOT NULL,
    venue VARCHAR(100),
    competition VARCHAR(100),
    season VARCHAR(20),
    home_score INT DEFAULT 0,
    away_score INT DEFAULT 0,
    status ENUM('Scheduled', 'Live', 'Completed', 'Postponed', 'Cancelled') DEFAULT 'Scheduled',
    referee VARCHAR(100),
    attendance INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_match_date (match_date),
    INDEX idx_status (status),
    INDEX idx_home_team (home_team_id),
    INDEX idx_away_team (away_team_id)
);

-- ===========================
-- Player Statistics Table
-- ===========================
CREATE TABLE player_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    season VARCHAR(20) NOT NULL,
    matches_played INT DEFAULT 0,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    minutes_played INT DEFAULT 0,
    shots_on_target INT DEFAULT 0,
    pass_accuracy DECIMAL(5, 2) COMMENT 'Percentage',
    tackles INT DEFAULT 0,
    interceptions INT DEFAULT 0,
    clean_sheets INT DEFAULT 0 COMMENT 'For goalkeepers',
    saves INT DEFAULT 0 COMMENT 'For goalkeepers',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_season (player_id, season),
    INDEX idx_player (player_id),
    INDEX idx_season (season),
    INDEX idx_goals (goals),
    INDEX idx_assists (assists)
);

-- ===========================
-- Match Events Table (goals, cards, substitutions)
-- ===========================
CREATE TABLE match_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    team_id INT NOT NULL,
    event_type ENUM('Goal', 'Yellow Card', 'Red Card', 'Substitution In', 'Substitution Out') NOT NULL,
    minute INT NOT NULL,
    additional_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_match (match_id),
    INDEX idx_player (player_id),
    INDEX idx_event_type (event_type)
);

-- ===========================
-- Team Statistics Table
-- ===========================
CREATE TABLE team_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    season VARCHAR(20) NOT NULL,
    matches_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    draws INT DEFAULT 0,
    losses INT DEFAULT 0,
    goals_for INT DEFAULT 0,
    goals_against INT DEFAULT 0,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_season (team_id, season),
    INDEX idx_team (team_id),
    INDEX idx_season (season),
    INDEX idx_points (points)
);

-- ===========================
-- Training Sessions Table
-- ===========================
CREATE TABLE training_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    coach_id INT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    focus VARCHAR(100),
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE SET NULL,
    INDEX idx_team (team_id),
    INDEX idx_date (session_date)
);

-- ===========================
-- Add Foreign Key to Teams table for coach
-- ===========================
ALTER TABLE teams
ADD CONSTRAINT fk_team_coach 
FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE SET NULL;

-- ===========================
-- Insert Sample Data
-- ===========================

-- Insert Admin User (password: admin123 - hashed with bcrypt)
-- Note: In production, use proper password hashing
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@fms.com', '$2a$10$XQmj8h8gN9LkMUJJ2QqVFeD8fJVxC.zKJ8yVR8h5K.X5K9kVqKJ7G', 'admin'),
('Manager User', 'manager@fms.com', '$2a$10$XQmj8h8gN9LkMUJJ2QqVFeD8fJVxC.zKJ8yVR8h5K.X5K9kVqKJ7G', 'manager');

-- Insert Sample Teams
INSERT INTO teams (name, founded_year, stadium, city, country) VALUES
('Al Nassr', 1955, 'Mrsool Park', 'Riyadh', 'Saudi Arabia'),
('Inter Miami', 2018, 'DRV PNK Stadium', 'Fort Lauderdale', 'USA'),
('Manchester City', 1880, 'Etihad Stadium', 'Manchester', 'England'),
('Liverpool', 1892, 'Anfield', 'Liverpool', 'England'),
('Real Madrid', 1902, 'Santiago Bernabéu', 'Madrid', 'Spain'),
('Barcelona', 1899, 'Camp Nou', 'Barcelona', 'Spain'),
('Bayern Munich', 1900, 'Allianz Arena', 'Munich', 'Germany'),
('PSG', 1970, 'Parc des Princes', 'Paris', 'France');

-- Insert Sample Coaches
INSERT INTO coaches (name, nationality, date_of_birth, experience_years, specialization, license_type, status) VALUES
('Pep Guardiola', 'Spain', '1971-01-18', 15, 'Tactical', 'UEFA Pro', 'Active'),
('Jürgen Klopp', 'Germany', '1967-06-16', 20, 'Pressing', 'UEFA Pro', 'Active'),
('Carlo Ancelotti', 'Italy', '1959-06-10', 28, 'Man Management', 'UEFA Pro', 'Active'),
('Xavi Hernández', 'Spain', '1980-01-25', 3, 'Possession', 'UEFA Pro', 'Active');

-- Insert Sample Players
INSERT INTO players (name, position, team_id, age, nationality, jersey_number, height, weight, status) VALUES
('Cristiano Ronaldo', 'Forward', 1, 38, 'Portugal', 7, 187, 83, 'Active'),
('Lionel Messi', 'Forward', 2, 36, 'Argentina', 10, 170, 72, 'Active'),
('Erling Haaland', 'Forward', 3, 23, 'Norway', 9, 194, 88, 'Active'),
('Kevin De Bruyne', 'Midfielder', 3, 32, 'Belgium', 17, 181, 76, 'Injured'),
('Virgil van Dijk', 'Defender', 4, 32, 'Netherlands', 4, 193, 92, 'Active'),
('Alisson Becker', 'Goalkeeper', 4, 31, 'Brazil', 1, 191, 91, 'Active'),
('Kylian Mbappé', 'Forward', 5, 25, 'France', 9, 178, 73, 'Active'),
('Vinicius Jr', 'Forward', 5, 23, 'Brazil', 20, 176, 73, 'Suspended'),
('Robert Lewandowski', 'Forward', 6, 35, 'Poland', 9, 185, 81, 'Active'),
('Marc-André ter Stegen', 'Goalkeeper', 6, 31, 'Germany', 1, 187, 85, 'Active');

-- Insert Sample Matches
INSERT INTO matches (home_team_id, away_team_id, match_date, match_time, venue, competition, season, home_score, away_score, status) VALUES
(6, 5, '2024-12-07', '20:00:00', 'Camp Nou', 'La Liga', '2024-25', 2, 1, 'Completed'),
(3, 4, '2024-12-06', '17:30:00', 'Etihad Stadium', 'Premier League', '2024-25', 3, 3, 'Completed'),
(7, 8, '2024-12-05', '18:30:00', 'Allianz Arena', 'Bundesliga', '2024-25', 4, 2, 'Completed'),
(4, 3, '2024-12-15', '20:00:00', 'Anfield', 'Premier League', '2024-25', 0, 0, 'Scheduled'),
(5, 6, '2024-12-18', '21:00:00', 'Santiago Bernabéu', 'La Liga', '2024-25', 0, 0, 'Scheduled');

-- Insert Sample Player Statistics
INSERT INTO player_statistics (player_id, season, matches_played, goals, assists, yellow_cards, minutes_played) VALUES
(1, '2024-25', 15, 28, 12, 2, 1350),
(2, '2024-25', 14, 26, 15, 1, 1260),
(3, '2024-25', 16, 32, 8, 3, 1440),
(4, '2024-25', 12, 8, 14, 4, 1080),
(5, '2024-25', 15, 2, 1, 5, 1350),
(6, '2024-25', 15, 0, 0, 0, 1350),
(7, '2024-25', 14, 29, 10, 2, 1260),
(8, '2024-25', 13, 12, 8, 6, 1170),
(9, '2024-25', 15, 24, 6, 3, 1350),
(10, '2024-25', 15, 0, 0, 1, 1350);

-- ===========================
-- Useful Views
-- ===========================

-- View: Player Details with Team Info
CREATE VIEW vw_player_details AS
SELECT 
    p.id,
    p.name AS player_name,
    p.position,
    p.age,
    p.nationality,
    p.jersey_number,
    p.status,
    t.name AS team_name,
    t.city AS team_city,
    ps.goals,
    ps.assists,
    ps.matches_played
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN player_statistics ps ON p.id = ps.player_id AND ps.season = '2024-25';

-- View: Upcoming Matches
CREATE VIEW vw_upcoming_matches AS
SELECT 
    m.id,
    m.match_date,
    m.match_time,
    ht.name AS home_team,
    at.name AS away_team,
    m.venue,
    m.competition,
    m.status
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
WHERE m.status = 'Scheduled'
ORDER BY m.match_date, m.match_time;

-- View: Team Standings
CREATE VIEW vw_team_standings AS
SELECT 
    t.name AS team_name,
    ts.season,
    ts.matches_played,
    ts.wins,
    ts.draws,
    ts.losses,
    ts.goals_for,
    ts.goals_against,
    (ts.goals_for - ts.goals_against) AS goal_difference,
    ts.points
FROM team_statistics ts
JOIN teams t ON ts.team_id = t.id
WHERE ts.season = '2024-25'
ORDER BY ts.points DESC, goal_difference DESC;

-- View: Top Scorers
CREATE VIEW vw_top_scorers AS
SELECT 
    p.name AS player_name,
    p.position,
    t.name AS team_name,
    ps.goals,
    ps.assists,
    ps.matches_played,
    ROUND(ps.goals / ps.matches_played, 2) AS goals_per_game
FROM player_statistics ps
JOIN players p ON ps.player_id = p.id
JOIN teams t ON p.team_id = t.id
WHERE ps.season = '2024-25' AND ps.matches_played > 0
ORDER BY ps.goals DESC, ps.assists DESC
LIMIT 20;

-- ===========================
-- Stored Procedures
-- ===========================

DELIMITER //

-- Procedure: Add Match Result
CREATE PROCEDURE sp_add_match_result(
    IN p_match_id INT,
    IN p_home_score INT,
    IN p_away_score INT
)
BEGIN
    DECLARE v_home_team_id INT;
    DECLARE v_away_team_id INT;
    DECLARE v_season VARCHAR(20);
    
    -- Get match details
    SELECT home_team_id, away_team_id, season 
    INTO v_home_team_id, v_away_team_id, v_season
    FROM matches 
    WHERE id = p_match_id;
    
    -- Update match score
    UPDATE matches 
    SET home_score = p_home_score, 
        away_score = p_away_score,
        status = 'Completed'
    WHERE id = p_match_id;
    
    -- Update home team statistics
    INSERT INTO team_statistics (team_id, season, matches_played, wins, draws, losses, goals_for, goals_against, points)
    VALUES (v_home_team_id, v_season, 1, 
            IF(p_home_score > p_away_score, 1, 0),
            IF(p_home_score = p_away_score, 1, 0),
            IF(p_home_score < p_away_score, 1, 0),
            p_home_score, p_away_score,
            IF(p_home_score > p_away_score, 3, IF(p_home_score = p_away_score, 1, 0)))
    ON DUPLICATE KEY UPDATE
        matches_played = matches_played + 1,
        wins = wins + IF(p_home_score > p_away_score, 1, 0),
        draws = draws + IF(p_home_score = p_away_score, 1, 0),
        losses = losses + IF(p_home_score < p_away_score, 1, 0),
        goals_for = goals_for + p_home_score,
        goals_against = goals_against + p_away_score,
        points = points + IF(p_home_score > p_away_score, 3, IF(p_home_score = p_away_score, 1, 0));
    
    -- Update away team statistics
    INSERT INTO team_statistics (team_id, season, matches_played, wins, draws, losses, goals_for, goals_against, points)
    VALUES (v_away_team_id, v_season, 1,
            IF(p_away_score > p_home_score, 1, 0),
            IF(p_away_score = p_home_score, 1, 0),
            IF(p_away_score < p_home_score, 1, 0),
            p_away_score, p_home_score,
            IF(p_away_score > p_home_score, 3, IF(p_away_score = p_home_score, 1, 0)))
    ON DUPLICATE KEY UPDATE
        matches_played = matches_played + 1,
        wins = wins + IF(p_away_score > p_home_score, 1, 0),
        draws = draws + IF(p_away_score = p_home_score, 1, 0),
        losses = losses + IF(p_away_score < p_home_score, 1, 0),
        goals_for = goals_for + p_away_score,
        goals_against = goals_against + p_home_score,
        points = points + IF(p_away_score > p_home_score, 3, IF(p_away_score = p_home_score, 1, 0));
END //

DELIMITER ;
