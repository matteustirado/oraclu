import pool from '../config/db.js';
import { emitToAll } from '../socket.js';
import axios from 'axios';

const getHojeLocal = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const runAxiosCouponGeneration = async (unit, clientCode, recordId) => {
  const isSP = String(unit).toUpperCase() === 'SP';
  const baseUrl = isSP ? process.env.API_URL_SP : process.env.API_URL_BH;
  const token = isSP ? process.env.API_TOKEN_SP : process.env.API_TOKEN_BH;
  const originUrl = isSP ? "https://www.dedalos.app.br" : "https://www.dedalosbh.app";
  
  const targetUrl = baseUrl.endsWith('/') ? `${baseUrl}api/cupons/` : `${baseUrl}/api/cupons/`;
  const hojeLocal = getHojeLocal();
  const agendadoStr = `${hojeLocal}T00:00:00`;
  
  let payload = {};

  if (isSP) {
    payload = {
      nome: `Pulseira ${clientCode}`,
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
      nome: `Pulseira ${clientCode}`,
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
    console.log(`[AXIOS BACKGROUND] Iniciando geração para ${unit} (Pulseira: ${clientCode})...`);
    
    const headers = {
      "Authorization": `Token ${token}`,
      "Content-Type": "application/json",
      "Origin": originUrl,
      "Referer": `${originUrl}/`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    const response = await axios.post(targetUrl, payload, {
      headers,
      timeout: 10000
    });

    if (response.data && response.data.id) {
      console.log(`[AXIOS BACKGROUND] SUCESSO! Cupom gerado: #${response.data.id}`);
      const conn = await pool.getConnection();
      await conn.query('UPDATE survey_coupons SET status = ?, legacy_coupon_id = ? WHERE id = ?', ['created', response.data.id, recordId]);
      conn.release();
    } else {
      throw new Error('ID missing no retorno da API');
    }
  } catch (error) {
    console.error(`\n[AXIOS CRITICAL ERROR] Falha ao gerar cupom:`);
    console.error(error.response?.data || error.message);
    
    const conn = await pool.getConnection();
    await conn.query('UPDATE survey_coupons SET status = ? WHERE id = ?', ['failed', recordId]);
    conn.release();
  }
};

export const prepareSurvey = async (req, res) => {
  const { unit, client_code } = req.body;
  console.log(`\n[API] Rota /prepare acionada -> Unidade: ${unit} | Pulseira: ${client_code}`);
  
  const hojeLocal = getHojeLocal();
  const connection = await pool.getConnection();

  try {
    const [existing] = await connection.query(
      'SELECT id, status FROM survey_coupons WHERE unit = ? AND client_code = ? AND operation_date = ?',
      [unit, client_code, hojeLocal]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'failed') {
        console.log(`[API] Pulseira ${client_code} falhou antes. Tentando gerar novamente via Axios...`);
        await connection.query('UPDATE survey_coupons SET status = ? WHERE id = ?', ['pending', existing[0].id]);
        runAxiosCouponGeneration(unit, client_code, existing[0].id);
        return res.status(200).json({ status: 'pending' });
      }
      console.log(`[API] Pulseira ${client_code} já possui cupom com status: ${existing[0].status}`);
      return res.status(200).json({ status: existing[0].status });
    }

    const [insertResult] = await connection.query(
      'INSERT INTO survey_coupons (unit, client_code, operation_date, status) VALUES (?, ?, ?, ?)',
      [unit, client_code, hojeLocal, 'pending']
    );

    console.log(`[API] Registro pendente criado. Acionando Axios em background...`);
    runAxiosCouponGeneration(unit, client_code, insertResult.insertId);

    res.status(200).json({ status: 'pending' });
  } catch (error) {
    console.error(`[API ERROR] Falha na rota /prepare:`, error);
    res.status(500).json({ error: 'Erro no prepare' });
  } finally {
    connection.release();
  }
};

export const createPreset = async (req, res) => {
  const { unit, title, pages } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [presetResult] = await connection.query('INSERT INTO survey_presets (title, unit) VALUES (?, ?)', [title, unit]);
    const presetId = presetResult.insertId;
    for (const page of pages) {
      let orderIndex = 0;
      for (const q of page.questions) {
        await connection.query(
          `INSERT INTO survey_questions (preset_id, page_number, question_text, question_type, image_a_url, image_b_url, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    const [presets] = await pool.query('SELECT * FROM survey_presets WHERE unit = ? AND is_deleted = 0 ORDER BY created_at DESC', [unit]);
    for (let preset of presets) {
      const [questions] = await pool.query('SELECT * FROM survey_questions WHERE preset_id = ? ORDER BY page_number ASC, order_index ASC', [preset.id]);
      const pagesMap = {};
      questions.forEach(q => {
        if (!pagesMap[q.page_number]) pagesMap[q.page_number] = { id: q.page_number, questions: [] };
        pagesMap[q.page_number].questions.push({ id: q.id, text: q.question_text, type: q.question_type, imgA: q.image_a_url, imgB: q.image_b_url });
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
  const { unit } = req.params;
  try {
    const [activePresets] = await pool.query('SELECT * FROM survey_presets WHERE unit = ? AND is_active = 1 LIMIT 1', [unit]);
    if (activePresets.length === 0) return res.status(404).json(null);
    const preset = activePresets[0];
    const [questions] = await pool.query('SELECT * FROM survey_questions WHERE preset_id = ? ORDER BY page_number ASC, order_index ASC', [preset.id]);
    const pagesMap = {};
    questions.forEach(q => {
      if (!pagesMap[q.page_number]) pagesMap[q.page_number] = { id: q.page_number, questions: [] };
      pagesMap[q.page_number].questions.push({ id: q.id, text: q.question_text, type: q.question_type, imgA: q.image_a_url, imgB: q.image_b_url });
    });
    preset.pages = Object.values(pagesMap);
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pesquisa ativa.' });
  }
};

export const saveResponse = async (req, res) => {
  const { preset_id, client_code, unit, answers } = req.body;
  console.log(`\n[API] Rota /responses acionada -> Salvando respostas da pulseira: ${client_code}`);
  
  const hojeLocal = getHojeLocal();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    
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

    let couponCode = null;
    let couponFailed = false;

    console.log(`[API] Entrando em loop de espera (Max 15s)...`);
    for (let i = 0; i < 15; i++) {
      const [rows] = await connection.query(
        'SELECT status, legacy_coupon_id FROM survey_coupons WHERE unit = ? AND client_code = ? AND operation_date = ?',
        [unit, client_code, hojeLocal]
      );

      if (rows.length > 0) {
        if (rows[0].status === 'created') {
          couponCode = `#${rows[0].legacy_coupon_id}`;
          console.log(`[API] Cupom encontrado no banco: ${couponCode}`);
          break;
        } else if (rows[0].status === 'failed') {
          console.log(`[API] A tarefa de background falhou.`);
          couponFailed = true;
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!couponCode && !couponFailed) {
      console.log(`[API] Timeout excedido.`);
      couponFailed = true;
    }

    res.status(201).json({ 
      message: 'Avaliação salva com sucesso.',
      coupon: couponCode,
      couponFailed: couponFailed
    });

  } catch (error) {
    await connection.rollback();
    console.error(`[API ERROR] Falha ao salvar resposta:`, error);
    res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  } finally {
    connection.release();
  }
};

export const getReportSummary = async (req, res) => {
  const { unit, month, year } = req.query;
  try {
    let queryParams = [month, year];
    let unitFilter = '';
    if (unit && unit !== 'TODOS') {
      unitFilter = 'AND p.unit = ?';
      queryParams.push(unit);
    }
    const [surveys] = await pool.query(`
      SELECT p.id, p.title, p.unit, COUNT(DISTINCT r.id) as total_responses, COUNT(DISTINCT q.id) as total_questions
      FROM survey_presets p
      LEFT JOIN survey_responses r ON p.id = r.preset_id AND MONTH(r.created_at) = ? AND YEAR(r.created_at) = ?
      LEFT JOIN survey_questions q ON p.id = q.preset_id
      WHERE p.is_deleted = 0 ${unitFilter}
      GROUP BY p.id HAVING total_responses > 0 OR p.is_active = 1
      ORDER BY p.created_at DESC
    `, queryParams);
    res.json(surveys);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar resumo.' });
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
      SELECT id, client_code, created_at FROM survey_responses 
      WHERE preset_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ? ${unitFilter}
      ORDER BY created_at DESC
    `, queryParams);

    for (let response of responses) {
      const [answers] = await pool.query(`
        SELECT a.answer_value, q.question_text, q.question_type FROM survey_answers a
        JOIN survey_questions q ON a.question_id = q.id
        WHERE a.response_id = ? ORDER BY q.page_number ASC, q.order_index ASC
      `, [response.id]);
      response.answers = answers;
    }
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};