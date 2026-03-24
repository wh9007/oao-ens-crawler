const { GoogleSpreadsheet } = require("google-spreadsheet");
const axios = require("axios");
const cheerio = require("cheerio");

const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

async function run() {
  const doc = new GoogleSpreadsheet("169QtA4-cGaJeegfyvNGsHzbimLZXRyiCwuMmm7Wyfmo");

  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  console.log("开始执行...");

  const response = await axios.post(
    "https://api.thegraph.com/subgraphs/name/ensdomains/ens",
    {
      query: `
      {
        registrations(first: 20, orderBy: registrationDate, orderDirection: desc) {
          domain {
            name
          }
        }
      }
      `
    }
  );

  const list = response.data.data.registrations;

  for (const item of list) {
    const domain = item.domain.name;

    if (domain.startsWith("[0")) continue;

    // ✅ 修复 URL
    const cleanName = domain.replace(".eth", "");
    const url = `https://${cleanName}.eth.limo`;

    let status = "down";
    let title = "";

    try {
      const res = await axios.get(url, { timeout: 5000 });

      status = res.status;

      const $ = cheerio.load(res.data);
      title = $("title").text();
    } catch (e) {
      status = "down";
    }

    await sheet.addRow({
      domain,
      url,
      title,
      status,
      last_check: new Date().toISOString(),
      clicks: 0
    });

    console.log(domain, status);
  }

  console.log("✅ 完成");
}

run();
