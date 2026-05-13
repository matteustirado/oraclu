import db from './config/db.js';

let ioInstance;

export default function configureSockets(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket] Oraclu conectado: ${socket.id}`);

    socket.on('survey_validate_client', async ({ clientCode }) => {
      try {
        if (!clientCode || clientCode.trim() === '') {
          return socket.emit('survey_validation_error', { message: 'Código de cliente inválido.' });
        }

        const cleanCode = clientCode.trim().toUpperCase();

        const [rows] = await db.execute(
          'SELECT id FROM vouchers WHERE client_code = ?',
          [cleanCode]
        );

        if (rows.length > 0) {
          return socket.emit('survey_validation_error', { message: 'Este código já resgatou um voucher.' });
        }

        socket.emit('survey_client_validated', { clientCode: cleanCode });
      } catch (error) {
        console.error('[Survey Validate Error]:', error);
        socket.emit('survey_validation_error', { message: 'Erro interno na validação.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Oraclu desconectado: ${socket.id}`);
    });
  });
}

export const emitToAll = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};