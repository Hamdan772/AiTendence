# Database Migration Guide: SQLite → MongoDB

This guide helps you migrate the database layer from SQLite to MongoDB.

## Architecture

- **Local Development**: Uses SQLite (`src/db.js`)
- **Vercel Production**: Uses MongoDB via Mongoose (`api/index.js`)

## Current Status

✅ MongoDB schemas are defined in `src/models.js`
✅ MongoDB connection module in `src/mongoConnection.js`  
✅ Vercel configuration in `vercel.json`
⏳ Route handlers need to be migrated to use Mongoose

## Migration Path

### Phase 1: Setup (Done)
- ✅ Create MongoDB models
- ✅ Setup Vercel configuration
- ✅ Add environment variables

### Phase 2: Route Migration (In Progress)
Update each route to use Mongoose instead of raw SQL queries.

Example: `src/routes/students.js`

**Before (SQLite):**
```javascript
const students = await db.all("SELECT * FROM students ORDER BY name");
```

**After (MongoDB):**
```javascript
const { Student } = require('../models');
const students = await Student.find().sort({ name: 1 });
```

### Phase 3: Testing
Test each route on Vercel after migration.

## Mongoose Query Examples

### Find
```javascript
// SQLite: SELECT * FROM students WHERE id = ?
const student = await Student.findById(id);

// SQLite: SELECT * FROM students WHERE name = ?
const student = await Student.findOne({ name: name });

// SQLite: SELECT * FROM students
const students = await Student.find();

// SQLite: SELECT COUNT(*) FROM students
const count = await Student.countDocuments();
```

### Create
```javascript
// SQLite: INSERT INTO students (...) VALUES (...)
const student = await Student.create({
  name: "John",
  student_id: "STU001",
  face_descriptor: null
});
```

### Update
```javascript
// SQLite: UPDATE students SET ... WHERE id = ?
const student = await Student.findByIdAndUpdate(
  id,
  { name: "Jane", face_descriptor: descriptor },
  { new: true }
);
```

### Delete
```javascript
// SQLite: DELETE FROM students WHERE id = ?
await Student.findByIdAndDelete(id);
```

### Delete with Constraints
```javascript
// SQLite: DELETE FROM attendance_records WHERE student_id = ?
await AttendanceRecord.deleteMany({ student_id: studentId });
```

## Common Patterns

### Joins (SQLite) → Populate (MongoDB)
```javascript
// SQLite: SELECT * FROM attendance_records JOIN students ...
const records = await AttendanceRecord.find()
  .populate('student_id')
  .populate('session_id');
```

### Transactions
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await Student.create([...], { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

### Bulk Operations
```javascript
const ops = students.map(s => ({
  updateOne: {
    filter: { _id: s._id },
    update: { status: 'present' }
  }
}));

await AttendanceRecord.bulkWrite(ops);
```

## Files to Update

1. **Routes** (High Priority)
   - `src/routes/students.js`
   - `src/routes/attendance.js`
   - `src/routes/analytics.js`
   - `src/routes/settings.js`
   - `src/routes/export.js`
   - `src/routes/auth.js`

2. **Services** (Medium Priority)
   - `src/services/analytics.js`
   - `src/services/face.js`
   - `src/services/notifications.js`

3. **Database Layer** (Already Done)
   - ✅ `src/models.js`
   - ✅ `src/mongoConnection.js`

## Testing

After migrating each route:

1. **Local**: Test with MongoDB locally
   ```bash
   # Update .env
   MONGODB_URI=mongodb://localhost:27017/aitendence
   
   # Run
   npm run dev
   ```

2. **Production**: Test on Vercel
   - Push changes to GitHub
   - Vercel auto-deploys
   - Test the functionality

## Rollback Plan

If something breaks:
1. Revert the commit
2. Push to GitHub (Vercel auto-redeploys)
3. Fix and retry

## Support Resources

- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Query Guide](https://docs.mongodb.com/manual/crud/)
- [Vercel Node.js Deployment](https://vercel.com/docs/concepts/functions/serverless-functions)
