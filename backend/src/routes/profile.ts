import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/profile/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  // Try to fetch as patient first
  let { data, error } = await supabase.from('patients').select('*').eq('id', id).single();

  // If not found as patient, try as doctor
  if (error) {
    const { data: doctorData, error: doctorError } = await supabase.from('doctors').select('*').eq('id', id).single();
    if (doctorError) return res.status(404).json({ error: 'Profile not found' });
    return res.json(doctorData);
  }

  return res.json(data);
});

// PATCH /api/profile
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: string } }).user;
  const allowed = ['fullName', 'phone', 'location', 'gender', 'age', 'speciality', 'practiceName', 'timeAvailable', 'medicalHistory', 'password'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Try updating as patient first
  let { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  // If patient not found, try doctor
  if (error) {
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (doctorError) return res.status(500).json({ error: doctorError.message });
    return res.json(doctorData);
  }

  return res.json(data);
});

// GET /api/profile/:id/records
router.get('/:id/records', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('appointment_data')
    .select('*')
    .eq('patientId', id)
    .order('createdAt', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
