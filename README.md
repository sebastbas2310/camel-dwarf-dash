# Camel & Dwarf Racing Hub

Create a modern, clean, and responsive React frontend application for "The Great EIA Camel vs. Dwarf Racing System". The app will connect to a custom Java Spring Boot REST API (running on http://localhost:8080/api).

### Visual & UX Requirements:

- Use Tailwind CSS and shadcn/ui components.

- Theme: A sports/racing dashboard with a playful yet highly professional look. Clear contrast, responsive design, readable typography.

- Global UI Elements: Navigation sidebar/header, loading spinners for async actions, user profile badge with active role display, logout button, and Toast notifications (Sonner/Shadcn Toast) for success and error messages.

- Error Handling: Handle 401 Unauthorized (redirect to login) and 403 Forbidden (show an Access Denied view). Do not show raw backend errors; map them to friendly messages.

### Authentication & Security State (JWT):

- Store JWT token and user details (username, role) in React state / Context / LocalStorage.

- Support 3 roles: ADMINISTRATOR, RACE_ORGANIZER, VIEWER.

- Role-based UI visibility:

  * ADMINISTRATOR: Access to all pages, user/competitor/team/race management, registration approvals, result entries, and Audit Logs.

  * RACE_ORGANIZER: Access to manage races, approve/reject registrations, record results, and view competitors/teams.

  * VIEWER: Read-only access to public race schedules, results, and leaderboards/standings. Hide/disable all edit, delete, and creation buttons for VIEWER.

### Mandatory Pages & Components to Build:

1. Auth Page (`/login`):

   - Form with username/email and password.

   - Saves JWT on success and redirects to Dashboard.

2. Main Dashboard (`/` or `/dashboard`):

   - Summary cards: Total/Active Competitors, Upcoming Races, Active Teams, Recent Winners.

   - Quick navigation links.

3. Competitors Module (`/competitors` & `/competitors/:id`):

   - List view with search input, filters (by Competitor Type: DWARF, CAMEL, MEDIUM, OTHER; and Status: ACTIVE, INJURED, SUSPENDED, RETIRED), and pagination.

   - Modal or Form to Create/Edit Competitor (Fields: Name, Nickname [unique], Type, Age, Weight, Height, Country, Status).

   - Confirmation dialog before deactivating/retiring a competitor (Soft delete action: DELETE `/api/competitors/{id}`).

4. Teams Module (`/teams` & `/teams/:id`):

   - List view of teams with member counts.

   - Detail view showing team members, strategy, and coach.

   - Action to add/remove members from a team (POST/DELETE to `/api/teams/{teamId}/members/{competitorId}`).

   - Modal/Form to Create/Edit Team.

5. Races Module (`/races` & `/races/:id`):

   - List view filtered by Race Status (DRAFT, OPEN_FOR_REGISTRATION, CLOSED_FOR_REGISTRATION, IN_PROGRESS, COMPLETED, CANCELLED) and Race Type (INDIVIDUAL, TEAM, MIXED).

   - Form to Create/Edit Race (Fields: Name, Description, Scheduled Date/Time, Start/Finish Location, Distance in meters, Max participants, Registration deadline, Status).

   - Detail page with participant list and status transitions (e.g., Open Registration, Start Race, Cancel Race).

6. Registrations Management (`/races/:raceId/registrations`):

   - View pending registrations.

   - Actions for Organizers/Admins to Approve or Reject registrations. If rejected, open a dialog asking for a mandatory reason (`validationNotes`).

7. Results Entry & Standings (`/races/:raceId/results` & `/standings`):

   - Screen to enter final race results (Positions 1st to 5th, completion time in seconds, status: FINISHED, DISQUALIFIED, DID_NOT_FINISH, DID_NOT_START). Ensure validation prevents duplicate positions.

   - Standings / Leaderboard view showing total points (1st: 10, 2nd: 7, 3rd: 5, 4th: 3, 5th: 1) with filters for Competitors vs. Teams.

8. Audit Log Page (`/audit-logs` - Admin Only):

   - Table displaying logs (Timestamp, User, Action, Entity Type, Description, Previous/New values).

9. Utility Views:

   - 404 Not Found Page.

   - 403 Access Denied Page.

### API Integration Setup:

- Centralize API calls into clean service functions using `axios` or `fetch` with request interceptors that attach `Authorization: Bearer <token>`.

- Use the standard API base URL: `http://localhost:8080/api`.

- Mock initial static data or empty states cleanly so the interface works out-of-the-box before the backend connects.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://camel-dwarf-dash.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2c5574d5-41f9-4619-86e7-28203cc84727).

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
