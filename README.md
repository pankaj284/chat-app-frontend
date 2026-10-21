# Chat App — Frontend

The React + Vite frontend for a real-time MERN chat application. Communicates with the backend via REST APIs and Socket.io for instant message delivery.

**[Live Demo](https://chat-app-frontend-sepia-three.vercel.app)**  
**[Backend Repository](https://github.com/pankaj284/chat-app-backend.git)**

---

## Features

- JWT-based login and registration
- Real-time messaging with Socket.io
- Fully responsive (mobile + desktop)
- User search to start new chats
- Chat history persisted from MongoDB
- Dark mode UI with custom CSS
- Auto-scroll to latest message
- Sidebar auto-updates when new messages arrive

---

## Tech Stack

- **React (Vite)** — UI framework
- **React Router DOM** — Client-side routing
- **Axios** — HTTP requests with JWT interceptor
- **Socket.io Client** — Real-time messaging
- **CSS3** — Custom dark theme + responsive design

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Backend running locally or on Render

### Installation

```bash
git clone https://github.com/pankaj284/chat-app-frontend.git
cd YOUR_FRONTEND_REPO
npm install