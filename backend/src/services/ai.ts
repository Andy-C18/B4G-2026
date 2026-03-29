import { openai } from '../lib/openai';

export type IntakeReport = {
  chief_complaint: string;
  summary: string;
  symptoms: string[];
  duration: string;
  severity: string;
  medications: string[];
  relevant_history: string[];
  possible_conditions: string[];
  recommended_speciality: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  follow_up_questions: string[];
};

export async function analyzePatientDescription(
  description: string
): Promise<IntakeReport> {
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'You are helping structure patient intake information. Do not diagnose with certainty. Return only valid JSON matching the requested schema.',
      },
      {
        role: 'user',
        content: `Patient description: ${description}`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'patient_intake_report',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            chief_complaint: { type: 'string' },
            summary: { type: 'string' },
            symptoms: {
              type: 'array',
              items: { type: 'string' },
            },
            duration: { type: 'string' },
            severity: { type: 'string' },
            medications: {
              type: 'array',
              items: { type: 'string' },
            },
            relevant_history: {
              type: 'array',
              items: { type: 'string' },
            },
            possible_conditions: {
              type: 'array',
              items: { type: 'string' },
            },
            recommended_speciality: { type: 'string' },
            urgency: {
              type: 'string',
              enum: ['routine', 'urgent', 'emergency'],
            },
            follow_up_questions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: [
            'chief_complaint',
            'summary',
            'symptoms',
            'duration',
            'severity',
            'medications',
            'relevant_history',
            'possible_conditions',
            'recommended_speciality',
            'urgency',
            'follow_up_questions',
          ],
        },
      },
    },
  });

  const jsonText = response.output_text;
  return JSON.parse(jsonText) as IntakeReport;
}

/*

export type IntakeReport = {
  chief_complaint: string;
  summary: string;
  symptoms: string[];
  duration: string;
  severity: string;
  medications: string[];
  relevant_history: string[];
  possible_conditions: string[];
  recommended_speciality: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  follow_up_questions: string[];
};

export async function analyzePatientDescription(
  description: string
): Promise<IntakeReport> {
  console.log('Mock AI input:', description);

  return {
    chief_complaint: 'Itchy rash on both arms',
    summary:
      'Patient reports a 2-week history of red, itchy rash on both arms, worse after showering, with recent detergent change.',
    symptoms: ['itching', 'redness', 'rash'],
    duration: '2 weeks',
    severity: 'moderate',
    medications: [],
    relevant_history: ['recent detergent change'],
    possible_conditions: ['contact dermatitis', 'eczema', 'allergic skin reaction'],
    recommended_speciality: 'Dermatology',
    urgency: 'routine',
    follow_up_questions: [
      'Has the rash spread to any other parts of your body?',
      'Have you used any new soaps, lotions, or detergents recently?',
      'Is the rash painful, warm, or swollen?',
      'Have you had fever or other symptoms with the rash?'
    ]
  };
}

*/