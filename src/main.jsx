import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

function RootWithBackButton() {
  useEffect(() => {
    const handleBackButton = (e) => {
      // Dispatch custom event for back button
      window.dispatchEvent(new CustomEvent('hardwareBackPress'));
    };

    // Android WebView back button
    document.addEventListener('backbutton', handleBackButton);
    
    return () => {
      document.removeEventListener('backbutton', handleBackButton);
    };
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootWithBackButton />
)