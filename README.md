# Church Compass

Build a comprehensive, modern, professional Web-based Church & Sunday School Management System Dashboard.

Design Requirements:

- Use a clean, modern, professional admin dashboard layout (Sidebar navigation, Top Header with profile/notifications, Main content area).

- Language: English interface with Burmese-friendly labels where applicable.

- Desktop/Laptop optimized view.

Core Modules & Features:

1. Dashboard Overview:

- Stat Cards: Total Sunday School Students, Active Courses, Total Monthly Income, Total Monthly Expenses, Net Balance.

- Quick action buttons for adding attendance, recording finance, and adding new students.

2. Sunday School Student Management:

- Student Directory Table with search bar (Search by Student Name) and filter by Grade/Age.

- Fields: Name, Age/Grade, Parent Phone Number, Address, Training Completion History.

- Detailed Student Profile view showing their entire personal data and course/attendance history when searched.

3. Weekly Attendance Tracking:

- Checkbox-based weekly attendance list for Sunday School.

- Attendance history view to see total attendance frequency and yearly attendance rate per student.

4. Courses & Training Management:

- Create and view courses/classes (Course Name, Date, Time, Instructor).

- Course Attendance/Completion tracker: Track which students completed which specific training and on what date.

- Filter and search training history by Course Title or Date.

#### Course completion API contract

Course completion records are stored independently from courses and are keyed by the
`(course_id, student_id)` pair. The backend should enforce that pair as unique.

- `GET /api/completions` returns an array (or `{ "completions": [...] }`) with
  `course_id`, `student_id`, and `date`.
- `POST /api/completions` accepts `{ "course_id": "...", "student_id": "...",
  "date": "YYYY-MM-DD" }` and creates or replaces that student's completion.
- `DELETE /api/completions?course_id=...&student_id=...` removes the matching record.

The frontend updates the shared completion state optimistically and rolls it back if
the API rejects a change, so the Courses and Students views stay in sync.

5. Petty Cash & Finance Management:

- Income (Donations/Offerings) and Expense transaction recorder.

- Image Upload functionality for physical vouchers and purchase receipts (Receipt Upload preview).

- Monthly Financial Report summary (Total Income vs Expense, Net Balance calculation).

- Transaction history table with date, category, amount, and receipt image attachment viewer.

Generate a complete, fully functional prototype with dummy sample data for testing.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sunday-shepherd.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5753324c-37d6-4a88-b7f4-b35754b826a5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
