# Privileged Matter Workflow - Backend Implementation

A secure backend for the Privileged Matter Workflow application with JWT authentication, MotherDuck database integration, and Google SSO foundation.

## 🏗️ Architecture

### Backend Structure
```
src/
├── config/
│   ├── database.js       # MotherDuck connection and schema management
│   └── auth.js          # JWT configuration and Google SSO setup
├── middleware/
│   ├── auth.js          # Authentication and authorization middleware
│   └── errorHandler.js  # Centralized error handling
├── controllers/
│   ├── authController.js        # Login, user management
│   ├── matterController.js      # Matter CRUD operations
│   ├── taskController.js        # Task management
│   ├── messageController.js     # Message handling
│   └── extensionController.js   # Browser extension API
├── services/
│   ├── auditService.js          # Audit trail management
│   └── authService.js           # Authorization helpers
└── routes/
    ├── auth.js          # Authentication routes
    ├── matters.js       # Matter routes
    ├── tasks.js         # Task routes
    ├── messages.js      # Message routes
    └── extension.js    # Extension routes
```

## 🔐 Security Features

### Authentication
- **JWT Token-based Authentication**: Stateless tokens with configurable expiration
- **Role-based Access Control**: Attorneys, business users, auditors, and admins
- **Protected Routes**: All API endpoints require valid authentication
- **Token Refresh**: Automatic redirect to login on token expiration

### Authorization
- **Matter Access Control**: Users can only access matters they're members of
- **Role-based Operations**: Only attorneys can create matters and tasks
- **Tenant Isolation**: All data is scoped to user's tenant
- **Audit Trail**: All actions are logged with cryptographic chain

### Security Middleware
- **Helmet**: Security headers and CSP
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: API rate limiting (100 requests per 15 minutes)
- **Input Validation**: Request validation and sanitization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MotherDuck account and API key
- (Optional) Google Cloud Console credentials for SSO

### Installation
```bash
npm install
```

### Configuration
Create a `.env` file based on `.env.example`:

```env
# MotherDuck Configuration
MOTHERDUCK_API_KEY=your_motherduck_api_key_here
MOTHERDUCK_DATABASE=privileged_matter_workflow

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Google SSO Configuration (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*
```

### Running the Server
```bash
npm start
```

The server will start on `http://localhost:3001` with:
- Main app: `http://localhost:3001/`
- Docs demo: `http://localhost:3001/docs/`
- Health check: `http://localhost:3001/health`

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email
- `GET /api/auth/me` - Get current user (protected)
- `GET /api/auth/google` - Get Google SSO URL
- `GET /api/auth/google/callback` - Google SSO callback (placeholder)

### Matters
- `GET /api/matters/bootstrap` - Get initial data (protected)
- `POST /api/matters` - Create matter (protected, attorney only)
- `GET /api/matters/:id` - Get matter details (protected)

### Tasks
- `POST /api/matters/:matterId/tasks` - Create task (protected, attorney only)
- `PATCH /api/tasks/:taskId` - Update task status (protected)

### Messages
- `POST /api/matters/:matterId/messages` - Send message (protected)

### Extension
- `POST /api/extension/events` - Log extension activity (protected)

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Current tests cover:
- Audit hash functionality
- Authentication flow
- Protected endpoint access
- Integration workflows

## 🔮 Google SSO Integration

The backend includes Google SSO foundation. To enable:

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add credentials to `.env` file
3. Implement the callback handler in `src/controllers/authController.js`

The current implementation provides:
- Google auth URL generation
- Callback endpoint structure
- User mapping placeholder

## 🌐 Frontend Integration

### Main Application
- Uses JWT tokens stored in localStorage
- Automatic token inclusion in API requests
- Redirect to login on token expiration
- Logout functionality

### Docs Demo
- Same authentication flow as main app
- Separate login page at `/docs/login.html`
- Shared auth.js library

### Browser Extension
- Background script for token management
- Chrome storage for token persistence
- Automatic token sync from main app
- Disabled user switching (uses authenticated user)

## 📊 Database Schema

All data is stored in MotherDuck with the following tables:
- `tenants` - Organization/tenant data
- `users` - User accounts with Google ID support
- `matters` - Legal matters with privilege labels
- `matter_members` - Matter access control
- `tasks` - Structured tasks with workflow states
- `messages` - Matter-scoped communication
- `audit_events` - Cryptographic audit trail

## 🛡️ Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Change JWT_SECRET in production** - Use strong, random secrets
3. **Enable HTTPS in production** - Protect token transmission
4. **Configure CORS properly** - Restrict to trusted origins
5. **Use environment-specific configs** - Different settings for dev/prod
6. **Monitor rate limiting** - Adjust based on usage patterns
7. **Regular security audits** - Review dependencies and configurations

## 🚧 Future Enhancements

- Complete Google SSO implementation
- Password hashing with bcrypt (currently demo mode)
- Refresh token implementation
- Session management
- API rate limiting per user
- Input validation library integration
- Comprehensive logging
- Database connection pooling
- API documentation (Swagger/OpenAPI)

## 📝 License

Private project - All rights reserved