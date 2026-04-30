const mongoose = require("mongoose");
const { Student, AttendanceSession, AttendanceRecord, Settings } = require("./models");

let isConnected = false;

async function initialize() {
    if (isConnected) {
        return createDbAdapter();
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is not set");
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        isConnected = true;
        console.log("Connected to MongoDB");

        await seedDefaults();

        return createDbAdapter();
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
}

async function seedDefaults() {
    const settings = [
        { key: "cutoff_percent", value: "75" },
        { key: "notify_enabled", value: "0" },
        { key: "smtp_host", value: "" },
        { key: "smtp_port", value: "587" },
        { key: "smtp_user", value: "" },
        { key: "smtp_pass", value: "" },
        { key: "smtp_from", value: "" },
        { key: "admin_password_hash", value: "" }
    ];

    for (const setting of settings) {
        await Settings.findOneAndUpdate(
            { key: setting.key },
            setting,
            { upsert: true }
        );
    }
}

function createDbAdapter() {
    return {
        get: async (sql, ...params) => {
            return executeGet(sql, params);
        },
        all: async (sql, ...params) => {
            return executeAll(sql, params);
        },
        run: async (sql, ...params) => {
            return executeRun(sql, params);
        },
        exec: async (sql) => {
            return null;
        }
    };
}

async function executeGet(sql, params) {
    // Handle COUNT queries
    if (sql.includes("SELECT COUNT(*)")) {
        if (sql.includes("FROM students")) {
            const count = await Student.countDocuments();
            return { count };
        }
        if (sql.includes("FROM attendance_sessions")) {
            const count = await AttendanceSession.countDocuments();
            return { count };
        }
        if (sql.includes("FROM attendance_records")) {
            const count = await AttendanceRecord.countDocuments();
            return { count };
        }
    }

    // SELECT from settings WHERE key = ?
    if (sql.includes("FROM settings WHERE key")) {
        const setting = await Settings.findOne({ key: params[0] });
        return setting ? { value: setting.value } : null;
    }

    // SELECT from students WHERE id = ?
    if (sql.includes("FROM students WHERE id")) {
        const student = await Student.findById(params[0]).lean();
        if (student) {
            return {
                id: student._id,
                student_id: student.student_id,
                name: student.name,
                email: student.email,
                parent_email: student.parent_email,
                phone: student.phone,
                parent_phone: student.parent_phone,
                face_descriptor: student.face_descriptor,
                face_enrolled_at: student.face_enrolled_at,
                created_at: student.created_at
            };
        }
        return null;
    }

    // SELECT from attendance_sessions WHERE session_date = ?
    if (sql.includes("FROM attendance_sessions WHERE session_date")) {
        const session = await AttendanceSession.findOne({ session_date: params[0] }).lean();
        return session ? { id: session._id } : null;
    }

    // SELECT from alert_log WHERE student_id = ? AND session_id = ?
    if (sql.includes("FROM alert_log WHERE")) {
        const alertExists = await AttendanceRecord.findOne({
            student_id: params[0],
            session_id: params[1]
        });
        return alertExists ? { 1: 1 } : null;
    }

    // SELECT * FROM students WHERE id = ?
    if (sql === "SELECT * FROM students WHERE id = ?") {
        const student = await Student.findById(params[0]).lean();
        if (student) {
            return {
                id: student._id.toString(),
                student_id: student.student_id,
                name: student.name,
                email: student.email,
                parent_email: student.parent_email,
                phone: student.phone,
                parent_phone: student.parent_phone,
                face_descriptor: student.face_descriptor,
                face_enrolled_at: student.face_enrolled_at,
                created_at: student.created_at
            };
        }
    }

    return null;
}

async function executeAll(sql, params) {
    // SELECT from students ORDER BY name
    if (sql.includes("SELECT") && sql.includes("FROM students") && !sql.includes("LEFT JOIN")) {
        const students = await Student.find().sort({ name: 1 }).lean();
        return students.map(s => ({
            id: s._id.toString(),
            student_id: s.student_id,
            name: s.name,
            email: s.email,
            parent_email: s.parent_email,
            phone: s.phone,
            parent_phone: s.parent_phone,
            face_descriptor: s.face_descriptor,
            face_enrolled_at: s.face_enrolled_at,
            created_at: s.created_at
        }));
    }

    // SELECT with face descriptor WHERE face_descriptor IS NOT NULL
    if (sql.includes("face_descriptor") && sql.includes("WHERE face_descriptor IS NOT NULL")) {
        const students = await Student.find({
            face_descriptor: { $exists: true, $ne: null }
        }).lean();
        return students.map(s => ({
            id: s._id.toString(),
            student_id: s.student_id,
            name: s.name,
            face_descriptor: s.face_descriptor
        }));
    }

    // Attendance records with JOINs
    if (sql.includes("FROM attendance_records ar") && sql.includes("JOIN students")) {
        const records = await AttendanceRecord.find()
            .populate("student_id")
            .populate("session_id")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        return records.map(r => ({
            status: r.status,
            recorded_at: r.recorded_at,
            name: r.student_id?.name,
            student_code: r.student_id?.student_id,
            session_date: r.session_id?.session_date
        }));
    }

    // Analytics query
    if (sql.includes("FROM students s") && sql.includes("LEFT JOIN attendance_records ar")) {
        const students = await Student.find().lean();
        const records = await AttendanceRecord.find().lean();

        return students.map(student => {
            const studentRecords = records.filter(r => r.student_id.toString() === student._id.toString());
            const presentCount = studentRecords.filter(r => r.status === 'present').length;

            return {
                id: student._id.toString(),
                student_id: student.student_id,
                name: student.name,
                email: student.email,
                parent_email: student.parent_email,
                present_count: presentCount
            };
        });
    }

    // Export query
    if (sql.includes("FROM attendance_records ar") && sql.includes("CSV")) {
        const records = await AttendanceRecord.find()
            .populate("student_id")
            .populate("session_id")
            .sort({ createdAt: -1 })
            .lean();

        return records.map(r => ({
            session_date: r.session_id?.session_date,
            student_id: r.student_id?.student_id,
            student_name: r.student_id?.name,
            status: r.status,
            recorded_at: r.recorded_at
        }));
    }

    return [];
}

async function executeRun(sql, params) {
    // INSERT INTO students
    if (sql.includes("INSERT INTO students")) {
        const student = await Student.create({
            student_id: params[0],
            name: params[1],
            email: params[2],
            parent_email: params[3],
            phone: params[4],
            parent_phone: params[5],
            created_at: params[6]
        });
        return { lastID: student._id.toString() };
    }

    // UPDATE students
    if (sql.includes("UPDATE students")) {
        await Student.findByIdAndUpdate(params[6], {
            student_id: params[0],
            name: params[1],
            email: params[2],
            parent_email: params[3],
            phone: params[4],
            parent_phone: params[5]
        });
        return { changes: 1 };
    }

    // DELETE FROM students
    if (sql.includes("DELETE FROM students")) {
        await Student.findByIdAndDelete(params[0]);
        return { changes: 1 };
    }

    // UPDATE students SET face_descriptor
    if (sql.includes("UPDATE students SET face_descriptor")) {
        await Student.findByIdAndUpdate(params[2], {
            face_descriptor: params[0],
            face_enrolled_at: params[1]
        });
        return { changes: 1 };
    }

    // INSERT INTO attendance_sessions
    if (sql.includes("INSERT INTO attendance_sessions")) {
        const session = await AttendanceSession.create({
            session_date: params[0],
            created_at: params[1]
        });
        return { lastID: session._id.toString() };
    }

    // INSERT INTO attendance_records
    if (sql.includes("INSERT INTO attendance_records")) {
        try {
            const record = await AttendanceRecord.create({
                session_id: params[0],
                student_id: params[1],
                status: params[2],
                recorded_at: params[3]
            });
            return { lastID: record._id.toString() };
        } catch (err) {
            if (err.code === 11000) {
                // Duplicate key, do update
                await AttendanceRecord.findOneAndUpdate(
                    { session_id: params[0], student_id: params[1] },
                    { status: params[2], recorded_at: params[3] }
                );
                return { changes: 1 };
            }
            throw err;
        }
    }

    // INSERT INTO settings
    if (sql.includes("INSERT INTO settings")) {
        await Settings.findOneAndUpdate(
            { key: params[0] },
            { key: params[0], value: params[1] },
            { upsert: true }
        );
        return { changes: 1 };
    }

    // INSERT INTO alert_log
    if (sql.includes("INSERT INTO alert_log")) {
        await AttendanceRecord.findOneAndUpdate(
            { student_id: params[0], session_id: params[1] },
            { alerted_at: params[2] },
            { upsert: true }
        );
        return { changes: 1 };
    }

    return { changes: 0 };
}

module.exports = { initialize };
