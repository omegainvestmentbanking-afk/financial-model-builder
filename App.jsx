import { useState, useRef, useCallback, useEffect } from "react";

const PROMPT = `You are a financial data extraction expert. Analyze these Indian company quarterly/annual financial results PDFs and extract ALL data into structured JSON.

Return ONLY valid JSON (no markdown, no backticks) with this structure:
{
  "company_name": "Full Company Name",
  "unit": "Crores",
  "quarterly": {
    "quarter_labels": ["Q3FY25","Q4FY25","Q1FY26","Q2FY26","Q3FY26"],
    "9m_curr": "9MFY26", "9m_prev": "9MFY25",
    "revenue": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "other_income": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "opex": {"q":[v,v,v,v,v],"9mc":v,"9mp":v,"label":"exact PDF label"},
    "employee": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "other_exp": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "depreciation": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "finance_costs": {"q":[v,v,v,v,v],"9mc":v,"9mp":v,"label":"exact label"},
    "exceptional": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "tax_current": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "tax_deferred": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "tax_earlier": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "paid_up_equity": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "other_equity_val": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "basic_eps": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "diluted_eps": {"q":[v,v,v,v,v],"9mc":v,"9mp":v},
    "extra": [{"label":"name","pos":"after_pat","q":[v,v,v,v,v],"9mc":v,"9mp":v}]
  },
  "segments": {
    "names": ["Seg1","Seg2"],
    "qlabels": ["Q3FY25","Q4FY25","Q1FY26","Q2FY26","Q3FY26"],
    "revenue": {"Seg1":[v,v,v,v,v],"Total":[v,v,v,v,v]},
    "results": {"Seg1":[v,v,v,v,v],"Total":[v,v,v,v,v]},
    "assets": {"Seg1":[v,v,v,v,v]},
    "liabilities": {"Seg1":[v,v,v,v,v]}
  },
  "annual": {
    "years": ["FY2023","FY2024","FY2025"],
    "pl": {
      "revenue":[v,v,v],"other_income":[v,v,v],
      "opex":[v,v,v],"opex_label":"exact label",
      "employee":[v,v,v],"other_exp":[v,v,v],
      "depreciation":[v,v,v],"interest":[v,v,v],"forex":[v,v,v],
      "exceptional":[v,v,v],
      "tax_current":[v,v,v],"tax_deferred":[v,v,v],"tax_earlier":[v,v,v],
      "basic_eps":[v,v,v],"diluted_eps":[v,v,v],
      "extra":[{"label":"name","values":[v,v,v]}]
    },
    "bs": {
      "ppe":[v,v,v],"cwip":[v,v,v],"rou":[v,v,v],"goodwill":[v,v,v],
      "intangibles":[v,v,v],"invest_nc":[v,v,v],"other_nc_assets":[v,v,v],"total_nc_assets":[v,v,v],
      "inventories":[v,v,v],"trade_recv":[v,v,v],"cash":[v,v,v],
      "other_bank":[v,v,v],"invest_c":[v,v,v],"other_c_assets":[v,v,v],
      "total_c_assets":[v,v,v],"total_assets":[v,v,v],
      "share_capital":[v,v,v],"other_equity":[v,v,v],"total_equity":[v,v,v],
      "minority":[v,v,v],
      "borrow_nc":[v,v,v],"lease_nc":[v,v,v],"other_nc_liab":[v,v,v],"total_nc_liab":[v,v,v],
      "borrow_c":[v,v,v],"lease_c":[v,v,v],"trade_pay":[v,v,v],
      "other_c_liab":[v,v,v],"total_c_liab":[v,v,v],"total_eq_liab":[v,v,v],
      "extra":[{"label":"name","section":"nc_assets","values":[v,v,v]}]
    },
    "cf": {
      "pbt":[v,v,v],"dep":[v,v,v],"finance_cost":[v,v,v],
      "interest_income":[v,v,v],"wc_changes":[v,v,v],
      "cash_from_ops":[v,v,v],"taxes_paid":[v,v,v],"net_operating":[v,v,v],
      "capex":[v,v,v],"invest_purchase":[v,v,v],"invest_sale":[v,v,v],
      "interest_recv":[v,v,v],"net_investing":[v,v,v],
      "borrow_proceeds":[v,v,v],"borrow_repay":[v,v,v],"lease_pay":[v,v,v],
      "interest_paid":[v,v,v],"dividends":[v,v,v],"net_financing":[v,v,v],
      "net_change":[v,v,v],"opening_cash":[v,v,v],"closing_cash":[v,v,v],
      "extra":[{"label":"name","section":"operating","values":[v,v,v]}]
    },
    "market": {"face_value":10,"share_capital_cr":null}
  }
}

RULES: Use null for unavailable data, 0 for zeros. Quarterly arrays=exactly 5 values. Derive Q4 from FY-9M if possible. Include ALL line items. Balance sheet must balance. Capex/dividends POSITIVE. Return ONLY JSON.`;

// â”€â”€â”€ Load SheetJS dynamically â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useSheetJS() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.XLSX) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// â”€â”€â”€ Excel builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const n = v => { if (v == null) return null; const x = Number(v); return isNaN(x) ? null : x; };
const has = a => a && a.some(v => n(v) != null);

function buildExcel(data) {
  const X = window.XLSX;
  const wb = X.utils.book_new();
  const co = data.company_name || "Company";
  const q = data.quarterly || {};
  const seg = data.segments || {};
  const ann = data.annual || {};
  const pl = ann.pl || {};
  const bs = ann.bs || {};
  const cf = ann.cf || {};
  const yrs = ann.years || [];
  const nY = yrs.length;
  const ql = q.quarter_labels || [];
  const nm1 = q["9m_curr"] || "9M Curr";
  const nm2 = q["9m_prev"] || "9M Prev";
  const vQ = item => item ? [...(item.q || Array(5).fill(null)), item["9mc"], item["9mp"]] : Array(7).fill(null);

  // S1: Format Quarter
  const s1 = [[co],["Profit and Loss Statement"],
    ["Particulars",...ql,"Y/Y%","Q/Q%",nm1,nm2,"YoY%"],["Income"],
    ["Revenue from operations",...vQ(q.revenue)],["Other income",...vQ(q.other_income)],
    ["Total Income"],["Expenses"],
    [q.opex?.label||"Operating expenses",...vQ(q.opex)],
    ["Employee benefits expense",...vQ(q.employee)],["Other expenses",...vQ(q.other_exp)],
    ["Total expenses"],["EBITDA"],
    ["Depreciation & amortisation",...vQ(q.depreciation)],["EBIT"],
    [q.finance_costs?.label||"Finance costs",...vQ(q.finance_costs)],
    ["Exceptional Items",...vQ(q.exceptional)],["Profit before tax"],
    ["Tax expense/(credit)"],["Current tax",...vQ(q.tax_current)],
    ["Deferred tax",...vQ(q.tax_deferred)],["Tax earlier years",...vQ(q.tax_earlier)],
    ["Total tax"],["PAT"]];
  (q.extra||[]).forEach(i => s1.push(["â¬¥ "+i.label,...vQ(i)]));
  s1.push([],["Paid up Equity",...vQ(q.paid_up_equity)],
    ["Other Equity",...vQ(q.other_equity_val)],["Earnings per share"],
    ["Basic (â‚¹)",...vQ(q.basic_eps)],["Diluted (â‚¹)",...vQ(q.diluted_eps)]);
  const ws1 = X.utils.aoa_to_sheet(s1);
  ws1["!cols"] = [{wch:40},...Array(10).fill({wch:11})];
  X.utils.book_append_sheet(wb, ws1, "Format quarter");

  // S2: Segment
  const s2 = [[co]];
  const sL = seg.qlabels || ql;
  ["revenue","results","assets","liabilities"].forEach(sec => {
    const d = seg[sec]; if (!d || !Object.keys(d).length) return;
    s2.push([],["Segment "+sec.charAt(0).toUpperCase()+sec.slice(1)],["Particulars",...sL]);
    Object.entries(d).forEach(([nm,v]) => s2.push([nm,...(v||[])]));
  });
  if (s2.length<=1) s2.push(["No segment data"]);
  const ws2 = X.utils.aoa_to_sheet(s2);
  ws2["!cols"] = [{wch:30},...Array(5).fill({wch:12})];
  X.utils.book_append_sheet(wb, ws2, "Segment");

  // S3: Format Annual
  const rv = (pl.revenue||[]).map(n), oi = (pl.other_income||[]).map(n);
  const ti = rv.map((r,i) => r!=null&&oi[i]!=null?r+oi[i]:r||oi[i]);
  const ox = (pl.opex||[]).map(n), em = (pl.employee||[]).map(n), oe = (pl.other_exp||[]).map(n);
  const te = ox.map((_,i) => { const v=[ox[i],em[i],oe[i]].filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0):null; });
  const eb = ti.map((t,i) => t!=null&&te[i]!=null?t-te[i]:null);
  const dp = (pl.depreciation||[]).map(n);
  const ebit = eb.map((e,i) => e!=null&&dp[i]!=null?e-dp[i]:null);
  const ir2 = (pl.interest||[]).map(n), fx = (pl.forex||[]).map(n), ex = (pl.exceptional||[]).map(n);
  const pbt = ebit.map((e,i) => { if(e==null)return null; let v=e; [ir2,fx,ex].forEach(a=>{const x=a[i];if(x!=null)v-=x;}); return v; });
  const tc = (pl.tax_current||[]).map(n), td = (pl.tax_deferred||[]).map(n), tl = (pl.tax_earlier||[]).map(n);
  const tt = tc.map((_,i) => { const v=[tc[i],td[i],tl[i]].filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0):null; });
  const pat = pbt.map((p,i) => p!=null&&tt[i]!=null?p-tt[i]:null);

  const s3 = [[co],["Profit and Loss Statement"],["Particulars",...yrs],["Income"],
    ["Revenue",...(pl.revenue||[])],["Other income",...(pl.other_income||[])],["Total Income",...ti],
    ["Expenses"],[pl.opex_label||"Operating expenses",...(pl.opex||[])],
    ["Employee expenses",...(pl.employee||[])],["Other expenses",...(pl.other_exp||[])],
    ["Total expenses",...te],["EBITDA",...eb],
    ["EBITDA Margin",...eb.map((e,i)=>e!=null&&ti[i]?(e/ti[i]*100).toFixed(1)+"%":"")],
    ["Depreciation",...(pl.depreciation||[])],["EBIT",...ebit],
    ["EBIT Margin",...ebit.map((e,i)=>e!=null&&ti[i]?(e/ti[i]*100).toFixed(1)+"%":"")],
    ["Finance costs"],["- Interest",...(pl.interest||[])],["- Forex",...(pl.forex||[])],
    ["Exceptional Items",...(pl.exceptional||[])],["Profit before tax",...pbt],
    ["Tax expense"],["Current tax",...(pl.tax_current||[])],["Deferred tax",...(pl.tax_deferred||[])],
    ["Tax earlier years",...(pl.tax_earlier||[])],["Total tax",...tt],["PAT",...pat]];
  (pl.extra||[]).forEach(i => s3.push(["â¬¥ "+i.label,...(i.values||[])]));
  s3.push([],["Basic EPS (â‚¹)",...(pl.basic_eps||[])],["Diluted EPS (â‚¹)",...(pl.diluted_eps||[])]);
  const ws3 = X.utils.aoa_to_sheet(s3);
  ws3["!cols"] = [{wch:40},...Array(nY).fill({wch:14})];
  X.utils.book_append_sheet(wb, ws3, "Format Annual");

  // S4: Balance Sheet
  const s4 = [[co],["Balance Sheet"],["Particulars",...yrs],["ASSETS"],["Non-Current Assets"]];
  [["PPE","ppe"],["CWIP","cwip"],["ROU","rou"],["Goodwill","goodwill"],["Intangibles","intangibles"],
   ["Investments NC","invest_nc"],["Other NC Assets","other_nc_assets"]
  ].forEach(([l,k])=>{if(has(bs[k]))s4.push([l,...(bs[k]||[])]);});
  (bs.extra||[]).filter(i=>i.section==="nc_assets").forEach(i=>s4.push(["â¬¥ "+i.label,...(i.values||[])]));
  s4.push(["Total NC Assets",...(bs.total_nc_assets||[])],[],["Current Assets"]);
  [["Inventories","inventories"],["Trade Receivables","trade_recv"],["Cash","cash"],
   ["Other Bank Bal","other_bank"],["Current Investments","invest_c"],["Other C Assets","other_c_assets"]
  ].forEach(([l,k])=>{if(has(bs[k]))s4.push([l,...(bs[k]||[])]);});
  (bs.extra||[]).filter(i=>i.section==="c_assets").forEach(i=>s4.push(["â¬¥ "+i.label,...(i.values||[])]));
  s4.push(["Total C Assets",...(bs.total_c_assets||[])],[],["TOTAL ASSETS",...(bs.total_assets||[])],
    [],["EQUITY & LIABILITIES"],["Equity"],["Share Capital",...(bs.share_capital||[])],
    ["Other Equity",...(bs.other_equity||[])],["Total Equity",...(bs.total_equity||[])]);
  if(has(bs.minority))s4.push(["Minority Interest",...(bs.minority||[])]);
  s4.push([],["NC Liabilities"]);
  [["NC Borrowings","borrow_nc"],["NC Lease Liab","lease_nc"],["Other NC Liab","other_nc_liab"]
  ].forEach(([l,k])=>{if(has(bs[k]))s4.push([l,...(bs[k]||[])]);});
  s4.push(["Total NC Liabilities",...(bs.total_nc_liab||[])],[],["Current Liabilities"]);
  [["C Borrowings","borrow_c"],["C Lease Liab","lease_c"],["Trade Payables","trade_pay"],["Other C Liab","other_c_liab"]
  ].forEach(([l,k])=>{if(has(bs[k]))s4.push([l,...(bs[k]||[])]);});
  s4.push(["Total C Liabilities",...(bs.total_c_liab||[])],[],["TOTAL EQ & LIAB",...(bs.total_eq_liab||[])]);
  const ws4 = X.utils.aoa_to_sheet(s4);
  ws4["!cols"] = [{wch:35},...Array(nY).fill({wch:14})];
  X.utils.book_append_sheet(wb, ws4, "Balance sheet");

  // S5: Cash Flow
  const s5 = [[co],["Cash Flow Statement"],["Particulars",...yrs],["A. Operating"]];
  [["PBT","pbt"],["Depreciation","dep"],["Finance Cost","finance_cost"],["Interest Income","interest_income"],["WC Changes","wc_changes"]
  ].forEach(([l,k])=>{if(has(cf[k]))s5.push([l,...(cf[k]||[])]);});
  (cf.extra||[]).filter(i=>i.section==="operating").forEach(i=>s5.push(["â¬¥ "+i.label,...(i.values||[])]));
  s5.push(["Cash from Ops",...(cf.cash_from_ops||[])],["Taxes Paid",...(cf.taxes_paid||[])],
    ["Net Cash - Operating",...(cf.net_operating||[])],[],["B. Investing"]);
  [["Capex","capex"],["Buy Investments","invest_purchase"],["Sell Investments","invest_sale"],["Interest Recv","interest_recv"]
  ].forEach(([l,k])=>{if(has(cf[k]))s5.push([l,...(cf[k]||[])]);});
  (cf.extra||[]).filter(i=>i.section==="investing").forEach(i=>s5.push(["â¬¥ "+i.label,...(i.values||[])]));
  s5.push(["Net Cash - Investing",...(cf.net_investing||[])],[],["C. Financing"]);
  [["Borrow Proceeds","borrow_proceeds"],["Borrow Repay","borrow_repay"],["Lease Pay","lease_pay"],
   ["Interest Paid","interest_paid"],["Dividends","dividends"]
  ].forEach(([l,k])=>{if(has(cf[k]))s5.push([l,...(cf[k]||[])]);});
  (cf.extra||[]).filter(i=>i.section==="financing").forEach(i=>s5.push(["â¬¥ "+i.label,...(i.values||[])]));
  s5.push(["Net Cash - Financing",...(cf.net_financing||[])],[],
    ["Net Change",...(cf.net_change||[])],["Opening Cash",...(cf.opening_cash||[])],["Closing Cash",...(cf.closing_cash||[])]);
  const ws5 = X.utils.aoa_to_sheet(s5);
  ws5["!cols"] = [{wch:35},...Array(nY).fill({wch:14})];
  X.utils.book_append_sheet(wb, ws5, "Cash Flow");

  // S6: Input Data
  const mk = ann.market||{};
  const s6 = [[co],["Input Data â€” All Raw Inputs"],[],["Particulars",...yrs],[],
    ["MARKET DATA"],["CMP (â‚¹)","Enter CMP"],["Face Value",mk.face_value||10],["Share Capital Cr",mk.share_capital_cr],[],
    ["P&L"],["Revenue",...(pl.revenue||[])],["Other Income",...(pl.other_income||[])],
    [pl.opex_label||"Opex",...(pl.opex||[])],["Employee",...(pl.employee||[])],["Other Exp",...(pl.other_exp||[])],
    ["Depreciation",...(pl.depreciation||[])],["Interest",...(pl.interest||[])],["Forex",...(pl.forex||[])],
    ["Exceptional",...(pl.exceptional||[])],["Current Tax",...(pl.tax_current||[])],
    ["Deferred Tax",...(pl.tax_deferred||[])],["Tax Earlier",...(pl.tax_earlier||[])],[],
    ["BALANCE SHEET"],["Total Assets",...(bs.total_assets||[])],["Total Equity",...(bs.total_equity||[])],
    ["NC Borrowings",...(bs.borrow_nc||[])],["C Borrowings",...(bs.borrow_c||[])],
    ["Trade Recv",...(bs.trade_recv||[])],["Inventories",...(bs.inventories||[])],
    ["Trade Pay",...(bs.trade_pay||[])],["Cash",...(bs.cash||[])],[],
    ["CASH FLOW"],["OCF",...(cf.net_operating||[])],["Capex",...(cf.capex||[])],["Dividends",...(cf.dividends||[])]];
  const ws6 = X.utils.aoa_to_sheet(s6);
  ws6["!cols"] = [{wch:30},...Array(nY).fill({wch:14})];
  X.utils.book_append_sheet(wb, ws6, "Input Data");

  // S7: Ratios
  const ratioItems = ["PER SHARE","Shares (Mn)","EPS (â‚¹)","CEPS","Book Value","","VALUATION","Market Cap","Total Debt",
    "Enterprise Value","EV/Sales","EV/EBITDA","P/E","P/BV","FCF","FCF Yield","","GROWTH","Sales Growth %",
    "EBITDA Growth %","PAT Growth %","","PROFITABILITY","Gross Profit","Gross Margin %","EBITDA Margin %",
    "EBIT Margin %","PAT Margin %","ROE %","ROCE %","ROIC %","Tax Rate %","","TURNOVER","Debtor Days",
    "Inventory Days","Creditor Days","Working Cycle","Asset Turnover","","LIQUIDITY","Current Ratio",
    "Net Debt","Net D/E","Interest Coverage","","PAYOUT","DPS","Div Yield %","Payout %"];
  const s7 = [[co],["Ratios"],["Y/E Mar (â‚¹ Cr)",...yrs]];
  ratioItems.forEach(r => s7.push(r ? [r] : []));
  const ws7 = X.utils.aoa_to_sheet(s7);
  ws7["!cols"] = [{wch:28},...Array(nY).fill({wch:14})];
  X.utils.book_append_sheet(wb, ws7, "Ratios");

  // S8: Exhibits
  const s8 = [[co],["Key Financials & Indicators"],[],
    ["Particulars",...yrs,"","Key Ratios",...yrs],
    ["Revenue",...(pl.revenue||[]),"","ROE %"],
    ["EBITDA",...eb,"","ROCE %"],
    ["PAT",...pat,"","D/E"],
    ["EPS",...(pl.basic_eps||[]),"","P/E"],[],["Source: Company, Financial Model Builder"]];
  const ws8 = X.utils.aoa_to_sheet(s8);
  ws8["!cols"] = [{wch:16},{wch:12},{wch:12},{wch:12},{wch:3},{wch:16},{wch:12},{wch:12},{wch:12}];
  X.utils.book_append_sheet(wb, ws8, "Exhibits");

  return X.write(wb, { bookType:"xlsx", type:"base64" });
}

// â”€â”€â”€ Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  bg:"#060a14",s:"#0d1220",card:"#111827",brd:"#1e293b",brdL:"#293548",
  a:"#3b82f6",aD:"rgba(59,130,246,0.1)",
  g:"#22c55e",gD:"rgba(34,197,94,0.08)",
  gold:"#f59e0b",goldD:"rgba(245,158,11,0.1)",
  r:"#ef4444",rD:"rgba(239,68,68,0.08)",
  t:"#e2e8f0",d:"#8896ab",m:"#556275",w:"#f8fafc"
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const xlsxReady = useSheetJS();
  const [files, setFiles] = useState([]);
  const [coName, setCoName] = useState("");
  const [cmpVal, setCmpVal] = useState("");
  const [fv, setFv] = useState("10");
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const [xlB64, setXlB64] = useState(null);
  const [rName, setRName] = useState("");
  const inRef = useRef(null);

  const STEPS = ["Reading PDFs","Calling Claude AI","Building Excel","Done"];

  const addF = useCallback(fl => {
    const pdfs = Array.from(fl).filter(f => f.type==="application/pdf"||f.name.endsWith(".pdf"));
    if (pdfs.length) setFiles(p => [...p, ...pdfs]);
  },[]);

  const readB64 = f => new Promise((res,rej) => {
    const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(f);
  });

  const fmtSz = b => b<1024?b+" B":b<1048576?(b/1024).toFixed(1)+" KB":(b/1048576).toFixed(1)+" MB";

  const run = async () => {
    setPhase("work"); setErr(""); setPct(8); setStep(0);
    try {
      const pdfs = [];
      for (const f of files) pdfs.push({name:f.name, data: await readB64(f)});
      setPct(15); setStep(1);

      const content = [];
      pdfs.forEach((p,i) => {
        content.push({type:"text",text:`--- PDF ${i+1}: ${p.name} ---`});
        content.push({type:"document",source:{type:"base64",media_type:"application/pdf",data:p.data}});
      });
      let extra = "";
      if (coName) extra += `\nCompany: ${coName}`;
      if (cmpVal) extra += `\nCMP: â‚¹${cmpVal}`;
      content.push({type:"text",text:PROMPT+extra});

      let fakePct = 25;
      const iv = setInterval(() => { fakePct = Math.min(fakePct+3,82); setPct(fakePct); }, 2000);

      const resp = await fetch("/api/analyze", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:16000,messages:[{role:"user",content}]})
      });
      clearInterval(iv);
      setPct(85); setStep(2);

      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message||`API error ${resp.status}`); }
      const result = await resp.json();
      let txt = result.content.map(c=>c.text||"").join("");
      if (txt.includes("```json")) txt = txt.split("```json")[1].split("```")[0];
      else if (txt.includes("```")) txt = txt.split("```")[1].split("```")[0];
      const extracted = JSON.parse(txt.trim());

      setPct(92);
      const b64 = buildExcel(extracted);
      setXlB64(b64);
      setRName(extracted.company_name||coName||"Company");
      setPct(100); setStep(3); setPhase("done");
    } catch(e) { console.error(e); setErr(e.message||"Error"); setPhase("error"); }
  };

  const download = () => {
    if (!xlB64) return;
    const fn = `${rName.replace(/[^a-zA-Z0-9 ]/g,"").trim()}_Financials.xlsx`;
    const link = document.createElement("a");
    link.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + xlB64;
    link.download = fn;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => { setFiles([]); setCoName(""); setCmpVal(""); setPhase("idle"); setPct(0); setStep(0); setErr(""); setXlB64(null); };

  const sheets = ["Format Quarter","Segment","Format Annual","Balance Sheet","Cash Flow","Input Data","Ratios","Exhibits"];
  const canGo = files.length > 0 && xlsxReady && phase === "idle";

  const boxStyle = {background:C.card,border:`1px solid ${C.brd}`,borderRadius:14,padding:"20px 22px",marginBottom:14};
  const inpStyle = {width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.brd}`,borderRadius:8,padding:"9px 12px",color:C.w,fontSize:13,fontFamily:"inherit",outline:"none"};

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 25% -5%,rgba(59,130,246,0.07),transparent 55%),${C.bg}`,color:C.t,fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"36px 18px 56px"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:9,marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${C.a},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:C.bg}}>â‚¹</div>
            <span style={{fontSize:21,fontWeight:700,color:C.w,letterSpacing:"-0.4px"}}>Financial Model Builder</span>
          </div>
          <p style={{fontSize:13,color:C.d,margin:0,lineHeight:1.7}}>Upload company PDFs â†’ AI extracts data â†’ Download 8-sheet Excel model</p>
        </div>

        {/* Upload Phase */}
        {(phase==="idle") && <>
          <div style={boxStyle}>
            <div style={{fontSize:10.5,fontWeight:700,color:C.a,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Step 1</div>
            <div style={{fontSize:14.5,fontWeight:600,color:C.w,marginBottom:3}}>Upload Company PDFs</div>
            <div style={{fontSize:12,color:C.d,marginBottom:12}}>Quarterly results, annual reports, investor presentations</div>
            <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);addF(e.dataTransfer.files)}}
              onClick={()=>inRef.current?.click()}
              style={{border:`2px dashed ${drag?C.a:C.brdL}`,borderRadius:10,padding:"30px 14px",textAlign:"center",cursor:"pointer",background:drag?C.aD:"transparent",transition:"all 0.2s"}}>
              <div style={{fontSize:28,marginBottom:4,color:drag?C.a:C.m}}>ðŸ“„</div>
              <div style={{fontSize:12.5,color:C.d}}>{drag?"Drop here":"Click or drag PDFs"}</div>
              <input ref={inRef} type="file" multiple accept=".pdf" onChange={e=>addF(e.target.files)} style={{display:"none"}} />
            </div>
            {files.length>0 && <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
              {files.map((f,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.aD,border:`1px solid rgba(59,130,246,0.12)`,borderRadius:7,padding:"7px 11px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{color:C.a,fontSize:15}}>ðŸ“„</span>
                    <div><div style={{fontSize:12,fontWeight:500,color:C.t}}>{f.name}</div><div style={{fontSize:10,color:C.m}}>{fmtSz(f.size)}</div></div>
                  </div>
                  <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.m,cursor:"pointer",fontSize:14,padding:3}}>âœ•</button>
                </div>
              ))}
            </div>}
          </div>

          <div style={boxStyle}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
              <span style={{fontSize:10.5,fontWeight:700,color:C.a,textTransform:"uppercase",letterSpacing:"1px"}}>Step 2</span>
              <span style={{fontSize:9.5,fontWeight:600,color:C.gold,background:C.goldD,padding:"2px 7px",borderRadius:4}}>OPTIONAL</span>
            </div>
            <div style={{fontSize:14.5,fontWeight:600,color:C.w,marginBottom:3}}>Company Details</div>
            <div style={{fontSize:12,color:C.d,marginBottom:10}}>Auto-detected from PDFs</div>
            <input value={coName} onChange={e=>setCoName(e.target.value)} placeholder="Company name" style={{...inpStyle,marginBottom:8}} />
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.m,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>CMP (â‚¹)</div>
                <input value={cmpVal} onChange={e=>setCmpVal(e.target.value)} placeholder="1850" style={inpStyle} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.m,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Face Value (â‚¹)</div>
                <input value={fv} onChange={e=>setFv(e.target.value)} placeholder="10" style={inpStyle} />
              </div>
            </div>
          </div>

          <button onClick={run} disabled={!canGo} style={{
            width:"100%",padding:"12px 18px",fontSize:13.5,fontWeight:600,
            color:canGo?C.w:C.m,background:canGo?`linear-gradient(135deg,${C.a},#2563eb)`:"rgba(255,255,255,0.04)",
            border:canGo?"none":`1px solid ${C.brd}`,borderRadius:10,cursor:canGo?"pointer":"not-allowed",
            display:"flex",alignItems:"center",justifyContent:"center",gap:7
          }}>
            {canGo ? <><span style={{fontSize:14}}>âœ¦</span> Build Model ({files.length} PDF{files.length>1?"s":""})</> : "Upload PDFs to start"}
          </button>
        </>}

        {/* Processing */}
        {phase==="work" && <div style={boxStyle}>
          <div style={{fontSize:14.5,fontWeight:600,color:C.w,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:16,height:16,border:`2px solid ${C.brd}`,borderTopColor:C.a,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
            Processing...
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:14}}>
            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.a},${C.gold})`,borderRadius:2,transition:"width 0.5s"}} />
          </div>
          {STEPS.map((s,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"5px 0",fontSize:12,color:i<step?C.g:i===step?C.w:C.m}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:i<step?C.g:i===step?C.a:C.brd,flexShrink:0}} />
              {s}
              {i<step && <span style={{marginLeft:"auto",color:C.g,fontSize:13}}>âœ“</span>}
            </div>
          ))}
        </div>}

        {/* Error */}
        {phase==="error" && <div style={boxStyle}>
          <div style={{background:C.rD,border:`1px solid rgba(239,68,68,0.2)`,borderRadius:8,padding:"11px 13px",fontSize:12,color:C.r,marginBottom:10}}>âš ï¸ {err}</div>
          <div style={{fontSize:12,color:C.d,marginBottom:12,lineHeight:1.5}}>Try again with different PDFs or fewer files. Image-scanned PDFs may not work.</div>
          <button onClick={reset} style={{width:"100%",padding:10,fontSize:13,fontWeight:600,color:C.t,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.brd}`,borderRadius:8,cursor:"pointer"}}>â† Try Again</button>
        </div>}

        {/* Success */}
        {phase==="done" && <div style={{...boxStyle,borderColor:"rgba(34,197,94,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:C.gD,border:`1.5px solid ${C.g}`,display:"flex",alignItems:"center",justifyContent:"center",color:C.g,fontSize:12}}>âœ“</div>
            <span style={{fontSize:14.5,fontWeight:600,color:C.w}}>{rName} â€” Model Ready!</span>
          </div>
          <p style={{fontSize:12,color:C.d,margin:"0 0 14px 0"}}>8-sheet financial model built. Items marked â¬¥ are additional from PDF.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:16}}>
            {sheets.map((s,i) => (
              <div key={i} style={{background:C.gD,border:`1px solid rgba(34,197,94,0.12)`,borderRadius:6,padding:"7px 5px",textAlign:"center"}}>
                <div style={{fontSize:10,fontWeight:600,color:C.g}}>{s}</div>
              </div>
            ))}
          </div>
          <button onClick={download} style={{
            width:"100%",padding:12,fontSize:14,fontWeight:600,color:C.bg,
            background:`linear-gradient(135deg,${C.g},#059669)`,border:"none",borderRadius:10,
            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:8
          }}>
            â¬‡ Download {rName.split(" ")[0]}_Financials.xlsx
          </button>
          <div style={{background:C.aD,border:`1px solid rgba(59,130,246,0.12)`,borderRadius:7,padding:"9px 12px",fontSize:11,color:C.d,lineHeight:1.6,marginBottom:8}}>
            ðŸ’¡ <strong style={{color:C.t}}>Tip:</strong> Upload this .xlsx back to Claude and ask to add Excel formulas for the Ratios sheet â€” all 64 ratios auto-calculate. Light blue = added items from PDF.
          </div>
          <button onClick={reset} style={{width:"100%",padding:10,fontSize:13,fontWeight:600,color:C.t,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.brd}`,borderRadius:8,cursor:"pointer"}}>â† Build Another</button>
        </div>}

        <div style={{textAlign:"center",marginTop:32,fontSize:10.5,color:C.m,lineHeight:1.9}}>
          <div>Powered by Claude AI â€¢ Numbers strictly from PDFs â€¢ No API key needed</div>
          <div>â¬¥ = added items (light blue in template) â€¢ Blue font = inputs â€¢ Gold = formulas</div>
        </div>
      </div>
    </div>
  );
}