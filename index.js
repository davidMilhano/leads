const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Configuração do multer para o upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Criar diretório output se não existir
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Rota raiz para carregar o arquivo HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para processar o upload do arquivo
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  // Verifica a extensão do arquivo (csv ou xlsx)
  const fileType = req.file.originalname.split('.').pop().toLowerCase();

  if (fileType === 'csv' || fileType === 'xlsx') {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    // Divide os dados em grupos de 300
    const batchSize = 300;
    const batches = [];

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
      
        // Converte os dados do lote para uma string CSV
        const csvData = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(batch));
      
        // Salva um arquivo para cada grupo de 300
        const fileName = `batch_${i / batchSize + 1}.${fileType}`;
        const filePath = path.join(__dirname, 'output', fileName);
        fs.writeFileSync(filePath, csvData);
      }

    return res.status(200).send('Arquivos divididos e salvos com sucesso.');
  } else {
    return res.status(400).send('Formato de arquivo não suportado. Use CSV ou XLSX.');
  }
});

app.listen(port, () => {
  console.log(`Servidor está rodando em http://localhost:${port}`);
});
