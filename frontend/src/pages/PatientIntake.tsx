/*For now it only needs:

one textarea
maybe one submit button

That’s it.

The goal is:

patient types symptoms
clicks submit
request goes to backend
row is created in reports
*/

import { useState } from 'react';
import { createIntakeReport } from '../lib/api';

const TEST_PATIENT_ID = '9334a195-9b3a-4ed7-a918-1046d87b8b51';

export default function PatientIntake() {
  const [title, setTitle] = useState('Skin irritation');
  const [description, setDescription] = useState('');
  const [needAsap, setNeedAsap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await createIntakeReport({
        patientId: TEST_PATIENT_ID,
        title,
        description,
        needAsap,
      });

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 16 }}>
      <h1>Patient Intake</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Report title"
          style={{ width: '100%', marginBottom: 12, padding: 10 }}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you're feeling in as much detail as you want..."
          style={{ width: '100%', height: 180, marginBottom: 12, padding: 10 }}
        />

        <label style={{ display: 'block', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={needAsap}
            onChange={(e) => setNeedAsap(e.target.checked)}
          />{' '}
          Need appointment ASAP
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Analyze and Create Report'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>AI Structured Report</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result.formatted_report, null, 2)}
          </pre>

          <h3>Recommended Speciality</h3>
          <p>{result.recommended_speciality}</p>

          <h3>Follow-up Questions</h3>
          <ul>
            {(result.follow_up_questions || []).map((q: string, i: number) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}