import './App.css';
import {Route,BrowserRouter as Router,Routes} from "react-router-dom"
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import VideoMeet from "./pages/VideoMeet"
import { AuthProvider } from './contexts/AuthContext';

function App() {

  return (
    <>
      <Router>
      <AuthProvider>

      <Routes>
        <Route path="/" element={<LandingPage/>}/>
        <Route path="/auth" element={<Authentication/>}/>
        <Route path="/:url" element={<VideoMeet/>}/>
      </Routes>

      </AuthProvider>

      </Router>
    </>
  )
}

export default App
