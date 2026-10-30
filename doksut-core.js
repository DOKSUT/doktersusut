
/*
 DOKSUT — Mesin Perhitungan Susut
 Estimasi terkalibrasi September 2026 ULP 14460.
 Belum merupakan rumus resmi FORJOG dan perlu
 validasi untuk unit serta periode lainnya.
*/

(function () {
  "use strict";

  const BASE = {
    penerimaan: 10370748.373,
    kirim: 40257.62431268,
    jtm: 290312.79018298,
    trafo: 172551.31088627,
    jtr: 650084.63340679,
    sr: 21119.62,
    feeder: 5,
    jtmLength: 312.22,
    trafoCount: 348,
    trafoKva: 32742,
    branch: 592,
    jtrLength: 403.68,
    srLength: 3505.04,
    customers: 87627,
    rTm: 0.47577249779002,
    rTr: 0.94500745005945,
    rSr: 3.3156856595075
  };

  const DEFAULTS = {
    lf_tm: 0.61,
    lf_trafo: 0.45,
    lf_tr: 0.42,
    lf_sr: 0.42,
    pf_tm: 0.99,
    pf_trafo: 0.90,
    pf_tr: 0.82,
    pf_sr: 0.81,
    fk_sr: 1.5,
    beban_penyulang: 0,
    beban_jurusan: 0,
    tegangan_jtr: 0.4
  };

  const CALIBRATION = {
    fk_tm: 0.34016142463647,
    fk_trafo: 2.0302160318536,
    fk_tr: 0.95829171621086
  };

  function num(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    if (value == null || value === "") return 0;

    let s = String(value).trim();

    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function ratio(value, reference) {
    return value > 0 && reference > 0
      ? value / reference
      : 1;
  }

  function llf(lf) {
    return 0.3 * lf + 0.7 * lf * lf;
  }

  function findSheet(workbook, keyword) {
    const key = Object.keys(workbook || {}).find(
      name => name.toUpperCase().includes(keyword)
    );

    if (!key) {
      throw new Error("Sheet tidak ditemukan: " + keyword);
    }

    return workbook[key];
  }

  function cell(sheet, row, col) {
    return num(sheet?.[row - 1]?.[col - 1]);
  }

  function selectedMonth() {
    const element = document.getElementById("month");
    const month = Number(element?.value);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Pilih bulan yang valid.");
    }

    return month;
  }

  function readInputs(workbook, month) {
    const asset = findSheet(workbook, "ASSET");
    const neraca = findSheet(workbook, "NERACA");
    const emin = findSheet(workbook, "EMIN");

    // ASSET: Januari = kolom H
    const a = row => cell(asset, row, 7 + month);

    // NERACA dan EMIN: Januari = kolom D
    const n = row => cell(neraca, row, 3 + month);
    const e = row => cell(emin, row, 3 + month);

    function weightedResistance(start, end) {
      let length = 0;
      let weighted = 0;

      for (let row = start; row <= end; row++) {
        const l = a(row);
        const r = cell(asset, row, 3);

        if (l > 0 && r > 0) {
          length += l;
          weighted += l * r;
        }
      }

      return length > 0 ? weighted / length : 0;
    }

    return {
      penerimaan: n(5),
      jual_tt: n(6),
      jual_tm: n(7),
      jual_tr: n(8),
      kirim_ul: n(9),
      pemakaian_sendiri: n(10),

      emin_tt: e(5),
      emin_tm: e(6),
      emin_tr: e(7),

      feeder: a(9),
      jtm_length: a(10),
      trafo: a(57),
      trafo_kva: a(58),
      branch: a(59),
      jtr_length: a(75),
      sr_length: a(99),
      customers: a(108),

      r_tm: a(112) || weightedResistance(11, 53),
      r_tr: a(113) || weightedResistance(78, 98),
      r_sr: a(114) || weightedResistance(102, 107)
    };
  }

  function calculate(workbook, parameters = {}) {
    const month = selectedMonth();
    const i = readInputs(workbook, month);

    const p = {
      ...DEFAULTS,
      ...Object.fromEntries(
        Object.entries(parameters).filter(
          ([, value]) => value !== null &&
            value !== undefined &&
            value !== ""
        )
      )
    };

    for (const key of Object.keys(p)) {
      p[key] = num(p[key]);
    }

    if (i.penerimaan <= 0) {
      throw new Error(
        "Penerimaan bulan yang dipilih kosong atau tidak valid."
      );
    }

    if (
      p.lf_tm <= 0 || p.lf_trafo <= 0 ||
      p.lf_tr <= 0 || p.lf_sr <= 0 ||
      p.pf_tm <= 0 || p.pf_trafo <= 0 ||
      p.pf_tr <= 0 || p.pf_sr <= 0
    ) {
      throw new Error("LF dan PF harus lebih besar dari nol.");
    }

    const jualNet =
      (i.jual_tt - i.emin_tt) +
      (i.jual_tm - i.emin_tm) +
      (i.jual_tr - i.emin_tr);

    const distribusi =
      i.penerimaan -
      jualNet -
      i.kirim_ul -
      i.pemakaian_sendiri;

    const flow = Math.max(
      0,
      i.penerimaan - i.kirim_ul
    ) / (BASE.penerimaan - BASE.kirim);

    function factor(lf, pf, fk, lf0, pf0, fk0) {
      return (
        ratio(llf(lf), llf(lf0)) *
        Math.pow(ratio(pf0, pf), 2) *
        ratio(fk, fk0)
      );
    }

    let peakTM = 1;

    if (p.beban_penyulang > 0) {
      const referenceAmp =
        (i.penerimaan - i.kirim_ul) /
        (
          720 *
          Math.max(1, i.feeder) *
          Math.sqrt(3) *
          20.6 *
          p.pf_tm *
          p.lf_tm
        );

      peakTM = Math.pow(
        p.beban_penyulang / Math.max(1, referenceAmp),
        2
      );
    }

    let peakTR = 1;

    if (p.beban_jurusan > 0) {
      const referenceAmp =
        (i.penerimaan - i.kirim_ul) /
        (
          720 *
          Math.max(1, i.branch) *
          Math.sqrt(3) *
          Math.max(0.01, p.tegangan_jtr) *
          p.pf_tr *
          p.lf_tr
        );

      peakTR = Math.pow(
        p.beban_jurusan / Math.max(1, referenceAmp),
        2
      );
    }

    const jtm =
      BASE.jtm *
      Math.pow(flow, 2) *
      ratio(i.jtm_length, BASE.jtmLength) *
      ratio(i.r_tm, BASE.rTm) *
      ratio(BASE.feeder, i.feeder) *
      factor(
        p.lf_tm, p.pf_tm, CALIBRATION.fk_tm,
        0.61, 0.99, CALIBRATION.fk_tm
      ) *
      peakTM;

    const trafo =
      BASE.trafo *
      Math.pow(flow, 2) *
      ratio(i.trafo, BASE.trafoCount) *
      ratio(BASE.trafoKva, i.trafo_kva) *
      factor(
        p.lf_trafo, p.pf_trafo, CALIBRATION.fk_trafo,
        0.45, 0.90, CALIBRATION.fk_trafo
      );

    const jtr =
      BASE.jtr *
      Math.pow(flow, 2) *
      ratio(i.jtr_length, BASE.jtrLength) *
      ratio(i.r_tr, BASE.rTr) *
      ratio(BASE.branch, i.branch) *
      Math.pow(ratio(0.82, p.pf_tr), 2) *
      ratio(llf(p.lf_tr), llf(0.42)) *
      ratio(0.4, Math.max(0.01, p.tegangan_jtr)) ** 2 *
      peakTR;

    const sr =
      BASE.sr *
      Math.pow(flow, 2) *
      ratio(i.sr_length, BASE.srLength) *
      ratio(i.r_sr, BASE.rSr) *
      ratio(BASE.customers, i.customers) *
      factor(
        p.lf_sr, p.pf_sr, p.fk_sr,
        0.42, 0.81, 1.5
      );

    const teknis = jtm + trafo + jtr + sr;
    const nonteknis = distribusi - teknis;

    const percent = value =>
      i.penerimaan > 0
        ? (value / i.penerimaan) * 100
        : 0;

    return {
      penerimaan: i.penerimaan,
      jual_net: jualNet,
      kirim_ul: i.kirim_ul,
      pemakaian_sendiri: i.pemakaian_sendiri,

      jtm,
      trafo,
      jtr,
      sr,

      susut_distribusi: distribusi,
      susut_teknis: teknis,
      susut_nonteknis: nonteknis,

      persen_distribusi: percent(distribusi),
      persen_teknis: percent(teknis),
      persen_nonteknis: percent(nonteknis),

      components: { jtm, trafo, jtr, sr },

      method:
        "Estimasi DOKSUT terkalibrasi September 2026 ULP 14460"
    };
  }

  window.DOKSUT = {
    calculate,
    readInputs,
    defaults: DEFAULTS
  };
})();
