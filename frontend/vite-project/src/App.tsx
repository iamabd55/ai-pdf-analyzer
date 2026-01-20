import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import OpenChat from './pages/OpenChat';

function App() {
  return (
    <Router>
      <div className="bg-background-light dark:bg-background-dark text-[#101318] dark:text-white min-h-screen flex flex-col">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<OpenChat />} />
          </Routes>
        </main>
        
      </div>
    </Router>
  );
}

export default App;