import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { Calendar, Mic, MicOff, ShieldCheck, Globe, Zap } from 'lucide-react';
import { API_BASE_URL } from './config';



export default function App() {
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('disconnected'); // disconnected, connecting, active
  const [isAgentTalking, setIsAgentTalking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const retellClientRef = useRef(null);

  useEffect(() => {
    // Initialize Retell Client from the imported module
    try {
      retellClientRef.current = new RetellWebClient();

      retellClientRef.current.on("call_started", () => {
        setCallStatus('active');
        setIsCalling(true);
      });

      retellClientRef.current.on("call_ended", () => {
        setCallStatus('disconnected');
        setIsCalling(false);
        setIsAgentTalking(false);
      });

      retellClientRef.current.on("agent_start_talking", () => {
        setIsAgentTalking(true);
      });

      retellClientRef.current.on("agent_stop_talking", () => {
        setIsAgentTalking(false);
      });

      retellClientRef.current.on("error", (err) => {
        console.error("Retell SDK Error:", err);
        setCallStatus('disconnected');
        setIsCalling(false);
        setIsAgentTalking(false);
        setErrorMessage("A connection error occurred.");
      });
    } catch (err) {
      console.error("Failed to initialize RetellClient:", err);
      setErrorMessage("Failed to initialize the voice engine.");
    }

    // Cleanup on component unmount
    return () => {
      if (retellClientRef.current) {
        retellClientRef.current.stopCall();
      }
    };
  }, []);

  const handleToggleCall = async () => {
    setErrorMessage('');
    
    if (isCalling) {
      retellClientRef.current?.stopCall();
    } else {
      setCallStatus('connecting');
      try {
        // Fetch the access token from your Python backend (main.py)
        const response = await fetch(`${API_BASE_URL}api/create-web-call`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Backend failed to provide token");
        
        const data = await response.json();

        if (data.access_token) {
          await retellClientRef.current?.startCall({
            accessToken: data.access_token
          });
        } else {
          throw new Error("Token missing from server response");
        }
      } catch (err) {
        console.error("Call initialization failed:", err);
        setCallStatus('disconnected');
        
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          setErrorMessage("Could not connect to backend. Check your FastAPI server and Vite proxy.");
        } else {
          setErrorMessage("Connection error. Please try again later.");
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200 font-sans flex flex-col items-center justify-center p-6 selection:bg-sky-500/30">
      
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        {/* Branding */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-sky-500 p-2 rounded-xl shadow-lg shadow-sky-500/20">
            <Calendar className="text-[#0B0F1A] w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">Clara<span className="text-sky-500">.ai</span></span>
        </div>

        {/* Main Interaction Hub */}
        <div className="bg-white/5 border border-white/10 rounded-[48px] p-12 backdrop-blur-sm shadow-2xl relative">
          
          {/* Visual Feedback Circle */}
          <div className={`mx-auto w-40 h-40 rounded-full border-2 flex items-center justify-center mb-10 transition-all duration-700 ${
            callStatus === 'active' 
            ? 'border-sky-500 bg-sky-500/10 scale-110 shadow-[0_0_60px_rgba(14,165,233,0.2)]' 
            : 'border-white/10 bg-white/5 shadow-inner'
          }`}>
            {callStatus === 'active' ? (
               <div className="flex gap-1.5 items-end h-10">
                 {[...Array(5)].map((_, i) => (
                   <div 
                    key={i} 
                    className={`w-1.5 bg-sky-400 rounded-full transition-all duration-300 ${isAgentTalking ? 'animate-bounce opacity-100' : 'h-1 opacity-40'}`} 
                    style={{ 
                      animationDelay: `${i * 0.15}s`, 
                      height: isAgentTalking ? `${40 + Math.random() * 60}%` : '4px' 
                    }}
                   />
                 ))}
               </div>
            ) : (
              <Mic className={`w-10 h-10 transition-colors duration-500 ${callStatus === 'connecting' ? 'text-sky-400 animate-pulse' : 'text-slate-600'}`} />
            )}
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
            {callStatus === 'active' ? (isAgentTalking ? "Clara is Speaking" : "Clara is Listening") : callStatus === 'connecting' ? "Connecting..." : "Need to Schedule?"}
          </h1>
          
          <p className="text-slate-400 mb-10 max-w-sm mx-auto leading-relaxed text-balance">
            {callStatus === 'active' 
              ? "Tell Clara your name and what time you'd like to schedule your session." 
              : "Experience the easiest way to schedule. Start a voice conversation with Clara now."}
          </p>

          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm animate-in fade-in slide-in-from-top-2">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleToggleCall}
            disabled={callStatus === 'connecting'}
            className={`group relative w-full flex items-center justify-center gap-3 py-6 rounded-3xl font-bold text-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCalling 
              ? 'bg-rose-500 text-white hover:bg-rose-600' 
              : 'bg-sky-500 text-[#0B0F1A] hover:bg-sky-400 shadow-xl shadow-sky-500/20'
            }`}
          >
            {isCalling ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            {isCalling ? "End Interaction" : callStatus === 'connecting' ? "Connecting..." : "Schedule Meeting"}
            {!isCalling && callStatus !== 'connecting' && (
               <div className="absolute inset-0 rounded-3xl bg-sky-400 animate-pulse opacity-20 pointer-events-none" />
            )}
          </button>
        </div>

        {/* Technical Trust Indicators */}
        <div className="mt-10 flex items-center justify-center gap-8 text-[11px] uppercase font-bold tracking-widest text-slate-600">
          <div className="flex items-center gap-2 group">
            <ShieldCheck className="w-4 h-4 text-sky-500/50 group-hover:text-sky-400 transition-colors" /> End-to-End
          </div>
          <div className="flex items-center gap-2 group">
            <Globe className="w-4 h-4 text-sky-500/50 group-hover:text-sky-400 transition-colors" /> Google Sync
          </div>
          <div className="flex items-center gap-2 group">
            <Zap className="w-4 h-4 text-sky-500/50 group-hover:text-sky-400 transition-colors" /> &lt;100ms Latency
          </div>
        </div>
      </div>

      <footer className="mt-12 text-slate-600 text-sm opacity-50 hover:opacity-100 transition-opacity">
        Built with Retell AI & Google Calendar API
      </footer>
    </div>
  );
}