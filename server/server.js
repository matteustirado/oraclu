import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import configureSockets from './src/socket.js';

// Import de Rotas
import authRoutes from './src/routes/authRoutes.js';
import surveyRoutes from './src/routes/surveyRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// Expor pasta de uploads publicamente para as imagens das pesquisas
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Montagem das rotas REST
app.use('/api/auth', authRoutes);
app.use('/api/survey', surveyRoutes);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

configureSockets(io);

const PORT = process.env.PORT || 4040;
server.listen(PORT, () => {
  console.log(`[ORACLU] Servidor rodando na porta ${PORT}`);
});