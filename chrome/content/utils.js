/* ***** BEGIN LICENCE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public Licence Version
 * 1.1 (the "Licence"); you may not use this file except in compliance with
 * the Licence. You may obtain a copy of the Licence at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the Licence
 * for the specific language governing rights and limitations under the
 * Licence.
 *
 * The Original Code is LeechBlock Add-on for Firefox.
 *
 * The Initial Developer of the Original Code is James Anderson.
 * Portions created by the Initial Developer are Copyright (C) 2007-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public Licence Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public Licence Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENCE BLOCK ***** */

/*
 * This file contains the code for various utility functions.
 */

const LeechBlock_ID = "{a95d8332-e4b4-6e7f-98ac-20b733364387}";
const LeechBlock_VERSION = "0.6.6";

const LeechBlock_DEFAULT_BLOCK_URL = "chrome://leechblock/locale/blocked.html";
const LeechBlock_DELAYED_BLOCK_URL = "chrome://leechblock/locale/delayed.html";

const LeechBlock_VERSION_HISTORY_URL = "http://www.proginosko.com/leechblock_history.html";

const LeechBlock_PARSE_URL = /^((\w+):\/*(\w+(?::\w+)?@)?([\w-\.]+)(?::(\d+))?([^\?#]*))(\?[^#]*)?(#.*)?$/;

// Global constants for accessing preferences
const LeechBlock_PREFS =
		Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.leechblock.");
const LeechBlock_clearUserPref = LeechBlock_PREFS.clearUserPref;
const LeechBlock_getBoolPref = LeechBlock_PREFS.getBoolPref;
const LeechBlock_setBoolPref = LeechBlock_PREFS.setBoolPref;
const LeechBlock_getCharPref = LeechBlock_PREFS.getCharPref;
const LeechBlock_setCharPref = LeechBlock_PREFS.setCharPref;
const LeechBlock_getIntPref = LeechBlock_PREFS.getIntPref;
const LeechBlock_setIntPref = LeechBlock_PREFS.setIntPref;
const LeechBlock_getUniCharPref = function (name) {
	return LeechBlock_PREFS.getComplexValue(name, Components.interfaces.nsISupportsString).data;
};
const LeechBlock_setUniCharPref = function (name, value) {
	var str = Components.classes["@mozilla.org/supports-string;1"]
			.createInstance(Components.interfaces.nsISupportsString);
	str.data = value;
	LeechBlock_PREFS.setComplexValue(name, Components.interfaces.nsISupportsString, str);
};
const LeechBlock_getBitPref = function (name, bit) {
	return ((LeechBlock_PREFS.getIntPref(name) & (1 << --bit)) != 0);
}
const LeechBlock_setBitPref = function (name, bit, value) {
	var bits = LeechBlock_PREFS.getIntPref(name);
	if (value) {
		LeechBlock_PREFS.setIntPref(name, bits | (1 << --bit));
	} else {
		LeechBlock_PREFS.setIntPref(name, bits & ~(1 << --bit));
	}
}

// Saves all preferences to file
function LeechBlock_savePreferences() {
	Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.savePrefFile(null);
}

// Converts old preferences
//
function LeechBlock_convertOldPreferences() {
	// Convert old boolean preferences to new bit preferences
	var names = [
		"conjMode", "activeBlock", "countFocus",
		"prevOpts", "prefAddons", "prefConfig",
	];
	for each (var name in names) {
		for (var set = 1; set <= 6; set++) {
			try {
				var value = LeechBlock_getBoolPref(name + set);
				LeechBlock_setBitPref(name, set, value);
				LeechBlock_clearUserPref(name + set);
			} catch (e) {
				// Nothing to do
			}
		}
	}
}

// Returns parsed URL (page address, arguments, and hash)
//
function LeechBlock_getParsedURL(url) {
	var results = LeechBlock_PARSE_URL.exec(url);
	if (results != null) {
		var page = results[1];
		var protocol = results[2];
		var userinfo = results[3];
		var host = results[4];
		var port = results[5];
		var path = results[6];
		var query = results[7];
		var fragment = results[8];
		return {
			pageNoArgs: page,
			page: (query == null) ? page : (page + query),
			protocol: protocol,
			host: host,
			path: path,
			args: (query == null) ? null : query.substring(1).split(/[;&]/),
			hash: (fragment == null) ? null : fragment.substring(1)
		};
	} else {
		LeechBlock_printConsole("Cannot parse URL: " + url);
		return {
			pageNoArgs: null,
			page: null,
			protocol: null,
			host: null,
			path: null,
			args: null,
			hash: null
		};
	}
}

// Returns browser version
//
function LeechBlock_getBrowserVersion() {
	return Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getCharPref("extensions.lastAppVersion");
}

// Creates regular expressions for matching sites to block/allow
//
function LeechBlock_getRegExpSites(sites) {
	if (sites == "") {
		return {
			block: "",
			allow: ""
		};
	}

	var blockFiles = false;
	var allowFiles = false;

	var patterns = sites.split(/\s+/);
	var blocks = new Array();
	var allows = new Array();
	for (var i in patterns) {
		if (patterns[i] == "FILE") {
			blockFiles = true;
		} else if (patterns[i] == "+FILE") {
			allowFiles = true;
		} else if (patterns[i].charAt(0) != "+") {
			// Add a regexp to block site(s)
			blocks.push(LeechBlock_patternToRegExp(patterns[i]));
		} else {
			// Add a regexp to allow site(s) as exception(s)
			allows.push(LeechBlock_patternToRegExp(patterns[i].substr(1)));
		}
	}
	return {
		block: (blocks.length > 0)
				? "^" + (blockFiles ? "file:|" : "") + "(https?|file):\\/+(" + blocks.join("|") + ")"
				: (blockFiles ? "^file:" : ""),
		allow: (allows.length > 0)
				? "^" + (allowFiles ? "file:|" : "") + "(https?|file):\\/+(" + allows.join("|") + ")"
				: (allowFiles ? "^file:" : "")
	};
}

// Converts site pattern to regular expression
//
function LeechBlock_patternToRegExp(pattern) {
	var special = /[\.\|\?\+\-\^\$\(\)\[\]\{\}\\]/g;
	return "(www\\.)?" + pattern				// assume optional www prefix
			.replace(special, "\\$&")			// fix special chars
			.replace(/^www\\\./, "")			// remove existing www prefix
			.replace(/\*{2,}/g, ".{STAR}")		// convert super-wildcards
			.replace(/\*/g, "[^\\/]{STAR}")		// convert wildcards
			.replace(/{STAR}/g, "*");			// convert stars
}

// Tests URL against block/allow regular expressions
//
function LeechBlock_testURL(pageURL, blockRE, allowRE) {
	return (blockRE != "" && (new RegExp(blockRE, "i")).test(pageURL)
			&& !(allowRE != "" && (new RegExp(allowRE, "i")).test(pageURL)));
}

// Checks times format
//
function LeechBlock_checkTimesFormat(times) {
	return (times == "") || /^\d\d\d\d-\d\d\d\d([, ]+\d\d\d\d-\d\d\d\d)*$/.test(times);
}

// Checks positive integer format
//
function LeechBlock_checkPosIntFormat(value) {
	return (value == "") || /^[1-9][0-9]*$/.test(value);
}

// Extracts times as minute periods
//
function LeechBlock_getMinPeriods(times) {
	var minPeriods = new Array();
	if (times != "") {
		var regexp = /^(\d\d)(\d\d)-(\d\d)(\d\d)$/;
		var periods = times.split(/[, ]+/);
		for (var i in periods) {
			var results = regexp.exec(periods[i]);
			if (results != null) {
				var minPeriod = {
					start: (parseInt(results[1], 10) * 60 + parseInt(results[2], 10)),
					end: (parseInt(results[3], 10) * 60 + parseInt(results[4], 10))
				};
				minPeriods.push(minPeriod);
			}
		}
	}
	return minPeriods;
}

// Encodes day selection
//
function LeechBlock_encodeDays(daySel) {
	var days = 0;
	for (var i = 0; i < 7; i++) {
		if (daySel[i]) days |= (1 << i);
	}
	return days;
}

// Decodes day selection
//
function LeechBlock_decodeDays(days) {
	var daySel = new Array(7);
	for (var i = 0; i < 7; i++) {
		daySel[i] = ((days & (1 << i)) != 0);
	}
	return daySel;
}

// Calculates start of time period from current time and time limit period
//
function LeechBlock_getTimePeriodStart(now, limitPeriod) {
	limitPeriod = +limitPeriod; // force value to number

	if (limitPeriod > 0) {
		var periodStart = now - (now % limitPeriod);

		// Adjust start time for timezone, DST, and Sunday as first day of week
		if (limitPeriod > 3600) {
			var offsetMins = new Date(now * 1000).getTimezoneOffset();
			periodStart += offsetMins * 60; // add time difference
			if (limitPeriod > 86400) {
				periodStart -= 345600; // subtract four days (Thu back to Sun)
			}

			// Correct any boundary errors
			while (periodStart > now) {
				periodStart -= limitPeriod;
			}
			while (periodStart <= now - limitPeriod) {
				periodStart += limitPeriod;
			}
		}

		return periodStart;
	}

	return 0;
}

// Formats a time in seconds to HH:MM:SS format
//
function LeechBlock_formatTime(time) {
	var neg = (time < 0);
	time = Math.abs(time);
	var h = Math.floor(time / 3600);
	var m = Math.floor(time / 60) % 60;
	var s = Math.floor(time) % 60;
	return (neg ? "-" : "") + ((h < 10) ? "0" + h : h)
			+ ":" + ((m < 10) ? "0" + m : m)
			+ ":" + ((s < 10) ? "0" + s : s);
}

// Prints message to console
//
function LeechBlock_printConsole(msg) {
	Components.classes["@mozilla.org/consoleservice;1"]
			.getService(Components.interfaces.nsIConsoleService)
			.logStringMessage("[LB] " + msg);
}

// Reads UTF-8 text file
//
function LeechBlock_readTextFile(file) {
	const charSet = "UTF-8";
	const bufferSize = 4096;
	const replaceChar = Components.interfaces.nsIConverterInputStream
			.DEFAULT_REPLACEMENT_CHARACTER;

	// Create UTF-8 file input stream
	var fis = Components.classes["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Components.interfaces.nsIFileInputStream);
	fis.init(file, 0x01, 0664, 0);
	var cis = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
			.createInstance(Components.interfaces.nsIConverterInputStream);
	cis.init(fis, charSet, bufferSize, replaceChar);

	// Read all text from stream
	var text = "";
	var str = {};
	while (cis.readString(bufferSize, str) != 0) {
		text += str.value;
	}

	// Close input stream
	cis.close();
	fis.close();

	return text;
}

// Writes UTF-8 text file
//
function LeechBlock_writeTextFile(file, text) {
	const charSet = "UTF-8";
	const bufferSize = 4096;
	const replaceChar = Components.interfaces.nsIConverterInputStream
			.DEFAULT_REPLACEMENT_CHARACTER;

	// Create UTF-8 file output stream
	var fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Components.interfaces.nsIFileOutputStream);
	fos.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	var cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
			.createInstance(Components.interfaces.nsIConverterOutputStream);
	cos.init(fos, charSet, bufferSize, replaceChar);

	// Write text to stream
	cos.writeString(text);

	// Close output stream
	cos.close();
	fos.close();
}

// Creates a random access code of a specified length
//
function LeechBlock_createAccessCode(len) {
	// Omit O, 0, I, l to avoid ambiguity with some fonts
	const codeChars = "!@#$%^&*()[]{}/\<>?+-=ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
	var code = "";
	for (var i = 0; i < len; i++) {
		code += codeChars.charAt(Math.random() * codeChars.length);
	}
	return code;
}

// Retrieves options password from Login Manager
//
function LeechBlock_retrievePassword() {
	var loginManager = Components.classes["@mozilla.org/login-manager;1"]
			.getService(Components.interfaces.nsILoginManager);

	var hostname = "chrome://leechblock";
	var httprealm = "Options";
	var username = "";

	// Search for password
	var logins = loginManager.findLogins({}, hostname, null, httprealm);
	for (var i = 0; i < logins.length; i++) {
		if (logins[i].username == username) {
			return logins[i].password;
		}
	}

	return ""; // no password found
}

// Stores options password in Login Manager
//
function LeechBlock_storePassword(password) {
	var loginManager = Components.classes["@mozilla.org/login-manager;1"]
			.getService(Components.interfaces.nsILoginManager);

	var hostname = "chrome://leechblock";
	var httprealm = "Options";
	var username = "";

	// Remove any existing password
	var logins = loginManager.findLogins({}, hostname, null, httprealm);
	for (var i = 0; i < logins.length; i++) {
		loginManager.removeLogin(logins[i]);
	}

	// Add new password
	if (password != null && password != "") {
		var login = Components.classes["@mozilla.org/login-manager/loginInfo;1"]
				.createInstance(Components.interfaces.nsILoginInfo);
		login.init(hostname, null, httprealm, username, password, "", "");
		loginManager.addLogin(login);
	}
}
