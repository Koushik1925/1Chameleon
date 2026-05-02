const express = require('express');
const db = require('../db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper to hash refresh tokens
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// 1. Register Device (Agent calls this)
router.post('/register', async (req, res) => {
    try {
        const { device_id, nickname } = req.body;
        
        if (!device_id) {
            return res.status(400).json({ success: false, error: 'Missing device_id' });
        }

        // Generate Refresh Token
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const refreshTokenHash = hashToken(refreshToken);

        // Upsert Device
        await db.query(`
            INSERT INTO devices (device_id, nickname, refresh_token_hash, status, last_seen)
            VALUES ($1, $2, $3, 'online', NOW())
            ON CONFLICT (device_id) 
            DO UPDATE SET 
                refresh_token_hash = EXCLUDED.refresh_token_hash,
                nickname = COALESCE(EXCLUDED.nickname, devices.nickname),
                status = 'online',
                last_seen = NOW()
        `, [device_id, nickname || 'Windows Desktop', refreshTokenHash]);

        res.json({
            success: true,
            data: {
                refresh_token: refreshToken
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. Heartbeat (Agent calls this periodically)
router.post('/heartbeat', async (req, res) => {
    try {
        const { device_id, status } = req.body;
        if (!device_id) return res.status(400).json({ success: false });

        await db.query(`
            UPDATE devices 
            SET last_seen = NOW(), status = $1 
            WHERE device_id = $2
        `, [status || 'online', device_id]);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 3. Get Devices (Dashboard calls this)
router.get('/', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ success: false, error: 'Email required' });

        const devicesRes = await db.query(`
            SELECT id, device_id, nickname, status, last_seen 
            FROM devices
            WHERE email = $1
        `, [email]);

        // Optional: Update status to offline if last_seen > 2 mins ago
        const devices = devicesRes.rows.map(d => {
            const isOffline = (Date.now() - new Date(d.last_seen).getTime()) > 120000;
            return {
                ...d,
                status: isOffline ? 'offline' : d.status
            };
        });

        res.json({ success: true, data: devices });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// 4. Revoke Device
router.post('/revoke', async (req, res) => {
    try {
        const { device_id } = req.body;
        await db.query(`UPDATE devices SET refresh_token_hash = NULL, status = 'offline' WHERE device_id = $1`, [device_id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 5. Rename Device
router.post('/rename', async (req, res) => {
    try {
        const { device_id, nickname } = req.body;
        await db.query(`UPDATE devices SET nickname = $1 WHERE device_id = $2`, [nickname, device_id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
