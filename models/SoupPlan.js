// models/SoupPlan.js
import mongoose from 'mongoose';

const soupPlanSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  soup: {
    type: String,
    required: true
  }
});

const SoupPlan = mongoose.model('SoupPlan', soupPlanSchema);

export default SoupPlan;
