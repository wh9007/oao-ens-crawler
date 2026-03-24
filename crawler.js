const { GoogleSpreadsheet } = require("google-spreadsheet");
const axios = require("axios");
const cheerio = require("cheerio");

// 读取凭证
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

async function run() {
  const doc = new GoogleSpreadsheet("169QtA4-cGaJeegfyvNGsHzbimLZXRyiCwuMmm7Wyfmo");

  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  console.log("开始抓 ENS + 网站检测...");

  const res = await fetch("https://api.thegraph.com/subgraphs/name/ensdomains/ens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `
      {
        registrations(first: 20, orderBy: registrationDate, orderDirection: desc) {
          domain {
            name
          }
        }
      }
      `
    })
  });

  const json = await res.json();
  const list = json.data.registrations;

  for (const item of list) {
    const domain = item.domain.name;

    // 过滤垃圾
    if (domain.startsWith("[0")) continue;

    const url = `https://${domain}.eth.limo`;

    let status = "down";
    let title = "";

    try {
      const res = await axios.get(url, { timeout: 5000 });

      status = res.status;

      const $ = cheerio.load(res.data);
      title = $("title").text();

    } catch (err) {
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
