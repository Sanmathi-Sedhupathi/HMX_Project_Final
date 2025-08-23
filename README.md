# HMX - FPV Virtual Tours Platform

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [API Documentation](#api-documentation)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Payment Integration](#payment-integration)
11. [Frontend Components](#frontend-components)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)

## 🚀 Project Overview

**HMX** is a comprehensive FPV (First Person View) virtual tours platform that connects businesses with skilled drone pilots to create immersive visual experiences. The platform serves multiple user types including clients, pilots, editors, and administrators.

### **Tagline:** "Piloting the Future"

### **About HMX**
HMX is a creative drone innovation company specializing in immersive FPV drone walkthroughs that capture the "real vibe" of locations. We bring details to life through cinematic motion for restaurants, resorts, adventure parks, and more. HMX is a movement redefining travel, marketing, and experience in the 21st century by merging storytelling with drone tech.

### **Mission**
To pioneer immersive visual storytelling using advanced FPV drone technology, helping businesses present their spaces and creating opportunities through a pilot-driven franchise model.

### **Vision**
To become the global benchmark for FPV experience marketing, enabling people to explore the world through drones even before stepping out of their homes.

## ✨ Features

### **Core Features**
- **Multi-User Platform**: Support for Clients, Pilots, Editors, and Administrators
- **Booking Management**: Complete booking lifecycle from creation to completion
- **Payment Integration**: PhonePe payment gateway with mock mode for development
- **Video Management**: Upload, processing, and delivery of FPV tour videos
- **Real-time Messaging**: In-app communication between users
- **Referral System**: Commission-based referral program
- **Admin Dashboard**: Comprehensive management interface

### **Industry-Specific Services**
1. **Restaurants & Cafes** - Showcase ambience, seating layout, food presentation
2. **Gaming & Entertainment Zones** - Capture thrill, energy, and fun
3. **Resorts & Farmstays** - Highlight comfort, open spaces, unique features
4. **Showrooms & Retail Spaces** - Present layout, lighting, product arrangement
5. **Real Estate** - Immersive FPV visualizations of properties
6. **Experience Parks & Water Parks** - Feature flights through attractions
7. **Fitness & Sports Arenas** - Show layout, vibe, and action
8. **Unique Local Attractions** - Discover and highlight hidden gems

## 🛠 Technology Stack

### **Frontend**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **Lucide React** - Icons

### **Backend**
- **Python 3.11+** - Programming language
- **Flask** - Web framework
- **SQLite3** - Database
- **PyJWT** - JWT authentication
- **Werkzeug** - Security utilities
- **Requests** - HTTP library
- **Cryptography** - Hashing utilities

### **Payment Gateway**
- **PhonePe API** - Payment processing
- **Mock Mode** - Development testing

## 📁 Project Structure

```
HMX/
├── backend/                 # Backend application
│   ├── app.py              # Main Flask application
│   ├── config.py           # Configuration settings
│   ├── phonepe_payment.py  # PhonePe integration
│   ├── requirements.txt    # Python dependencies
│   ├── create_admin.py     # Admin user creation
│   └── hmx.db             # SQLite database
├── src/                    # Frontend application
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── data/              # Static data
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── public/                # Static assets
├── package.json           # Node.js dependencies
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── README.md             # This documentation
```

## 🚀 Installation & Setup

### **Prerequisites**
- Node.js 18+ and npm
- Python 3.11+
- Git

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd HMX
```

### **2. Backend Setup**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python app.py
```

### **3. Frontend Setup**
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### **4. Create Admin User**
```bash
cd backend
python create_admin.py
```

## ⚙️ Configuration

### **Environment Variables**
Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=sqlite:///hmx.db

# JWT Secret
JWT_SECRET_KEY=your-secret-key-here

# PhonePe Configuration (Optional)
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes
PHONEPE_REDIRECT_URL=http://localhost:5173/payment/callback

# Server Configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

### **PhonePe Integration**
The platform supports both real PhonePe API and mock mode:

- **Mock Mode** (Default): Perfect for development and testing
- **Production Mode**: Requires valid PhonePe merchant credentials

## 🗄️ Database Schema

### **Core Tables**

#### **users**
- `id` (Primary Key)
- `email` (Unique)
- `password_hash`
- `role` (admin, client, pilot, editor)
- `name`, `phone`, `address`
- `created_at`, `updated_at`

#### **pilots**
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `experience_years`
- `specializations`
- `equipment_details`
- `availability_status`

#### **editors**
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `skills`
- `portfolio_links`
- `availability_status`

#### **bookings**
- `id` (Primary Key)
- `client_id` (Foreign Key)
- `pilot_id` (Foreign Key)
- `editor_id` (Foreign Key)
- `service_type`
- `location_details`
- `base_cost`, `final_cost`
- `status` (pending, in_progress, completed, cancelled)
- `created_at`, `updated_at`

#### **payments**
- `id` (Primary Key)
- `booking_id` (Foreign Key)
- `amount`
- `status` (pending, completed, failed, refunded)
- `payment_method`
- `merchant_transaction_id`
- `phonepe_transaction_id`
- `payment_gateway`
- `gateway_response`
- `created_at`

#### **videos**
- `id` (Primary Key)
- `booking_id` (Foreign Key)
- `file_path`
- `duration`
- `file_size`
- `status` (uploading, processing, completed, failed)
- `created_at`

#### **messages**
- `id` (Primary Key)
- `sender_id` (Foreign Key)
- `receiver_id` (Foreign Key)
- `booking_id` (Foreign Key)
- `content`
- `is_read`
- `created_at`

#### **referrals**
- `id` (Primary Key)
- `referrer_id` (Foreign Key)
- `referred_user_id` (Foreign Key)
- `commission_amount`
- `status` (pending, paid)
- `created_at`

## 📡 API Documentation

### **Authentication Endpoints**

#### **POST /api/auth/register**
Register a new user account.
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890",
  "role": "client"
}
```

#### **POST /api/auth/login**
Authenticate user and get JWT token.
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### **GET /api/auth/verify**
Verify JWT token and get user info.

### **Booking Endpoints**

#### **POST /api/bookings**
Create a new booking.
```json
{
  "service_type": "restaurant",
  "location_details": "123 Main St, City",
  "preferred_date": "2024-01-15",
  "special_requirements": "Include outdoor seating area"
}
```

#### **GET /api/bookings**
Get user's bookings (filtered by role).

#### **PUT /api/bookings/{id}**
Update booking details.

#### **DELETE /api/bookings/{id}**
Cancel a booking.

### **Payment Endpoints**

#### **POST /api/payment/initiate**
Initiate PhonePe payment.
```json
{
  "booking_id": 123,
  "amount": 5000
}
```

#### **POST /api/payment/callback**
Handle PhonePe payment callback.

#### **GET /api/payment/status/{merchant_transaction_id}**
Check payment status.

#### **POST /api/payment/refund**
Process refund (admin only).

### **Video Endpoints**

#### **POST /api/videos/upload**
Upload video file.

#### **GET /api/videos/{booking_id}**
Get videos for a booking.

#### **PUT /api/videos/{id}**
Update video details.

### **Messaging Endpoints**

#### **POST /api/messages**
Send a message.
```json
{
  "receiver_id": 456,
  "booking_id": 123,
  "content": "Hello, when can we schedule the shoot?"
}
```

#### **GET /api/messages/{booking_id}**
Get messages for a booking.

#### **PUT /api/messages/{id}/read**
Mark message as read.

## 👥 User Roles & Permissions

### **Client**
- Create and manage bookings
- Make payments
- View and download videos
- Send messages to pilots/editors
- View booking history

### **Pilot**
- View assigned bookings
- Update booking status
- Upload raw video files
- Communicate with clients
- Manage availability

### **Editor**
- View assigned video editing tasks
- Upload processed videos
- Communicate with clients
- Manage portfolio

### **Admin**
- Manage all users
- Oversee all bookings
- Process refunds
- View analytics and reports
- System configuration

## 💳 Payment Integration

### **PhonePe Integration**
The platform integrates with PhonePe payment gateway:

#### **Features**
- Payment initiation
- Status checking
- Callback handling
- Refund processing
- Mock mode for development

#### **Payment Flow**
1. Client initiates payment
2. System creates PhonePe payment request
3. Client redirected to PhonePe
4. Payment processed
5. Callback updates booking status
6. Video processing begins

#### **Mock Mode**
For development and testing:
- Simulates complete payment flow
- No real credentials required
- Realistic response simulation
- Database integration maintained

## 🎨 Frontend Components

### **Core Components**

#### **Layout Components**
- `Navbar` - Navigation with role-based menu
- `Layout` - Main layout wrapper
- `Footer` - Site footer

#### **Authentication**
- `LoginPage` - User login
- `SignupPage` - User registration
- `PilotSignupPage` - Pilot registration
- `ReferralSignupPage` - Referral registration

#### **Dashboard Components**
- `AdminDashboard` - Admin management interface
- `ClientDashboard` - Client booking management
- `PilotDashboard` - Pilot task management
- `EditorDashboard` - Editor task management

#### **Payment Components**
- `PhonePePayment` - Payment modal
- `PaymentCallbackPage` - Payment result page

### **Page Structure**
- **Public Pages**: Home, About, FAQ, Industries
- **Authentication**: Login, Signup pages
- **Dashboard Pages**: Role-specific dashboards
- **Utility Pages**: 404, Payment callback

## 🚀 Deployment

### **Development**
```bash
# Backend
cd backend
python app.py

# Frontend
npm run dev
```

### **Production Build**
```bash
# Build frontend
npm run build

# Serve with production server
npm run preview
```

### **Environment Setup**
1. Set production environment variables
2. Configure production database
3. Set up SSL certificates
4. Configure domain and DNS
5. Set up monitoring and logging

### **Recommended Hosting**
- **Backend**: Heroku, DigitalOcean, AWS
- **Frontend**: Vercel, Netlify, AWS S3
- **Database**: PostgreSQL (production), SQLite (development)

## 🔧 Troubleshooting

### **Common Issues**

#### **Backend Issues**
1. **Database Connection Error**
   - Check database file permissions
   - Verify database path in config

2. **JWT Token Issues**
   - Verify JWT_SECRET_KEY is set
   - Check token expiration

3. **PhonePe Integration**
   - Verify credentials in config
   - Check mock mode settings

#### **Frontend Issues**
1. **Build Errors**
   - Clear node_modules and reinstall
   - Check TypeScript errors

2. **API Connection**
   - Verify backend URL in api.ts
   - Check CORS configuration

### **Debug Mode**
Enable debug logging:
```python
# backend/app.py
app.run(debug=True, port=5000)
```

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### **Code Standards**
- Follow TypeScript best practices
- Use consistent formatting
- Add proper documentation
- Write unit tests

### **Testing**
```bash
# Backend tests
python -m pytest

# Frontend tests
npm test
```

## 📞 Support

For technical support or questions:
- Check the troubleshooting section
- Review API documentation
- Contact the development team

## 📄 License

This project is proprietary software. All rights reserved.

---

**HMX - Piloting the Future** 🚁
