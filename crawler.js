const { GoogleSpreadsheet } = require("google-spreadsheet");
const axios = require("axios");
const cheerio = require("cheerio");

const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

async function run() {
  const doc = new GoogleSpreadsheet("169QtA4-cGaJeegfyvNGsHzbimLZXRyiCwuMmm7Wyfmo");

  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const seedSheet = doc.sheetsByTitle["seed"];
  const mainSheet = doc.sheetsByIndex[0];

  console.log("开始执行种子ENS检测...");

  // 🔥 清空主表
  const rows = await mainSheet.getRows();
  for (let row of rows) {
    await row.delete();
  }

  // 读取 seed
  const seeds = await seedSheet.getRows();

  for (const item of seeds) {
    const domain = item.domain;

    if (!domain) continue;

    const cleanName = domain.replace(".eth", "");
    const url = `https://${cleanName}.eth.limo`;

    let status = "down";
    let title = "";

    try {
      const res = await axios.get(url, { timeout: 5000 });

      status = res.status;

      if (status !== 200) continue;

      const $ = cheerio.load(res.data);
      title = $("title").text();

    } catch (e) {
      continue;
    }

    await mainSheet.addRow({
      domain,
      url,
      title,
      status,
      last_check: new Date().toISOString(),
      clicks: 0
    });

    console.log("有效网站:", domain);
  }

  console.log("✅ 完成（种子筛选）");
}

run();
