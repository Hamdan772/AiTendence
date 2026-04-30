const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  student_id: {
    type: String,
    required: true,
    unique: true
  },
  face_descriptor: {
    type: String,
    default: null
  },
  face_enrolled_at: {
    type: String,
    default: null
  },
  created_at: {
    type: String,
    default: () => new Date().toISOString()
  }
});

const attendanceSessionSchema = new mongoose.Schema({
  session_date: {
    type: String,
    required: true,
    unique: true
  },
  created_at: {
    type: String,
    default: () => new Date().toISOString()
  }
});

const attendanceRecordSchema = new mongoose.Schema({
  session_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'AttendanceSession'
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Student'
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  recorded_at: {
    type: String,
    default: () => new Date().toISOString()
  }
});

// Create compound index for session and student
attendanceRecordSchema.index({ session_id: 1, student_id: 1 }, { unique: true });

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  created_at: {
    type: String,
    default: () => new Date().toISOString()
  }
});

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: String,
  created_at: {
    type: String,
    default: () => new Date().toISOString()
  }
});

const Student = mongoose.model('Student', studentSchema);
const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = {
  Student,
  AttendanceSession,
  AttendanceRecord,
  Admin,
  Settings
};
