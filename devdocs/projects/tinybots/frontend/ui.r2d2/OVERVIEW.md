# ui.r2d2 - TinyBots Customer Dashboard

## Purpose

Customer-facing React web application for managing Tessa robots. Users can schedule tasks, manage music playlists, configure speech interactions, and control robot settings.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 16.14.x | UI framework |
| TypeScript | 4.9.x | Type safety (partially migrated) |
| Redux + Redux Thunk | 4.x / 2.x | State management |
| Material-UI | 4.11.x | Component library |
| React Router | 5.2.x | Routing |
| axios | 0.19.x | HTTP client |
| i18next | 19.x | Internationalization |
| styled-components | 5.x | CSS-in-JS styling |
| Formik | 2.x | Form handling |
| date-fns / moment | - | Date utilities |

> **Note:** Mix of `.jsx` and `.tsx` files - partial TypeScript migration in progress.

## Source Code Location

```
projects/tinybots/frontend/ui.r2d2/
```

## Project Structure

```
src/
├── App.jsx                 # Main app with route definitions
├── Root.tsx                # Root component with Provider setup
├── root.reducer.ts         # Combined Redux reducers
├── store.ts                # Redux store configuration
├── theme.ts                # Material-UI theme
├── index.tsx               # Entry point
├── common/                 # Shared code
│   ├── api/                # API setup, interceptors
│   ├── components/         # Reusable UI components
│   ├── constants/          # App constants, URLs, env config
│   ├── hooks/              # Custom React hooks
│   ├── hoc/                # Higher-order components (PrivateRoute, etc.)
│   ├── redux/              # Shared Redux (ui, appTime, heartbeat)
│   └── utils/              # Utility functions
├── features/               # Feature modules (see below)
├── localization/           # i18n translations (nl, en, de)
└── assets/                 # Static assets, images
```

## Routes & Screens

### Public Routes (No Auth)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/`, `/login` | Login | User login |
| `/mfa` | MFA | Multi-factor authentication |
| `/signup` | SignUp | New user registration |
| `/forgot-password` | ForgotPassword | Password recovery |
| `/reset-wachtwoord/:key` | ResetPassword | Password reset with key |
| `/activeren/:key` | AccountActivation | Account activation |
| `/invite/:inviteCode/:email` | Invite | View invite details |

### Protected Routes (Auth Required)

| Route | Component | Requires Robot | Purpose |
|-------|-----------|----------------|---------|
| `/onboarding` | Onboarding | No | New user onboarding flow |
| `/overview` | Overview | Yes | Daily/weekly schedule dashboard |
| `/task/:type/:id?/:taskId?/:time?` | Task | Yes | Create/edit scheduled tasks |
| `/script/overview/:id?` | ScriptsOverview | Yes | Browse script templates |
| `/script/:v2/template/:id?` | ScriptSingle | Yes | View/edit single script |
| `/music` | Music | Yes | Music library & playlists |
| `/direct` | DirectSpeech | Yes | Send direct messages to robot |
| `/speech-interactions` | SpeechInteractionOverview | Yes | Custom voice commands list |
| `/speech-interactions/new` | SpeechInteractionSingle | Yes | Create new voice command |
| `/speech-interactions/edit/:id` | SpeechInteractionSingle | Yes | Edit voice command |
| `/robot-settings` | RobotSettingsPage | Yes | Robot configuration |
| `/settings` | Settings | Yes | App settings |
| `/general-settings` | GeneralSettings | Yes | Account settings menu |
| `/general-settings/user-profile` | UserProfilePage | No* | User profile management |
| `/general-settings/mfa` | GeneralSettingsMFA | Yes | MFA configuration |
| `/information` | InformationPage | Yes | EULA and legal info |
| `/pairing` | Pairing | Conditional | Pair new robot |
| `/email/change` | EmailChange | No | Email change confirmation |

### Utility Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/offline-notifications/email-verification` | VerifyRobotContact | Verify notification email |
| `/offline-notifications/email-unsubscribe` | UnsubscribeRobotContact | Unsubscribe from notifications |
| `/delete-account/success` | DeleteUserAccountSuccess | Account deletion confirmation |
| `/error` | Error | Generic error page |

## Feature Modules

### Core Features

| Feature | Location | Description |
|---------|----------|-------------|
| **auth** | `features/auth/` | Login, signup, password flows, MFA |
| **overview** | `features/overview/` | Schedule calendar (daily/weekly view) |
| **task** | `features/task/` | Task scheduler (music, scripts, reminders) |
| **music** | `features/music/` | Music upload, playlists, song management |
| **mScripts** | `features/mScripts/` | Tessa scripts editor and overview |
| **speechInteraction** | `features/speechInteraction/` | Custom voice commands |
| **robotSettings** | `features/robotSettings/` | Robot profile and settings |
| **generalSettings** | `features/generalSettings/` | User profile, robot users, MFA |

### Supporting Features

| Feature | Location | Description |
|---------|----------|-------------|
| **pairing** | `features/pairing/` | Robot pairing flow |
| **invite** | `features/invite/` | User invite handling |
| **directSpeech** | `features/directSpeech/` | Send direct messages |
| **offlineNotifications** | `features/offlineNotifications/` | Offline alert configuration |
| **permissions** | `features/permissions/` | Permission management |
| **appNotifications** | `features/appNotifications/` | In-app notifications |
| **information** | `features/information/` | EULA display |

## API Integration

The app communicates with multiple TinyBots backend microservices via REST APIs. API URLs are configured in `src/common/constants/urls/urls.json`.

### Backend Services

| Service | Base URL Key | Purpose |
|---------|--------------|---------|
| **prowl** | `prowl` | User accounts, auth, MFA, password management |
| **checkpoint** | `checkpoint` | Robot management, user-robot relationships, invites |
| **eve** | `eve` | Schedule management (tasks, recurring events) |
| **soundwave** | `soundwave` | Music collection, playlists |
| **micro_manager** | `micro_manager` | Scripts CRUD, templates, executions |
| **baymax** | `baymax` | Robot configuration, firmware updates |
| **commander_data** | `commander_data` | Robot settings (volume, language, etc.) |
| **custom_commands** | `custom_commands` | Speech interactions |
| **clank** | `clank` | Offline notification contacts |
| **hue** | `hue` | App notifications |
| **marvin** | `marvin` | TTS preview |
| **permissions** | `permissions` | Permission management |
| **robby** | `robby` | Reports |
| **heartbeat** | `heartbeat` | Robot online status |
| **direct_speech** | `direct_speech` | Direct messages to robot |

### API Calls by Screen

#### Login/Auth (`prowl`, `checkpoint`)
- `POST /v3/users/accounts/login` - User login
- `POST /v4/users/accounts/eula-login` - Login with EULA acceptance
- `PUT /v2/users/accounts` - User signup
- `POST /v1/users/accounts/forgotten` - Request password reset
- `POST /v1/users/accounts/reset` - Reset password
- `POST /v1/users/accounts/token` - Refresh token
- `GET /v1/app-users/accounts/self` - Get current user
- `GET /v3/robots/mine` - List user's robots

#### Overview (`eve`)
- `GET /v6/schedules/{robotId}?from=&until=` - Fetch schedule for date range

#### Task (`eve`, `micro_manager`)
- `PUT /v6/schedules/{robotId}` - Create/update task
- `DELETE /v4/schedules/{robotId}` - Delete task
- `GET /v5/scripts/user/robots/{robotId}/scripts` - List scripts for task linking

#### Music (`soundwave`)
- `GET /v1/music/collection/{robotId}` - List music collection
- `GET /v1/music/collection/{robotId}/meta` - Get storage usage
- `POST /v1/music/collection/{robotId}` - Upload songs
- `DELETE /v1/music/collection/{robotId}/{songId}` - Delete song
- `GET /v1/music/playlist/{robotId}` - List playlists
- `PUT /v1/music/playlist/{robotId}` - Create playlist
- `DELETE /v1/music/playlist/{robotId}/{playlistId}` - Delete playlist

#### Scripts (`micro_manager`)
- `GET /v5/scripts/user/robots/{robotId}/scripts` - List scripts
- `GET /v5/scripts/user/robots/{robotId}/scripts/{id}` - Get script detail
- `GET /v3/scripts/user/robots/{robotId}/templates` - List templates
- `PUT /v3/scripts/user/robots/{robotId}/scripts` - Save script
- `PATCH /v2/scripts/.../archive` - Archive script
- `POST /v2/scripts/user/robot/{robotId}/scripts/convert` - Convert v1 to v2

#### Speech Interactions (`custom_commands`)
- `GET /v1/speech-interactions/{robotId}` - List custom commands
- `GET /v1/speech-interactions/{robotId}/{id}` - Get single command
- `PUT /v1/speech-interactions/{robotId}` - Create/update command
- `DELETE /v1/speech-interactions/{robotId}/{id}` - Delete command
- `GET /v1/speech-interactions/{robotId}/default` - List default commands
- `POST /v1/speech-interactions/{robotId}/default/{id}/toggle` - Toggle default command

#### Robot Settings (`commander_data`, `checkpoint`, `baymax`)
- `GET /v5/settingsrobot/user/{robotId}` - Get robot settings
- `PATCH /v5/settingsrobot/user/{robotId}` - Update settings
- `PATCH /v3/robots/accounts/{robotId}/profile` - Update end user name
- `GET /v1/config/{robotId}` - Get robot configuration
- `POST /v1/config/{robotId}/restart` - Install update
- `POST /v1/config/{robotId}/deploy` - Download update

#### User Profile (`prowl`, `checkpoint`)
- `PATCH /v3/users/accounts/self/profile` - Update profile
- `PATCH /v3/users/accounts/self` - Change password, MFA
- `DELETE /v5/users/accounts/self` - Delete account
- `POST /v3/users/accounts/self/email` - Change email
- `GET /v3/users/robots/{robotId}/users` - List robot users

#### Robot Users / Invites (`checkpoint`, `prowl`)
- `GET /v3/users/robots/{robotId}/users` - List users for robot
- `GET /v2/robots/{robotId}/invites` - List pending invites
- `PUT /v2/robots/{robotId}/invites` - Send invite
- `DELETE /v2/robots/{robotId}/invites/{inviteId}` - Cancel invite
- `DELETE /v2/robots/{robotId}/users/{userId}` - Remove user from robot
- `PATCH /v3/robots/{robotId}/users/{userId}` - Change user role

#### Pairing (`checkpoint`)
- `POST /v3/robots/accounts/pair` - Pair robot with code
- `POST /v2/robots/accounts/updatepair` - Update pairing

#### Offline Notifications (`clank`)
- `GET /v1/offline/notification/{robotId}/contacts` - List contacts
- `PUT /v1/offline/notification/{robotId}/contacts` - Add/update contact
- `DELETE /v1/offline/notification/{robotId}/contacts/{id}` - Remove contact
- `PATCH /v1/offline/notification/{robotId}/contacts/{id}/settings` - Update settings

#### Permissions (`permissions`)
- `GET /v1/permissions` - List all permission types
- `GET /v1/permissions/robots/{robotId}` - Get robot permissions
- `PUT /v1/permissions/robots/{robotId}` - Set permissions
- `DELETE /v1/permissions/robots/{robotId}/permissions/{id}` - Remove permission

#### App Notifications (`hue`)
- `GET /v1/notifications` - Get notifications
- `POST /v1/notifications/{uuid}/seen` - Mark as seen

#### Heartbeat (`heartbeat`)
- `GET /v1/heartbeat/status/{robotId}` - Get online status
- `POST /v1/heartbeat/update/{robotId}` - Trigger status update

#### Information (`prowl`)
- `GET /v1/eula/latest` - Get latest EULA
- `GET /v1/eula/{eulaId}` - Get specific EULA
- `POST /v4/users/accounts/self/eula` - Accept EULA

## State Management (Redux)

### Root State Slices

```typescript
interface RootState {
  // Auth
  session: SessionState;
  user: UserState;
  robots: Robot[];
  allRobots: Robot[];
  robotPairing: PairingState;
  robotConfig: RobotConfig;
  
  // Features
  overview: OverviewState;
  task: TaskState;
  tessaScript: TessaScriptState;
  tessaScriptOverview: TessaScriptOverviewState;
  speechInteractionSingle: SpeechInteractionSingleState;
  speechInteractionOverview: SpeechInteractionOverviewState;
  robotSettings: RobotSettingsState;
  robotUser: RobotUserState;
  userProfile: UserProfileState;
  permissions: PermissionsState;
  
  // Music
  musicOverview: MusicOverviewState;
  musicUpload: MusicUploadState;
  selectPlaylist: SelectPlaylistState;
  playlistSelectMusic: PlaylistSelectMusicState;
  playlistSongsSequence: PlaylistSongsSequenceState;
  
  // Other
  directSpeech: DirectSpeechState;
  settings: SettingsState;
  eula: EulaState;
  appNotifications: AppNotificationsState;
  offlineNotifications: OfflineNotificationsState;
  
  // UI
  ui: UIState;
  appTime: AppTimeState;
  heartbeat: HeartbeatState;
  
  // Auth flows
  login: LoginState;
  signup: SignupState;
  pairing: PairingState;
  activate: ActivateState;
  forgotPassword: ForgotPasswordState;
  resetPassword: ResetPasswordState;
  emailChange: EmailChangeState;
  scriptFeedback: ScriptFeedbackState;
}
```

## Development

### Local Setup

```bash
cd projects/tinybots/frontend/ui.r2d2

# Install dependencies (requires Node 24+)
npm install

# Start dev server (port 8081)
npm start
# Opens: http://localhost:8081
# API: https://api.tinybots.academy
```

### Build Commands

| Command | Environment | API Target |
|---------|-------------|------------|
| `npm start` | Local dev | api.tinybots.academy |
| `npm run dev` | Development build | api.tinybots.academy |
| `npm run build` | Production build | api.tinybots.io |

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:react

# Run tests without watch mode
npm run test-runner
```

## Key Patterns

### API URL Helper

```typescript
import { getUrls } from '../common/constants';

// Usage
const url = getUrls('prowl', 'login');
// Returns: "/v3/users/accounts/login"

// With params
const url = getUrls('eve', 'getschedules').replace('{robotId}', robotId);
```

### Private Route HOC

```typescript
// Requires authentication
<PrivateRoute path="/overview" component={Overview} />

// Requires authentication + robot selected
<PrivateRoute path="/music" requiresRobot component={Music} />
```

### Feature Module Structure

```
features/featureName/
├── FeatureName.tsx         # Main component
├── FeatureName.test.tsx    # Tests
├── api/
│   └── index.ts            # API calls
├── redux/
│   ├── reducer.ts          # Redux slice
│   ├── reducer.test.ts
│   ├── types.ts            # TypeScript types
│   └── selectors.ts        # Selectors (optional)
├── components/             # Sub-components
└── utils/                  # Feature-specific utils
```

## Related Documentation

- **Global Overview:** `devdocs/projects/tinybots/OVERVIEW.md`
- **Backend APIs:** Individual service overviews in `devdocs/projects/tinybots/backend/`
- **OpenAPI Specs:** `devdocs/projects/tinybots/backend/tiny-specs/OVERVIEW.md`
