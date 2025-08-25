import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // WebSocket connection
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  
  // Chat state
  const [chats, setChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [currentMessages, setCurrentMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  
  // Configuration
  const [config, setConfig] = useState({
    type: "ask_anything",
    tenant_name: "gold_v1.com",
    stage: "01 Nurture (pre-pipeline)",
    stage_type: "Competition",
    meeting_id: "demo_memory_1",
    text: "Trevor (Transform AI's CEO) : Awesome Avinash, let's get started about aviso",
    page_name: "linkedin"
  })
  
  const messagesEndRef = useRef(null)
  
  // Connect to WebSocket
  const connectWebSocket = () => {
    try {
      // Try localhost first, then 0.0.0.0 as fallback
      const wsUrl = 'ws://localhost:8002/halo/ws/1'
      console.log('Attempting to connect to:', wsUrl)
      const websocket = new WebSocket(wsUrl)
      
      websocket.onopen = () => {
        setConnectionStatus('connected')
        console.log('WebSocket connected successfully to:', wsUrl)
      }
      
      websocket.onmessage = (event) => {
        console.log('Received message:', event.data)
        try {
          const response = JSON.parse(event.data)
          addMessage('assistant', response.message || event.data)
          setIsLoading(false)
        } catch (error) {
          addMessage('assistant', event.data)
          setIsLoading(false)
        }
      }
      
      websocket.onclose = () => {
        setConnectionStatus('disconnected')
        console.log('WebSocket disconnected from:', wsUrl)
      }
      
      websocket.onerror = (error) => {
        setConnectionStatus('error')
        console.error('WebSocket error connecting to:', wsUrl, error)
        setIsLoading(false)
      }
      
      setWs(websocket)
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }
  
  // Alternative connection method
  const connectWebSocketAlternative = () => {
    try {
      const wsUrl = 'ws://0.0.0.0:8002/halo/ws/1'
      console.log('Attempting alternative connection to:', wsUrl)
      const websocket = new WebSocket(wsUrl)
      
      websocket.onopen = () => {
        setConnectionStatus('connected')
        console.log('WebSocket connected successfully to:', wsUrl)
      }
      
      websocket.onmessage = (event) => {
        console.log('Received message:', event.data)
        try {
          const response = JSON.parse(event.data)
          addMessage('assistant', response.message || event.data)
          setIsLoading(false)
        } catch (error) {
          addMessage('assistant', event.data)
          setIsLoading(false)
        }
      }
      
      websocket.onclose = () => {
        setConnectionStatus('disconnected')
        console.log('WebSocket disconnected from:', wsUrl)
      }
      
      websocket.onerror = (error) => {
        setConnectionStatus('error')
        console.error('WebSocket error connecting to:', wsUrl, error)
        setIsLoading(false)
      }
      
      setWs(websocket)
    } catch (error) {
      console.error('Failed to create alternative WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }
  
  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (ws) {
      ws.close()
      setWs(null)
    }
  }
  
  // Create new chat
  const createNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date()
    }
    
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setCurrentMessages([])
  }
  
  // Select chat
  const selectChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setCurrentMessages(chat.messages)
    }
  }
  
  // Add message
  const addMessage = (sender, content) => {
    const message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date()
    }
    
    setCurrentMessages(prev => [...prev, message])
    
    // Update chat in chats array
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const updatedMessages = [...chat.messages, message]
        return {
          ...chat,
          messages: updatedMessages,
          title: updatedMessages.length === 1 ? content.substring(0, 30) + '...' : chat.title
        }
      }
      return chat
    }))
  }
  
  // Send message
  const sendMessage = () => {
    if (!inputMessage.trim() || !ws || connectionStatus !== 'connected') return
    
    // Create new chat if none exists
    if (!currentChatId) {
      createNewChat()
    }
    
    // Add user message
    addMessage('user', inputMessage)
    
    // Prepare WebSocket payload
    const payload = {
      ...config,
      question: inputMessage
    }
    
    console.log('Sending payload:', payload)
    // Send to WebSocket
    ws.send(JSON.stringify(payload))
    setIsLoading(true)
    setInputMessage('')
  }
  
  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  // Update config
  const updateConfig = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])
  
  // Auto-connect on mount
  useEffect(() => {
    connectWebSocket()
    return () => disconnectWebSocket()
  }, [])
  
  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button 
            className="new-chat-btn"
            onClick={createNewChat}
          >
            + New Chat
          </button>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
        
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
              onClick={() => selectChat(chat.id)}
            >
              <div className="chat-title">{chat.title}</div>
              <div className="chat-date">
                {chat.createdAt.toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
        
        <div className="sidebar-footer">
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'error' ? 'Error' : 'Disconnected'}
          </div>
          <div className="connection-buttons">
            <button 
              className="connect-btn"
              onClick={connectionStatus === 'connected' ? disconnectWebSocket : connectWebSocket}
            >
              {connectionStatus === 'connected' ? 'Disconnect' : 'Connect (localhost)'}
            </button>
            {connectionStatus !== 'connected' && (
              <button 
                className="connect-btn alt"
                onClick={connectWebSocketAlternative}
              >
                Try 0.0.0.0
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>Halo Chat</h1>
        </header>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <h3>Configuration</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Type:</label>
                <input 
                  value={config.type} 
                  onChange={(e) => updateConfig('type', e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Tenant Name:</label>
                <input 
                  value={config.tenant_name} 
                  onChange={(e) => updateConfig('tenant_name', e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Stage:</label>
                <input 
                  value={config.stage} 
                  onChange={(e) => updateConfig('stage', e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Stage Type:</label>
                <input 
                  value={config.stage_type} 
                  onChange={(e) => updateConfig('stage_type', e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Meeting ID:</label>
                <input 
                  value={config.meeting_id} 
                  onChange={(e) => updateConfig('meeting_id', e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Page Name:</label>
                <input 
                  value={config.page_name} 
                  onChange={(e) => updateConfig('page_name', e.target.value)}
                />
              </div>
              <div className="setting-item full-width">
                <label>Text Context:</label>
                <textarea 
                  value={config.text} 
                  onChange={(e) => updateConfig('text', e.target.value)}
                  rows="3"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Chat Area */}
        <div className="chat-area">
          {currentMessages.length === 0 ? (
            <div className="empty-state">
              <h2>What can I help with?</h2>
              <p>Start a conversation by typing your question below.</p>
            </div>
          ) : (
            <div className="messages">
              {currentMessages.map(message => (
                <div key={message.id} className={`message ${message.sender} ${message.type || 'message'}`}>
                  <div className="message-content">
                    <div className="message-text">
                      {message.sender === 'assistant' ? (
                        <div className="formatted-response">
                          {message.content.split('\n').map((paragraph, index) => {
                            if (paragraph.trim() === '') return <br key={index} />
                            
                            // Handle numbered lists
                            if (/^\d+\./.test(paragraph.trim())) {
                              return (
                                <div key={index} className="numbered-item">
                                  {paragraph.trim()}
                                </div>
                              )
                            }
                            
                            // Handle bullet points
                            if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('• ')) {
                              return (
                                <div key={index} className="bullet-item">
                                  {paragraph.trim()}
                                </div>
                              )
                            }
                            
                            // Handle bold text with **
                            const formattedText = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            
                            return (
                              <p key={index} dangerouslySetInnerHTML={{ __html: formattedText }} />
                            )
                          })}
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything..."
              rows="1"
              disabled={connectionStatus !== 'connected'}
            />
            <button 
              className="send-btn"
              onClick={sendMessage}
              disabled={!inputMessage.trim() || connectionStatus !== 'connected' || isLoading}
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App