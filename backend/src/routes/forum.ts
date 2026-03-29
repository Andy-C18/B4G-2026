import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/forum
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*, author:author_id(fullName)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/forum/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data: post, error } = await supabase
    .from('forum_posts')
    .select('*, author:author_id(fullName)')
    .eq('id', id)
    .single();
  if (error) return res.status(404).json({ error: 'Post not found' });

  const { data: comments } = await supabase
    .from('forum_comments')
    .select('*, author:author_id(fullName)')
    .eq('post_id', id)
    .order('created_at', { ascending: true });

  return res.json({ post, comments: comments || [] });
});

// POST /api/forum
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: string } }).user;
  const { title, content, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({ author_id: user.id, title, content, tags: tags || [] })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// POST /api/forum/:id/comments
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: string } }).user;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  const { data, error } = await supabase
    .from('forum_comments')
    .insert({ post_id: req.params.id, author_id: user.id, content })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

export default router;
