import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, FileText, Activity, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Appointment, Patient, Doctor } from '../types';

type ProfileType = Patient | Doctor;

const isDoctor = (p: ProfileType): p is Doctor => 'speciality' in p;

export default function Dashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const { data } = await supabase
        .from('appointment_data')
        .select('*')
        .or(`patientId.eq.${profile.id},doctorId.eq.${profile.id}`)
        .order('createdAt', { ascending: false })
        .limit(5);
      setAppointments((data as Appointment[]) || []);
      setLoading(false);
    }
    load();
  }, [profile]);

  const statusColor = (s: string) => {
    switch (s) {
      case 'draft': return 'text-gray-700 bg-gray-50';
      case 'requested': return 'text-amber-700 bg-amber-50';
      case 'confirmed': return 'text-blue-700 bg-blue-50';
      case 'done': return 'text-green-700 bg-green-50';
      case 'cancelled': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const isPatient = profile && !isDoctor(profile as any);
  const firstName = profile?.fullName?.split(' ')[0] || 'User';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-primary-100">
          {isPatient
            ? 'How are you feeling today? Describe your symptoms to get started.'
            : `Managing appointments as ${(profile as any)?.speciality || 'Doctor'}.`}
        </p>
        {isPatient && (
          <Link
            to="/doctor-seek"
            className="inline-flex items-center gap-2 mt-4 bg-white text-primary-700 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            Start Doctor Seek
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Appointments',
            value: appointments.length,
            icon: Calendar,
            color: 'text-primary-600 bg-primary-50',
          },
          {
            label: 'Draft',
            value: appointments.filter((a) => a.status === 'draft').length,
            icon: Clock,
            color: 'text-gray-600 bg-gray-50',
          },
          {
            label: 'Confirmed',
            value: appointments.filter((a) => a.status === 'confirmed').length,
            icon: Activity,
            color: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Completed',
            value: appointments.filter((a) => a.status === 'done').length,
            icon: CheckCircle,
            color: 'text-green-600 bg-green-50',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions (patients only) */}
      {isPatient && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/doctor-seek" className="card hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer">
              <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Doctor Seek</p>
                <p className="text-xs text-gray-500">Describe symptoms & get report</p>
              </div>
            </Link>
            <Link to="/appointments" className="card hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Appointments</p>
                <p className="text-xs text-gray-500">View & manage appointments</p>
              </div>
            </Link>
            <Link to="/profile" className="card hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer">
              <div className="p-3 rounded-xl bg-green-50 text-green-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-800">My Records</p>
                <p className="text-xs text-gray-500">Past medical history</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Recent appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Appointments</h2>
          <Link to="/appointments" className="text-sm text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="card text-center text-gray-500 py-8">Loading…</div>
        ) : appointments.length === 0 ? (
          <div className="card text-center text-gray-500 py-10">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No appointments yet.</p>
            {isPatient && (
              <Link to="/doctor-seek" className="btn-primary mt-3 inline-flex">
                Create your first report
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <Link
                key={appt.id}
                to={`/appointments/${appt.id}`}
                className="card hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {appt.title || 'Appointment'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(appt.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusColor(appt.status)}`}>
                  {appt.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
