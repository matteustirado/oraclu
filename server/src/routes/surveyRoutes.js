import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  createPreset, getPresets, deletePreset, activatePreset, 
  getActivePreset, saveResponse, getReportSummary, getReportDetails 
} from '../controllers/surveyController.js';

const router = Router();

// Configuração do Multer para Imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `img-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// CRUD de Predefinições
router.post('/presets', createPreset);
router.get('/presets/:unit', getPresets);
router.delete('/presets/:id', deletePreset);

// Ativação e Display Ao Vivo
router.post('/active', activatePreset);
router.get('/active/:unit', getActivePreset);

// Submissão de Votos
router.post('/responses', saveResponse);

// Relatórios
router.get('/reports/summary', getReportSummary);
router.get('/reports/details/:id', getReportDetails);

// Upload de Imagens
router.post('/upload', upload.single('surveyImage'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;