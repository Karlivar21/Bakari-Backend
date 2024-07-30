// backend/routes/soupPlan.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const soupPlanFilePath = path.join(__dirname, '..', 'data', 'soupPlan.json');

router.get('/getSoupPlan', (req, res) => {
    fs.readFile(soupPlanFilePath, (err, data) => {
        if (err) return res.status(500).json({ error: 'Error reading soup plan file' });
        res.json(JSON.parse(data));
    });
});

router.post('/updateSoupPlan', (req, res) => {
    const newSoupPlan = req.body;
    fs.writeFile(soupPlanFilePath, JSON.stringify(newSoupPlan, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Error saving soup plan' });
        res.json({ message: 'Soup plan updated successfully' });
    });
});

module.exports = router;
