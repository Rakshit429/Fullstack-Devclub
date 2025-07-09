import React from 'react';
import { useAuth } from './context/AuthContext'; // Import the custom hook
import AuthForms from './AuthForms';
import MainApplication from './MainApplication';
import './App.css';

function App() {
  // Get the mongoUser directly from our global context!
  const { mongoUser } = useAuth();
  return (
    <div className="App">
      {mongoUser ? <MainApplication /> : <AuthForms />}
    </div>
  );
}

export default App;