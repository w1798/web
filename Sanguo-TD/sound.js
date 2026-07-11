/* ===== 音效系統 ===== */
var Sound = {
  ctx: null,
  enabled: true,

  init: function() {
    var settings = Service.getSettings();
    this.enabled = settings.soundEnabled !== false;
  },

  ensureCtx: function() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggle: function(on) {
    this.enabled = on;
    if (on) this.ensureCtx();
    var settings = Service.getSettings();
    settings.soundEnabled = on;
    Service.saveData();
  },

  play: function(type) {
    if (!this.enabled) return;
    try {
      this.ensureCtx();
      if (this.ctx.state !== 'running') return;
      switch(type) {
        case 'sword': this.playSword(); break;
        case 'bow': this.playBow(); break;
        case 'spear': this.playSpear(); break;
        case 'horse': this.playHorse(); break;
        case 'mage': this.playMage(); break;
        case 'monk': this.playMonk(); break;
        case 'soldier': this.playSoldier(); break;
      }
    } catch(e) {}
  },

  _osc: function(type, freq, endFreq, dur, gainVal) {
    var ctx = this.ctx;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), now + dur);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.setTargetAtTime(0, now, dur * 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  },

  playSword: function() {
    this._osc('sawtooth', 300, 100, 0.12, 0.3);
  },

  playBow: function() {
    this._osc('sine', 1200, 300, 0.1, 0.25);
  },

  playSpear: function() {
    this._osc('square', 200, 80, 0.12, 0.2);
  },

  playHorse: function() {
    this._osc('triangle', 150, 50, 0.18, 0.3);
  },

  playMage: function() {
    this._osc('sine', 500, 1000, 0.15, 0.2);
  },

  playMonk: function() {
    this._osc('sine', 600, 400, 0.15, 0.2);
  },

  playSoldier: function() {
    this._osc('triangle', 220, 110, 0.1, 0.3);
  }
};
