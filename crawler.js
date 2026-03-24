const { GoogleSpreadsheet } = require("google-spreadsheet");

// 读取 GitHub Secret
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

async function run() {
  const doc = new GoogleSpreadsheet("169QtA4-cGaJeegfyvNGsHzbimLZXRyiCwuMmm7Wyfmo");

  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  console.log("开始抓取 ENS 数据...");

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

    // 🔥 正确过滤垃圾 ENS
    if (domain.startsWith("[0")) {
      console.log("跳过垃圾:", domain);
      continue;
    }

    await sheet.addRow({
      domain: domain,
      last_check: new Date().toISOString()
    });

    console.log("写入:", domain);
  }

  console.log("✅ 完成");
}

run();
