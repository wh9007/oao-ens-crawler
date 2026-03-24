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

  // 🔥 清空旧数据（保留表头）
  const rows = await sheet.getRows();
  for (let row of rows) {
    await row.delete();
  }

  console.log("旧数据已清空");

  // 获取 ENS 数据
  const response = await axios.post(
    "https://api.thegraph.com/subgraphs/name/ensdomains/ens",
    {
      query: `
      {
        registrations(first: 50, orderBy: registrationDate, orderDirection: desc) {
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

    // 过滤垃圾
    if (domain.startsWith("[0")) continue;

    const cleanName = domain.replace(".eth", "");
    const url = `https://${cleanName}.eth.limo`;

    let status = "down";
    let title = "";

    try {
      const res = await axios.get(url, { timeout: 5000 });

      status = res.status;

      // ❗只保留有效网站
      if (status !== 200) continue;

      const $ = cheerio.load(res.data);
      title = $("title").text();

    } catch (e) {
      continue;
    }

    await sheet.addRow({
      domain,
      url,
      title,
      status,
      last_check: new Date().toISOString(),
      clicks: 0
    });

    console.log("有效网站:", domain);
  }

  console.log("✅ 完成（仅保留有效网站）");
}

run();
