const DISTANCES = {
  '42.195':  { name: '全马', km: 42.195,  splits: [5, 10, 15, 20, 25, 30, 35, 40, 42.195] },
  '21.0975': { name: '半马', km: 21.0975, splits: [5, 10, 15, 20, 21.0975] },
  '10':      { name: '10K',  km: 10,      splits: [2, 4, 6, 8, 10] },
  '5':       { name: '5K',   km: 5,       splits: [1, 2, 3, 4, 5] }
};

function fmtTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function fmtPace(secondsPerKm) {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function generateSplits(km) {
  let interval;
  if (km <= 3) interval = 0.5;
  else if (km <= 6) interval = 1;
  else if (km <= 15) interval = 2;
  else if (km <= 30) interval = 5;
  else interval = 10;

  const splits = [];
  for (let s = interval; s < km - 0.001; s += interval) {
    splits.push(Math.round(s * 1000) / 1000);
  }
  splits.push(km);
  return splits;
}

function getSplitPoints(km, customDistKm) {
  if (km === 'custom') return generateSplits(customDistKm);
  return DISTANCES[km].splits;
}

function getEffectiveKm(currentDistance, customDistKm) {
  if (currentDistance === 'custom') return customDistKm;
  return DISTANCES[currentDistance].km;
}

function buildSplitData(currentDistance, customDistKm, secondsPerKm) {
  const km = getEffectiveKm(currentDistance, customDistKm);
  if (!km || km <= 0 || secondsPerKm <= 0) return [];

  const splits = getSplitPoints(currentDistance, customDistKm);
  return splits.map(function (sp, i) {
    const isLast = i === splits.length - 1;
    return {
      label: isLast ? sp + 'km (终点)' : sp + 'km',
      cumTime: fmtTime(secondsPerKm * sp),
      pace: fmtPace(secondsPerKm) + '/km',
      isLast: isLast
    };
  });
}

Page({
  data: {
    currentTab: 'time-to-pace',
    currentDistance: '42.195',
    customDistKm: null,
    customDistValue: '',
    customFocused: false,


    // Mode 1
    targetH: '4',
    targetM: '0',
    targetS: '0',
    paceResult: '5:41',
    splitsTimeToPace: [],

    // Mode 2
    paceM: '5',
    paceS: '0',
    timeResult: '3:30:58',
    splitsPaceToTime: [],

    // Pace Table
    paceStartLabels: ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00'],
    paceStartValues: [180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480],
    paceStartIndex: 2,

    paceEndLabels: ['4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30', '10:00'],
    paceEndValues: [240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600],
    paceEndIndex: 4,

    paceStepLabels: ['5', '10', '15', '30'],
    paceStepValues: [5, 10, 15, 30],
    paceStepIndex: 1,

    paceTableData: [],
    paceDistLabels: ['5K', '10K', '半马', '全马']
  },

  onLoad: function () {
    this.updateTimeToPace();
    this.updatePaceToTime();
    this.updatePaceTable();
  },

  // ── Tab switch ──
  onTabTap: function (e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    if (tab === 'time-to-pace') this.updateTimeToPace();
    else if (tab === 'pace-to-time') this.updatePaceToTime();
    else if (tab === 'pace-table') this.updatePaceTable();
  },

  // ── Distance switch ──
  onDistanceTap: function (e) {
    var key = e.currentTarget.dataset.key;
    var update = { currentDistance: key };

    if (key !== 'custom') {
      update.customDistKm = null;
      update.customDistValue = '';
    }

    this.setData(update);

    if (key !== 'custom') {
      this.updateTimeToPace();
      this.updatePaceToTime();
    }
  },

  onCustomFocus: function () {
    if (this.data.currentDistance !== 'custom') {
      this.setData({ currentDistance: 'custom', customFocused: true });
    } else {
      this.setData({ customFocused: true });
    }
  },

  onCustomBlur: function () {
    this.setData({ customFocused: false });
  },

  // ── Custom distance input ──
  onCustomDistInput: function (e) {
    var raw = e.detail.value.replace(/[^0-9.]/g, '');
    var val = parseFloat(raw);
    var customDistKm = val > 0 ? val : null;
    this.setData({
      customDistValue: raw,
      customDistKm: customDistKm
    });
    this.updateTimeToPace();
    this.updatePaceToTime();
  },

  // ── Mode 1 inputs ──
  onTargetTimeInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var raw = e.detail.value.replace(/[^0-9]/g, '');
    var update = {};
    update[field] = raw;
    this.setData(update);
    this.updateTimeToPace();
  },

  updateTimeToPace: function () {
    var totalSeconds =
      (parseInt(this.data.targetH) || 0) * 3600 +
      (parseInt(this.data.targetM) || 0) * 60 +
      (parseInt(this.data.targetS) || 0);
    var km = getEffectiveKm(this.data.currentDistance, this.data.customDistKm);
    if (totalSeconds <= 0 || !km || km <= 0) return;

    var paceSeconds = totalSeconds / km;
    this.setData({
      paceResult: fmtPace(paceSeconds),
      splitsTimeToPace: buildSplitData(this.data.currentDistance, this.data.customDistKm, paceSeconds)
    });
  },

  // ── Mode 2 inputs ──
  onPaceInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var raw = e.detail.value.replace(/[^0-9.]/g, '');
    var update = {};
    update[field] = raw;
    this.setData(update);
    this.updatePaceToTime();
  },

  updatePaceToTime: function () {
    var paceSeconds =
      (parseInt(this.data.paceM) || 0) * 60 +
      (parseInt(this.data.paceS) || 0);
    var km = getEffectiveKm(this.data.currentDistance, this.data.customDistKm);
    if (paceSeconds <= 0 || !km || km <= 0) return;

    var totalSeconds = paceSeconds * km;
    this.setData({
      timeResult: fmtTime(totalSeconds),
      splitsPaceToTime: buildSplitData(this.data.currentDistance, this.data.customDistKm, paceSeconds)
    });
  },

  // ── Pace table ──
  onPaceStartChange: function (e) {
    this.setData({ paceStartIndex: parseInt(e.detail.value) });
    this.updatePaceTable();
  },

  onPaceEndChange: function (e) {
    this.setData({ paceEndIndex: parseInt(e.detail.value) });
    this.updatePaceTable();
  },

  onPaceStepChange: function (e) {
    this.setData({ paceStepIndex: parseInt(e.detail.value) });
    this.updatePaceTable();
  },

  updatePaceTable: function () {
    var start = this.data.paceStartValues[this.data.paceStartIndex];
    var end = this.data.paceEndValues[this.data.paceEndIndex];
    var step = this.data.paceStepValues[this.data.paceStepIndex];

    var distKeys = ['5', '10', '21.0975', '42.195'];
    var rows = [];

    for (var pace = start; pace <= end; pace += step) {
      var times = distKeys.map(function (k) {
        return fmtTime(pace * parseFloat(k));
      });
      rows.push({ pace: fmtPace(pace), times: times });
    }

    this.setData({ paceTableData: rows });
  }
});
