import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const soupPlanFilePath = path.join(__dirname, '..', 'data', 'soupPlan.json');

router.get('/getSoupPlan', (req, res) => {
    fs.readFile(soupPlanFilePath, (err, data) => {
        if (err) {
            console.error('Error reading soup plan file:', err);
            return res.status(500).json({ error: 'Error reading soup plan file' });
        }
        res.json(JSON.parse(data));
    });
});

router.post('/updateSoupPlan', (req, res) => {
    const newSoupPlan = req.body;
    fs.writeFile(soupPlanFilePath, JSON.stringify(newSoupPlan, null, 2), (err) => {
        if (err) {
            console.error('Error saving soup plan:', err);
            return res.status(500).json({ error: 'Error saving soup plan' });
        }
        res.json({ message: 'Soup plan updated successfully' });
    });
});

export default router;
