# 🐣 Tamagotchi Web Revive

A modern, web-based Tamagotchi game built with Node.js, Express, PostgreSQL, and vanilla JavaScript. Raise your digital pet in the browser with real-time stats, evolution system, and beautiful UI!

## ✨ Features

- **🐣 Complete Pet Lifecycle**: From egg to adult with realistic evolution stages
- **📊 Real-time Stats**: Hunger, happiness, hygiene, health, discipline, and energy
- **⏰ Passive Degradation**: Stats decrease over time when not cared for
- **🎮 Interactive Actions**: Feed, play, clean, heal, discipline, and sleep
- **🔄 Evolution System**: Pets evolve based on care quality and time
- **💀 Death & Revival**: Pets can die from neglect, but you can start fresh
- **🔐 User Authentication**: Secure login/signup with JWT tokens
- **📱 Responsive Design**: Beautiful UI that works on all devices
- **⚡ Background Jobs**: Automated pet care and evolution checks
- **🎨 Modern UI**: Glassmorphism design with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tamagotchi-web-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tamagotchi_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb tamagotchi_db
   
   # Run the schema
   psql -d tamagotchi_db -f database/schema.sql
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` and start raising your digital pet!

## 🎮 How to Play

### Getting Started
1. **Sign up** with your email and password
2. **Spawn a pet** by giving it a name
3. **Care for your pet** using the action buttons

### Pet Actions
- **🍽️ Feed**: Increases hunger (+20), decreases hygiene (-5)
- **🎮 Play**: Increases happiness (+15), decreases energy (-10)
- **🛁 Clean**: Increases hygiene (+30)
- **💊 Heal**: Restores health to 100%
- **⚠️ Discipline**: Increases discipline (+10), decreases happiness (-5)
- **😴 Sleep**: Toggles sleep state, affects energy regeneration

### Pet Stages
- **🥚 Egg**: Starting stage, hatches after 6 minutes
- **🐣 Baby**: 0-2 hours old
- **🐤 Child**: 2-8 hours old, requires good care
- **🐥 Teen**: 8-24 hours old, needs discipline
- **🐔 Adult**: 24+ hours old, fully grown
- **💀 Dead**: Any stage, caused by neglect

### Stats System
- **Hunger**: Decreases 10 points per hour
- **Happiness**: Decreases 5 points per hour
- **Hygiene**: Decreases 7 points every 90 minutes
- **Energy**: Decreases 15 points per hour (awake) or 5 points per hour (sleeping)
- **Health**: Decreases when hunger or hygiene reaches 0
- **Discipline**: Only increases through discipline action

## 🏗️ Architecture

### Backend Structure
```
├── config/
│   └── database.js          # PostgreSQL connection
├── models/
│   ├── User.js             # User authentication model
│   └── Tamagotchi.js       # Pet game logic model
├── middleware/
│   └── auth.js             # JWT authentication
├── routes/
│   ├── auth.js             # Authentication endpoints
│   └── pet.js              # Pet management endpoints
├── database/
│   └── schema.sql          # Database schema
└── server.js               # Main Express server
```

### Frontend Structure
```
├── public/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Modern CSS with animations
│   └── app.js              # JavaScript game logic
```

### API Endpoints

#### Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/login` - User login
- `GET /auth/logout` - User logout

#### Pet Management
- `GET /pet` - Get current pet state
- `POST /pet/spawn` - Create new pet
- `POST /pet/action/:type` - Perform action (feed, play, clean, heal, discipline)
- `POST /pet/sleep` - Toggle sleep state
- `POST /pet/revive` - Start new life after death

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

### Background Jobs
- **Pet Care Check**: Every 6 hours, forces death for inactive pets (72+ hours)
- **Evolution Check**: Daily at midnight, processes pet evolution

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Express-validator for all inputs
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries

## 🎨 UI/UX Features

- **Glassmorphism Design**: Modern glass-like interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Smooth Animations**: CSS transitions and transforms
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Toast Notifications**: User feedback for actions
- **Loading States**: Visual feedback during API calls
- **Color-coded Stats**: Visual indicators for pet health

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production` in environment
2. Configure production database
3. Set secure JWT secret
4. Configure CORS for your domain
5. Use PM2 or similar for process management

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes!

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `createdb tamagotchi_db`

**Port Already in Use**
- Change `PORT` in `.env` file
- Or kill process using port 3000

**CORS Errors**
- Ensure frontend URL is allowed in CORS configuration
- Check browser console for specific errors

**Pet Not Updating**
- Check browser console for API errors
- Verify JWT token is valid
- Check server logs for errors

## 🎯 Future Enhancements

- [ ] Multiple pet types with different characteristics
- [ ] Pet accessories and customization
- [ ] Social features (pet playdates)
- [ ] Achievement system
- [ ] Pet breeding mechanics
- [ ] Mobile app version
- [ ] Real-time multiplayer features
- [ ] Pet marketplace

---

**Happy Pet Raising! 🐣✨** 