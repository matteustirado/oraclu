import pool from '../config/db.js';
import { emitToAll } from '../socket.js';
import axios from 'axios';

let dbChecked = false;
const ensureDbUpdates = async () => {
  if (dbChecked) return;
  try {
    const conn = await pool.getConnection();
    // Migração 1: Nome do cliente nas respostas
    await conn.query('ALTER TABLE survey_responses ADD COLUMN client_name VARCHAR(100) DEFAULT NULL').catch(() => {});
    
    // Migração 2: Tabela de Páginas Condicionais e Títulos
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        preset_id INT NOT NULL,
        page_number INT NOT NULL,
        title VARCHAR(255) DEFAULT '',
        is_conditional BOOLEAN DEFAULT FALSE,
        cond_question_id INT DEFAULT NULL,
        cond_value VARCHAR(50) DEFAULT NULL
      )
    `).catch(() => {});
    
    conn.release();
  } catch (e) {}
  dbChecked = true;
};

const getHojeLocal = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const fetchClientName = async (baseUrl, token, clientCode) => {
  try {
    const endpoint = baseUrl.endsWith('/') ? `${baseUrl}api/entradasOne/${clientCode}/` : `${baseUrl}/api/entradasOne/${clientCode}/`;
    const response = await axios.get(endpoint, {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 5000
    });
    const data = response.data;
    return data.nome || data.name || data.nome_cliente || data.cliente || `Pulseira ${clientCode}`;
  } catch (error) {
    return `Pulseira ${clientCode}`;
  }
};

const runAxiosCouponGeneration = async (unit, clientCode, recordId) => {
  const isSP = String(unit).toUpperCase() === 'SP';
  const baseUrl = isSP ? process.env.API_URL_SP : process.env.API_URL_BH;
  const token = isSP ? process.env.API_TOKEN_SP : process.env.API_TOKEN_BH;
  
  let targetUrl = "";
  if (isSP) {
    targetUrl = "https://www.dedalos.app.br/api/proxy/api/cupons/";
  } else {
    targetUrl = baseUrl.endsWith('/') ? `${baseUrl}api/cupons/` : `${baseUrl}/api/cupons/`;
  }

  const hojeLocal = getHojeLocal();
  const agendadoStr = `${hojeLocal}T00:00:00`;
  
  const nomeCliente = await fetchClientName(baseUrl, token, clientCode);
  
  let payload = {};

  if (isSP) {
    payload = {
      nome: nomeCliente,
      idUser: 1,
      tipoCupom: 8,
      tipo: "Benefício Pesquisa de Satisfação",
      agendado: agendadoStr,
      descontos: "Entrada promocional por pesquisa de satisfação",
      valor: 0,
      dia: [1],
      regra1: "Entrada promocional liberada após responder a pesquisa",
      desconto1: "0",
      regra2: "Válido somente na data de emissão",
      desconto2: "",
      regra3: "Uso único e intransferível",
      desconto3: "",
      regra4: "", desconto4: "",
      regra5: "", desconto5: "",
      regra6: null, desconto6: null,
      novo: true, ativo: true, local: "SP",
      codigo: "", nome_amigo: "", nome_amigo2: "",
      homenageado: false, quarta_top: false, mao_amiga: false, signo: false
    };
  } else {
    const aplicarDesconto = (valor, percentual = 10) => {
      const centavos = Math.round(Number(valor) * 100);
      const finalCentavos = Math.round(centavos * (100 - percentual) / 100);
      return (finalCentavos / 100).toFixed(2);
    };

    const desconto1 = aplicarDesconto(23.99, 10);
    const desconto2 = aplicarDesconto(29.99, 10);
    const desconto3 = aplicarDesconto(33.99, 10);

    payload = {
      nome: nomeCliente,
      idUser: 1,
      tipoCupom: 8,
      tipo: "Benefício Pesquisa de Satisfação",
      agendado: agendadoStr,
      descontos: "Entrada promocional por pesquisa de satisfação",
      valor: desconto3,
      dia: [1],
      regra1: "Entrada promocional liberada após responder a pesquisa",
      desconto1: desconto1,
      regra2: "Entrada promocional liberada após responder a pesquisa",
      desconto2: desconto2,
      regra3: "Entrada promocional liberada após responder a pesquisa",
      desconto3: desconto3,
      regra4: "", desconto4: "",
      regra5: "", desconto5: "",
      regra6: null, desconto6: null,
      novo: true, ativo: true, local: "BH",
      codigo: "", nome_amigo: "", nome_amigo2: "",
      homenageado: true, pesquisa: true, signo: false, instagram: false, quarta_top: false, mao_amiga: false
    };
  }

  try {
    const headers = {
      "Authorization": `Token ${token}`,
      "Content-Type": "application/json",
      "Cookie": `dedalos_app.token=${token}; dedalos_app.id_user=1`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    const response = await axios.post(targetUrl, payload, {
      headers,
      timeout: 15000
    });

    if (response.data && response.data.id) {
      const conn = await pool.getConnection();
      await conn.query('UPDATE survey_coupons SET status = ?, legacy_coupon_id = ? WHERE id = ?', ['created', response.data.id, recordId]);
      conn.release();
    } else {
      throw new Error('ID missing');
    }
  } catch (error) {
    const conn = await pool.getConnection();
    await conn.query('UPDATE survey_coupons SET status = ? WHERE id = ?', ['failed', recordId]);
    conn.release();
  }
};

export const prepareSurvey = async (req, res) => {
  await ensureDbUpdates();
  const { unit, client_code } = req.body;
  const hojeLocal = getHojeLocal();
  const connection = await pool.getConnection();

  try {
    const [existing] = await connection.query(
      'SELECT id, status, legacy_coupon_id FROM survey_coupons WHERE unit = ? AND client_code = ? AND operation_date = ?',
      [unit, client_code, hojeLocal]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'failed') {
        await connection.query('UPDATE survey_coupons SET status = ? WHERE id = ?', ['pending', existing[0].id]);
        runAxiosCouponGeneration(unit, client_code, existing[0].id);
        return res.status(200).json({ status: 'pending' });
      }
      return res.status(200).json({ 
        status: existing[0].status,
        coupon: existing[0].legacy_coupon_id ? `#${existing[0].legacy_coupon_id}` : null
      });
    }

    const [insertResult] = await connection.query(
      'INSERT INTO survey_coupons (unit, client_code, operation_date, status) VALUES (?, ?, ?, ?)',
      [unit, client_code, hojeLocal, 'pending']
    );

    runAxiosCouponGeneration(unit, client_code, insertResult.insertId);
    res.status(200).json({ status: 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Erro no prepare' });
  } finally {
    connection.release();
  }
};

export const createPreset = async (req, res) => {
  await ensureDbUpdates();
  const { unit, title, pages } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [presetResult] = await connection.query('INSERT INTO survey_presets (title, unit) VALUES (?, ?)', [title, unit]);
    const presetId = presetResult.insertId;
    
    // Dicionário para traduzir IDs temporários do Frontend em IDs reais do Banco de Dados
    const idMap = {};

    // 1. Salva as perguntas primeiro para gerar os IDs
    for (const page of pages) {
      let orderIndex = 0;
      for (const q of page.questions) {
        const [qRes] = await connection.query(
          `INSERT INTO survey_questions (preset_id, page_number, question_text, question_type, image_a_url, image_b_url, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [presetId, page.id, q.text, q.type, q.imgA || null, q.imgB || null, orderIndex]
        );
        idMap[String(q.id)] = qRes.insertId;
        orderIndex++;
      }
    }

    // 2. Salva as configurações da página (com a regra condicional já traduzida)
    for (const page of pages) {
      let finalCondId = null;
      if (page.isConditional && page.condQuestionId) {
        finalCondId = idMap[String(page.condQuestionId)] || null;
      }
      
      await connection.query(
        'INSERT INTO survey_pages (preset_id, page_number, title, is_conditional, cond_question_id, cond_value) VALUES (?, ?, ?, ?, ?, ?)',
        [presetId, page.id, page.title || '', page.isConditional ? 1 : 0, finalCondId, page.condValue || '']
      );
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
  await ensureDbUpdates();
  const { unit } = req.params;
  try {
    const [presets] = await pool.query('SELECT * FROM survey_presets WHERE unit = ? AND is_deleted = 0 ORDER BY created_at DESC', [unit]);
    
    for (let preset of presets) {
      const [pagesData] = await pool.query('SELECT * FROM survey_pages WHERE preset_id = ? ORDER BY page_number ASC', [preset.id]);
      const [questions] = await pool.query('SELECT * FROM survey_questions WHERE preset_id = ? ORDER BY page_number ASC, order_index ASC', [preset.id]);
      
      const pagesMap = {};
      
      // Carrega as configurações das páginas
      pagesData.forEach(p => {
        pagesMap[p.page_number] = {
          id: p.page_number,
          title: p.title,
          isConditional: p.is_conditional === 1,
          condQuestionId: p.cond_question_id,
          condValue: p.cond_value,
          questions: []
        };
      });

      // Carrega as perguntas para dentro de suas respectivas páginas
      questions.forEach(q => {
        if (!pagesMap[q.page_number]) {
          pagesMap[q.page_number] = { id: q.page_number, title: '', isConditional: false, condQuestionId: null, condValue: '', questions: [] };
        }
        pagesMap[q.page_number].questions.push({ 
          id: q.id, 
          text: q.question_text, 
          type: q.question_type, 
          imgA: q.image_a_url, 
          imgB: q.image_b_url 
        });
      });
      
      preset.pages = Object.values(pagesMap).sort((a, b) => a.id - b.id);
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
    emitToAll('survey_active_updated', { unit });
    res.json({ message: 'Pesquisa ativada nos terminais.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Erro ao ativar a pesquisa.' });
  } finally {
    connection.release();
  }
};

export const getActivePreset = async (req, res) => {
  await ensureDbUpdates();
  const { unit } = req.params;
  try {
    const [activePresets] = await pool.query('SELECT * FROM survey_presets WHERE unit = ? AND is_active = 1 LIMIT 1', [unit]);
    if (activePresets.length === 0) return res.status(404).json(null);
    const preset = activePresets[0];
    
    const [pagesData] = await pool.query('SELECT * FROM survey_pages WHERE preset_id = ? ORDER BY page_number ASC', [preset.id]);
    const [questions] = await pool.query('SELECT * FROM survey_questions WHERE preset_id = ? ORDER BY page_number ASC, order_index ASC', [preset.id]);
    
    const pagesMap = {};
    
    pagesData.forEach(p => {
      pagesMap[p.page_number] = {
        id: p.page_number,
        title: p.title,
        isConditional: p.is_conditional === 1,
        condQuestionId: p.cond_question_id,
        condValue: p.cond_value,
        questions: []
      };
    });

    questions.forEach(q => {
      if (!pagesMap[q.page_number]) {
        pagesMap[q.page_number] = { id: q.page_number, title: '', isConditional: false, condQuestionId: null, condValue: '', questions: [] };
      }
      pagesMap[q.page_number].questions.push({ 
        id: q.id, 
        text: q.question_text, 
        type: q.question_type, 
        imgA: q.image_a_url, 
        imgB: q.image_b_url 
      });
    });
    
    preset.pages = Object.values(pagesMap).sort((a, b) => a.id - b.id);
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pesquisa ativa.' });
  }
};

export const saveResponse = async (req, res) => {
  await ensureDbUpdates();

  const { preset_id, client_code, unit, answers } = req.body;
  const hojeLocal = getHojeLocal();
  
  const isSP = String(unit).toUpperCase() === 'SP';
  const baseUrl = isSP ? process.env.API_URL_SP : process.env.API_URL_BH;
  const token = isSP ? process.env.API_TOKEN_SP : process.env.API_TOKEN_BH;
  const nomeCliente = await fetchClientName(baseUrl, token, client_code);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    
    const [responseResult] = await connection.query(
      'INSERT INTO survey_responses (preset_id, client_code, unit, client_name) VALUES (?, ?, ?, ?)',
      [preset_id, client_code, unit, nomeCliente]
    );
    const responseId = responseResult.insertId;

    for (const ans of answers) {
      await connection.query(
        'INSERT INTO survey_answers (response_id, question_id, answer_value) VALUES (?, ?, ?)',
        [responseId, ans.question_id, ans.answer_value]
      );
    }
    await connection.commit();

    let couponCode = null;
    let couponFailed = false;

    for (let i = 0; i < 20; i++) {
      const [rows] = await connection.query(
        'SELECT status, legacy_coupon_id FROM survey_coupons WHERE unit = ? AND client_code = ? AND operation_date = ?',
        [unit, client_code, hojeLocal]
      );

      if (rows.length > 0) {
        if (rows[0].status === 'created') {
          couponCode = `#${rows[0].legacy_coupon_id}`;
          break;
        } else if (rows[0].status === 'failed') {
          couponFailed = true;
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!couponCode && !couponFailed) {
      couponFailed = true;
    }

    res.status(201).json({ 
      message: 'Avaliação salva com sucesso.',
      coupon: couponCode,
      couponFailed: couponFailed
    });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  } finally {
    connection.release();
  }
};

export const getReportSummary = async (req, res) => {
  const { unit, month, year } = req.query;
  try {
    let queryParams = [parseInt(month), parseInt(year)];
    let unitFilter = '';
    if (unit && unit !== 'TODOS') {
      unitFilter = 'AND p.unit = ?';
      queryParams.push(unit);
    }
    const [surveys] = await pool.query(`
      SELECT p.id, p.title, p.unit, p.is_active, p.created_at,
             COUNT(DISTINCT r.id) as total_responses, 
             COUNT(DISTINCT q.id) as total_questions
      FROM survey_presets p
      LEFT JOIN survey_responses r ON p.id = r.preset_id AND MONTH(r.created_at) = ? AND YEAR(r.created_at) = ?
      LEFT JOIN survey_questions q ON p.id = q.preset_id
      WHERE p.is_deleted = 0 ${unitFilter}
      GROUP BY p.id, p.title, p.unit, p.is_active, p.created_at
      HAVING total_responses > 0 OR p.is_active = 1
      ORDER BY p.created_at DESC
    `, queryParams);
    res.json(surveys);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar resumo.' });
  }
};

export const getReportDetails = async (req, res) => {
  await ensureDbUpdates();

  const { id } = req.params;
  const { unit, month, year } = req.query;
  try {
    let queryParams = [id, parseInt(month), parseInt(year)];
    let unitFilter = '';
    if (unit && unit !== 'TODOS') {
      unitFilter = 'AND r.unit = ?';
      queryParams.push(unit);
    }
    const [responses] = await pool.query(`
      SELECT 
        r.id, r.client_code, r.unit, r.created_at, r.client_name, 
        c.legacy_coupon_id as coupon
      FROM survey_responses r
      LEFT JOIN survey_coupons c 
        ON r.client_code = c.client_code 
        AND DATE(r.created_at) = c.operation_date 
        AND r.unit = c.unit
      WHERE r.preset_id = ? AND MONTH(r.created_at) = ? AND YEAR(r.created_at) = ? ${unitFilter}
      ORDER BY r.created_at DESC
    `, queryParams);

    for (let response of responses) {
      if (!response.client_name) {
        const isSP = String(response.unit).toUpperCase() === 'SP';
        const baseUrl = isSP ? process.env.API_URL_SP : process.env.API_URL_BH;
        const token = isSP ? process.env.API_TOKEN_SP : process.env.API_TOKEN_BH;
        response.client_name = await fetchClientName(baseUrl, token, response.client_code);
        
        try {
          await pool.query('UPDATE survey_responses SET client_name = ? WHERE id = ?', [response.client_name, response.id]);
        } catch (e) {}
      }
      
      response.coupon = response.coupon ? `#${response.coupon}` : 'Não gerado';

      const [answers] = await pool.query(`
        SELECT a.answer_value, q.question_text, q.question_type 
        FROM survey_answers a
        JOIN survey_questions q ON a.question_id = q.id
        WHERE a.response_id = ? ORDER BY q.page_number ASC, q.order_index ASC
      `, [response.id]);
      response.answers = answers;
    }
    res.json(responses);
  } catch (error) {
    console.error('[API ERROR] getReportDetails:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};