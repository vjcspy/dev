# wonkers-dash-admin - TinyBots Admin Dashboard

## Purpose

Internal admin dashboard for TinyBots staff to manage robots, TaaS orders, organisations, subscriptions, and voice assistant devices. Supports order lifecycle management, device enrollment, and analytics.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| AngularJS | 1.7.x | Routing, shell, legacy components |
| React | 16.14.x | Modern UI components |
| ngreact | 0.5.x | React-Angular bridge |
| TypeScript | 4.5.x | Type safety |
| Redux Toolkit | 1.6.x | State management (React) |
| Material-UI | 4.12.x | Component library |
| Webpack | 4.x | Bundler |
| Satellizer | 0.15.x | Angular auth library |
| i18next | 20.x | Internationalization |
| styled-components | 5.x | CSS-in-JS |
| dymojs | 1.2.x | Label printing |
| exceljs | 4.x | Excel file parsing |

> **Architecture Note:** Hybrid AngularJS + React application. AngularJS handles routing via UI-Router. React components are wrapped via `ngreact` for use in Angular templates.

## Source Code Location

```
projects/tinybots/frontend/wonkers-dash-admin/
```

## Project Structure

```
src/
├── index.html              # Entry HTML
├── app/
│   ├── root.js             # Angular app bootstrap
│   ├── root.config.js      # Angular config (auth, interceptors)
│   ├── common/
│   │   ├── app.module.js   # Main app module
│   │   ├── redux/          # Redux store setup
│   │   ├── hooks/          # Custom React hooks
│   │   ├── tb-core/        # Core Angular services
│   │   └── utilities/      # Shared utilities, constants
│   └── components/         # Feature modules (see below)
├── localization/           # i18n translations
├── styles/                 # Global SCSS styles
├── tools/                  # Utility tools (Dymo labels, Excel parser)
└── assets/                 # Static assets
```

## Routes & Screens

### Auth Routes (Public)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/login` | login | Admin login |
| `/login-mfa` | loginMfa | MFA verification during login |
| `/set-mfa` | setMfaPage | MFA setup for new admins |

### Protected Routes (Auth Required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/overview` | overviewPage | Main dashboard — robots, subscriptions overview |
| `/orders` | orderOverviewPage | TaaS orders management |
| `/organisations` | organisations | Organisation and subscription management |
| `/dashtransfer` | dashtransferPage | Dashboard transfer tool |
| `/voice-assistant-enrollment` | voiceAssistantEnrollmentPage | Voice assistant device enrollment |
| `/custom-query-page` | customQueryPage | Custom GraphQL analytics queries |
| `/data-group` | dataGroupPage | Data group analytics |
| `/data-group-overview` | dataGroupOverviewPage | Data group overview |

## Feature Modules

| Feature | Location | Description |
|---------|----------|-------------|
| **auth** | `components/auth/` | Login, MFA setup/verification, SSO |
| **overview** | `components/overview/` | Robot/subscription dashboard with search and filtering |
| **orders** | `components/orders/` | TaaS order lifecycle — create, accept, decline, ship, return |
| **organisations** | `components/organisations/` | Organisation management, admin accounts, invites |
| **dashtransfer** | `components/dashtransfer/` | Transfer dashboard ownership |
| **voice-assistant-enrollment** | `components/voice-assistant-enrollment/` | Android voice assistant device enrollment with QR |
| **analytics** | `components/analytics/` | Custom GraphQL queries, data groups |
| **heartbeat** | `components/heartbeat/` | Robot online status monitoring |

## API Integration

### Backend Services

The app communicates with TinyBots admin APIs. URLs are configured in `src/app/common/utilities/constants/constants.module.ts`.

| Service | URL Pattern | Purpose |
|---------|-------------|---------|
| **wonkers (admin auth)** | `/v3/admin/accounts/*` | Admin login, token refresh, MFA |
| **admin** | `/v3/admin/*`, `/v4/admin/*`, `/v6/admin/*` | All admin operations |
| **prowl** | `/v1/passwords/analysis` | Password strength analysis |
| **graphql** | `/v4/dashboard/graphql` | Analytics queries |

### API Calls by Feature

#### Auth (`wonkers`)
- `POST /v3/admin/accounts/login` - Admin login
- `POST /v3/admin/accounts/token` - Refresh token
- `POST /v3/admin/accounts/mfa` - Setup MFA
- `POST /v2/dashboard/accounts/verifypassword` - Verify password
- `GET /v3/openid/oauth/signin/microsoft` - Microsoft SSO signin
- `GET /v3/openid/oauth/signup/microsoft` - Microsoft SSO signup

#### Overview (`admin`)
- `GET /v4/admin/overview` - Dashboard overview data
- `GET /v3/admin/robots` - List robots
- `GET /v4/admin/robots` - List robots (v4)
- `GET /v2/admin/robots/{robotId}/status` - Robot status
- `GET /v3/admin/robots/{robotId}/account` - Robot account details
- `GET /v3/admin/subscriptions` - List subscriptions
- `GET /v3/admin/chains` - List chains
- `GET /v2/admin/relations` - List relations

#### TaaS Orders (`admin`)
- `GET /v6/admin/taas-orders` - List orders
- `GET /v6/admin/taas-orders/{id}` - Get order details
- `POST /v6/admin/taas-orders` - Create order
- `PATCH /v6/admin/taas-orders/{id}` - Update order (track & trace, notes)
- `POST /v6/admin/taas-orders/{id}/status/accept` - Accept order
- `POST /v6/admin/taas-orders/{id}/status/decline` - Decline order
- `POST /v6/admin/taas-orders/{id}/status/delivered` - Mark delivered
- `POST /v6/admin/taas-orders/{id}/status/ship` - Link robot and ship
- `POST /v6/admin/taas-orders/{id}/return` - Create return
- `POST /v6/admin/taas-orders/{id}/status/accept-return` - Accept return
- `POST /v6/admin/taas-orders/{id}/status/reject-return` - Reject return

#### Order/Return Concepts (`admin`)
- `GET /v6/admin/taas-orders/concepts/orders` - Search order concepts
- `GET /v6/admin/taas-orders/concepts/orders/{id}` - Get order concept
- `GET /v6/admin/taas-orders/concepts/returns` - Search return concepts
- `GET /v6/admin/taas-orders/concepts/returns/{id}` - Get return concept
- `POST /v4/admin/taas-orders/concepts/retrieve` - Retrieve concepts from source

#### Organisations (`admin`)
- `GET /v3/admin/accounts/relations/{relationId}` - List organisation admin accounts
- `POST /v2/admin/invite` - Send admin invite
- `DELETE /v3/admin/accounts?email=` - Delete admin account (super user)
- `GET /v2/admin/relations?email=` - Get relations by email

#### TaaS Link (`admin`)
- `POST /v4/admin/taas/{taasId}/link` - Link TaaS subscription
- `DELETE /v3/admin/taas` - Delete TaaS

#### Voice Assistant Enrollment (`admin`)
- `GET /v1/android-devices/devices` - List voice assistant devices
- `GET /v1/android-devices/qr` - Get enrollment QR code

#### Dashboard Transfer (`admin`)
- `POST /v3/admin/transfer` - Transfer dashboard ownership

#### Analytics (`graphql`)
- `POST /v4/dashboard/graphql` - Execute GraphQL queries

## State Management (Redux)

### Root State Slices

```typescript
interface RootState {
  orderOverview: OrderOverviewState;      // Orders list and filters
  overview: OverviewState;                // Main dashboard data
  detailed: DetailedState;                // Robot/subscription details
  dashtransfer: DashtransferState;        // Transfer tool state
  ordersDetailed: OrdersDetailedState;    // Order detail view
  orderConcept: OrderConceptState;        // Create order flow
  orderReturn: OrderReturnState;          // Create return flow
  organisationAccounts: OrganisationAccountsState;  // Org admin accounts
  voiceAssistantDevices: VoiceAssistantDevicesState; // Device enrollment
  dataGroup: DataGroupState;              // Analytics data groups
}
```

## Development

### Local Setup

```bash
cd projects/tinybots/frontend/wonkers-dash-admin

# Install dependencies
yarn install

# Start dev server (port 8080)
yarn start
# Opens: http://localhost:8080
# API: https://api.tinybots.academy
```

### Build Commands

| Command | Environment | API Target | Output |
|---------|-------------|------------|--------|
| `yarn start` | Local dev | api.tinybots.academy | Dev server |
| `yarn dev` | Development | api.tinybots.academy | dist/ (unminified) |
| `yarn build` | Production | api.tinybots.io | dist/ (minified) |

### Testing

```bash
# Run all tests (Karma + Jest)
yarn test

# Lint TypeScript files
yarn lint

# Fix lint issues
yarn lint:fix
```

## Key Patterns

### React-Angular Bridge (ngreact)

React components are wrapped for use in Angular:

```javascript
// In Angular module
import { MyReactComponent } from './MyReactComponent'

angular.module('myModule', [])
  .value('MyReactComponent', MyReactComponent)  // Register React component
  .directive('myReactComponent', ['reactDirective', (reactDirective) =>
    reactDirective('MyReactComponent')          // Create Angular directive
  ])
```

```html
<!-- In Angular template -->
<my-react-component props="$ctrl.data"></my-react-component>
```

### API URL Constants

```typescript
import { URLS } from '../common/utilities/constants/constants.module'

// Usage
const url = URLS.admin.taasOrders  // "/v6/admin/taas-orders"
const url = `${URLS.admin.taasOrders}/${orderId}/status/accept`
```

### HTTP Error Handling

```typescript
import { parseHttpError } from '../common/utilities/errorHandling'

// All API calls wrap with error handler
$http.get<T>(url).catch(parseHttpError)
```

### Feature Module Structure

```
components/featureName/
├── featureName.module.js     # Angular module with route config
├── featureName.component.js  # Angular wrapper component
├── FeatureName/
│   ├── FeatureName.tsx       # Main React component
│   ├── FeatureName.module.js # ngreact bridge module
│   └── FeatureName.test.tsx  # Tests
├── types/                    # TypeScript types
├── redux/
│   ├── reducer.ts            # Redux slice
│   ├── api.ts                # API calls
│   ├── thunks.ts             # Async thunks
│   └── selectors.ts          # Selectors
└── helpers/                  # Feature utilities
```

## Tools

### Dymo Label Printing

Located in `src/tools/TbDymo/`. Provides label templates for:
- Robot box labels
- MAC address labels
- CPU serial labels

### Excel Parser

Located in `src/tools/excelParser/`. Parses Excel files for bulk operations.

## Related Documentation

- **Global Overview:** `devdocs/projects/tinybots/OVERVIEW.md`
- **Customer Dashboard (ui.r2d2):** `devdocs/projects/tinybots/frontend/ui.r2d2/OVERVIEW.md`
- **Backend TaaS Orders:** `devdocs/projects/tinybots/backend/wonkers-taas-orders/OVERVIEW.md`
- **Backend Admin APIs:** `devdocs/projects/tinybots/backend/wonkers-api/OVERVIEW.md`
