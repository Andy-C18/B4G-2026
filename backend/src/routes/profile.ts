import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/profile/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ error: 'Profile not found' });
  return res.json(data);
});

// PATCH /api/profile
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: string } }).user;
  const allowed = ['full_name', 'specialty', 'bio', 'phone', 'date_of_birth', 'gender', 'blood_type', 'allergies'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/profile/:id/records
router.get('/:id/records', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
