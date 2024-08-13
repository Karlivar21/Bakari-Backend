import mongoose from 'mongoose';

// Order schema
const commentSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    comment: { type: String, required: true },
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;