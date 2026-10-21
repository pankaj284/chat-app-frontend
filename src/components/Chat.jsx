import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Chat.css';
import { socket } from '../socket';   // fixed typo

function Chat() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef(null);   // moved UP

    // Auth guard
    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo) {
            navigate('/login');
        } else {
            setUser(userInfo);
        }
    }, [navigate]);

    // Socket connect
    useEffect(() => {
        if (!user) return;

        socket.connect();
        socket.emit("setup", user);

        socket.on("connected", () => console.log("✅ Socket connected"));

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Fetch chats
    useEffect(() => {
        if (!user) return;

        const fetchChats = async () => {
            try {
                const { data } = await api.get('/chats');
                setChats(data);
            } catch (err) {
                console.error('Failed to fetch chats:', err);
            } finally {
                setLoadingChats(false);
            }
        };

        fetchChats();
    }, [user]);

    // Fetch messages for selected chat
    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/messages/${selectedChat._id}`);
                setMessages(data);
            } catch (err) {
                console.error('Failed to load messages:', err);
            }
        };

        fetchMessages();
    }, [selectedChat]);

    // Receive messages in real-time
    // Receive messages in real-time
    useEffect(() => {
        const handler = (newMessageReceived) => {
            const incomingChatId = newMessageReceived.chatId._id;

            // 1. If this chat is currently open → append message
            if (selectedChat && incomingChatId === selectedChat._id) {
                setMessages((prev) => [...prev, newMessageReceived]);
            }

            // 2. Update the sidebar — find the chat, update preview, move to top
            setChats((prevChats) => {
                const chatExists = prevChats.find((c) => c._id === incomingChatId);

                if (chatExists) {
                    // Remove from current position, update latestMessage, put at top
                    const updated = prevChats.map((c) =>
                        c._id === incomingChatId
                            ? { ...c, latestMessage: newMessageReceived }
                            : c
                    );
                    updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    return updated;
                }

                // 3. Chat doesn't exist in sidebar yet — someone new messaged you
                // We only have the chatId reference in the message, not the full chat object
                // So we need to fetch the full chat from backend
                const fetchFullChat = async () => {
                    try {
                        const { data } = await api.get('/chats');
                        return data;
                    } catch (err) {
                        console.error('Failed to fetch chats:', err);
                        return prevChats;
                    }
                };
                fetchFullChat().then(setChats);
                return prevChats;
            });
        };

        socket.on("message received", handler);
        return () => socket.off("message received", handler);
    }, [selectedChat]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message — OUTSIDE useEffect now
    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        const content = newMessage;
        setNewMessage('');

        try {
            const { data } = await api.post('/messages', {
                content,
                chatId: selectedChat._id,
            });
            setMessages((prev) => [...prev, data]);
            socket.emit('new message', data);
        } catch (err) {
            console.error('Failed to send:', err);
        }
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        navigate('/login');
    };

    const getOtherUser = (chat) => {
        return chat.participants.find((p) => p._id !== user._id);
    };

    // Fetch all users when modal opens
    useEffect(() => {
        if (!showModal) return;

        const fetchUsers = async () => {
            try {
                const { data } = await api.get('/users');
                setAllUsers(data);
            } catch (err) {
                console.error('Failed to fetch users:', err);
            }
        };

        fetchUsers();
    }, [showModal]);

    // Open a chat with a clicked user
    const startChat = async (userId) => {
        try {
            const { data } = await api.post('/chats', { userId });

            // If chat already in sidebar → just select it
            // If it's new → add to list and select it
            setChats((prev) => {
                const exists = prev.find((c) => c._id === data._id);
                return exists ? prev : [data, ...prev];
            });

            setSelectedChat(data);
            setShowModal(false);
        } catch (err) {
            console.error('Failed to start chat:', err);
        }
    };

    if (!user) return null;   // last return — all hooks above it ✅

    return (
        <div className={`chat-page ${selectedChat ? 'chat-open' : ''}`}>

            {/* NEW CHAT MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Start a new chat</h3>
                        <input
                            className="modal-search"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <div className="user-list-modal">
                            {allUsers.length === 0 ? (
                                <p style={{ color: '#666', fontSize: '14px', padding: '12px' }}>
                                    Loading users...
                                </p>
                            ) : (
                                allUsers
                                    .filter((u) =>
                                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        u.username.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((u) => (
                                        <div
                                            key={u._id}
                                            className="user-item-modal"
                                            onClick={() => startChat(u._id)}
                                        >
                                            {u.name} <span style={{ color: '#666' }}>@{u.username}</span>
                                        </div>
                                    ))
                            )}
                        </div>

                        <button className="close-btn" onClick={() => setShowModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>{user.name}</h2>
                    <button onClick={logout} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>

                <div className="sidebar-search">
                    <input placeholder="Search or start new chat" />
                </div>

                <div className="chat-list">
                    {loadingChats ? (
                        <p style={{ padding: '20px', color: '#666', fontSize: '14px' }}>Loading chats...</p>
                    ) : chats.length === 0 ? (
                        <p style={{ padding: '20px', color: '#666', fontSize: '14px' }}>No chats yet. Click + to start one.</p>
                    ) : (
                        chats.map((chat) => {
                            const other = getOtherUser(chat);
                            return (
                                <div
                                    key={chat._id}
                                    className={`chat-list-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                                    onClick={() => setSelectedChat(chat)}
                                >
                                    <div className="chat-list-item-name">{other?.name || 'Unknown'}</div>
                                    <div className="chat-list-item-preview">
                                        {chat.latestMessage?.text || 'No messages yet'}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="new-chat-btn"
                >
                    +
                </button>
            </div>

            {/* CHAT WINDOW */}
            <div className="chat-window">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <button className="back-btn" onClick={() => setSelectedChat(null)}>
                                ←
                            </button>
                            <h2>{getOtherUser(selectedChat)?.name}</h2>
                        </div>
                        <div className="messages-area">
                            {messages.length === 0 ? (
                                <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
                                    No messages yet. Say hi!
                                </p>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg._id}
                                        className={`message ${msg.senderId._id === user._id ? 'own' : 'other'}`}
                                    >
                                        {msg.text}
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="message-input-area">
                            <input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)}
                                placeholder="Type a message..."
                            />
                            <button onClick={sendMessage} disabled={!newMessage.trim()}>
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        Select a chat to start messaging
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;