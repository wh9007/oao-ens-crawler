const { GoogleSpreadsheet } = require("google-spreadsheet");

// 读取 GitHub Secret
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

async function run() {
  const doc = new GoogleSpreadsheet("169QtA4-cGaJeegfyvNGsHzbimLZXRyiCwuMmm7Wyfmo");

  // 登录 Google
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  console.log("开始抓取 ENS 数据...");

  // 请求 ENS 数据（The Graph）
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

  console.log("获取数量:", list.length);

  for (const item of list) {
    const domain = item.domain.name;

    // 🔥 过滤垃圾 ENS（全0或合约生成的）
    if (/^\[0+\]/.test(domain)) {
      console.log("跳过垃圾:", domain);
      continue;
    }

    // 写入 Google Sheet
    await sheet.addRow({
      domain: domain,
      last_check: new Date().toISOString()
    });

    console.log("写入:", domain);
  }

  console.log("✅ 完成");
}

run();
