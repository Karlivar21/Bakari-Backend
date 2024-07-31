// models/SoupPlan.js
import mongoose from 'mongoose';

const soupPlanSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Mánudagur', 'Þriðjudagur', 'Miðvikudagur', 'Fimmtudagur', 'Föstudagur']
  },
  soup: {
    type: String,
    required: true
  },
  week: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  }
});

const SoupPlan = mongoose.model('SoupPlan', soupPlanSchema);

export default SoupPlan;
