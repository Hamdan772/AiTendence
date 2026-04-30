const nodemailer = require("nodemailer");
const { getCutoffPercent, getNotificationSettings } = require("./settings");
const { getStudentAttendance } = require("./analytics");

async function maybeSendAlert(db, studentId, sessionId) {
  const settings = await getNotificationSettings(db);
  if (!settings.enabled) {
    return { sent: false, reason: "disabled" };
  }

  if (!settings.host || !settings.user || !settings.pass || !settings.from) {
    return { sent: false, reason: "incomplete_settings" };
  }

  const cutoffPercent = await getCutoffPercent(db);
  const attendance = await getStudentAttendance(db, studentId);

  if (attendance.totalSessions === 0 || attendance.percent >= cutoffPercent) {
    return { sent: false, reason: "not_below_cutoff" };
  }

  const alreadySent = await db.get(
    "SELECT 1 FROM alert_log WHERE student_id = ? AND session_id = ?",
    studentId,
    sessionId
  );
  if (alreadySent) {
    return { sent: false, reason: "already_sent" };
  }

  const student = await db.get("SELECT * FROM students WHERE id = ?", studentId);
  if (!student) {
    return { sent: false, reason: "missing_student" };
  }

  const recipients = [student.email, student.parent_email].filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, reason: "no_recipients" };
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: {
      user: settings.user,
      pass: settings.pass
    }
  });

  const subject = `Attendance Alert: ${student.name}`;
  const body =
    "Hello,\n\n" +
    `${student.name}'s attendance is ${attendance.percent.toFixed(1)}% which is below the ${cutoffPercent}% cutoff.\n` +
    `Total sessions: ${attendance.totalSessions}\n\n` +
    "Please contact the administrator if you believe this is incorrect.\n";

  await transporter.sendMail({
    from: settings.from,
    to: recipients.join(","),
    subject,
    text: body
  });

  await db.run(
    "INSERT INTO alert_log (student_id, session_id, created_at) VALUES (?, ?, ?)",
    studentId,
    sessionId,
    new Date().toISOString()
  );

  return { sent: true };
}

module.exports = { maybeSendAlert };
