import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './utils/databaseAuth';

// Components
import Navbar from './components/Navbar';
import Auth from './components/Auth';

// Pages
import Home from './pages/Home';
import MyListings from './pages/MyListings';
import PropertyDetails from './pages/PropertyDetails';
import PropertyForm from './pages/PropertyForm';
import Profile from './pages/Profile';

// Private Route Wrapper
const PrivateRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  );

  return user ? children : <Navigate to="/auth" />;
};

// Public Route Wrapper (Redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  );

  return user ? <Navigate to="/my-listings" /> : children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="animate-fade-in">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              }
            />
            <Route path="/property/:id" element={<PropertyDetails />} />

            {/* Protected Routes */}
            <Route
              path="/my-listings"
              element={
                <PrivateRoute>
                  <MyListings />
                </PrivateRoute>
              }
            />
            <Route
              path="/create-announcement"
              element={
                <PrivateRoute>
                  <PropertyForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/edit-property/:id"
              element={
                <PrivateRoute>
                  <PropertyForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>

        <footer className="bg-white border-t border-slate-100 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 font-medium">© 2026 Vita State Manager. All rights reserved.</p>
            <div className="flex justify-center space-x-6 mt-4">
              <a href="#" className="text-slate-300 hover:text-primary-500 transition-colors">Privacy Policy</a>
              <a href="#" className="text-slate-300 hover:text-primary-500 transition-colors">Terms of Service</a>
              <a href="#" className="text-slate-300 hover:text-primary-500 transition-colors">Cookies</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
