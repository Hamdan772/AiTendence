const fs = require("fs");
const path = require("path");

const dataDir = process.env.VERCEL
    ? path.join("/tmp", "attendra-data")
    : path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "db.json");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let cache = {
    students: [],
    attendance_sessions: [],
    attendance_records: [],
    settings: [],
    alert_log: [],
    nextStudentId: 1,
    nextSessionId: 1,
    nextRecordId: 1
};

function saveDb() {
    try {
        fs.writeFileSync(dbFile, JSON.stringify(cache, null, 2));
    } catch (err) {
        console.error("Error saving database:", err);
    }
}

function loadDb() {
    try {
        if (fs.existsSync(dbFile)) {
            const data = fs.readFileSync(dbFile, "utf8");
            cache = JSON.parse(data);
        } else {
            initializeDefaults();
            saveDb();
        }
    } catch (err) {
        console.error("Error loading database:", err);
        initializeDefaults();
    }
}

function initializeDefaults() {
    cache = {
        students: [],
        attendance_sessions: [],
        attendance_records: [],
        settings: [
            { key: "cutoff_percent", value: "75" },
            { key: "notify_enabled", value: "0" },
            { key: "smtp_host", value: "" },
            { key: "smtp_port", value: "587" },
            { key: "smtp_user", value: "" },
            { key: "smtp_pass", value: "" },
            { key: "smtp_from", value: "" },
            { key: "admin_password_hash", value: "" }
        ],
        alert_log: [],
        nextStudentId: 1,
        nextSessionId: 1,
        nextRecordId: 1
    };
}

loadDb();

function createDbAdapter() {
    return {
        get: async (sql, ...params) => {
            if (sql.includes("SELECT COUNT(*)")) {
                if (sql.includes("FROM students")) {
                    return { count: cache.students.length };
                }
                if (sql.includes("FROM attendance_sessions")) {
                    return { count: cache.attendance_sessions.length };
                }
                if (sql.includes("FROM attendance_records")) {
                    return { count: cache.attendance_records.length };
                }
            }

            if (sql.includes("FROM settings WHERE key")) {
                const setting = cache.settings.find(s => s.key === params[0]);
                return setting || null;
            }

            if (sql.includes("FROM students WHERE id")) {
                return cache.students.find(s => s.id === parseInt(params[0])) || null;
            }

            if (sql.includes("FROM attendance_sessions WHERE session_date")) {
                return cache.attendance_sessions.find(s => s.session_date === params[0]) || null;
            }

            if (sql.includes("FROM alert_log WHERE")) {
                return cache.alert_log.find(
                    a => a.student_id === params[0] && a.session_id === params[1]
                ) || null;
            }

            return null;
        },

        all: async (sql, ...params) => {
            if (sql.includes("SELECT") && sql.includes("FROM students") && !sql.includes("LEFT JOIN")) {
                return cache.students.sort((a, b) => a.name.localeCompare(b.name));
            }

            if (sql.includes("face_descriptor") && sql.includes("WHERE face_descriptor IS NOT NULL")) {
                return cache.students.filter(s => s.face_descriptor);
            }

            if (sql.includes("FROM attendance_records ar") && sql.includes("JOIN students")) {
                return cache.attendance_records
                    .map(ar => {
                        const student = cache.students.find(s => s.id === ar.student_id);
                        const session = cache.attendance_sessions.find(s => s.id === ar.session_id);
                        return {
                            status: ar.status,
                            recorded_at: ar.recorded_at,
                            name: student?.name,
                            student_code: student?.student_id,
                            session_date: session?.session_date
                        };
                    })
                    .slice(-200);
            }

            if (sql.includes("FROM students s") && sql.includes("LEFT JOIN attendance_records ar")) {
                return cache.students.map(student => {
                    const records = cache.attendance_records.filter(r => r.student_id === student.id);
                    const presentCount = records.filter(r => r.status === "present").length;
                    return {
                        id: student.id,
                        student_id: student.student_id,
                        name: student.name,
                        email: student.email,
                        parent_email: student.parent_email,
                        present_count: presentCount
                    };
                });
            }

            if (sql.includes("FROM attendance_records ar") && sql.includes("ORDER BY")) {
                return cache.attendance_records.map(ar => {
                    const student = cache.students.find(s => s.id === ar.student_id);
                    const session = cache.attendance_sessions.find(s => s.id === ar.session_id);
                    return {
                        session_date: session?.session_date,
                        student_id: student?.student_id,
                        student_name: student?.name,
                        status: ar.status,
                        recorded_at: ar.recorded_at
                    };
                });
            }

            return [];
        },

        run: async (sql, ...params) => {
            if (sql.includes("INSERT INTO students")) {
                const student = {
                    id: cache.nextStudentId++,
                    student_id: params[0],
                    name: params[1],
                    email: params[2],
                    parent_email: params[3],
                    phone: params[4],
                    parent_phone: params[5],
                    created_at: params[6],
                    face_descriptor: null,
                    face_enrolled_at: null
                };
                cache.students.push(student);
                saveDb();
                return { lastID: student.id };
            }

            if (sql.includes("UPDATE students") && sql.includes("WHERE id")) {
                const student = cache.students.find(s => s.id === parseInt(params[6]));
                if (student) {
                    student.student_id = params[0];
                    student.name = params[1];
                    student.email = params[2];
                    student.parent_email = params[3];
                    student.phone = params[4];
                    student.parent_phone = params[5];
                    saveDb();
                }
                return { changes: 1 };
            }

            if (sql.includes("DELETE FROM students")) {
                cache.students = cache.students.filter(s => s.id !== parseInt(params[0]));
                saveDb();
                return { changes: 1 };
            }

            if (sql.includes("UPDATE students SET face_descriptor")) {
                const student = cache.students.find(s => s.id === parseInt(params[2]));
                if (student) {
                    student.face_descriptor = params[0];
                    student.face_enrolled_at = params[1];
                    saveDb();
                }
                return { changes: 1 };
            }

            if (sql.includes("INSERT INTO attendance_sessions")) {
                const session = {
                    id: cache.nextSessionId++,
                    session_date: params[0],
                    created_at: params[1]
                };
                cache.attendance_sessions.push(session);
                saveDb();
                return { lastID: session.id };
            }

            if (sql.includes("INSERT INTO attendance_records")) {
                const existing = cache.attendance_records.find(
                    r => r.session_id === params[0] && r.student_id === params[1]
                );
                if (existing) {
                    existing.status = params[2];
                    existing.recorded_at = params[3];
                } else {
                    cache.attendance_records.push({
                        id: cache.nextRecordId++,
                        session_id: params[0],
                        student_id: params[1],
                        status: params[2],
                        recorded_at: params[3]
                    });
                }
                saveDb();
                return { lastID: cache.nextRecordId - 1 };
            }

            if (sql.includes("INSERT INTO settings")) {
                const existing = cache.settings.find(s => s.key === params[0]);
                if (existing) {
                    existing.value = params[1];
                } else {
                    cache.settings.push({ key: params[0], value: params[1] });
                }
                saveDb();
                return { changes: 1 };
            }

            if (sql.includes("INSERT INTO alert_log")) {
                cache.alert_log.push({
                    student_id: params[0],
                    session_id: params[1],
                    created_at: params[2]
                });
                saveDb();
                return { changes: 1 };
            }

            return { changes: 0 };
        },

        exec: async (sql) => {
            return null;
        }
    };
}

async function initDb() {
    return createDbAdapter();
}

module.exports = { initDb };
