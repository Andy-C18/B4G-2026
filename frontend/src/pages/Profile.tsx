import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  User, Calendar, Droplet, AlertTriangle, FileText,
  Star, Edit3, Save, X, Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Profile, MedicalRecord, Appointment, DoctorRating } from '../types';

export default function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { profile: myProfile, refreshProfile } = useAuth();
  const isOwnProfile = !id || id === myProfile?.id;
  const targetId = id || myProfile?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ratings, setRatings] = useState<DoctorRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (targetId) load(targetId);
  }, [targetId]);

  async function load(uid: string) {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (p) {
      setProfile(p as Profile);
      setEditForm(p as Profile);
    }

    const { data: rec } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', uid)
      .order('created_at', { ascending: false });
    setRecords((rec as MedicalRecord[]) || []);

    const { data: appts } = await supabase
      .from('appointments')
      .select('*, doctor:doctor_id(full_name,specialty)')
      .eq('patient_id', uid)
      .order('requested_at', { ascending: false });
    setAppointments((appts as Appointment[]) || []);

    if (p && (p as Profile).role === 'doctor') {
      const { data: rat } = await supabase
        .from('doctor_ratings')
        .select('*, patient:patient_id(full_name)')
        .eq('doctor_id', uid)
        .order('created_at', { ascending: false });
      setRatings((rat as DoctorRating[]) || []);
    }

    setLoading(false);
  }

  const handleSave = async () => {
    if (!myProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        specialty: editForm.specialty,
        bio: editForm.bio,
        phone: editForm.phone,
        blood_type: editForm.blood_type,
        date_of_birth: editForm.date_of_birth,
        gender: editForm.gender,
        allergies: editForm.allergies,
      })
      .eq('id', myProfile.id);
    if (!error) {
      setEditing(false);
      await refreshProfile();
      await load(myProfile.id);
    }
    setSaving(false);
  };

  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  if (loading) return <div className="card text-center py-12 text-gray-400">Loading…</div>;
  if (!profile) return <div className="card text-center py-12 text-gray-500">Profile not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile.full_name?.[0] || 'U'}
            </div>
            <div>
              {editing ? (
                <input
                  className="input text-xl font-bold mb-1"
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
              )}
              <span className={`text-sm px-3 py-0.5 rounded-full capitalize font-medium ${
                profile.role === 'doctor' ? 'bg-blue-50 text-blue-700' : 'bg-health-50 text-health-700'
              }`}>
                {profile.role}
              </span>
              {profile.specialty && (
                <p className="text-gray-500 text-sm mt-0.5">{profile.specialty}</p>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="btn-secondary p-2">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary p-2">
                    <Save className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 text-sm">
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Doctor avg rating */}
        {profile.role === 'doctor' && avgRating && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className={`w-4 h-4 ${n <= parseFloat(avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
            <span className="text-sm text-gray-400">({ratings.length} rating{ratings.length !== 1 ? 's' : ''})</span>
          </div>
        )}

        {/* Profile fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {editing ? (
            <>
              {profile.role === 'doctor' && (
                <div>
                  <label className="label">Specialty</label>
                  <input className="input" value={editForm.specialty || ''} onChange={(e) => setEditForm((f) => ({ ...f, specialty: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="label">Phone</label>
                <input className="input" value={editForm.phone || ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input" value={editForm.date_of_birth || ''} onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div>
                <label className="label">Blood Type</label>
                <select className="input" value={editForm.blood_type || ''} onChange={(e) => setEditForm((f) => ({ ...f, blood_type: e.target.value }))}>
                  <option value="">Select…</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={editForm.gender || ''} onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value as Profile['gender'] }))}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Bio</label>
                <textarea className="input h-20 resize-none" value={editForm.bio || ''} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Known Allergies (comma-separated)</label>
                <input className="input" value={(editForm.allergies || []).join(', ')} onChange={(e) => setEditForm((f) => ({ ...f, allergies: e.target.value.split(',').map((a) => a.trim()).filter(Boolean) }))} />
              </div>
            </>
          ) : (
            <>
              {profile.bio && (
                <div className="sm:col-span-2 text-gray-600 text-sm bg-gray-50 rounded-lg p-3">{profile.bio}</div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {profile.phone}
                </div>
              )}
              {profile.date_of_birth && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  DOB: {new Date(profile.date_of_birth).toLocaleDateString()}
                </div>
              )}
              {profile.blood_type && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Droplet className="w-4 h-4 text-red-400" />
                  Blood Type: {profile.blood_type}
                </div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="capitalize">{profile.gender.replace('_', ' ')}</span>
                </div>
              )}
              {profile.allergies && profile.allergies.length > 0 && (
                <div className="sm:col-span-2 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Allergies</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.allergies.map((a) => (
                        <span key={a} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Medical History (patients) */}
      {profile.role === 'patient' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Medical History
          </h2>
          {records.length === 0 ? (
            <div className="card text-center text-gray-400 py-8">No medical records yet.</div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => (
                <div key={rec.id} className="card text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">{rec.diagnosis || 'Visit Record'}</p>
                    <p className="text-xs text-gray-400">{new Date(rec.created_at).toLocaleDateString()}</p>
                  </div>
                  {rec.medications && Array.isArray(rec.medications) && rec.medications.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Medications</p>
                      <p className="text-gray-700">
                        {(rec.medications as Array<{ name: string }>).map((m) => m.name).join(', ')}
                      </p>
                    </div>
                  )}
                  {rec.notes && <p className="text-gray-600 italic">{rec.notes}</p>}
                  {rec.prescription_url && (
                    <a href={rec.prescription_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary-600 hover:underline text-xs flex items-center gap-1">
                      <FileText className="w-3 h-3" /> View prescription
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past Appointments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Past Appointments
        </h2>
        {appointments.filter((a) => a.status === 'done').length === 0 ? (
          <div className="card text-center text-gray-400 py-8">No completed appointments.</div>
        ) : (
          <div className="space-y-3">
            {appointments.filter((a) => a.status === 'done').map((appt) => {
              const doc = appt.doctor as Record<string, string> | undefined;
              return (
                <div key={appt.id} className="card text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Dr. {doc?.full_name || 'Unknown'}</p>
                    {doc?.specialty && <p className="text-xs text-gray-500">{doc.specialty}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{new Date(appt.requested_at).toLocaleDateString()}</p>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Done</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doctor Ratings (for doctor profiles) */}
      {profile.role === 'doctor' && ratings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Patient Reviews
          </h2>
          <div className="space-y-3">
            {ratings.map((r) => {
              const patient = r.patient as Record<string, string> | undefined;
              return (
                <div key={r.id} className="card text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="font-medium text-gray-700">{patient?.full_name || 'Patient'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-gray-600 italic">"{r.comment}"</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
