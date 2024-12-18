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

// Função auxiliar para criar um nó de item
function createItemNode(fromId, toId, attributes) {
  const newItem = { $: { ...attributes } };
  if (fromId === toId) {
    newItem.$ = { id: fromId.toString(), ...attributes };
    delete newItem.$.fromid;
    delete newItem.$.toid;
  } else {
    //newItem.$ = { fromid: fromId.toString(), toid: toId.toString(), ...attributes };
	newItem.$.fromid = fromId.toString(); 
	newItem.$.toid = toId.toString(); 
    delete newItem.$.id;
  }
  return newItem;
}

// Função para atualizar o XML com os _clientId
function updateXMLWithClientId(xmlFilePath, xmlFilePathW, logFilePath, rootNode) {
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
    xml2js.parseString(data, (err, result) => {
      if (err) {
        console.error('Erro ao converter XML para JSON:', err);
        return;
      }

      // Acessar os itens do XML
      const xmlItems = result.items.item || [];
      const updatedItems = [];
      const logItems = [];

      const existingClientIds = new Set();

	  const attributesToCheck = [
        'decayTo',
        'transformTo',
        'maleTransformTo',
        'femaleTransformTo',
        'transformDeEquipTo',
        'transformEquipTo'
      ];
	  
      xmlItems.forEach((xmlItem1) => {
		  
		let xmlItem = xmlItem1;
		// Atualizar atributos adicionais no formato "<attribute key=... value=... />"
        if (xmlItem.attribute) {
			xmlItem.attribute.forEach((attr) => {
				if (attr.$.key && attr.$.value) {
				
					const iskey = attributesToCheck.find((key) => key === attr.$.key);
					if(iskey){
						const attributeValue = parseInt(attr.$.value);
						const item = rootNode._children.find((i) => i._serverId === attributeValue);

						if (item) {
							attr.$.value = item._clientId.toString();
						}
					}
				}
			});
		}
		
        if (xmlItem.$.id) {
          // Caso o item tenha um atributo "id"
          const xmlItemId = parseInt(xmlItem.$.id); // id do XML (string -> número)
          const item = rootNode._children.find((i) => i._serverId === xmlItemId);

          if (item) {
            if (existingClientIds.has(item._clientId)) {
              // Adicionar ao log se o clientId já existir
              //logItems.push({ ...xmlItem.$ });
			  logItems.push({ serverId: xmlItem.$.id, clientId: item._clientId, ...xmlItem.$ });
            } else {
              // Atualizar o id com o _clientId e colocar no início
              //xmlItem.$ = { id: item._clientId.toString(), ...xmlItem.$ };
			  xmlItem.$.id = item._clientId;
              console.log(`Item com id ${xmlItemId} atualizado para clientId ${item._clientId}.`);
              updatedItems.push(xmlItem);
              existingClientIds.add(item._clientId);
            }
          }
        } else if (xmlItem.$.fromid && xmlItem.$.toid) {
          // Caso o item tenha "fromid" e "toid"
          const fromId = parseInt(xmlItem.$.fromid);
          const toId = parseInt(xmlItem.$.toid);

          let currentFrom = null;
          let currentTo = null;

          for (let id = fromId; id <= toId; id++) {
            const item = rootNode._children.find((i) => i._serverId === id);
            if (item) {
              if (existingClientIds.has(item._clientId)) {
                // Adicionar ao log se o clientId já existir
                logItems.push({ serverId: id, clientId: item._clientId, ...xmlItem.$ });
              } else if (currentFrom === null) {
                currentFrom = item._clientId;
                currentTo = item._clientId;
              } else if (item._clientId === currentTo + 1) {
                // Expandir o intervalo se os clientIds forem sequenciais
                currentTo = item._clientId;
				
				///////////////////////////////////////
				existingClientIds.add(item._clientId);
              } else {
                // Adicionar o intervalo atual ao XML
                updatedItems.push(createItemNode(currentFrom, currentTo, xmlItem.$));
                currentFrom = item._clientId;
                currentTo = item._clientId;
                existingClientIds.add(item._clientId);
              }
            }
          }

          // Adicionar o último intervalo ao XML
          if (currentFrom !== null && currentTo !== null) {
            updatedItems.push(createItemNode(currentFrom, currentTo, xmlItem.$));
          }
        }
      });

      // Atualizar o resultado JSON com os novos itens
      result.items.item = updatedItems;

      // Converter o JSON de volta para XML
      const builder = new xml2js.Builder();
      const updatedXML = builder.buildObject(result);

      // Salvar o XML atualizado
      fs.writeFile(xmlFilePathW, updatedXML, 'utf8', (err) => {
        if (err) {
          console.error('Erro ao salvar o arquivo XML:', err);
        } else {
          console.log('XML atualizado com sucesso!');
        }
      });

      // Gerar o log de itens repetidos
      if (logItems.length > 0) {
        const logBuilder = new xml2js.Builder({ headless: true });
        const logXML = logBuilder.buildObject({ log: { item: logItems } });
        fs.writeFile(logFilePath, logXML, 'utf8', (err) => {
          if (err) {
            console.error('Erro ao salvar o arquivo de log:', err);
          } else {
            console.log('Log de itens repetidos salvo com sucesso!');
          }
        });
      }
    });
  });
}
console.log(Array.isArray(rootNode));

console.log(rootNode);
// Caminho para o seu arquivo XML
const xmlFilePath = 'items.xml';
const xmlFilePathW = 'items_clientid.xml';
const logFilePath = 'log.xml';

// Chamar a função para atualizar o XML
updateXMLWithClientId(xmlFilePath, xmlFilePathW, logFilePath, rootNode);
