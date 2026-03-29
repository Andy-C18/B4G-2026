export interface Profile {
  id: string;
  role: 'patient' | 'doctor';
  full_name: string;
  avatar_url?: string;
  specialty?: string;
  bio?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  blood_type?: string;
  allergies?: string[];
  created_at: string;
  updated_at: string;
}

export interface SymptomReport {
  id: string;
  patient_id: string;
  symptoms_text: string;
  photo_urls?: string[];
  video_url?: string;
  follow_up_answers?: Record<string, string>;
  structured_report: StructuredReport;
  suggested_doctor_type?: string;
  created_at: string;
}

export interface StructuredReport {
  chief_complaint: string;
  symptom_duration?: string;
  symptom_severity?: string;
  associated_symptoms?: string[];
  medical_history_notes?: string;
  current_medications?: string;
  follow_up_summary?: Record<string, string>;
  suggested_doctor_type?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  symptom_report_id?: string;
  status: 'requested' | 'confirmed' | 'done' | 'cancelled';
  notes?: string;
  requested_at: string;
  completed_at?: string;
  patient?: Profile;
  doctor?: Profile;
  symptom_report?: SymptomReport;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  prescription_url?: string;
  prescription_data?: PrescriptionData;
  diagnosis?: string;
  medications?: Medication[];
  lab_results?: Record<string, unknown>;
  notes?: string;
  created_at: string;
}

export interface PrescriptionData {
  raw_text?: string;
  parsed_medications?: Medication[];
  diagnosis?: string;
  follow_up?: string;
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface DoctorRating {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  patient?: Profile;
}

export interface ForumPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  tags?: string[];
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  comment_count?: number;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  upvotes: number;
  created_at: string;
  author?: Profile;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'boolean';
  options?: string[];
}
