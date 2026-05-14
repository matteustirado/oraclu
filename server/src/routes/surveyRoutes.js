import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  createPreset, getPresets, deletePreset, activatePreset, 
  getActivePreset, saveResponse, getReportSummary, getReportDetails,
  prepareSurvey
} from '../controllers/surveyController.js';

const router = Router();

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

router.post('/presets', createPreset);
router.get('/presets/:unit', getPresets);
router.delete('/presets/:id', deletePreset);

router.post('/active', activatePreset);
router.get('/active/:unit', getActivePreset);

router.post('/prepare', prepareSurvey);
router.post('/responses', saveResponse);

router.get('/reports/summary', getReportSummary);
router.get('/reports/details/:id', getReportDetails);

router.post('/upload', upload.single('surveyImage'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;