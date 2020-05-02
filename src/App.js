import React, {useState} from 'react';
import logo from './logo.svg';
import './App.css';
import LoginUI from './LoginUI';
import Profile from './profile'
function App() {
  const [login, setLogin] = useState('');
  return (
    <div className="App container alert alert-secondary">
      <div style={{padding:"30px"}}>
            {login.length === 0 && <LoginUI setLogin={setLogin} />  }
            {login.length > 0 && <Profile  setLogin={setLogin} login={login} />}
      </div>
      
    </div>
  );
}

export default App;
