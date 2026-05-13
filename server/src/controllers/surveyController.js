import pool from '../config/db.js';
import { emitToAll } from '../socket.js';
import axios from 'axios';

// ==========================================
// FUNÇÃO AUXILIAR: GERAR CUPOM 10%
// ==========================================
const generateSurveyCoupon = async (unit, clientCode) => {
  const unitUpper = String(unit).toUpperCase();
  const isSP = unitUpper === 'SP';
  
  // Puxa as credenciais do .env (as mesmas do Jukebox/Golden Locker)
  const baseUrl = isSP 
    ? (process.env.VITE_API_URL_SP || process.env.API_URL_SP)
    : (process.env.VITE_API_URL_BH || process.env.API_URL_BH);
    
  const token = isSP 
    ? (process.env.VITE_API_TOKEN_SP || process.env.API_TOKEN_SP)
    : (process.env.VITE_API_TOKEN_BH || process.env.API_TOKEN_BH);

  if (!baseUrl || !token) {
    throw new Error(`Credenciais da API do Sistema Mãe ausentes para a unidade ${unitUpper}`);
  }

  const couponsUrl = baseUrl.endsWith('/') ? `${baseUrl}api/cupons/` : `${baseUrl}/api/cupons/`;
  
  // Pegamos o ID da categoria via .env (Se não tiver, cai pro 11 do VIP para não quebrar)
  const categoryId = process.env.SURVEY_COUPON_ID ? parseInt(process.env.SURVEY_COUPON_ID, 10) : 11;
  const todayStr = new Date().toISOString().split('T')[0] + 'T00:00:00';

  const payload = {
    "tipoCupom": categoryId,
    "nome": `[ORACLU] Pulseira ${clientCode}`, // Nome mascarado para identificar que veio da pesquisa
    "idUser": 1,
    "local": unitUpper,
    "tipo": "Pesquisa de Satisfação",
    "descontos": "10% Off na Entrada",
    "regra1": "Uso único", 
    "desconto1": "10.00", 
    "regra2": "Válido apenas hoje", 
    "desconto2": "",
    "regra3": "Intransferível", 
    "desconto3": "",
    "regra4": "", "desconto4": "",
    "regra5": "", "desconto5": "",
    "regra6": null, "desconto6": null,
    "agendado": todayStr,
    "dia": [1, 2, 3, 4, 5, 6, 7],
    "ativo": true, 
    "novo": true,
    "codigo": "", 
    "nome_amigo": "", 
    "nome_amigo2": "",
    "valor": 0, 
    "homenageado": false, 
    "quarta_top": false,
    "mao_amiga": false, 
    "signo": false
  };

  const response = await axios.post(couponsUrl, payload, {
    headers: {
      "Authorization": `Token ${token}`,
      "Content-Type": "application/json"
    },
    timeout: 10000 // Timeout de 10 segundos
  });
  
  return response.data; // Retorna o JSON do cupom gerado, incluindo o ID
};

// ==========================================
// PRESETS / EDITOR
// ==========================================
export const createPreset = async (req, res) => {
  const { unit, title, pages } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [presetResult] = await connection.query(
      'INSERT INTO survey_presets (title, unit) VALUES (?, ?)',
      [title, unit]
    );
    const presetId = presetResult.insertId;

    for (const page of pages) {
      let orderIndex = 0;
      for (const q of page.questions) {
        await connection.query(
          `INSERT INTO survey_questions 
          (preset_id, page_number, question_text, question_type, image_a_url, image_b_url, order_index) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [presetId, page.id, q.text, q.type, q.imgA || null, q.imgB || null, orderIndex]
        );
        orderIndex++;
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Predefinição salva com sucesso.', id: presetId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Erro ao salvar a predefinição.' });
  } finally {
    connection.release();
  }
};

export const getPresets = async (req, res) => {
  const { unit } = req.params;
  try {
    const [presets] = await pool.query(
      'SELECT * FROM survey_presets WHERE unit = ? AND is_deleted = 0 ORDER BY created_at DESC',
      [unit]
    );

    for (let preset of presets) {
      const [questions] = await pool.query(
        'SELECT * FROM survey_questions WHERE preset_id = ? ORDER BY page_number ASC, order_index ASC',
        [preset.id]
      );

      const pagesMap = {};
      questions.forEach(q => {
        if (!pagesMap[q.page_number]) pagesMap[q.page_number] = { id: q.page_number, questions: [] };
        pagesMap[q.page_number].questions.push({
          id: q.id,
          text: q.question_text,
          type: q.question_type,
          imgA: q.image_a_url,
          imgB: q.image_b_url
        });
      });
      preset.pages = Object.values(pagesMap);
    }
    res.json(presets);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar predefinições.' });
  }
};

export const deletePreset = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE survey_presets SET is_deleted = 1 WHERE id = ?', [id]);
    res.json({ message: 'Predefinição excluída com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir predefinição.' });
  }
};

export const activatePreset = async (req, res) => {
  const { unit, presetId } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('UPDATE survey_presets SET is_active = 0 WHERE unit = ?', [unit]);
    await connection.query('UPDATE survey_presets SET is_active = 1 WHERE id = ? AND unit = ?', [presetId, unit]);
    await connection.commit();

    // Avisa todos os terminais via WebSocket que uma nova pesquisa está ativa
    emitToAll('survey_active_updated', { unit });

    res.json({ message: 'Pesquisa ativada nos terminais.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Erro ao ativar a pesquisa.' });
  } finally {
    connection.release();
  }
};

// =====================================
// DISPLAY & RELATÓRIOS (COM CUPOM)
// =====================================

export const getActivePreset = async (req, res) => {
  const { unit } = req.params;
  try {
    const [activePresets] = await pool.query(
      'SELECT * FROM survey_presets WHERE unit = ? AND is_active = 1 LIMIT 1',
      [unit]
    );

    if (activePresets.length === 0) return res.status(404).json(null);

    const preset = activePresets[0];
    const [questions] = await pool.query(
      'SELECT * FROM survey_questions WHERE preset_id = ? ORDER BY page_number ASC, order_index ASC',
      [preset.id]
    );

    const pagesMap = {};
    questions.forEach(q => {
      if (!pagesMap[q.page_number]) pagesMap[q.page_number] = { id: q.page_number, questions: [] };
      pagesMap[q.page_number].questions.push({
        id: q.id, text: q.question_text, type: q.question_type, imgA: q.image_a_url, imgB: q.image_b_url
      });
    });

    preset.pages = Object.values(pagesMap);
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pesquisa ativa.' });
  }
};

export const saveResponse = async (req, res) => {
  const { preset_id, client_code, unit, answers } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    
    // 1. Salva a resposta do cliente
    const [responseResult] = await connection.query(
      'INSERT INTO survey_responses (preset_id, client_code, unit) VALUES (?, ?, ?)',
      [preset_id, client_code, unit]
    );
    const responseId = responseResult.insertId;

    for (const ans of answers) {
      await connection.query(
        'INSERT INTO survey_answers (response_id, question_id, answer_value) VALUES (?, ?, ?)',
        [responseId, ans.question_id, ans.answer_value]
      );
    }

    await connection.commit();

    // 2. GERAÇÃO DO CUPOM (Fora da transação SQL para não dar rollback se a API externa falhar)
    let couponCode = null;
    try {
      const couponData = await generateSurveyCoupon(unit, client_code);
      if (couponData && couponData.id) {
        // Formata o código para aparecer bonito no tablet (Ex: ORACLU-8392)
        couponCode = `ORACLU-${couponData.id}`;
      }
    } catch (apiError) {
      console.error("[ORACLU] Falha ao gerar cupom no Sistema Mãe:", apiError.response?.data || apiError.message);
      // Se falhar, a pesquisa continua salva. O código de cupom vai como fallback para o frontend.
    }

    res.status(201).json({ 
      message: 'Avaliação salva com sucesso.',
      coupon: couponCode // <- O Frontend pega isso e joga na tela!
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  } finally {
    connection.release();
  }
};

export const getReportSummary = async (req, res) => {
  const { unit, month, year } = req.query;
  try {
    // Filtro dinâmico: se a unit for vazia (TODOS), não usamos o filtro na query.
    let queryParams = [month, year];
    let unitFilter = '';
    
    if (unit && unit !== 'TODOS') {
      unitFilter = 'AND p.unit = ?';
      queryParams.push(unit);
    }

    const [surveys] = await pool.query(`
      SELECT 
        p.id, p.title, p.unit,
        COUNT(DISTINCT r.id) as total_responses,
        COUNT(DISTINCT q.id) as total_questions
      FROM survey_presets p
      LEFT JOIN survey_responses r ON p.id = r.preset_id AND MONTH(r.created_at) = ? AND YEAR(r.created_at) = ?
      LEFT JOIN survey_questions q ON p.id = q.preset_id
      WHERE p.is_deleted = 0 ${unitFilter}
      GROUP BY p.id
      HAVING total_responses > 0 OR p.is_active = 1
      ORDER BY p.created_at DESC
    `, queryParams);

    res.json(surveys);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar resumo de relatórios.' });
  }
};

export const getReportDetails = async (req, res) => {
  const { id } = req.params;
  const { unit, month, year } = req.query;
  try {
    let queryParams = [id, month, year];
    let unitFilter = '';

    if (unit && unit !== 'TODOS') {
      unitFilter = 'AND unit = ?';
      queryParams.push(unit);
    }

    const [responses] = await pool.query(`
      SELECT id, client_code, created_at 
      FROM survey_responses 
      WHERE preset_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ? ${unitFilter}
      ORDER BY created_at DESC
    `, queryParams);

    for (let response of responses) {
      const [answers] = await pool.query(`
        SELECT a.answer_value, q.question_text, q.question_type 
        FROM survey_answers a
        JOIN survey_questions q ON a.question_id = q.id
        WHERE a.response_id = ?
        ORDER BY q.page_number ASC, q.order_index ASC
      `, [response.id]);
      response.answers = answers;
    }

    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar detalhes da pesquisa.' });
  }
};