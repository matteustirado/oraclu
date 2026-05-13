import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e senha são obrigatórios.' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const user = users[0];
    let isValidPassword = false;

    // TRAVA DE MIGRAÇÃO: Detecta se a senha no banco ainda é texto puro (sem o prefixo $2 do bcrypt)
    if (!user.password_hash.startsWith('$2')) {
      // Senha em texto puro (veio do seed do init.sql)
      if (password === user.password_hash) {
        isValidPassword = true;
        // Criptografa com força 10 e atualiza no banco para os próximos logins
        const hashed = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, user.id]);
        console.log(`[AUTH] Senha do usuário '${username}' migrada para Bcrypt com sucesso.`);
      }
    } else {
      // Senha já está protegida com bcrypt, valida normalmente
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        unit: user.unit 
      },
      process.env.JWT_SECRET,
      { expiresIn: '100y' } // Mantido o padrão de longa duração do Dédalos
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        unit: user.unit
      }
    });
  } catch (error) {
    console.error('[Auth Error]:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};