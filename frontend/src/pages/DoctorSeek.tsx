import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Camera, Video, MessageSquare, FileText,
  ArrowRight, ArrowLeft, CheckCircle, Stethoscope, Upload, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { generateFollowUpQuestions, buildStructuredReport, suggestDoctorType } from '../lib/aiHelper';
import type { FollowUpQuestion } from '../types';

const STEPS = ['Symptoms', 'Photos', 'Video', 'Follow-up', 'Review'];

export default function DoctorSeek() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [symptomsText, setSymptomsText] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const suggestedType = symptomsText ? suggestDoctorType(symptomsText) : '';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoUrls((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setVideoFile(f);
      setVideoUrl(URL.createObjectURL(f));
    }
  };

  const goNext = () => {
    if (step === 0 && !symptomsText.trim()) {
      setError('Please describe your symptoms before continuing.');
      return;
    }
    setError('');
    if (step === 2) {
      setFollowUpQuestions(generateFollowUpQuestions(symptomsText));
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError('');
    try {
      const uploadedPhotoUrls: string[] = [];
      // Upload photos to Supabase Storage if any
      for (const file of photoFiles) {
        const path = `${profile.id}/${Date.now()}-${file.name}`;
        const { data } = await supabase.storage.from('symptom-media').upload(path, file);
        if (data) {
          const { data: urlData } = supabase.storage.from('symptom-media').getPublicUrl(data.path);
          uploadedPhotoUrls.push(urlData.publicUrl);
        }
      }

      let uploadedVideoUrl = '';
      if (videoFile) {
        const path = `${profile.id}/${Date.now()}-${videoFile.name}`;
        const { data } = await supabase.storage.from('symptom-media').upload(path, videoFile);
        if (data) {
          const { data: urlData } = supabase.storage.from('symptom-media').getPublicUrl(data.path);
          uploadedVideoUrl = urlData.publicUrl;
        }
      }

      const structuredReport = buildStructuredReport(symptomsText, followUpAnswers);

      // Create an appointment with symptom data
      const { error: apptError } = await supabase.from('appointment_data').insert({
        patientId: profile.id,
        title: suggestedType ? `Consult ${suggestedType}` : 'Doctor Consultation',
        reportType: 'symptom',
        status: 'draft',
        follow_up_questions: followUpQuestions,
        follow_up_answers: followUpAnswers,
        formatted_report: structuredReport,
        recommended_speciality: suggestedType,
        needAsap: false,
      });
      if (apptError) throw apptError;

      navigate('/appointments');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Search className="w-5 h-5 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Seek</h1>
        </div>
        <p className="text-gray-500">Describe your health concern and we'll generate a structured report for your doctor.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 ${idx < step ? 'bg-green-500 text-white' : idx === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
              {idx < step ? <CheckCircle className="w-4 h-4" /> : idx + 1}
            </div>
            <span className={`text-xs hidden sm:block ${idx === step ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
            {idx < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 ml-1" />}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 0: Symptoms Text */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              Describe Your Symptoms
            </h2>
            <p className="text-sm text-gray-500">Be as detailed as possible — location, when it started, what makes it better or worse.</p>
            <textarea
              className="input h-40 resize-none"
              placeholder="e.g. I've had a sharp chest pain on the left side for the past 3 days, along with shortness of breath when climbing stairs…"
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
            />
            {symptomsText.trim() && (
              <div className="flex items-center gap-2 bg-primary-50 rounded-lg px-4 py-3 text-sm text-primary-700">
                <Stethoscope className="w-4 h-4 flex-shrink-0" />
                <span>Suggested doctor type: <strong>{suggestedType}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-600" />
              Add Photos <span className="text-sm font-normal text-gray-400">(optional)</span>
            </h2>
            <p className="text-sm text-gray-500">Upload photos of visible symptoms like rashes, swelling, or injuries.</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload photos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
            </label>
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`symptom-${i}`} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Video */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600" />
              Add a Short Video Note <span className="text-sm font-normal text-gray-400">(optional)</span>
            </h2>
            <p className="text-sm text-gray-500">Record or upload a short video (max 2 minutes) explaining your symptoms.</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload a video</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
            </label>
            {videoUrl && (
              <div className="relative">
                <video src={videoUrl} controls className="w-full rounded-lg border border-gray-200" />
                <button
                  onClick={() => { setVideoFile(null); setVideoUrl(''); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Follow-up Questions */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              Smart Follow-up Questions
            </h2>
            <p className="text-sm text-gray-500">These questions help your doctor understand your situation better.</p>
            <div className="space-y-4">
              {followUpQuestions.map((q) => (
                <div key={q.id}>
                  <label className="label">{q.question}</label>
                  {q.type === 'text' && (
                    <textarea
                      className="input h-20 resize-none"
                      placeholder="Your answer…"
                      value={followUpAnswers[q.id] || ''}
                      onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  )}
                  {q.type === 'select' && (
                    <select
                      className="input"
                      value={followUpAnswers[q.id] || ''}
                      onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    >
                      <option value="">Select an option…</option>
                      {q.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {q.type === 'boolean' && (
                    <div className="flex gap-3">
                      {['Yes', 'No'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${followUpAnswers[q.id] === opt
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Review Your Report
            </h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Chief Complaint</p>
                <p className="text-gray-800">{symptomsText}</p>
              </div>
              {photoUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Photos Attached</p>
                  <div className="flex gap-2">
                    {photoUrls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}
              {videoUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Video Note</p>
                  <p className="text-gray-600">1 video attached</p>
                </div>
              )}
              {Object.keys(followUpAnswers).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Follow-up Answers</p>
                  <div className="space-y-2">
                    {followUpQuestions.filter((q) => followUpAnswers[q.id]).map((q) => (
                      <div key={q.id}>
                        <p className="text-gray-500 text-xs">{q.question}</p>
                        <p className="text-gray-800 font-medium">{followUpAnswers[q.id]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-primary-50 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-primary-500 uppercase tracking-wide mb-1">Suggested Specialist</p>
                <p className="text-primary-800 font-semibold flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  {suggestedType}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm mt-4">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={goNext} className="btn-primary flex items-center gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {submitting ? 'Submitting…' : 'Submit & Request Appointment'}
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
