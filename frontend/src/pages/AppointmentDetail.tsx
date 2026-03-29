import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, User, Stethoscope, FileText, CheckCircle,
  Star, Upload, AlertCircle, Clock, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Appointment, MedicalRecord, DoctorRating } from '../types';

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [rating, setRating] = useState<DoctorRating | null>(null);
  const [loading, setLoading] = useState(true);

  // Post-appointment state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState('');
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    const { data } = await supabase
      .from('appointments')
      .select('*, patient:patient_id(*), doctor:doctor_id(*), symptom_report:symptom_report_id(*)')
      .eq('id', id)
      .single();
    if (data) setAppt(data as Appointment);

    const { data: rec } = await supabase
      .from('medical_records')
      .select('*')
      .eq('appointment_id', id)
      .maybeSingle();
    if (rec) setRecord(rec as MedicalRecord);

    const { data: rat } = await supabase
      .from('doctor_ratings')
      .select('*')
      .eq('appointment_id', id)
      .maybeSingle();
    if (rat) setRating(rat as DoctorRating);

    setLoading(false);
  }

  const handleMarkDone = async () => {
    if (!appt) return;
    setSaving(true);
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', appt.id);
    if (!error) {
      setAppt((prev) => prev ? { ...prev, status: 'done', completed_at: new Date().toISOString() } : prev);
      // Prompt patient to upload prescription
      if (profile?.role === 'patient') setShowPrescriptionModal(true);
    }
    setSaving(false);
  };

  const handleDoneClick = () => {
    if (profile?.role === 'doctor') {
      handleMarkDone();
    }
  };

  // Watch appt status changes to show modal for patient
  useEffect(() => {
    if (appt?.status === 'done' && profile?.role === 'patient' && !record) {
      // Show prescription upload if not already submitted
    }
  }, [appt?.status]);

  const handlePrescriptionSubmit = async () => {
    if (!appt || !profile) return;
    setSaving(true);
    setError('');
    try {
      let prescUrl = '';
      if (prescriptionFile) {
        const path = `prescriptions/${profile.id}/${Date.now()}-${prescriptionFile.name}`;
        const { data } = await supabase.storage.from('medical-docs').upload(path, prescriptionFile);
        if (data) {
          const { data: urlData } = supabase.storage.from('medical-docs').getPublicUrl(data.path);
          prescUrl = urlData.publicUrl;
        }
      }

      const parsedMeds = medications
        ? medications.split(/\n|,/).map((m) => ({ name: m.trim() })).filter((m) => m.name)
        : [];

      const { error: recError } = await supabase.from('medical_records').insert({
        patient_id: profile.id,
        appointment_id: appt.id,
        prescription_url: prescUrl || null,
        diagnosis: diagnosis || null,
        medications: parsedMeds.length ? parsedMeds : null,
        notes: prescriptionNotes || null,
        prescription_data: {
          raw_text: prescriptionNotes,
          parsed_medications: parsedMeds,
          diagnosis,
        },
      });
      if (recError) throw recError;

      setShowPrescriptionModal(false);
      setShowRatingModal(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (!appt || !profile) return;
    setSaving(true);
    setError('');
    try {
      const { error: ratError } = await supabase.from('doctor_ratings').insert({
        appointment_id: appt.id,
        patient_id: profile.id,
        doctor_id: appt.doctor_id,
        rating: ratingValue,
        comment: ratingComment || null,
      });
      if (ratError) throw ratError;
      setShowRatingModal(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rating failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card text-center py-12 text-gray-400">Loading…</div>;
  if (!appt) return <div className="card text-center py-12 text-gray-500">Appointment not found.</div>;

  interface ReportShape {
    symptoms_text?: string;
    suggested_doctor_type?: string;
    photo_urls?: string[];
    structured_report?: Record<string, unknown>;
  }

  const report = appt.symptom_report as ReportShape | undefined;
  const patientProfile = appt.patient as Record<string, string> | undefined;
  const doctorProfile = appt.doctor as Record<string, string> | undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">← Back</button>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${
          appt.status === 'done' ? 'bg-green-50 text-green-700' :
          appt.status === 'confirmed' ? 'bg-blue-50 text-blue-700' :
          appt.status === 'requested' ? 'bg-amber-50 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>{appt.status}</span>
      </div>

      {/* Participants */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Appointment Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Patient</p>
              <p className="font-medium text-gray-800">{patientProfile?.full_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-health-50 rounded-lg">
              <Stethoscope className="w-5 h-5 text-health-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Doctor</p>
              <p className="font-medium text-gray-800">
                {doctorProfile?.full_name ? `Dr. ${doctorProfile.full_name}` : 'Unassigned'}
              </p>
              {doctorProfile?.specialty && (
                <p className="text-xs text-gray-500">{doctorProfile.specialty}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Requested</p>
              <p className="font-medium text-gray-800">{new Date(appt.requested_at).toLocaleDateString()}</p>
            </div>
          </div>
          {appt.completed_at && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Completed</p>
                <p className="font-medium text-gray-800">{new Date(appt.completed_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-appointment Report */}
      {report && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Pre-Appointment Report
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Chief Complaint</p>
              <p className="text-gray-800 bg-gray-50 rounded-lg p-3">{report.symptoms_text as string}</p>
            </div>
            {report?.suggested_doctor_type && (
              <div className="bg-primary-50 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-1">Suggested Specialist</p>
                <p className="text-primary-800 font-semibold">{report.suggested_doctor_type}</p>
              </div>
            )}
            {Array.isArray(report?.photo_urls) && report.photo_urls!.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Attached Photos</p>
                <div className="flex gap-2">
                  {report.photo_urls!.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {report?.structured_report && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Structured Summary</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {Object.entries(report.structured_report).map(([k, v]) => (
                    v && k !== 'follow_up_summary' ? (
                      <div key={k}>
                        <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}: </span>
                        <span className="text-gray-800">
                          {Array.isArray(v) ? (v as string[]).join(', ') : String(v)}
                        </span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Doctor actions */}
      {profile?.role === 'doctor' && appt.status !== 'done' && appt.status !== 'cancelled' && (
        <div className="card border-2 border-green-200 bg-green-50">
          <h3 className="font-semibold text-green-800 mb-2">Doctor Actions</h3>
          <p className="text-sm text-green-700 mb-4">
            Click the button below once the appointment is complete. The patient will then be prompted to upload their prescription.
          </p>
          <button
            onClick={handleDoneClick}
            disabled={saving}
            className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Marking done…' : 'Mark Appointment as Done'}
          </button>
        </div>
      )}

      {/* Patient post-appointment actions */}
      {profile?.role === 'patient' && appt.status === 'done' && !record && (
        <div className="card border-2 border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upload Prescription
          </h3>
          <p className="text-sm text-amber-700 mb-4">Your appointment is done. Please upload your prescription to keep your records up to date.</p>
          <button
            onClick={() => setShowPrescriptionModal(true)}
            className="btn-primary bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Prescription
          </button>
        </div>
      )}

      {/* Medical Record */}
      {record && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Medical Record
          </h2>
          <div className="space-y-3 text-sm">
            {record.diagnosis && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnosis</p>
                <p className="text-gray-800">{record.diagnosis}</p>
              </div>
            )}
            {record.medications && Array.isArray(record.medications) && record.medications.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Medications</p>
                <ul className="list-disc list-inside space-y-1 text-gray-800">
                  {(record.medications as Array<{ name: string; dosage?: string; frequency?: string }>).map((med, i) => (
                    <li key={i}>{med.name}{med.dosage ? ` — ${med.dosage}` : ''}{med.frequency ? `, ${med.frequency}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {record.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-gray-800">{record.notes}</p>
              </div>
            )}
            {record.prescription_url && (
              <a href={record.prescription_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 hover:underline">
                <FileText className="w-4 h-4" /> View Prescription
              </a>
            )}
          </div>
        </div>
      )}

      {/* Rating */}
      {rating && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Doctor Rating
          </h2>
          <div className="flex items-center gap-2 mb-2">
            {[1,2,3,4,5].map((n) => (
              <Star key={n} className={`w-5 h-5 ${n <= rating.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
            ))}
            <span className="text-gray-700 font-medium ml-1">{rating.rating}/5</span>
          </div>
          {rating.comment && <p className="text-gray-600 text-sm italic">"{rating.comment}"</p>}
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload Prescription</h2>
              <button onClick={() => setShowPrescriptionModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Prescription File (image/PDF)</label>
                <input type="file" accept="image/*,.pdf" className="input" onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="label">Diagnosis</label>
                <input type="text" className="input" placeholder="e.g. Acute bronchitis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </div>
              <div>
                <label className="label">Medications (one per line or comma-separated)</label>
                <textarea className="input h-24 resize-none" placeholder="e.g. Amoxicillin 500mg, 3x daily" value={medications} onChange={(e) => setMedications(e.target.value)} />
              </div>
              <div>
                <label className="label">Doctor's Notes</label>
                <textarea className="input h-20 resize-none" placeholder="Any additional notes from the doctor…" value={prescriptionNotes} onChange={(e) => setPrescriptionNotes(e.target.value)} />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowPrescriptionModal(false)} className="btn-secondary flex-1">Skip</button>
                <button onClick={handlePrescriptionSubmit} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Save Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Rate Your Doctor</h2>
              <button onClick={() => setShowRatingModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              How was your experience with Dr. {(appt.doctor as unknown as Record<string,string>)?.full_name}?
            </p>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setRatingValue(n)}>
                  <Star className={`w-8 h-8 transition-colors ${n <= ratingValue ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="label">Comment (optional)</label>
              <textarea className="input h-24 resize-none" placeholder="Share your experience…" value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} />
            </div>
            {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowRatingModal(false)} className="btn-secondary flex-1">Skip</button>
              <button onClick={handleRatingSubmit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
