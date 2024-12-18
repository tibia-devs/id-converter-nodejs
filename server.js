const { OTBReader, OTBWriter } = require('@v0rt4c/otb');
const fs = require('fs');
const xml2js = require('xml2js');

function readOTBFile(filePath) {
  // Lê o arquivo como um buffer
  const buffer = fs.readFileSync(filePath);
  
  // Converte o buffer para um Uint8Array
  const uint8Array = new Uint8Array(buffer);

  return uint8Array;
}

const reader = new OTBReader(readOTBFile('items.otb'));
const rootNode = reader.parse();


// Função para atualizar o XML com os _clientId
function updateXMLWithClientId(xmlFilePath, rootNode) {
  // Certificar-se de que rootNode._children é um array válido
  if (!Array.isArray(rootNode._children)) {
    console.error('rootNode._children não é um array');
    return;
  }

  // Ler o arquivo XML
  fs.readFile(xmlFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo XML:', err);
      return;
    }

    // Converter XML para JSON
    xml2js.parseString(data,  (err, result) => {
      if (err) {
        console.error('Erro ao converter XML para JSON:', err);
        return;
      }

      // Acessar os itens do XML
      const xmlItems = result.items.item;

      // Para cada item XML, compare com o _serverId dos itens
      xmlItems.forEach(xmlItem => {
        const xmlItemId = parseInt(xmlItem.$.id); // id do XML (string -> número)
        
        // Encontrar o item pelo _serverId
        const item = rootNode._children.find(i => i._serverId === xmlItemId);

        if (item) {
          // Se encontrar o item correspondente, atualizar o id com o _clientId
          xmlItem.$.id = item._clientId;
		  console.log(`Item com id ${xmlItemId} convert clientId ${item._clientId}.`);
        } else {
          //console.log(`Item com id ${xmlItemId} não encontrado no array de itens.`);
        }
      });

      // Converter o JSON de volta para XML
      const builder = new xml2js.Builder();
      const updatedXML = builder.buildObject(result);

      // Salvar o XML atualizado
      fs.writeFile(xmlFilePath, updatedXML, 'utf8', err => {
        if (err) {
          console.error('Erro ao salvar o arquivo XML:', err);
        } else {
          console.log('XML atualizado com sucesso!');
        }
      });
    });
  });
}
console.log(Array.isArray(rootNode));

console.log(rootNode);
// Caminho para o seu arquivo XML
const xmlFilePath = 'items.xml';

// Chamar a função para atualizar o XML
updateXMLWithClientId(xmlFilePath, rootNode);
