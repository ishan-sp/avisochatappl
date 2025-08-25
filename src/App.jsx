
import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // WebSocket connection
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [pingTimestamp, setPingTimestamp] = useState(null)
  const reconnectTimeoutRef = useRef(null)

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

  // Format message content with proper markdown rendering
  const formatMessageContent = (content) => {
    if (typeof content !== 'string') return content;
    
    // Convert **bold** to <strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  // Connect to WebSocket
  const connectWebSocket = () => {
    // Clear any existing connection
    if (ws) {
      ws.close()
    }

    try {
      // Try multiple possible WebSocket URLs
      const possibleUrls = [
        'ws://localhost:8002/halo/ws/1',
        'ws://127.0.0.1:8002/halo/ws/1',
        'ws://0.0.0.0:8002/halo/ws/1'
      ]
      
      const wsUrl = possibleUrls[0] // Start with localhost
      console.log('Attempting to connect to:', wsUrl)
      setConnectionStatus('connecting')
      
      const websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        setConnectionStatus('connected')
        console.log('WebSocket connected successfully to:', wsUrl)
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      websocket.onmessage = (event) => {
        console.log('Received message:', event.data)
        try {
          const response = JSON.parse(event.data)

          // Handle ping messages - don't add to chat
          if (response.type === 'ping') {
            setPingTimestamp(new Date(response.timestamp * 1000).toLocaleTimeString())
            return
          }

          // Handle regular responses
          if (response.status === 'success' && response.answer) {
            addMessage('assistant', response.answer, 'success')
          } else if (response.message) {
            addMessage('assistant', response.message)
          } else {
            addMessage('assistant', event.data)
          }
          setIsLoading(false)
        } catch (error) {
          console.error('Error parsing message:', error)
          addMessage('assistant', event.data)
          setIsLoading(false)
        }
      }

      websocket.onclose = (event) => {
        setConnectionStatus('disconnected')
        console.log('WebSocket disconnected from:', wsUrl, 'Code:', event.code, 'Reason:', event.reason)
        
        // Don't auto-reconnect if it was a manual disconnect
        if (event.code !== 1000 && event.code !== 1001) {
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...')
            connectWebSocket()
          }, 3000)
        }
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

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Manual disconnect') // Use normal closure code
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
  const addMessage = (sender, content, status = null) => {
    const message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date(),
      status: status // Add status for styling (e.g., 'success')
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
    try {
      ws.send(JSON.stringify(payload))
      setIsLoading(true)
      setInputMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
    }
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
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      disconnectWebSocket()
    }
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

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-grid">
              <label>
                Tenant Name:
                <input
                  type="text"
                  value={config.tenant_name}
                  onChange={(e) => updateConfig('tenant_name', e.target.value)}
                />
              </label>
              <label>
                Stage:
                <input
                  type="text"
                  value={config.stage}
                  onChange={(e) => updateConfig('stage', e.target.value)}
                />
              </label>
              <label>
                Stage Type:
                <input
                  type="text"
                  value={config.stage_type}
                  onChange={(e) => updateConfig('stage_type', e.target.value)}
                />
              </label>
              <label>
                Meeting ID:
                <input
                  type="text"
                  value={config.meeting_id}
                  onChange={(e) => updateConfig('meeting_id', e.target.value)}
                />
              </label>
              <label>
                Text:
                <textarea
                  value={config.text}
                  onChange={(e) => updateConfig('text', e.target.value)}
                  rows="3"
                />
              </label>
              <label>
                Page Name:
                <input
                  type="text"
                  value={config.page_name}
                  onChange={(e) => updateConfig('page_name', e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

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
            <div className="status-dot"></div>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </div>
          <div className="connection-buttons">
            <button
              className="connect-btn"
              onClick={connectionStatus === 'connected' ? disconnectWebSocket : connectWebSocket}
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connected' ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        {/* Header */}
        <div className="chat-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>WebSocket Chat</h1>
          
          {/* Ping Status Box */}
          {pingTimestamp && (
            <div className="ping-status">
              <span className="ping-dot"></span>
              Last ping: {pingTimestamp}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          {currentMessages.map(message => (
            <div key={message.id} className={`message ${message.sender}`}>
              <div className={`message-content ${message.status || ''}`}>
                {message.status === 'success' && (
                  <div className="success-indicator">
                    <span className="success-dot"></span>
                    Success
                  </div>
                )}
                <div 
                  className="message-text"
                  dangerouslySetInnerHTML={{
                    __html: formatMessageContent(message.content)
                  }}
                />
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content loading">
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
