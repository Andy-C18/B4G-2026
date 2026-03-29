import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/appointments – list for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as Request & { user: { id: string } }).user;

  // Check if user is a doctor or patient
  const { data: doctor } = await supabase.from('doctors').select('id').eq('id', user.id).single();
  const isDoctor = !!doctor;
  const col = isDoctor ? 'doctorId' : 'patientId';

  const { data, error } = await supabase
    .from('appointment_data')
    .select('*')
    .eq(col, user.id)
    .order('createdAt', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/appointments/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('appointment_data')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Appointment not found' });
  return res.json(data);
});

// PATCH /api/appointments/:id/done
router.patch('/:id/done', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as Request & { user: { id: string } }).user;

  const { data: appt, error: apptError } = await supabase
    .from('appointment_data')
    .select('doctorId')
    .eq('id', id)
    .single();

  if (apptError || !appt) return res.status(404).json({ error: 'Appointment not found' });
  if ((appt as any).doctorId !== user.id) return res.status(403).json({ error: 'Only the assigned doctor can mark this done' });

  const { data, error } = await supabase
    .from('appointment_data')
    .update({ status: 'done' })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get('/patient/:id/appointments', async (req, res) => {
  try {
    const patientId = req.params.id;

    const { data, error } = await supabase
      .from('appointment_data')
      .select(`
        *,
        doctors (*)
      `)
      .eq('patientId', patientId)
      .order('createdAt', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load appointments' });
  }
});

export default router;
