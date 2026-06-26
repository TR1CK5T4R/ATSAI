import app from './src/app.js';
import dotenv from 'dotenv';
import { connectDB } from './src/config/database.js';
import connectMongo from './src/config/mongo.js';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

const startServer = async () => {
    // Connect to Databases
    await connectDB();
    await connectMongo();

    const PORT = process.env.PORT || 3001;

    // Create HTTP server from Express app
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://localhost:3000"],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('send_message', (data) => {
            // Save to MongoDB here using a Message model
            io.emit('receive_message', data);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    // Start server
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful Shutdown
    const exitHandler = () => {
        if (server) {
            server.close(() => {
                console.log('Server closed');
                process.exit(1);
            });
        } else {
            process.exit(1);
        }
    };

    const unexpectedErrorHandler = (error) => {
        console.error(error);
        exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGTERM', () => {
        console.log('SIGTERM received');
        if (server) {
            server.close();
        }
    });
};

startServer();
