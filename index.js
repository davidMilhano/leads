const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
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
app.use('/imagens', express.static('imagens'));
// Rota raiz para carregar o arquivo HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
const bodyParser = require('body-parser');

// Configure o body-parser para lidar com dados POST
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Rota para retornar os dados dos artistas
app.get('/get_categorias', async (req, res) => {
  try {
    // Crie uma conexão com o banco de dados
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'leads'
    });



    // Execute a consulta SQL
    const [rows] = await connection.query('SELECT category FROM business_leads;');
    // Extraia as categorias da resposta do banco de dados
    const categorias = rows.map(row => row.category);

    // Encerre a conexão com o banco de dados
    await connection.end();
    console.log(categorias);
    res.json(categorias);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).send('Erro ao buscar categorias.');
  }

});

// Servir arquivos estáticos
app.use(express.static('public'));
// Rota para processar o upload do arquivo
app.post('/upload/:id', upload.single('file'), (req, res) => {
  // if (!req.file) {
  //   return res.status(400).send('Nenhum arquivo enviado.');
  // 


  const id = req.params.id;
  console.log(id);

  // Verifica a extensão do arquivo (csv ou
  const fileType = req.file.originalname.split('.').pop().toLowerCase();

  if (fileType === 'csv' || fileType === 'xlsx') {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    const batchSize = 300;
    const random_number = Math.random();
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const csvData = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(batch));
      const fileName = `batch_${i / batchSize + 1}.${fileType}`;
      const filePath = path.join(__dirname, 'output', `${random_number}_${id}_${fileName}`);
      fs.writeFileSync(filePath, csvData);
    }

    return res.status(200).send('Arquivos divididos e salvos com sucesso.' + req.params.id);
  } else {
    return res.status(400).send('Formato de arquivo não suportado. Use CSV ou XLSX.');
  }
});

app.listen(port, () => {
  console.log(`Servidor está rodando em http://localhost:${port}`);
});
