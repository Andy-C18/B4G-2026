import type { FollowUpQuestion, StructuredReport } from '../types';

/** Symptom keywords → doctor type mapping */
const DOCTOR_TYPE_MAP: Array<{ keywords: string[]; doctorType: string }> = [
  {
    keywords: ['chest pain', 'heart', 'palpitation', 'shortness of breath', 'hypertension', 'blood pressure'],
    doctorType: 'Cardiologist',
  },
  {
    keywords: ['rash', 'skin', 'acne', 'eczema', 'psoriasis', 'itching', 'hives', 'mole'],
    doctorType: 'Dermatologist',
  },
  {
    keywords: ['headache', 'migraine', 'seizure', 'numbness', 'tingling', 'dizziness', 'memory', 'stroke'],
    doctorType: 'Neurologist',
  },
  {
    keywords: ['bone', 'joint', 'knee', 'back pain', 'fracture', 'arthritis', 'muscle', 'sprain'],
    doctorType: 'Orthopedic Specialist',
  },
  {
    keywords: ['stomach', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating', 'acid reflux', 'abdominal'],
    doctorType: 'Gastroenterologist',
  },
  {
    keywords: ['eye', 'vision', 'blurry', 'cataracts', 'glaucoma'],
    doctorType: 'Ophthalmologist',
  },
  {
    keywords: ['ear', 'hearing', 'throat', 'nose', 'sinus', 'tonsil', 'laryngitis'],
    doctorType: 'ENT Specialist (Ear, Nose & Throat)',
  },
  {
    keywords: ['diabetes', 'thyroid', 'hormones', 'weight gain', 'fatigue', 'insulin'],
    doctorType: 'Endocrinologist',
  },
  {
    keywords: ['cough', 'asthma', 'lung', 'breathing', 'bronchitis', 'pneumonia', 'tuberculosis'],
    doctorType: 'Pulmonologist',
  },
  {
    keywords: ['urinary', 'kidney', 'bladder', 'urine', 'prostate'],
    doctorType: 'Urologist',
  },
  {
    keywords: ['anxiety', 'depression', 'mental health', 'stress', 'insomnia', 'bipolar', 'panic'],
    doctorType: 'Psychiatrist',
  },
  {
    keywords: ['pregnancy', 'menstrual', 'gynecological', 'ovarian', 'uterus', 'cervical'],
    doctorType: 'Gynecologist / OB-GYN',
  },
];

export function suggestDoctorType(symptomsText: string): string {
  const lower = symptomsText.toLowerCase();
  for (const { keywords, doctorType } of DOCTOR_TYPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return doctorType;
    }
  }
  return 'General Practitioner';
}

/** Generate rule-based follow-up questions from symptom text */
export function generateFollowUpQuestions(symptomsText: string): FollowUpQuestion[] {
  const lower = symptomsText.toLowerCase();
  const questions: FollowUpQuestion[] = [
    {
      id: 'duration',
      question: 'How long have you been experiencing these symptoms?',
      type: 'select',
      options: ['Less than 24 hours', '1–3 days', '4–7 days', '1–2 weeks', 'More than 2 weeks', 'More than a month'],
    },
    {
      id: 'severity',
      question: 'How would you rate the severity of your symptoms? (1 = mild, 10 = severe)',
      type: 'select',
      options: ['1–3 (Mild)', '4–6 (Moderate)', '7–9 (Severe)', '10 (Unbearable)'],
    },
  ];

  if (lower.includes('pain')) {
    questions.push({
      id: 'pain_type',
      question: 'How would you describe the pain?',
      type: 'select',
      options: ['Sharp / stabbing', 'Dull / aching', 'Burning', 'Throbbing', 'Pressure-like', 'Cramping'],
    });
  }

  if (
    lower.includes('chest') ||
    lower.includes('heart') ||
    lower.includes('breathing') ||
    lower.includes('shortness')
  ) {
    questions.push({
      id: 'exertion',
      question: 'Does the symptom worsen with physical activity?',
      type: 'boolean',
    });
  }

  if (lower.includes('fever') || lower.includes('temperature')) {
    questions.push({
      id: 'fever_temp',
      question: 'What was your highest recorded temperature?',
      type: 'select',
      options: ['Below 38°C / 100.4°F', '38–39°C / 100.4–102.2°F', 'Above 39°C / 102.2°F', "I haven't measured"],
    });
  }

  questions.push(
    {
      id: 'prior_history',
      question: 'Have you experienced similar symptoms before?',
      type: 'boolean',
    },
    {
      id: 'current_medications',
      question: 'Are you currently taking any medications? If yes, please list them.',
      type: 'text',
    },
    {
      id: 'allergies',
      question: 'Do you have any known allergies (medications, food, etc.)?',
      type: 'text',
    },
    {
      id: 'other_symptoms',
      question: 'Are there any other associated symptoms you have not mentioned?',
      type: 'text',
    }
  );

  return questions;
}

/** Build a structured pre-appointment report */
export function buildStructuredReport(
  symptomsText: string,
  followUpAnswers: Record<string, string>
): StructuredReport {
  const doctorType = suggestDoctorType(symptomsText);
  const associatedRaw = followUpAnswers['other_symptoms'] || '';
  const associated = associatedRaw
    ? associatedRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    chief_complaint: symptomsText,
    symptom_duration: followUpAnswers['duration'],
    symptom_severity: followUpAnswers['severity'],
    associated_symptoms: associated,
    medical_history_notes: followUpAnswers['prior_history'] === 'Yes' ? 'Patient has experienced similar symptoms before.' : undefined,
    current_medications: followUpAnswers['current_medications'],
    follow_up_summary: followUpAnswers,
    suggested_doctor_type: doctorType,
  };
}
