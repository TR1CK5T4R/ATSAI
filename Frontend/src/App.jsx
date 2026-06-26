import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import Interview from './pages/Interview';
import Results from './pages/Results';
import Courses from './pages/Courses';
import Admin from './pages/Admin';

const App = () => {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#121212',
            color: '#fff',
            border: '1px solid #27272a'
          }
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resume" element={<ResumeUpload />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/results" element={<Results />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        {/* 404 - Redirect to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
