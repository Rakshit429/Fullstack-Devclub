import React, { useState, useEffect } from 'react';
import axios from 'axios'; // We use axios to make the API call
import './App.css';

function App() {
  // 'useState' creates a state variable to hold the message we get from the backend
  const [message, setMessage] = useState('Loading...');
  const [secondMessage, setSecondMessage] = useState(''); // This is an extra state variable for future use

  // 'useEffect' is a hook that runs code after the component renders.
  // The empty array [] at the end means it will only run ONCE, when the component first loads.
  useEffect(() => {
    // We make an API call to our backend server.
    // NOTE: Make sure your backend server is running!
    axios.get('http://localhost:5000/api/message')
      .then(response => {
        // When we get a successful response, we update the message state
        setMessage(response.data.message);
      })
      .catch(error => {
        // If there's an error, we display a friendly error message
        console.error('There was an error fetching the data!', error);
        setMessage('Could not connect to the backend. Is it running?');
      });
    // This is an additional API call for future use
    axios.get('http://localhost:5000/api/second-message')
      .then(response => {
        // Update the second message state
        setSecondMessage(response.data.message);
      })
      .catch(error => {
        console.error('There was an error fetching the second message!', error);
      });
  }, []); // The empty array is crucial!

  return (
    <div className="App">
      <header className="App-header">
        <h1>CAIC Full-Stack Chat App</h1>
        <p>Message from Server:</p>
        {/* This will display the message from our state */}
        <p className="server-message">{message}</p>
        <p className="server-message">{secondMessage}</p>
      </header>
    </div>
  );
}

export default App;