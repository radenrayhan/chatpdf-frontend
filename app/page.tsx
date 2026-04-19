'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      await uploadPDF(acceptedFiles[0]);
      setShowUploader(false);
    },
  });

  const uploadPDF = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload`, formData, {});
      
      setSessionId(response.data.session_id);
      setFileName(response.data.filename);
      
      setMessages([
        {
          id: '1',
          text: `✅ PDF "${response.data.filename}" berhasil diupload! ${response.data.total_pages} halaman diproses. Silakan tanya apapun tentang isi PDF ini.`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Gagal upload PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
     const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        session_id: sessionId,
        question: input,
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Ask error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '❌ Maaf, terjadi kesalahan. Silakan coba lagi.',
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const changeDocument = () => {
    setShowUploader(true);
    if (sessionId) {
      axios.delete(`http://localhost:8000/session/${sessionId}`).catch(console.error);
    }
  };

  const cancelChange = () => {
    setShowUploader(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Contoh pertanyaan yang disarankan
  const suggestions = [
    "Ringkasan dokumen ini apa?",
    "Jelaskan poin-poin pentingnya",
    "Apa kesimpulan dari dokumen?",
    "Buatkan 3 pertanyaan dari materi ini"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header dengan gradient */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-100 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📄</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ChatPDF
              </h1>
              <p className="text-xs text-gray-500">Chat dengan dokumen PDF Anda</p>
            </div>
          </div>
          {sessionId && !showUploader && (
            <button
              onClick={changeDocument}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              🔄 Ganti Dokumen
            </button>
          )}
        </div>
        {fileName && !showUploader && (
          <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
            <span className="text-blue-500">📑</span>
            <span className="font-medium">Active PDF:</span>
            <span className="text-gray-700">{fileName}</span>
          </div>
        )}
      </header>

      {/* Upload Area (kondisional) */}
      {showUploader && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">🔄</div>
                <h2 className="text-2xl font-bold text-gray-800">Ganti Dokumen</h2>
                <p className="text-gray-500 text-sm mt-1">Upload PDF baru untuk memulai chat</p>
              </div>
              <div
                {...getRootProps()}
                className={`border-3 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300
                  ${isDragActive 
                    ? 'border-blue-500 bg-blue-50 scale-105' 
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
              >
                <input {...getInputProps()} />
                <div className="text-7xl mb-4">{isDragActive ? '📂' : '📁'}</div>
                {isDragActive ? (
                  <p className="text-blue-500 font-medium">Lepaskan PDF di sini...</p>
                ) : (
                  <>
                    <p className="text-gray-600 font-medium">Drag & drop PDF di sini</p>
                    <p className="text-sm text-gray-400 mt-2">atau klik untuk memilih file</p>
                  </>
                )}
              </div>
              <button
                onClick={cancelChange}
                className="mt-6 w-full bg-gray-100 text-gray-600 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all duration-300 font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      {sessionId && !showUploader && (
        <>
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl p-4 shadow-md ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                    <div className="flex space-x-2">
                      <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-5">
            <div className="max-w-4xl mx-auto">
              {/* Suggestion Chips */}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Input Form */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Tanyakan tentang isi PDF..."
                  className="flex-1 border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-none font-medium"
                >
                  Kirim ✨
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Initial Upload Area - Tampilan Menarik */}
      {!sessionId && !showUploader && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            {/* Hero Section */}
            <div className="text-center mb-10">
              <div className="text-8xl mb-5 animate-bounce">📄</div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Chat dengan PDF Anda
              </h2>
              <p className="text-gray-500 text-lg">
                Upload dokumen PDF dan mulai bertanya apapun tentang isinya
              </p>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-100 scale-105 shadow-xl' 
                  : 'border-gray-300 bg-white/50 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-xl'
                }`}
            >
              <input {...getInputProps()} />
              <div className="text-7xl mb-5">{isDragActive ? '📂✨' : '📁'}</div>
              {isDragActive ? (
                <p className="text-blue-500 text-lg font-medium">Lepaskan PDF untuk upload...</p>
              ) : (
                <>
                  <p className="text-gray-700 text-lg font-medium mb-2">
                    Drag & drop PDF di sini
                  </p>
                  <p className="text-gray-400">
                    atau <span className="text-blue-500 font-medium">klik untuk memilih file</span>
                  </p>
                </>
              )}
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-md transition-all">
                <div className="text-3xl mb-2">🔒</div>
                <p className="text-sm text-gray-600">Private & Secure</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-md transition-all">
                <div className="text-3xl mb-2">⚡</div>
                <p className="text-sm text-gray-600">Fast Response</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-md transition-all">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-sm text-gray-600">Accurate Answer</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
