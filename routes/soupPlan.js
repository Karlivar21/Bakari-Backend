// routes/soupPlan.js
import express from 'express';
import SoupPlan from '../models/SoupPlan.js';

const router = express.Router();

// Get the soup plan for the week
router.get('/', async (req, res) => {
  try {
    const soupPlan = await SoupPlan.find();
    const defaultPlan = {
      Mánudagur: '',
      Þriðjudagur: '',
      Miðvikudagur: '',
      Fimmtudagur: '',
      Föstudagur: '',
      week: {
        startDate: new Date(),
        endDate: new Date()
      }
    };

    const responsePlan = soupPlan.length ? soupPlan.reduce((acc, curr) => {
      acc[curr.day] = curr.soup;
      return acc;
    }, { ...defaultPlan, week: soupPlan[0].week }) : defaultPlan;

    res.json(responsePlan);
  } catch (err) {
    console.error('Error fetching soup plan:', err);
    res.status(500).json({ error: 'Error fetching soup plan', details: err.message });
  }
});

// Update the soup plan for the week
router.post('/', async (req, res) => {
  const newSoupPlan = req.body;
  try {
    await Promise.all(
      Object.keys(newSoupPlan).map(async day => {
        if (day !== 'week') {
          await SoupPlan.findOneAndUpdate(
            { day },
            { soup: newSoupPlan[day], week: newSoupPlan.week },
            { upsert: true, new: true }
          );
        }
      })
    );
    res.json({ message: 'Soup plan updated successfully' });
  } catch (err) {
    console.error('Error updating soup plan:', err);
    res.status(500).json({ error: 'Error updating soup plan', details: err.message });
  }
});

export default router;
