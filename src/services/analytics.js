async function getTotalSessions(db) {
  const row = await db.get("SELECT COUNT(*) AS count FROM attendance_sessions");
  return row ? row.count : 0;
}

async function getStudentAttendance(db, studentId) {
  const totalSessions = await getTotalSessions(db);
  const row = await db.get(
    "SELECT COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0) AS present_count FROM attendance_records WHERE student_id = ?",
    studentId
  );
  const presentCount = row ? row.present_count : 0;
  const percent = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

  return {
    totalSessions,
    presentCount,
    percent
  };
}

async function getAnalytics(db, cutoffPercent) {
  const totalSessions = await getTotalSessions(db);
  const students = await db.all(`
    SELECT
      s.id,
      s.student_id,
      s.name,
      s.email,
      s.parent_email,
      COALESCE(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END), 0) AS present_count
    FROM students s
    LEFT JOIN attendance_records ar ON ar.student_id = s.id
    GROUP BY s.id
    ORDER BY s.name
  `);

  const totalStudents = students.length;
  const items = students.map((student) => {
    const percent = totalSessions > 0 ? (student.present_count / totalSessions) * 100 : 0;
    const flagged = totalSessions > 0 && percent < cutoffPercent;

    return {
      id: student.id,
      studentId: student.student_id,
      name: student.name,
      email: student.email,
      parentEmail: student.parent_email,
      presentCount: student.present_count,
      percent,
      flagged
    };
  });

  const segments = {
    high: 0,
    medium: 0,
    low: 0
  };

  items.forEach((item) => {
    if (item.percent >= 90) {
      segments.high += 1;
    } else if (item.percent >= cutoffPercent) {
      segments.medium += 1;
    } else {
      segments.low += 1;
    }
  });

  const segmentPercents = {
    high: totalStudents > 0 ? (segments.high / totalStudents) * 100 : 0,
    medium: totalStudents > 0 ? (segments.medium / totalStudents) * 100 : 0,
    low: totalStudents > 0 ? (segments.low / totalStudents) * 100 : 0
  };

  return {
    totalSessions,
    totalStudents,
    items,
    segments,
    segmentPercents
  };
}

module.exports = {
  getAnalytics,
  getStudentAttendance,
  getTotalSessions
};
