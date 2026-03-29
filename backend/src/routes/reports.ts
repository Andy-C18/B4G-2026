import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { analyzePatientDescription } from '../services/ai';

const router = Router();

router.post('/test-ai', async (req, res) => {
  try {
    const { description } = req.body;
    const result = await analyzePatientDescription(description);
    return res.json(result);
  } catch (error: any) {
    console.error('AI test error:', error);
    return res.status(500).json({ error: error.message || 'AI failed' });
  }
});

router.post('/intake', async (req, res) => {
  try {
    const { patientId, title, description, needAsap } = req.body;

    if (!patientId || !description) {
      return res.status(400).json({
        error: 'patientId and description are required',
      });
    }

    const aiResult = await analyzePatientDescription(description);

    const { data, error } = await supabase
      .from('appointment_data')
      .insert([
        {
          patientId,
          title: title || 'New intake report',
          reportType: 'intake',
          status: 'draft',
          needAsap: !!needAsap,
          formatted_report: aiResult,
          follow_up_questions: aiResult.follow_up_questions,
          recommended_speciality: aiResult.recommended_speciality,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (error: any) {
    console.error('Intake route error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create intake report',
    });
  }
});

export default router;