# MOE Support Assist - Frontend Client

A modern React-based frontend application for the MOE Support Assist platform, providing an intuitive chat interface for customer support and AI-powered assistance.

## 🚀 Features

- **Real-time Chat Interface**: Interactive chat with AI support agents
- **Multi-mode Support**: Ask and Investigate modes for different use cases
- **Zendesk Integration**: Seamless ticket management and customer support
- **Okta Authentication**: Secure SSO integration
- **Responsive Design**: Modern UI with Tailwind CSS
- **Real-time Streaming**: Live message streaming with SSE
- **Citation Support**: Rich content rendering with source citations
- **Admin Dashboard**: Analytics and session management
- **Announcement System**: Dynamic banner and notification system

## 🛠 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Authentication**: Okta OIDC
- **HTTP Client**: Fetch API with custom service layer
- **Real-time**: Server-Sent Events (SSE)
- **Package Manager**: pnpm

## 📦 Installation

### Prerequisites

- Node.js (v20.11 or higher)
- pnpm (v8 or higher)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Okta OIDC Configuration
   VITE_OKTA_CLIENT_ID=your_client_id
   VITE_OKTA_ISSUER=https://your-domain.okta.com
   VITE_OKTA_REDIRECT_URI=http://localhost:5173/login/callback

   # Zendesk Configuration
   VITE_ZENDESK_DOMAIN=your_domain
   VITE_ZENDESK_API_TOKEN=your_api_token
   VITE_ZENDESK_EMAIL=your_email
   VITE_ZENDESK_SUBDOMAIN=your_domain.zendesk.com

   # API Configuration
   VITE_API_BASE_URL=http://localhost:8000
   VITE_STORAGE_API_BASE_URL=http://localhost:8001
   ```

## 🚀 Development

### Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Linting

```bash
pnpm lint
```

## 🏗 Project Structure

```
src/
├── components/          # React components
│   ├── admin/          # Admin dashboard components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat interface components
│   ├── layout/         # Layout and navigation
│   └── ui/             # Reusable UI components
├── config/             # Configuration files
├── constants/          # Application constants
├── core/               # Core application logic
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API and service layer
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_OKTA_CLIENT_ID` | Okta OIDC client ID | Yes |
| `VITE_OKTA_ISSUER` | Okta issuer URL | Yes |
| `VITE_OKTA_REDIRECT_URI` | OAuth redirect URI | Yes |
| `VITE_ZENDESK_DOMAIN` | Zendesk domain | Yes |
| `VITE_ZENDESK_API_TOKEN` | Zendesk API token | Yes |
| `VITE_ZENDESK_EMAIL` | Zendesk email | Yes |
| `VITE_ZENDESK_SUBDOMAIN` | Zendesk subdomain | Yes |
| `VITE_API_BASE_URL` | Backend API URL | Yes |
| `VITE_STORAGE_API_BASE_URL` | Storage API URL | Yes |

### Features

The application supports various feature flags and configurations:

- **Analytics**: User behavior tracking and analytics
- **Caching**: Intelligent caching for performance
- **Debug Mode**: Enhanced logging and debugging
- **Console Logs**: Development logging controls

## 🐳 Docker

### Build Docker Image

```bash
docker build -t moe-support-client .
```

### Run with Docker

```bash
docker run -p 3000:80 moe-support-client
```

## 📚 API Integration

The frontend integrates with several backend services:

- **Chat API**: Real-time chat functionality
- **Session Storage**: Conversation persistence
- **Admin API**: Analytics and management
- **Zendesk API**: Ticket management
- **Okta API**: Authentication and user management

## 🔒 Security

- Environment variables for sensitive configuration
- Secure token storage
- HTTPS enforcement in production
- Input validation and sanitization
- XSS protection

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Update documentation for API changes
4. Test thoroughly before submitting PRs

## 📄 License

This project is part of the MOE Support Assist platform.

## 🆘 Support

For issues and questions, please contact the development team or create an issue in the repository.
