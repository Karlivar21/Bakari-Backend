import express from 'express';
import Comment from '../models/Comments.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const comments = await Comment.find();
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching comments', error });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id, name, phone, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newComment = new Comment({
            id,
            name,
            phone,
            email,
            message
        });

        await newComment.save();
        res.status(201).json({ message: 'Comment created', comment: newComment });
    } catch (error) {
        res.status(400).json({ message: 'Error creating comment', error });
    }
});

export default router;
