export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  gender: string;
  createdAt: string;
  age: number;
  password: string;
}

export interface Patient extends Profile {
  medicalHistory: Record<string, string>;
}

export interface Doctor extends Profile {
  speciality: string;
  practiceName: string;
  rating: number;
  reviewCount: number;
  timeAvailable: Record<string, unknown>;
}

// Type guard to check if profile is a doctor
export function isDoctor(profile: Patient | Doctor): profile is Doctor {
  return 'speciality' in profile || 'practiceName' in profile;
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
  patientId: string;
  doctorId: string;
  title?: string;
  reportType?: string;
  status: 'draft' | 'requested' | 'confirmed' | 'done' | 'cancelled';
  needAsap?: boolean;
  follow_up_questions?: Record<string, string>;
  follow_up_answers?: Record<string, string>;
  pre_appointment_report?: StructuredReport;
  recommended_speciality?: string;
  selected_time?: string;
  post_appointment_report?: Record<string, unknown>;
  doctor_rating?: number;
  doctor_rating_text?: string;
  createdAt: string;
  requested_at?: string;
  completed_at?: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patient_id?: string; // backward compatibility
  appointmentId?: string;
  appointment_id?: string; // backward compatibility
  notes?: string;
  diagnosis?: string;
  medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
  prescription_url?: string;
  prescription_data?: Record<string, any>;
  createdAt: string;
  created_at?: string; // backward compatibility
}

export interface DoctorRating {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  patient?: Patient;
  doctor?: Doctor;
}

// export interface SymptomReport {
//   id: string;
//   patientId: string;
//   reportType?: string;
//   formatted_report?: StructuredReport;
//   follow_up_questions?: Record<string, string>;
//   follow_up_answers?: Record<string, string>;
//   createdAt: string;
// }

// export interface MedicalRecord {
//   id: string;
//   patientId: string;
//   appointmentId?: string;
//   notes?: string;
//   createdAt: string;
// }

// export interface DoctorRating {
//   appointmentId: string;
//   patientId: string;
//   doctorId: string;
//   rating: number;
//   comment?: string;
//   createdAt: string;
//   patient?: Patient;
//   doctor?: Doctor;
// }

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
  author?: { fullName: string };
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  upvotes: number;
  created_at: string;
  author?: { fullName: string };
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'boolean';
  options?: string[];
}
