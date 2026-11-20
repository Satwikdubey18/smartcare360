/**
 * QR Code Generator — qrcode-generator (MIT License)
 * https://github.com/kazuhikoarase/qrcode-generator
 * Version 1.4.4  |  Copyright (c) 2009 Kazuhiko Arase
 *
 * MIT License:
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* Minimal standalone implementation — generates a QR code and renders to a canvas or returns a data URL */

var qrcode = (function(){
  var _this = {};

  var PAD0 = 0xEC;
  var PAD1 = 0x11;

  var createData = function(typeNumber, errorCorrectionLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    var buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
      data.write(buffer);
    }
    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  };

  var createBytes = function(buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);
    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }
    var totalCodeCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    var data = new Array(totalCodeCount);
    var index = 0;
    for (var i = 0; i < maxDcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    for (var i = 0; i < maxEcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    return data;
  };

  _this.stringToBytes = function(s) {
    var bytes = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      bytes.push(c & 0xFF);
    }
    return bytes;
  };

  _this.createQRCode = function(typeNumber, errorCorrectionLevel) {
    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];
    var _this2 = {};

    var makeImpl = function(test, maskPattern) {
      _moduleCount = _typeNumber * 4 + 17;
      _modules = (function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row++) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col++) modules[row][col] = null;
        }
        return modules;
      })(_moduleCount);
      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);
      if (_typeNumber >= 7) setupTypeNumber(test);
      if (_dataCache == null) _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || _moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || _moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4))
            _modules[row + r][col + c] = true;
          else
            _modules[row + r][col + c] = false;
        }
      }
    };

    var getBestMaskPattern = function() {
      var minLostPoint = 0;
      var pattern = 0;
      for (var i = 0; i < 8; i++) {
        makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(_modules, _moduleCount);
        if (i == 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
      }
      return pattern;
    };

    var setupTimingPattern = function() {
      for (var r = 8; r < _moduleCount - 8; r++) {
        if (_modules[r][6] != null) continue;
        _modules[r][6] = (r % 2 == 0);
      }
      for (var c = 8; c < _moduleCount - 8; c++) {
        if (_modules[6][c] != null) continue;
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {
      var pos = QRUtil.getPatternPosition(_typeNumber);
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i]; var col = pos[j];
          if (_modules[row][col] != null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0))
                _modules[row + r][col + c] = true;
              else
                _modules[row + r][col + c] = false;
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {
      var bits = QRUtil.getBCHTypeNumber(_typeNumber);
      for (var i = 0; i < 18; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }
      for (var i = 0; i < 18; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {
      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 6) _modules[i][8] = mod;
        else if (i < 8) _modules[i + 1][8] = mod;
        else _modules[_moduleCount - 15 + i][8] = mod;
      }
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 8) _modules[8][_moduleCount - i - 1] = mod;
        else if (i < 9) _modules[8][15 - i - 1 + 1] = mod;
        else _modules[8][15 - i - 1] = mod;
      }
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {
      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);
      for (var col = _moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col -= 1;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (_modules[row][col - c] == null) {
              var dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
              var mask = maskFunc(row, col - c);
              if (mask) dark = !dark;
              _modules[row][col - c] = dark;
              bitIndex -= 1;
              if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || _moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    };

    _this2.addData = function(data) {
      _dataList.push(new QR8bitByte(data));
      _dataCache = null;
    };

    _this2.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) throw new Error(row + "," + col);
      return _modules[row][col];
    };

    _this2.getModuleCount = function() { return _moduleCount; };

    _this2.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;
        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = new QRBitBuffer();
          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
            data.write(buffer);
          }
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
          if (buffer.getLengthInBits() <= totalDataCount * 8) break;
        }
        _typeNumber = typeNumber;
      }
      makeImpl(false, getBestMaskPattern());
    };

    _this2.createTableTag = function(cellSize, margin) {
      cellSize = cellSize || 2; margin = margin || cellSize * 4;
      var qrHtml = "";
      qrHtml += '<table style="border-width: 0px; border-style: none; border-color: #0000ff; border-collapse: collapse; margin: ' + margin + 'px ' + margin + 'px;">';
      for (var r = 0; r < _this2.getModuleCount(); r++) {
        qrHtml += "<tr>";
        for (var c = 0; c < _this2.getModuleCount(); c++)
          qrHtml += '<td style="border-width: 0px; border-style: none; border-color: #0000ff; border-collapse: collapse; padding: 0px; margin: 0px; width: ' + cellSize + 'px; height: ' + cellSize + 'px; background-color: ' + (_this2.isDark(r, c) ? "#000000" : "#ffffff") + ';"></td>';
        qrHtml += "</tr>";
      }
      qrHtml += "</table>";
      return qrHtml;
    };

    _this2.createImgTag = function(cellSize, margin, alt) {
      cellSize = cellSize || 2; margin = margin || cellSize * 4;
      var size = _this2.getModuleCount() * cellSize + margin * 2;
      var min = margin; var max = size - margin;
      return createImgTag(size, size, function(x, y) { return min <= x && x < max && min <= y && y < max && _this2.isDark(Math.floor((y - min) / cellSize), Math.floor((x - min) / cellSize)); }, alt);
    };

    var createImgTag = function(width, height, getPixel, alt) {
      var bitsPerSample = 8; var numSamples = 1;
      var byteLength = (Math.ceil(width * numSamples * bitsPerSample / 8) + 1) * height + 26;
      var PALETTE = [[255, 255, 255], [0, 0, 0]];
      return "";
    };

    _this2.createDataURL = function(cellSize, margin) {
      cellSize = cellSize || 4; margin = margin || cellSize * 4;
      var size = _this2.getModuleCount() * cellSize + margin * 2;
      var canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#000000";
      for (var r = 0; r < _this2.getModuleCount(); r++) {
        for (var c = 0; c < _this2.getModuleCount(); c++) {
          if (_this2.isDark(r, c)) {
            ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
          }
        }
      }
      return canvas.toDataURL("image/png");
    };

    return _this2;
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------
  var QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------
  var QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };

  //---------------------------------------------------------------------
  // QR8bitByte
  //---------------------------------------------------------------------
  function QR8bitByte(data) {
    this._mode = QRMode.MODE_8BIT_BYTE;
    this._data = data;
    this._bytes = _this.stringToBytes(data);
  }
  QR8bitByte.prototype.getMode = function() { return this._mode; };
  QR8bitByte.prototype.getLength = function() { return this._bytes.length; };
  QR8bitByte.prototype.write = function(buffer) { for (var i = 0; i < this._bytes.length; i++) buffer.put(this._bytes[i], 8); };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------
  var QRUtil = (function() {
    var PATTERN_POSITION_TABLE = [[], [6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
    var _this3 = {};
    _this3.getBCHTypeInfo = function(data) { var d = data << 10; while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15) >= 0) d ^= (G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15))); return ((data << 10) | d) ^ G15_MASK; };
    _this3.getBCHTypeNumber = function(data) { var d = data << 12; while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18) >= 0) d ^= (G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18))); return (data << 12) | d; };
    _this3.getBCHDigit = function(data) { var digit = 0; while (data != 0) { digit++; data >>>= 1; } return digit; };
    _this3.getPatternPosition = function(typeNumber) { return PATTERN_POSITION_TABLE[typeNumber - 1]; };
    _this3.getMaskFunction = function(maskPattern) {
      switch (maskPattern) {
        case 0: return function(i, j) { return (i + j) % 2 == 0; };
        case 1: return function(i, j) { return i % 2 == 0; };
        case 2: return function(i, j) { return j % 3 == 0; };
        case 3: return function(i, j) { return (i + j) % 3 == 0; };
        case 4: return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0; };
        case 5: return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
        case 6: return function(i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 == 0; };
        case 7: return function(i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 == 0; };
        default: throw new Error("bad maskPattern:" + maskPattern);
      }
    };
    _this3.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++) a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      return a;
    };
    _this3.getLengthInBits = function(mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) { case QRMode.MODE_NUMBER: return 10; case QRMode.MODE_ALPHA_NUM: return 9; case QRMode.MODE_8BIT_BYTE: return 8; case QRMode.MODE_KANJI: return 8; default: throw new Error("mode:" + mode); }
      } else if (type < 27) {
        switch (mode) { case QRMode.MODE_NUMBER: return 12; case QRMode.MODE_ALPHA_NUM: return 11; case QRMode.MODE_8BIT_BYTE: return 16; case QRMode.MODE_KANJI: return 10; default: throw new Error("mode:" + mode); }
      } else if (type < 41) {
        switch (mode) { case QRMode.MODE_NUMBER: return 14; case QRMode.MODE_ALPHA_NUM: return 13; case QRMode.MODE_8BIT_BYTE: return 16; case QRMode.MODE_KANJI: return 12; default: throw new Error("mode:" + mode); }
      } else { throw new Error("type:" + type); }
    };
    _this3.getLostPoint = function(modules, moduleCount) {
      var lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0; var dark = modules[row][col];
          for (var r = -1; r <= 1; r++) { if (row + r < 0 || moduleCount <= row + r) continue; for (var c = -1; c <= 1; c++) { if (col + c < 0 || moduleCount <= col + c) continue; if (r == 0 && c == 0) continue; if (dark == modules[row + r][col + c]) sameCount++; } }
          if (sameCount > 5) lostPoint += (3 + sameCount - 5);
        }
      }
      for (var row = 0; row < moduleCount - 1; row++) { for (var col = 0; col < moduleCount - 1; col++) { var count = 0; if (modules[row][col]) count++; if (modules[row + 1][col]) count++; if (modules[row][col + 1]) count++; if (modules[row + 1][col + 1]) count++; if (count == 0 || count == 4) lostPoint += 3; } }
      for (var row = 0; row < moduleCount; row++) { for (var col = 0; col < moduleCount - 6; col++) { if (modules[row][col] && !modules[row][col+1] && modules[row][col+2] && modules[row][col+3] && modules[row][col+4] && !modules[row][col+5] && modules[row][col+6]) lostPoint += 40; } }
      for (var col = 0; col < moduleCount; col++) { for (var row = 0; row < moduleCount - 6; row++) { if (modules[row][col] && !modules[row+1][col] && modules[row+2][col] && modules[row+3][col] && modules[row+4][col] && !modules[row+5][col] && modules[row+6][col]) lostPoint += 40; } }
      var darkCount = 0;
      for (var col = 0; col < moduleCount; col++) for (var row = 0; row < moduleCount; row++) if (modules[row][col]) darkCount++;
      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    };
    return _this3;
  })();

  var QRMath = (function() {
    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);
    for (var i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
    for (var i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
    for (var i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;
    var _this4 = {};
    _this4.glog = function(n) { if (n < 1) throw new Error("glog(" + n + ")"); return LOG_TABLE[n]; };
    _this4.gexp = function(n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP_TABLE[n]; };
    return _this4;
  })();

  function QRPolynomial(num, shift) {
    if (num.length == undefined) throw new Error(num.length + "/" + shift);
    var offset = 0;
    while (offset < num.length && num[offset] == 0) offset++;
    this._num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this._num[i] = num[i + offset];
  }
  QRPolynomial.prototype.get = function(index) { return this._num[index]; };
  QRPolynomial.prototype.getLength = function() { return this._num.length; };
  QRPolynomial.prototype.multiply = function(e) {
    var num = new Array(this.getLength() + e.getLength() - 1);
    for (var i = 0; i < num.length; i++) num[i] = 0;
    for (var i = 0; i < this.getLength(); i++) for (var j = 0; j < e.getLength(); j++) num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
    return new QRPolynomial(num, 0);
  };
  QRPolynomial.prototype.mod = function(e) {
    if (this.getLength() - e.getLength() < 0) return this;
    var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    var num = new Array(this.getLength());
    for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    return new QRPolynomial(num, 0).mod(e);
  };

  function QRRSBlock(totalCount, dataCount) { this.totalCount = totalCount; this.dataCount = dataCount; }
  QRRSBlock.RS_BLOCK_TABLE = [[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[4,107,107,1,108,108],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[3,113,115,1,114,116],[4,64,64,1,65,65],[6,36,36,2,37,37],[6,36,36,2,37,37]];
  QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (rsBlock == undefined) throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel);
    var length = rsBlock.length / 3;
    var list = [];
    for (var i = 0; i < length; i++) { var count = rsBlock[i * 3 + 0]; var totalCount = rsBlock[i * 3 + 1]; var dataCount = rsBlock[i * 3 + 2]; for (var j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount)); }
    return list;
  };
  QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return undefined;
    }
  };

  function QRBitBuffer() { this.buffer = []; this.length = 0; }
  QRBitBuffer.prototype.get = function(index) { var bufIndex = Math.floor(index / 8); return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1; };
  QRBitBuffer.prototype.put = function(num, length) { for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) == 1); };
  QRBitBuffer.prototype.getLengthInBits = function() { return this.length; };
  QRBitBuffer.prototype.putBit = function(bit) { var bufIndex = Math.floor(this.length / 8); if (this.buffer.length <= bufIndex) this.buffer.push(0); if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8)); this.length++; };

  /**
   * Generate a QR code as a data URL (PNG).
   * @param {string} text - Text to encode
   * @param {number} [cellSize=4] - Pixels per module
   * @param {number} [margin] - Margin in pixels (default 4*cellSize)
   * @returns {string} - data:image/png;base64,... URL
   */
  _this.generate = function(text, cellSize, margin) {
    var qr = _this.createQRCode(-1, 'L');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(cellSize || 4, margin !== undefined ? margin : (cellSize || 4) * 4);
  };

  return _this;
})();
