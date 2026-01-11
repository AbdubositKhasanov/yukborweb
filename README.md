# 🚀 YukBor Platform v2.0 - Production Ready

O'zbekiston uchun zamonaviy yuk va transport platformasi. React + Vite + PWA.

## ✨ Features

### 🔐 Security
- ✅ Token encryption (production)
- ✅ Input sanitization (XSS protection)
- ✅ CSRF protection ready
- ✅ Secure API calls with interceptors

### ⚡ Performance
- ✅ Code splitting & lazy loading
- ✅ PWA support (offline mode)
- ✅ API caching
- ✅ Optimized bundle size
- ✅ Loading skeletons

### 🎨 UX/UI
- ✅ Toast notifications
- ✅ Error boundaries
- ✅ Form validation (react-hook-form + zod)
- ✅ Responsive design
- ✅ Loading states

### 🧰 Developer Experience
- ✅ ESLint + Prettier
- ✅ Custom React hooks
- ✅ Clean code structure
- ✅ Environment variables
- ✅ Git ignore configured

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment
\`\`\`bash
# Copy .env.example to .env and update values
cp .env.example .env
\`\`\`

Edit `.env`:
\`\`\`env
VITE_API_URL=http://167.172.68.133:8080
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
VITE_ENCRYPTION_KEY=your-secret-key-here
\`\`\`

### 3. Run Development Server
\`\`\`bash
npm run dev
\`\`\`

Opens at: **http://localhost:3000**

### 4. Build for Production
\`\`\`bash
npm run build
npm run preview
\`\`\`

## 📁 Project Structure

\`\`\`
yukbor-platform-v2/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── ErrorBoundary.jsx
│   │   ├── LoadingSkeleton.jsx
│   │   ├── Navigation.jsx
│   │   └── ...
│   ├── pages/          # Route pages
│   │   ├── SearchPage.jsx
│   │   ├── CreateTransportPage.jsx
│   │   └── ...
│   ├── services/       # API services
│   │   └── api.js      # Improved API with caching
│   ├── hooks/          # Custom React hooks
│   │   └── index.js
│   ├── utils/          # Utility functions
│   │   ├── toast.js
│   │   └── sanitize.js
│   ├── context/        # React Context
│   │   └── StaticDataContext.jsx
│   ├── config/         # App configuration
│   │   └── config.js
│   ├── styles/         # Global styles
│   │   └── main.css
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── .eslintrc.cjs       # ESLint config
├── .prettierrc         # Prettier config
├── .gitignore          # Git ignore
├── vite.config.js      # Vite config with PWA
└── package.json        # Dependencies
\`\`\`

## 🛠️ Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
\`\`\`

## 🔌 API Integration

### Backend Configuration
API base URL is configured in `.env`:
\`\`\`env
VITE_API_URL=http://167.172.68.133:8080
\`\`\`

### Available Endpoints
All endpoints from the original project are supported:
- Authentication: `/login/mobile`, `/user/me`
- Search: `/cargos`, `/transports`
- Orders: `/my/orders`, `/create/order`, etc.
- Transports: `/my/transports`, `/create/transport`, etc.
- Harbingers: `/my/harbingers`, `/create/harbinger`, etc.

## 🎯 Custom Hooks

\`\`\`javascript
import { useDebounce, useApi, useForm } from './hooks';

// Debounce search input
const debouncedValue = useDebounce(searchTerm, 500);

// API calls with loading/error states
const { data, loading, error, execute } = useApi(searchCargos);

// Form handling
const { values, errors, handleChange, handleSubmit } = useForm(initialValues);
\`\`\`

## 📱 PWA Support

The app supports Progressive Web App features:
- ✅ Offline mode
- ✅ Install to home screen
- ✅ Service worker caching
- ✅ App manifest

## 🔐 Security Features

### Token Encryption
\`\`\`javascript
// Tokens are automatically encrypted in production
import { setAuthToken } from './services/api';
setAuthToken(token); // Encrypted automatically
\`\`\`

### Input Sanitization
\`\`\`javascript
import { sanitizeInput } from './utils/sanitize';
const clean = sanitizeInput(userInput); // XSS protection
\`\`\`

## 🎨 UI Components

### Toast Notifications
\`\`\`javascript
import { showSuccess, showError, showPromise } from './utils/toast';

showSuccess('Transport yaratildi!');
showError('Xatolik yuz berdi');

// Promise-based
showPromise(
  createTransport(data),
  {
    loading: 'Yaratilmoqda...',
    success: 'Muvaffaqiyatli!',
    error: 'Xatolik yuz berdi'
  }
);
\`\`\`

### Loading Skeletons
\`\`\`javascript
import { CardSkeleton, GridSkeleton } from './components/LoadingSkeleton';

if (loading) {
  return <GridSkeleton count={6} columns={3} />;
}
\`\`\`

## 🚀 Deployment

### Build
\`\`\`bash
npm run build
\`\`\`

Output will be in `dist/` directory.

### Environment Variables
Create `.env.production`:
\`\`\`env
VITE_API_URL=https://api.yukbor.uz
VITE_TELEGRAM_BOT_USERNAME=yukbor_prod_bot
VITE_APP_ENV=production
VITE_ENCRYPTION_KEY=super-secret-production-key
\`\`\`

### Server Configuration (Nginx)
\`\`\`nginx
server {
    listen 80;
    server_name yukbor.uz;
    root /var/www/yukbor/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8080;
    }
}
\`\`\`

## 📊 Code Quality

### ESLint
\`\`\`bash
npm run lint
npm run lint:fix
\`\`\`

### Prettier
\`\`\`bash
npm run format
npm run format:check
\`\`\`

## 🐛 Troubleshooting

### Port Already in Use
\`\`\`bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

### Dependencies Issues
\`\`\`bash
# Clean install
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Build Errors
\`\`\`bash
# Clear cache
npm run build -- --force
\`\`\`

## 📚 Documentation

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [React Hook Form](https://react-hook-form.com)

## ⚡ Performance Tips

1. **Lazy Loading**: All pages are lazy-loaded
2. **Code Splitting**: Vendor chunks are split
3. **API Caching**: Responses are cached for 5 minutes
4. **Image Optimization**: Use WebP format
5. **PWA**: Service worker caches assets

## 🎯 Next Steps

1. ✅ Set up CI/CD pipeline
2. ✅ Add unit tests
3. ✅ Configure monitoring (Sentry)
4. ✅ Add analytics (Google Analytics)
5. ✅ Set up staging environment

## 📝 License

Proprietary - YukBor Platform

## 🤝 Contributing

Contact the development team for contribution guidelines.

---

**Built with ❤️ for Uzbekistan**

Version: 2.0.0 (Production Ready)
