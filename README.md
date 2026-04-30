Student Attendance Management System

Features
- Student registration and admin CRUD
- Face enrollment per student profile
- Face recognition attendance (auto marks unmatched students absent for a session)
- Manual attendance with session-based tracking
- Attendance analytics with cutoff flagging
- CSV export for attendance records
- SMTP notifications to students and parents

Getting started
1. npm install
2. npm run dev
3. Open localhost:3000 in a browser

Security setup
1. Set SESSION_SECRET for production use.

Notes
- Attendance percentage is computed from total sessions recorded.
- Notification settings are stored in the local database.
- Face recognition runs in-browser using face-api.js and stores facial embeddings in the local database.
