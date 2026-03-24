const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = "169QtA4-cGaJeegfyvNGsHzbimLZXRyiCwuMmm7Wyfmo";

async function main() {
  try {
    console.log("开始执行...");

    // 1) 取少量 ENS 数据（测试用）
    const res = await axios.post(
      "https://api.thegraph.com/subgraphs/name/ensdomains/ens",
      {
        query: `
        {
          registrations(first: 5) {
            domain { name }
          }
        }`,
      }
    );

    const list = res.data.data.registrations;
    console.log("获取数量:", list.length);

    // 2) 连接 Google Sheet
    const doc = new GoogleSpreadsheet(SHEET_ID);
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    console.log("Sheet:", doc.title);

    // 3) 写入
    for (const item of list) {
      await sheet.addRow({
        domain: item.domain.name,
        time: new Date().toISOString(),
      });
      console.log("写入:", item.domain.name);
    }

    console.log("✅ 完成");
  } catch (e) {
    console.error("❌ 错误:", e.message);
    process.exit(1);
  }
}

main();
