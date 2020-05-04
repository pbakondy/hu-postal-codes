'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const XLSX = require('xlsx');

const SOURCE_XSLX = 'https://www.posta.hu/static/internet/download/Iranyitoszam-Internet_uj.xlsx';
const LOCAL_XLSX = path.join(__dirname, 'postal-codes.xlsx');

const POSTAL_CODES_JSON = path.join(__dirname, 'postal-codes.json');
const BUDAPEST_JSON = path.join(__dirname, 'budapest.json');
const MISKOLC_JSON = path.join(__dirname, 'miskolc.json');
const DEBRECEN_JSON = path.join(__dirname, 'debrecen.json');
const SZEGED_JSON = path.join(__dirname, 'szeged.json');
const PECS_JSON = path.join(__dirname, 'pecs.json');
const GYOR_JSON = path.join(__dirname, 'gyor.json');

const DISTRICT_MAP = {
  'I.': 1, 'II.': 2, 'III.': 3, 'IV.': 4, 'V.': 5, 'VI.': 6, 'VII.': 7, 'VIII.': 8, 'IX.': 9, 'X.': 10,
  'XI.': 11, 'XII.': 12, 'XIII.': 13, 'XIV.': 14, 'XV.': 15, 'XVI.': 16, 'XVII.': 17, 'XVIII.': 18, 'XIX.': 19, 'XX.': 20,
  'XXI.': 21, 'XXII.': 22, 'XXIII.': 23
};

async function downloadFile() {
  console.log( 'Downloading: ' + SOURCE_XSLX );
  const writer = fs.createWriteStream(LOCAL_XLSX);

  const response = await axios({
    url: SOURCE_XSLX,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

function convert() {
  var workbook = XLSX.read(LOCAL_XLSX, { type: 'file' });

  processTotal(workbook.Sheets[workbook.SheetNames[0]]);
  processCapital(workbook.Sheets[workbook.SheetNames[2]], BUDAPEST_JSON, true);
  processCity(workbook.Sheets[workbook.SheetNames[3]], MISKOLC_JSON);
  processCity(workbook.Sheets[workbook.SheetNames[4]], DEBRECEN_JSON);
  processCity(workbook.Sheets[workbook.SheetNames[5]], SZEGED_JSON);
  processCity(workbook.Sheets[workbook.SheetNames[6]], PECS_JSON);
  processCity(workbook.Sheets[workbook.SheetNames[7]], GYOR_JSON);
}

async function processTotal(sheet) {
  const rawJson = XLSX.utils.sheet_to_json(sheet);

  let out = [];
  rawJson.forEach(item => {
    const zip = item['IRSZ'];
    const city = item['Település'] ? item['Település'].trim() : null;
    const region = item['Településrész'] ? item['Településrész'].trim() : null;
    out.push(region ? {zip, city, region} : {zip, city});
  })

  fs.writeFile( POSTAL_CODES_JSON, JSON.stringify( out, null, 2 ), ( err ) => {
    if ( err ) {
      throw err;
    }
    console.log(`${POSTAL_CODES_JSON} saved` );
  } );
}

async function processCapital(sheet) {
  const rawJson = XLSX.utils.sheet_to_json(sheet);

  let out = [];
  rawJson.forEach(item => {
    const zip = item['IRSZ'];
    const streetName = item['UTCANÉV'] ? item['UTCANÉV'].trim() : null;
    const streetType = item['UTÓTAG'] ? item['UTÓTAG'].trim() : null;
    const number1 = item['1.SZÁM'];
    const part1 = item['1.JEL'] ? item['1.JEL'].trim() : '';
    const number2 = item['2.SZÁM'];
    const part2 = item['2.JEL'] ? item['2.JEL'].trim() : '';
    const districtRoman = item['KER'] ? item['KER'].trim() : null;
    const district = DISTRICT_MAP[districtRoman];

    // Logic described in second Sheet (Jelek)
    let numbers = null;
    if (number1 === 0) {
      // apply zip for the whole street
    } else if (number1 > 0 && number2 > 0) {
      numbers = `${number1}${part1} to ${number2}${part2}`;
    } else if (number1 > 0 && number2 === 0) {
      numbers = `from ${number1}${part1} until the end`;
    } else if (number1 === -1) {
      numbers = `odd numbers`;
    } else if (number1 === -2) {
      numbers = `even numbers`;
    } else if (number1 === -3) {
      numbers = `the rest`;
    }

    out.push(numbers ? {zip, streetName, streetType, numbers, district} : {zip, streetName, streetType, district});
  })

  fs.writeFile( BUDAPEST_JSON, JSON.stringify( out, null, 2 ), ( err ) => {
    if ( err ) {
      throw err;
    }
    console.log(`${BUDAPEST_JSON} saved` );
  } );
}


async function processCity(sheet, outFile) {
  const rawJson = XLSX.utils.sheet_to_json(sheet);

  let out = [];
  rawJson.forEach(item => {
    const zip = item['IRSZ'] || item['IRSZ.'];
    const streetName = item['CíMHELY NEVE'] ? item['CíMHELY NEVE'].trim() : null;
    const streetType = item['JELLEGE'] ? item['JELLEGE'].trim() : null;
    const number1 = item['1.SZÁM'];
    const part1 = item['1.JEL'] ? item['1.JEL'].trim() : '';
    const number2 = item['2.SZÁM'];
    const part2 = item['2.JEL'] ? item['2.JEL'].trim() : '';

    // Logic described in second Sheet (Jelek)
    let numbers = null;
    if (number1 === 0) {
      // apply zip for the whole street
    } else if (number1 > 0 && number2 > 0) {
      numbers = `${number1}${part1} to ${number2}${part2}`;
    } else if (number1 > 0 && number2 === 0) {
      numbers = `from ${number1}${part1} until the end`;
    } else if (number1 === -1) {
      numbers = `odd numbers`;
    } else if (number1 === -2) {
      numbers = `even numbers`;
    } else if (number1 === -3) {
      numbers = `the rest`;
    }

    out.push(streetType ? ( numbers ? {zip, streetName, streetType, numbers} : {zip, streetName, streetType} ) : {zip, streetName});
  })

  fs.writeFile( outFile, JSON.stringify( out, null, 2 ), ( err ) => {
    if ( err ) {
      throw err;
    }
    console.log(`${outFile} saved` );
  } );
}


downloadFile().then(() => {
  convert();
})
