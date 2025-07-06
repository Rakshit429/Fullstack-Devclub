import React, { useState, useEffect } from 'react';
import AuthForms from './AuthForms'; // Import the new component
import MainApplication from './MainApplication'; // Import the new component
import './App.css';

function App() {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
  }, []);

	const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUserInfo(null);
  };

	const handleProfileUpdate = (newUserInfo) => {
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    setUserInfo(newUserInfo);
  };
  return (
    <div className="App">
      {userInfo ? (
        <MainApplication userInfo={userInfo} onLogout={handleLogout} onProfileUpdate = {handleProfileUpdate} />
      ) : (
        <AuthForms />
      )}
    </div>
  );
}

export default App;