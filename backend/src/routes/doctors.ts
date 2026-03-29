import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/match', async (req, res) => {
  try {
    const speciality = String(req.query.speciality || '').trim();

    if (!speciality) {
      return res.status(400).json({ error: 'speciality is required' });
    }

    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .ilike('speciality', speciality);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const sorted = (data || []).sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });

    return res.json(sorted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to match doctors' });
  }
});

export default router;