import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, required: true },
    message: { type: String, required: true }
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
